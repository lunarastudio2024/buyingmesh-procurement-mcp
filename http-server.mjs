import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { handleMessage } from './protocol.mjs';

const port = Number(process.env.MCP_PORT || 9797);
const sessions = new Map();

function send(res, status, body, headers = {}) {
  if (status === 204) {
    res.writeHead(status, headers);
    return res.end();
  }
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-cache', ...headers });
  res.end(payload);
}

function body(req) {
  return new Promise((resolve, reject) => {
    let value = '';
    req.on('data', (chunk) => { value += chunk; if (value.length > 1_000_000) reject(new Error('body_too_large')); });
    req.on('end', () => { try { resolve(JSON.parse(value || '{}')); } catch { reject(new Error('invalid_json')); } });
    req.on('error', reject);
  });
}

export function createMcpHttpServer() {
  return http.createServer(async (req, res) => {
  if (req.url !== '/mcp') return send(res, 404, { error: 'not_found' });
  const origin = req.headers.origin;
  if (origin) {
    try {
      const host = new URL(origin).hostname;
      const allowedOrigins = (process.env.MCP_ALLOWED_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean);
      if (!['localhost', '127.0.0.1', '::1'].includes(host) && !allowedOrigins.includes(origin)) return send(res, 403, { error: 'origin_not_allowed' });
    } catch { return send(res, 403, { error: 'invalid_origin' }); }
  }
  const sessionId = req.headers['mcp-session-id'];
  if (req.method === 'GET') {
    const session = sessions.get(sessionId);
    if (!sessionId || !session) return send(res, 400, { error: 'missing_or_unknown_session' });
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive', 'Mcp-Session-Id': sessionId });
    res.write('retry: 5000\n\n');
    const heartbeat = setInterval(() => res.write(': ping\n\n'), 15_000);
    req.on('close', () => clearInterval(heartbeat));
    return;
  }
  if (req.method === 'DELETE') {
    const session = sessions.get(sessionId);
    if (!session) return send(res, 404, { error: 'missing_or_unknown_session' });
    sessions.delete(sessionId);
    return send(res, 204, null);
  }
  if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' });
  try {
    const message = await body(req);
    const response = await handleMessage(message);
    const activeSessionId = sessionId || randomUUID();
    if (!sessions.has(activeSessionId)) sessions.set(activeSessionId, { createdAt: Date.now() });
    const responseHeaders = { 'Mcp-Session-Id': activeSessionId, 'MCP-Protocol-Version': '2024-11-05' };
    if (!response) return send(res, 202, {}, responseHeaders);
    if ((req.headers.accept || '').includes('text/event-stream')) {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', ...responseHeaders });
      res.end(`event: message\ndata: ${JSON.stringify(response)}\n\n`);
      return;
    }
    return send(res, 200, response, responseHeaders);
  } catch (error) {
    return send(res, error.message === 'invalid_json' ? 400 : 413, { error: error.message });
  }
});
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const server = createMcpHttpServer();
  server.listen(port, '127.0.0.1', () => console.log(`Yiwu Source MCP HTTP listening on http://127.0.0.1:${server.address().port}/mcp`));
}
