import test from 'node:test';
import assert from 'node:assert/strict';
import { dockerSyncSchema } from '../src/validators/agentValidators.js';

const metric = {
  containerId: 'container-a',
  cpuPercent: 1.25,
  memoryUsageBytes: 1024,
  memoryLimitBytes: 4096,
  memoryPercent: 25,
  networkRxBytes: 50,
  networkTxBytes: 75,
  blockReadBytes: null,
  blockWriteBytes: 0,
};

test('Docker ingestion accepts metrics-only reports with inventory omitted', () => {
  const result = dockerSyncSchema.safeParse({
    available: true,
    collectedAt: new Date().toISOString(),
    host: { engineVersion: '29.9.1', apiVersion: '1.56' },
    containerCount: 1,
    runningCount: 1,
    stoppedCount: 0,
    imageCount: 2,
    metrics: [metric],
  });
  assert.equal(result.success, true);
});

test('Docker ingestion rejects null inventory instead of confusing it with empty inventory', () => {
  const result = dockerSyncSchema.safeParse({
    available: true,
    collectedAt: new Date().toISOString(),
    host: {},
    containers: null,
    metrics: [metric],
  });
  assert.equal(result.success, false);
});

test('Docker ingestion distinguishes an empty complete inventory from unavailable Docker', () => {
  const empty = dockerSyncSchema.safeParse({ available: true, collectedAt: new Date().toISOString(), host: {}, containers: [], metrics: [] });
  const unavailable = dockerSyncSchema.safeParse({ available: false, dockerError: 'DOCKER_ENGINE_UNAVAILABLE', collectedAt: new Date().toISOString() });
  assert.equal(empty.success, true);
  assert.equal(unavailable.success, true);
});
