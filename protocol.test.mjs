import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { handleMessage } from '../protocol.mjs';

test('shared MCP handler exposes the procurement tool set', async () => {
  const response = await handleMessage({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
  assert.equal(response.result.tools.length, 19);
  assert.equal(response.result.tools[0].name, 'search_products');
});

test('MCP stdio server answers initialize and tools/list', async () => {
  const child = spawn(process.execPath, [path.resolve('server.mjs')], { cwd: path.resolve('.') });
  const messages = [
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} },
    { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }
  ];
  const output = new Promise((resolve, reject) => {
    const lines = [];
    child.stdout.on('data', (chunk) => {
      lines.push(...chunk.toString().trim().split(/\r?\n/).filter(Boolean));
      if (lines.length >= 2) resolve(lines.map((line) => JSON.parse(line)));
    });
    child.on('error', reject);
    setTimeout(() => reject(new Error('MCP server timeout')), 3000);
  });
  for (const message of messages) child.stdin.write(`${JSON.stringify(message)}\n`);
  const replies = await output;
  child.kill();
  assert.equal(replies[0].result.serverInfo.name, 'buyingmesh-procurement');
  assert.equal(replies[1].result.tools.length, 19);
});
