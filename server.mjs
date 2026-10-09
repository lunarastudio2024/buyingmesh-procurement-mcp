import readline from 'node:readline';
import { handleMessage } from './protocol.mjs';

const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
input.on('line', async (line) => {
  if (!line.trim()) return;
  let message;
  try { message = JSON.parse(line); } catch { return process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'invalid JSON-RPC message' } })}\n`); }
  const response = await handleMessage(message);
  if (response) process.stdout.write(`${JSON.stringify(response)}\n`);
});
