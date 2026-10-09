import test from 'node:test';
import assert from 'node:assert/strict';
import { createMcpHttpServer } from '../http-server.mjs';

test('MCP HTTP endpoint supports initialize, SSE stream and session close', async (t) => {
  const server = createMcpHttpServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}/mcp`;
  const response = await fetch(base, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }) });
  assert.equal(response.status, 200);
  const sessionId = response.headers.get('mcp-session-id');
  assert.ok(sessionId);
  const payload = await response.json();
  assert.equal(payload.result.serverInfo.name, 'buyingmesh-procurement');

  const stream = await fetch(base, { headers: { 'Mcp-Session-Id': sessionId } });
  assert.equal(stream.status, 200);
  assert.match(stream.headers.get('content-type'), /text\/event-stream/);
  await stream.body.cancel();

  const closed = await fetch(base, { method: 'DELETE', headers: { 'Mcp-Session-Id': sessionId } });
  assert.equal(closed.status, 204);
});
