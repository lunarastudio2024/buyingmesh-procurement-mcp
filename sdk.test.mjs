import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';

const validInitialize = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'quickstart-test', version: '0.1.0' }
  }
};

test('official SDK stdio server negotiates and lists structured tools', async (t) => {
  const child = spawn(process.execPath, ['sdk-server.mjs'], { cwd: path.resolve('.') });
  t.after(() => child.kill());
  const output = new Promise((resolve, reject) => {
    const lines = [];
    const timer = setTimeout(() => reject(new Error('SDK MCP timeout')), 3000);
    child.stdout.on('data', (chunk) => {
      lines.push(...chunk.toString().trim().split(/\r?\n/).filter(Boolean));
      if (lines.length >= 2) { clearTimeout(timer); resolve(lines.map((line) => JSON.parse(line))); }
    });
    child.on('error', reject);
  });
  child.stdin.write(`${JSON.stringify(validInitialize)}\n`);
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' })}\n`);
  const replies = await output;
  assert.equal(replies[0].result.serverInfo.name, 'buyingmesh-procurement');
  assert.equal(replies[1].result.tools.length, 19);
  assert.equal(replies[1].result.tools[0].name, 'search_products');
});
