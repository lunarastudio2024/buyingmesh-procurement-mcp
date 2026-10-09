# BuyingMesh Procurement MCP — publishing notes

## Automated checks

```bash
npm ci
npm test
npm pack --dry-run
```

The package is intentionally unscoped and public-ready as `yiwu-source-procurement-mcp`. Before publishing to npm, verify the name is available and add the final repository URL to `package.json`.

## Remote MCP

The canonical remote endpoint is `https://buyingmesh.com/mcp`. It is deployed as a Cloudflare Worker with public sandbox discovery. Production workflows require the platform's access controls and payment configuration.

## Registry metadata

`server.json` is the public MCP Registry manifest served from BuyingMesh. The source repository should be linked from the GitHub repository and from the Registry profile after the first public push.
