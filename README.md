# BuyingMesh Procurement MCP

An open-source Model Context Protocol adapter for [BuyingMesh](https://buyingmesh.com), an agent-native B2B procurement network. The adapter exposes structured supplier catalog discovery, quote comparison, landed-cost estimates, buyer confirmation and sandbox order workflows through the official MCP SDK.

The public remote MCP endpoint is `https://buyingmesh.com/mcp`.

The remote service is the canonical production integration. This repository is the reproducible local adapter for agents that need stdio or a local Streamable HTTP process.

## What it exposes

The adapter registers 19 tools:

- Product and supplier discovery: `search_products`, `get_product`, `search_suppliers`, `get_supplier`, `list_supplier_products`, `get_supplier_performance`
- Commercial workflow: `compare_quotes`, `create_quote`, `get_quote`, `compare_supplier_offers`, `request_buyer_confirmation`
- Delivery estimates: `search_shipping_rates`, `lookup_tariffs`, `estimate_landed_cost`
- Order lifecycle: `create_order`, `get_order_status`, `update_order_status`, `cancel_order`
- Human support: `contact_support`

Discovery and estimates are safe to call. Product price, inventory, lead time and supplier qualification are time-sensitive snapshots. Agents must surface `dataEnvironment`, `dataFreshness`, MOQ and confidence, and must obtain explicit buyer confirmation before an order mutation. Sandbox orders are test fixtures and do not move funds or trigger shipment.

## Run locally

Requirements: Node.js 20 or newer.

```bash
npm ci
cp .env.example .env
npm test
npm start
npm run start:http
```

The default REST base is `http://127.0.0.1:8787`. To use the public sandbox, set `API_BASE_URL=https://buyingmesh.com`. Set `MCP_API_KEY` before exposing a local HTTP process outside localhost, and restrict browser origins with `MCP_ALLOWED_ORIGINS`.

Example MCP client configuration:

```json
{
  "mcpServers": {
    "buyingmesh": {
      "command": "npx",
      "args": ["-y", "yiwu-source-procurement-mcp"],
      "env": { "API_BASE_URL": "https://buyingmesh.com" }
    }
  }
}
```

For remote clients, use `https://buyingmesh.com/mcp` with Streamable HTTP. Read the machine-readable entry points first:

- Agent profile: <https://buyingmesh.com/.well-known/agent.json>
- OpenAPI JSON: <https://buyingmesh.com/openapi.json>
- MCP Registry manifest: <https://buyingmesh.com/server.json>
- Authentication and environments: <https://buyingmesh.com/auth.md>

## Repository layout

- `sdk-server.mjs` — official MCP SDK stdio and Streamable HTTP server
- `protocol.mjs` — tool schemas and REST adapter
- `test/` — protocol, HTTP and SDK interoperability tests
- `server.mjs` and `http-server.mjs` — compatibility implementations

## Scope and safety

This repository contains the adapter and its tests. It does not contain BuyingMesh database credentials, admin keys, x402 private keys, supplier documents or buyer personal data. See [SECURITY.md](SECURITY.md) for responsible disclosure.

## License

MIT. See [LICENSE](LICENSE).
