import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createApiClient } from './api.js';

async function withServer(handler, run) {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  try { await run(`http://127.0.0.1:${address.port}`); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}

test('agent API client does not retry non-retryable 4xx responses', async () => {
  let requests = 0;
  await withServer((_req, res) => {
    requests++;
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: { message: 'Invalid request' } }));
  }, async (url) => {
    const client = createApiClient(url, 'test-token');
    await assert.rejects(client.post('/ingest', {}, 3, 1), /HTTP 400/);
  });
  assert.equal(requests, 1);
});

test('agent API client retries transient server failures', async () => {
  let requests = 0;
  await withServer((_req, res) => {
    requests++;
    res.writeHead(requests === 1 ? 503 : 200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
  }, async (url) => {
    const client = createApiClient(url, 'test-token');
    const result = await client.post('/ingest', {}, 2, 1);
    assert.equal(result.success, true);
  });
  assert.equal(requests, 2);
});
