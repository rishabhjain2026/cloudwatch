import test from 'node:test';
import assert from 'node:assert/strict';
import { checkEndpoint, isPublicAddress, validateEndpointUrl } from './apiCheckerService.js';
import { monitorHealth } from './apiMonitorService.js';
import { env } from '../config/env.js';
import { decryptMonitorConfig, encryptMonitorConfig } from './apiMonitorCrypto.js';

test('SSRF guard permits public addresses and rejects private, reserved and mapped private ranges', () => {
  for (const address of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111']) assert.equal(isPublicAddress(address), true, address);
  for (const address of ['127.0.0.1', '10.4.0.1', '172.20.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.2', '::1', 'fd12::1', 'fe80::1', '::ffff:127.0.0.1']) assert.equal(isPublicAddress(address), false, address);
});

test('endpoint URL validation permits only credential-free HTTP(S) and rejects secret query parameters', () => {
  assert.equal(validateEndpointUrl('https://status.example.com/health').hostname, 'status.example.com');
  assert.throws(() => validateEndpointUrl('ftp://status.example.com/health'), { code: 'INVALID_URL' });
  assert.throws(() => validateEndpointUrl('https://user:pass@status.example.com/'), { code: 'INVALID_URL' });
  assert.throws(() => validateEndpointUrl('https://status.example.com/?api_key=secret'), { code: 'URL_CREDENTIALS_BLOCKED' });
});

test('endpoint check blocks metadata and loopback destinations before connecting', async () => {
  const result = await checkEndpoint({ url: 'http://169.254.169.254/latest/meta-data/', method: 'GET', expectedStatus: 200, timeoutMs: 1000 });
  assert.equal(result.success, false);
  assert.equal(result.errorType, 'SSRF_BLOCKED');
  assert.equal(result.statusCode, null);
});

test('monitor health has explicit awaiting, paused, down, degraded, and operational states', () => {
  const monitor = { enabled: true, warningLatencyMs: 500 };
  assert.equal(monitorHealth(monitor, null), 'UNKNOWN');
  assert.equal(monitorHealth({ ...monitor, enabled: false }, null), 'PAUSED');
  assert.equal(monitorHealth(monitor, { success: false }), 'DOWN');
  assert.equal(monitorHealth(monitor, { success: true, latencyMs: 500 }), 'DEGRADED');
  assert.equal(monitorHealth(monitor, { success: true, latencyMs: 120 }), 'UP');
  assert.equal(monitorHealth({ ...monitor, intervalSec: 30 }, { success: true, latencyMs: 120, checkedAt: new Date(Date.now() - 91_000) }), 'UNKNOWN');
});

test('request secrets require a configured key and encrypt/decrypt with authenticated encryption', () => {
  assert.equal(encryptMonitorConfig({ headers: {}, body: null }), null);
  const oldKey = env.API_MONITOR_ENCRYPTION_KEY;
  env.API_MONITOR_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString('base64');
  try {
    const encrypted = encryptMonitorConfig({ headers: { Authorization: 'Bearer private-value' }, body: null });
    assert.equal(encrypted.includes('private-value'), false);
    assert.deepEqual(decryptMonitorConfig(encrypted), { headers: { Authorization: 'Bearer private-value' }, body: null });
  } finally { env.API_MONITOR_ENCRYPTION_KEY = oldKey; }
});
