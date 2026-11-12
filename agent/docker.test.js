import test from 'node:test';
import assert from 'node:assert/strict';
import { createDockerCollector, statsValues } from './docker.js';

const stats = {
  cpu_stats: { cpu_usage: { total_usage: 30, percpu_usage: [1, 2] }, system_cpu_usage: 300, online_cpus: 2 },
  precpu_stats: { cpu_usage: { total_usage: 10 }, system_cpu_usage: 200 },
  memory_stats: { usage: 80, limit: 100, stats: { inactive_file: 20 } },
  networks: { eth0: { rx_bytes: 10, tx_bytes: 20 }, eth1: { rx_bytes: 5, tx_bytes: 7 } },
  blkio_stats: { io_service_bytes_recursive: [{ op: 'Read', value: 40 }, { op: 'Write', value: 50 }] },
};

test('Docker stats use real engine counters and preserve unavailable block metrics', () => {
  assert.deepEqual(statsValues(stats), {
    cpuPercent: 40,
    memoryUsageBytes: 60,
    memoryLimitBytes: 100,
    memoryPercent: 60,
    networkRxBytes: 15,
    networkTxBytes: 27,
    blockReadBytes: 40,
    blockWriteBytes: 50,
  });
  assert.equal(statsValues({ ...stats, blkio_stats: { io_service_bytes_recursive: [] } }).blockReadBytes, null);
});

test('collector reads Docker Engine version, complete container inventory, images, and stats', async () => {
  const calls = [];
  const request = async (_socket, path) => {
    calls.push(path);
    if (path === '/version') return { Version: '27.1.0', ApiVersion: '1.47', Os: 'linux', Arch: 'amd64' };
    if (path === '/images/json') return [{ Id: 'sha256:image1' }, { Id: 'sha256:image2' }];
    if (path === '/containers/json?all=1') return [{ Id: 'abc123', Names: ['/web'], Image: 'nginx:1.27', State: 'running', Status: 'Up 4 minutes', Created: 100 }];
    if (path === '/containers/abc123/json') return {
      Config: { Image: 'nginx:1.27' },
      State: { Status: 'running', StartedAt: '2026-01-01T00:00:00.000Z', Health: { Status: 'healthy' } },
      RestartCount: 2,
      NetworkSettings: { Networks: { bridge: { IPAddress: '172.17.0.2', Gateway: '172.17.0.1' } } },
      Mounts: [{ Type: 'volume', Source: '/private/docker/volume', Destination: '/data', Mode: 'rw', RW: true }],
    };
    if (path === '/containers/abc123/stats?stream=false') return stats;
    throw new Error(`Unexpected Docker request: ${path}`);
  };
  const collector = createDockerCollector({ socketPath: 'pipe', request });
  const result = await collector.collect();
  assert.equal(result.available, true);
  assert.equal(result.host.engineVersion, '27.1.0');
  assert.equal(result.imageCount, 2);
  assert.equal(result.containerCount, 1);
  assert.equal(result.runningCount, 1);
  assert.equal(result.containers[0].name, 'web');
  assert.equal(result.containers[0].restartCount, 2);
  assert.equal(result.containers[0].mounts[0].source, '/private/docker/volume');
  assert.equal(result.metrics[0].networkRxBytes, 15);
  assert.ok(calls.includes('/containers/json?all=1'));
});

test('inventory can be refreshed on a separate interval while metrics use cached identities', async () => {
  let includeCalls = 0;
  const request = async (_socket, path) => {
    if (path === '/version') return { Version: '27.1.0', ApiVersion: '1.47' };
    if (path === '/images/json') return [];
    if (path === '/containers/json?all=1') { includeCalls++; return [{ Id: 'abc123', Names: ['/db'], Image: 'postgres:16', State: 'running', Created: 100 }]; }
    if (path === '/containers/abc123/json') return { Config: { Image: 'postgres:16' }, State: { Status: 'running' }, RestartCount: 0 };
    if (path === '/containers/abc123/stats?stream=false') return stats;
    throw new Error(`Unexpected Docker request: ${path}`);
  };
  const collector = createDockerCollector({ socketPath: 'pipe', request });
  await collector.collect({ includeInventory: true });
  const metricsOnly = await collector.collect({ includeInventory: false });
  assert.equal(includeCalls, 1);
  assert.equal(Object.hasOwn(metricsOnly, 'containers'), false);
  assert.equal(metricsOnly.metrics.length, 1);
});

test('removed containers between inventory and inspect/stats do not break collection', async () => {
  const request = async (_socket, path) => {
    if (path === '/version') return { Version: '27.1.0', ApiVersion: '1.47' };
    if (path === '/images/json') return [];
    if (path === '/containers/json?all=1') return [{ Id: 'gone', Names: ['/gone'], Image: 'busybox', State: 'running', Created: 100 }];
    const error = new Error('not found');
    error.statusCode = 404;
    throw error;
  };
  const collector = createDockerCollector({ socketPath: 'pipe', request });
  const result = await collector.collect();
  assert.deepEqual(result.containers, []);
  assert.deepEqual(result.metrics, []);
  assert.equal(result.available, true);
});

test('a failed stats request leaves Docker availability healthy and omits the missing metric', async () => {
  const request = async (_socket, path) => {
    if (path === '/version') return { Version: '27.1.0', ApiVersion: '1.47' };
    if (path === '/images/json') return [];
    if (path === '/containers/json?all=1') return [{ Id: 'abc123', Names: ['/web'], Image: 'nginx', State: 'running', Created: 100 }];
    if (path === '/containers/abc123/json') return { Config: { Image: 'nginx' }, State: { Status: 'running' }, RestartCount: 0 };
    const error = new Error('temporary Docker stats error');
    error.statusCode = 500;
    throw error;
  };
  const collector = createDockerCollector({ socketPath: 'pipe', request });
  const result = await collector.collect();
  assert.equal(result.available, true);
  assert.equal(result.containerCount, 1);
  assert.deepEqual(result.metrics, []);
  assert.equal(result.statsUnavailableCount, 1);
});
