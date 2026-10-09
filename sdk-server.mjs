#!/usr/bin/env node
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { invoke } from './protocol.mjs';

const serverInfo = { name: 'buyingmesh-procurement', version: '0.5.0' };

function createServer() {
  const server = new McpServer(serverInfo, { instructions: 'Read-only discovery is safe to call. Sandbox products are disposable test fixtures, not commercial offers. Always surface freshness, MOQ, inventory and supplier qualification. Estimate tools are non-binding; request explicit buyer confirmation before create_order. Settlement is simulated in this environment and idempotency keys are required for order mutation.' });
  const call = (name) => async (args) => ({ content: [{ type: 'text', text: JSON.stringify(await invoke(name, args)) }] });
  server.registerTool('search_products', { title: 'Search products', description: 'Search structured products by exact SKU or GTIN, specification, MOQ, price, inventory and lead time.', inputSchema: { q: z.string().optional(), sku: z.string().optional(), gtin: z.string().optional(), category: z.string().optional(), supplierId: z.string().optional(), supplierSlug: z.string().optional(), material: z.string().optional(), size: z.string().optional(), minMoq: z.number().int().optional(), maxMoq: z.number().int().optional(), minPrice: z.number().optional(), maxPrice: z.number().optional(), limit: z.number().int().max(100).optional(), environment: z.enum(['sandbox', 'production']).optional() } }, call('search_products'));
  server.registerTool('get_product', { title: 'Get product JSON-LD', description: 'Read Schema.org product data, material, size, MOQ, inventory, lead time and supplier qualifications.', inputSchema: { sku: z.string().min(1), environment: z.enum(['sandbox', 'production']).optional() } }, call('get_product'));
  server.registerTool('search_suppliers', { title: 'Search suppliers', description: 'Find approved supplier storefronts with reviewed credentials and platform-observed performance.', inputSchema: { q: z.string().optional(), category: z.string().optional(), countryRegion: z.string().optional(), supplierType: z.string().optional(), verified: z.boolean().optional(), minProducts: z.number().int().optional(), limit: z.number().int().max(100).optional() } }, call('search_suppliers'));
  server.registerTool('get_supplier', { title: 'Get supplier storefront', description: 'Retrieve one public supplier storefront by stable ID or slug.', inputSchema: { supplierId: z.string().min(1) } }, call('get_supplier'));
  server.registerTool('list_supplier_products', { title: 'List supplier products', description: 'List precisely filtered products for one approved supplier storefront.', inputSchema: { supplierId: z.string().min(1), sku: z.string().optional(), q: z.string().optional(), limit: z.number().int().max(100).optional() } }, call('list_supplier_products'));
  server.registerTool('compare_quotes', { title: 'Compare quotes', description: 'Compare supplier quotes, shipping and lead time by quantity and destination.', inputSchema: { items: z.array(z.object({ sku: z.string(), quantity: z.number().int().positive() })), destination: z.object({ country: z.string().min(2), postalCode: z.string().min(2) },) } }, call('compare_quotes'));
  server.registerTool('create_quote', { title: 'Create quote', description: 'Create a retrievable quote snapshot; no order or payment side effect.', inputSchema: { items: z.array(z.object({ sku: z.string(), quantity: z.number().int().positive() })), destination: z.object({ country: z.string().min(2) }), environment: z.enum(['sandbox', 'production']).optional() } }, call('create_quote'));
  server.registerTool('get_quote', { title: 'Get quote', description: 'Retrieve a previously created quote and its expiry.', inputSchema: { quoteId: z.string().min(1) } }, call('get_quote'));
  server.registerTool('create_order', { title: 'Create order', description: 'Create a B2B order from a confirmed quote in sandbox mode. Use an idempotency key only after buyer approval.', inputSchema: { quoteId: z.string().min(1), buyer: z.object({ name: z.string().min(1), email: z.string().email() }), shippingAddress: z.record(z.string(), z.string()), idempotencyKey: z.string().min(8).optional() } }, call('create_order'));
  server.registerTool('get_order_status', { title: 'Get order status', description: 'Read order status, tracking number, ETA, payment mode and fulfillment events.', inputSchema: { orderId: z.string().min(1) } }, call('get_order_status'));
  server.registerTool('update_order_status', { title: 'Update order status', description: 'Advance a sandbox order through an allowed fulfillment transition after evidence is supplied.', inputSchema: { orderId: z.string().min(1), status: z.enum(['shipped', 'tracking_updated', 'eta_updated', 'delivered', 'accepted', 'released', 'disputed']), data: z.record(z.string(), z.any()).optional() } }, call('update_order_status'));
  server.registerTool('cancel_order', { title: 'Cancel order', description: 'Cancel an order before fulfillment when permitted.', inputSchema: { orderId: z.string().min(1), reason: z.string().max(500).optional() } }, call('cancel_order'));
  server.registerTool('compare_supplier_offers', { title: 'Compare supplier offers', description: 'Compare eligible supplier offers for requested SKUs, quantities and destination. Read-only estimate.', inputSchema: { items: z.array(z.object({ sku: z.string(), quantity: z.number().int().positive() })), destination: z.object({ country: z.string().min(2) }), environment: z.enum(['sandbox', 'production']).optional() } }, call('compare_supplier_offers'));
  server.registerTool('get_supplier_performance', { title: 'Get supplier performance', description: 'Read platform-observed supplier fulfillment metrics with sample size and as-of timestamp.', inputSchema: { supplierId: z.string().min(1) } }, call('get_supplier_performance'));
  server.registerTool('search_shipping_rates', { title: 'Estimate shipping rates', description: 'Estimate shipping options using weight, dimensions and destination. Requires carrier confirmation.', inputSchema: { destination: z.object({ country: z.string().min(2) }), origin: z.object({ country: z.string().optional() }).optional(), weightKg: z.number().positive().optional(), quantity: z.number().int().positive().optional(), dimensionsCm: z.object({ length: z.number().positive().optional(), width: z.number().positive().optional(), height: z.number().positive().optional() }).optional() } }, call('search_shipping_rates'));
  server.registerTool('lookup_tariffs', { title: 'Lookup tariffs', description: 'Return a preliminary HS-code and destination duty range requiring broker confirmation.', inputSchema: { hsCode: z.string().min(2), destinationCountry: z.string().min(2), customsValue: z.number().nonnegative().optional(), currency: z.string().optional() } }, call('lookup_tariffs'));
  server.registerTool('estimate_landed_cost', { title: 'Estimate landed cost', description: 'Combine product subtotal, estimated shipping and preliminary duty into a non-binding range.', inputSchema: { items: z.array(z.object({ sku: z.string(), quantity: z.number().int().positive() })), destination: z.object({ country: z.string().min(2) }), hsCode: z.string().optional(), weightKg: z.number().positive().optional(), dimensionsCm: z.object({ length: z.number().positive().optional(), width: z.number().positive().optional(), height: z.number().positive().optional() }).optional(), environment: z.enum(['sandbox', 'production']).optional() } }, call('estimate_landed_cost'));
  server.registerTool('request_buyer_confirmation', { title: 'Request buyer confirmation', description: 'Create a short-lived explicit confirmation request before any order mutation. No payment side effect.', inputSchema: { quoteId: z.string().min(1), buyerNote: z.string().max(500).optional() } }, call('request_buyer_confirmation'));
  server.registerTool('contact_support', { title: 'Contact support', description: 'Send a support request to the BuyingMesh operator. Never include credentials.', inputSchema: { message: z.string().min(5).max(4000), subject: z.string().max(180).optional(), agentName: z.string().max(180).optional(), agentId: z.string().max(180).optional(), replyTo: z.string().email().optional(), context: z.record(z.string(), z.any()).optional() } }, call('contact_support'));
  return server;
}

async function startStdio() {
  const server = createServer();
  await server.connect(new StdioServerTransport());
}

const isInitialize = (body) => body?.method === 'initialize';
const jsonBody = (req) => new Promise((resolve, reject) => { let raw = ''; req.on('data', (chunk) => { raw += chunk; }); req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { reject(new Error('invalid_json')); } }); req.on('error', reject); });

function isLocalOrigin(origin) {
  try {
    const hostname = new URL(origin).hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  } catch { return false; }
}

export function createHttpServer({ apiKey = process.env.MCP_API_KEY, allowedOrigins = process.env.MCP_ALLOWED_ORIGINS || '' } = {}) {
  const sessions = new Map();
  const server = http.createServer(async (req, res) => {
    if (req.url !== '/mcp') { res.writeHead(404); return res.end(); }
    const origin = req.headers.origin;
    if (origin && !(allowedOrigins.split(',').map((item) => item.trim()).filter(Boolean).includes(origin) || (!allowedOrigins && isLocalOrigin(origin)))) {
      res.writeHead(403, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ error: 'origin_not_allowed' }));
    }
    if (origin) {
      res.setHeader('access-control-allow-origin', origin);
      res.setHeader('vary', 'Origin');
      res.setHeader('access-control-expose-headers', 'Mcp-Session-Id, Mcp-Protocol-Version');
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
        'access-control-allow-headers': 'Authorization, Content-Type, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID',
        'access-control-max-age': '600'
      });
      return res.end();
    }
    if (apiKey && req.headers.authorization !== `Bearer ${apiKey}`) { res.writeHead(401, { 'www-authenticate': 'Bearer' }); return res.end(); }
    const sessionId = req.headers['mcp-session-id'];
    try {
      if (req.method === 'POST') {
        const body = await jsonBody(req);
        let session = sessionId ? sessions.get(sessionId) : null;
        if (!session && isInitialize(body)) {
          const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID(), onsessioninitialized: (id) => sessions.set(id, { transport }) });
          const mcp = createServer();
          transport.onclose = () => { if (transport.sessionId) sessions.delete(transport.sessionId); };
          await mcp.connect(transport);
          await transport.handleRequest(req, res, body);
          return;
        }
        if (!session) { res.writeHead(404, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ error: 'session_not_found' })); }
        await session.transport.handleRequest(req, res, body);
        return;
      }
      if (req.method === 'GET' || req.method === 'DELETE') {
        const session = sessionId ? sessions.get(sessionId) : null;
        if (!session) { res.writeHead(404); return res.end(); }
        await session.transport.handleRequest(req, res);
        return;
      }
      res.writeHead(405); res.end();
    } catch (error) {
      if (!res.headersSent) { res.writeHead(500, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: error.message })); }
    }
  });
  server.on('close', () => {
    for (const { transport } of sessions.values()) transport.close().catch(() => {});
    sessions.clear();
  });
  return server;
}

async function startHttp() {
  const port = Number(process.env.MCP_SDK_PORT || 9898);
  const host = process.env.MCP_HOST || '127.0.0.1';
  const server = createHttpServer();
  server.listen(port, host, () => console.log(`Yiwu Source MCP SDK HTTP listening on http://${host}:${port}/mcp`));
}

if (process.argv.includes('--http')) startHttp(); else startStdio();
