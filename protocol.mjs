const apiBase = process.env.API_BASE_URL || 'http://127.0.0.1:8787';
const paymentSignature = process.env.PAYMENT_SIGNATURE || '';

export const tools = [
  { name: 'search_products', description: 'Search structured products using exact SKU or GTIN, supplier, material, dimensions, MOQ, price, inventory, lead time and qualification filters. Defaults to the sandbox catalog.', inputSchema: { type: 'object', properties: { q: { type: 'string' }, sku: { type: 'string' }, gtin: { type: 'string' }, category: { type: 'string' }, supplierId: { type: 'string' }, supplierSlug: { type: 'string' }, material: { type: 'string' }, size: { type: 'string' }, minMoq: { type: 'integer' }, maxMoq: { type: 'integer' }, minPrice: { type: 'number' }, maxPrice: { type: 'number' }, limit: { type: 'integer' }, environment: { type: 'string', enum: ['sandbox', 'production'] } } } },
  { name: 'get_product', description: 'Get Schema.org product data and supplier qualifications.', inputSchema: { type: 'object', required: ['sku'], properties: { sku: { type: 'string' }, environment: { type: 'string', enum: ['sandbox', 'production'] } } } },
  { name: 'search_suppliers', description: 'Find approved public supplier storefronts and inspect reviewed credentials and platform-observed performance.', inputSchema: { type: 'object', properties: { q: { type: 'string' }, category: { type: 'string' }, countryRegion: { type: 'string' }, supplierType: { type: 'string' }, verified: { type: 'boolean' }, minProducts: { type: 'integer' }, limit: { type: 'integer' } } } },
  { name: 'get_supplier', description: 'Retrieve a public supplier storefront by stable supplier ID or slug.', inputSchema: { type: 'object', required: ['supplierId'], properties: { supplierId: { type: 'string' } } } },
  { name: 'get_supplier_performance', description: 'Read platform-observed supplier fulfillment metrics with sample size and as-of timestamp.', inputSchema: { type: 'object', required: ['supplierId'], properties: { supplierId: { type: 'string' } } } },
  { name: 'list_supplier_products', description: 'List precisely filtered, approved catalog products for one public supplier storefront.', inputSchema: { type: 'object', required: ['supplierId'], properties: { supplierId: { type: 'string' }, sku: { type: 'string' }, q: { type: 'string' }, limit: { type: 'integer' } } } },
  { name: 'compare_quotes', description: 'Compare supplier quotes by quantity and destination.', inputSchema: { type: 'object', required: ['items', 'destination'], properties: { items: { type: 'array' }, destination: { type: 'object' }, environment: { type: 'string', enum: ['sandbox', 'production'] } } } },
  { name: 'create_quote', description: 'Create a retrievable quote snapshot without an order or payment side effect.', inputSchema: { type: 'object', required: ['items', 'destination'], properties: { items: { type: 'array' }, destination: { type: 'object' }, environment: { type: 'string', enum: ['sandbox', 'production'] } } } },
  { name: 'get_quote', description: 'Retrieve a previously created quote by quoteId and inspect expiry and options.', inputSchema: { type: 'object', required: ['quoteId'], properties: { quoteId: { type: 'string' } } } },
  { name: 'create_order', description: 'Create an order from a confirmed quote in sandbox mode.', inputSchema: { type: 'object', required: ['quoteId', 'buyer', 'shippingAddress'], properties: { quoteId: { type: 'string' }, buyer: { type: 'object' }, shippingAddress: { type: 'object' }, idempotencyKey: { type: 'string' } } } },
  { name: 'get_order_status', description: 'Read order status, tracking number and ETA.', inputSchema: { type: 'object', required: ['orderId'], properties: { orderId: { type: 'string' } } } },
  { name: 'update_order_status', description: 'Advance a sandbox order through an allowed fulfillment transition after evidence is supplied.', inputSchema: { type: 'object', required: ['orderId', 'status'], properties: { orderId: { type: 'string' }, status: { type: 'string', enum: ['shipped', 'tracking_updated', 'eta_updated', 'delivered', 'accepted', 'released', 'disputed'] }, data: { type: 'object' } } } },
  { name: 'cancel_order', description: 'Cancel an order before fulfillment when the state machine permits it.', inputSchema: { type: 'object', required: ['orderId'], properties: { orderId: { type: 'string' }, reason: { type: 'string' } } } },
  { name: 'contact_support', description: 'Send a support request from an agent to the BuyingMesh operator by email. Never include credentials.', inputSchema: { type: 'object', required: ['message'], properties: { message: { type: 'string' }, subject: { type: 'string' }, agentName: { type: 'string' }, agentId: { type: 'string' }, replyTo: { type: 'string' }, context: { type: 'object' } } } }
  ,{ name: 'compare_supplier_offers', description: 'Compare eligible supplier offers for requested SKUs, quantity and destination. Read-only estimate.', inputSchema: { type: 'object', required: ['items', 'destination'], properties: { items: { type: 'array' }, destination: { type: 'object' }, environment: { type: 'string', enum: ['sandbox', 'production'] } } } }
  ,{ name: 'search_shipping_rates', description: 'Estimate shipping options using weight, dimensions and destination. Requires carrier confirmation.', inputSchema: { type: 'object', required: ['destination'], properties: { destination: { type: 'object' }, weightKg: { type: 'number' }, quantity: { type: 'integer' }, dimensionsCm: { type: 'object' } } } }
  ,{ name: 'lookup_tariffs', description: 'Return a preliminary HS-code and destination tariff estimate requiring broker confirmation.', inputSchema: { type: 'object', required: ['hsCode', 'destinationCountry'], properties: { hsCode: { type: 'string' }, destinationCountry: { type: 'string' }, customsValue: { type: 'number' }, currency: { type: 'string' } } } }
  ,{ name: 'estimate_landed_cost', description: 'Combine product subtotal, estimated shipping and preliminary duty into a landed-cost range.', inputSchema: { type: 'object', required: ['items', 'destination'], properties: { items: { type: 'array' }, destination: { type: 'object' }, hsCode: { type: 'string' }, weightKg: { type: 'number' }, dimensionsCm: { type: 'object' }, environment: { type: 'string', enum: ['sandbox', 'production'] } } } }
  ,{ name: 'request_buyer_confirmation', description: 'Create a short-lived explicit confirmation request for a quote before order mutation.', inputSchema: { type: 'object', required: ['quoteId'], properties: { quoteId: { type: 'string' }, buyerNote: { type: 'string' } } } }
];

async function callApi(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, { ...options, headers: { 'content-type': 'application/json', ...(options.headers || {}) } });
  const body = await response.json();
  if (!response.ok) throw new Error(`${body.code || response.status}: ${body.message || 'API request failed'}`);
  return body;
}

export async function invoke(name, args = {}) {
  if (name === 'search_products') {
    const query = new URLSearchParams(Object.entries(args).filter(([, value]) => value !== undefined && value !== null && value !== '').map(([key, value]) => [key, String(value)])).toString();
    return callApi(`/v1/products${query ? `?${query}` : ''}`, { headers: { 'PAYMENT-SIGNATURE': paymentSignature } });
  }
  if (name === 'get_product') return callApi(`/v1/products/${encodeURIComponent(args.sku)}${args.environment ? `?environment=${encodeURIComponent(args.environment)}` : ''}`, { headers: { 'PAYMENT-SIGNATURE': paymentSignature } });
  if (name === 'search_suppliers') return callApi(`/v1/suppliers?${new URLSearchParams(Object.entries(args).filter(([, value]) => value !== undefined && value !== null).map(([key, value]) => [key, String(value)])).toString()}`);
  if (name === 'get_supplier') return callApi(`/v1/suppliers/${encodeURIComponent(args.supplierId)}`);
  if (name === 'get_supplier_performance') return callApi(`/v1/suppliers/${encodeURIComponent(args.supplierId)}/performance`);
  if (name === 'list_supplier_products') return callApi(`/v1/suppliers/${encodeURIComponent(args.supplierId)}/products?${new URLSearchParams(Object.entries(args).filter(([key, value]) => key !== 'supplierId' && value !== undefined && value !== null).map(([key, value]) => [key, String(value)])).toString()}`);
  if (name === 'compare_quotes' || name === 'create_quote') return callApi('/v1/quotes', { method: 'POST', body: JSON.stringify({ items: args.items, destination: args.destination, environment: args.environment }) });
  if (name === 'get_quote') return callApi(`/v1/quotes/${encodeURIComponent(args.quoteId)}`);
  if (name === 'create_order') return callApi('/v1/orders', { method: 'POST', headers: { 'Idempotency-Key': args.idempotencyKey || `mcp-${args.quoteId}` }, body: JSON.stringify(args) });
  if (name === 'get_order_status') return callApi(`/v1/orders/${encodeURIComponent(args.orderId)}`);
  if (name === 'update_order_status') return callApi(`/v1/orders/${encodeURIComponent(args.orderId)}/status`, { method: 'POST', body: JSON.stringify({ status: args.status, data: args.data }) });
  if (name === 'cancel_order') return callApi(`/v1/orders/${encodeURIComponent(args.orderId)}/cancel`, { method: 'POST', body: JSON.stringify({ reason: args.reason }) });
  if (name === 'compare_supplier_offers') return callApi('/v1/quotes/compare-suppliers', { method: 'POST', body: JSON.stringify(args) });
  if (name === 'search_shipping_rates') return callApi('/v1/shipping/rates', { method: 'POST', body: JSON.stringify(args) });
  if (name === 'lookup_tariffs') return callApi('/v1/tariffs/lookup', { method: 'POST', body: JSON.stringify(args) });
  if (name === 'estimate_landed_cost') return callApi('/v1/landed-cost', { method: 'POST', body: JSON.stringify(args) });
  if (name === 'request_buyer_confirmation') return callApi('/v1/buyer-confirmations', { method: 'POST', body: JSON.stringify(args) });
  if (name === 'contact_support') return callApi('/v1/support/contact', { method: 'POST', body: JSON.stringify(args) });
  throw new Error(`unknown tool: ${name}`);
}

export async function handleMessage(message) {
  if (message.method === 'notifications/initialized') return null;
  if (message.method === 'initialize') return { jsonrpc: '2.0', id: message.id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'buyingmesh-procurement', version: '0.5.0' }, instructions: 'Sandbox discovery is safe to call. Surface freshness, MOQ, inventory and supplier qualification. Estimate tools are non-binding; request explicit buyer confirmation before create_order.' } };
  if (message.method === 'tools/list') return { jsonrpc: '2.0', id: message.id, result: { tools } };
  if (message.method === 'tools/call') {
    try {
      const result = await invoke(message.params?.name, message.params?.arguments || {});
      return { jsonrpc: '2.0', id: message.id, result: { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result } };
    } catch (error) {
      return { jsonrpc: '2.0', id: message.id, result: { isError: true, content: [{ type: 'text', text: error.message }] } };
    }
  }
  return { jsonrpc: '2.0', id: message.id, error: { code: -32601, message: `method not found: ${message.method}` } };
}
