/** Read-only Docker Engine API collector. Uses a named pipe on Windows and a Unix socket on Linux. */
import http from 'node:http';

const DEFAULT_SOCKET = process.platform === 'win32'
  ? '\\\\.\\pipe\\docker_engine'
  : '/var/run/docker.sock';

function dockerRequest(socketPath, path, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const request = http.request({ socketPath, path, method: 'GET', timeout: timeoutMs }, (response) => {
      let raw = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { raw += chunk; });
      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          const error = new Error(`Docker Engine returned HTTP ${response.statusCode}`);
          error.statusCode = response.statusCode;
          reject(error);
          return;
        }
        try { resolve(raw ? JSON.parse(raw) : null); }
        catch { reject(new Error('Docker Engine returned invalid JSON')); }
      });
    });
    request.on('timeout', () => request.destroy(new Error('Docker Engine request timed out')));
    request.on('error', reject);
    request.end();
  });
}

function normalizeContainer(summary, inspect) {
  const config = inspect?.Config || {};
  const state = inspect?.State || {};
  const networks = Object.entries(inspect?.NetworkSettings?.Networks || {}).map(([name, network]) => ({
    name,
    ipAddress: network.IPAddress || null,
    gateway: network.Gateway || null,
  }));
  const ports = (summary.Ports || []).map((port) => ({
    ip: port.IP || null,
    privatePort: port.PrivatePort,
    publicPort: port.PublicPort || null,
    type: port.Type,
  }));
  const mounts = (inspect?.Mounts || []).map((mount) => ({
    type: mount.Type,
    source: mount.Source || null,
    destination: mount.Destination,
    mode: mount.Mode || null,
    rw: mount.RW ?? null,
  }));
  const name = (summary.Names || []).find(Boolean)?.replace(/^\//, '') || summary.Id.slice(0, 12);
  return {
    containerId: summary.Id,
    name,
    image: config.Image || summary.Image || null,
    state: String(state.Status || summary.State || 'unknown').toLowerCase(),
    status: summary.Status || null,
    health: state.Health?.Status || null,
    createdAt: summary.Created ? new Date(summary.Created * 1000).toISOString() : null,
    startedAt: state.StartedAt && !state.StartedAt.startsWith('0001-') ? state.StartedAt : null,
    restartCount: Number(inspect?.RestartCount || 0),
    ports,
    networks,
    mounts,
  };
}

function statsValues(stats) {
  if (!stats) return null;
  const cpuDelta = (stats.cpu_stats?.cpu_usage?.total_usage ?? 0) - (stats.precpu_stats?.cpu_usage?.total_usage ?? 0);
  const systemDelta = (stats.cpu_stats?.system_cpu_usage ?? 0) - (stats.precpu_stats?.system_cpu_usage ?? 0);
  const cpuCount = stats.cpu_stats?.online_cpus || stats.cpu_stats?.cpu_usage?.percpu_usage?.length || 0;
  const cpuPercent = systemDelta > 0 && cpuDelta >= 0 && cpuCount > 0
    ? Number(((cpuDelta / systemDelta) * cpuCount * 100).toFixed(3))
    : null;
  const memoryUsage = stats.memory_stats?.usage;
  const memoryLimit = stats.memory_stats?.limit;
  const memoryCache = stats.memory_stats?.stats?.inactive_file ?? stats.memory_stats?.stats?.total_inactive_file ?? 0;
  const memoryUsageBytes = Number.isFinite(memoryUsage) ? Math.max(0, memoryUsage - memoryCache) : null;
  const networks = Object.values(stats.networks || {});
  const networkRxBytes = networks.length ? networks.reduce((sum, item) => sum + (item.rx_bytes || 0), 0) : null;
  const networkTxBytes = networks.length ? networks.reduce((sum, item) => sum + (item.tx_bytes || 0), 0) : null;
  const blocks = stats.blkio_stats?.io_service_bytes_recursive || [];
  const readBlocks = blocks.filter((item) => item.op?.toLowerCase() === 'read');
  const writeBlocks = blocks.filter((item) => item.op?.toLowerCase() === 'write');
  const blockReadBytes = readBlocks.length ? readBlocks.reduce((sum, item) => sum + (item.value || 0), 0) : null;
  const blockWriteBytes = writeBlocks.length ? writeBlocks.reduce((sum, item) => sum + (item.value || 0), 0) : null;
  return {
    cpuPercent,
    memoryUsageBytes,
    memoryLimitBytes: Number.isFinite(memoryLimit) ? memoryLimit : null,
    memoryPercent: memoryLimit > 0 && memoryUsageBytes != null ? Number(((memoryUsageBytes / memoryLimit) * 100).toFixed(3)) : null,
    networkRxBytes,
    networkTxBytes,
    blockReadBytes,
    blockWriteBytes,
  };
}

export function createDockerCollector({ socketPath = process.env.DOCKER_SOCKET || DEFAULT_SOCKET, timeoutMs = 8000, request = dockerRequest } = {}) {
  let cachedContainers = [];

  async function collect({ includeInventory = true } = {}) {
    const [version, imageList] = await Promise.all([
      request(socketPath, '/version', timeoutMs),
      request(socketPath, '/images/json', timeoutMs),
    ]);
    let inventory = null;
    if (includeInventory) {
      const summaries = await request(socketPath, '/containers/json?all=1', timeoutMs);
      const detailed = await Promise.all(summaries.map(async (summary) => {
        try {
          return normalizeContainer(summary, await request(socketPath, `/containers/${encodeURIComponent(summary.Id)}/json`, timeoutMs));
        } catch (error) {
          if (error.statusCode === 404) return null;
          // Summary data is still a valid inventory record if detailed inspect is temporarily unavailable.
          return normalizeContainer(summary, null);
        }
      }));
      cachedContainers = detailed.filter(Boolean);
      inventory = cachedContainers;
    }

    let statsUnavailableCount = 0;
    const metrics = await Promise.all(cachedContainers.map(async (container) => {
      try {
        const stats = await request(socketPath, `/containers/${encodeURIComponent(container.containerId)}/stats?stream=false`, timeoutMs);
        const values = statsValues(stats);
        return values ? { containerId: container.containerId, ...values } : null;
      } catch (error) {
        // Containers can exit or be removed between listing and stats. Their inventory remains valid.
        if (error.statusCode === 404) return null;
        statsUnavailableCount++;
        return null;
      }
    }));

    return {
      available: true,
      host: {
        engineVersion: version.Version || null,
        apiVersion: version.ApiVersion || null,
        os: version.Os || null,
        architecture: version.Arch || null,
      },
      containerCount: cachedContainers.length,
      runningCount: cachedContainers.filter((container) => container.state === 'running').length,
      stoppedCount: cachedContainers.filter((container) => container.state !== 'running').length,
      imageCount: imageList.length,
      statsUnavailableCount,
      ...(inventory !== null ? { containers: inventory } : {}),
      metrics: metrics.filter(Boolean),
      collectedAt: new Date().toISOString(),
    };
  }

  return { collect };
}

export { statsValues };
export default () => createDockerCollector().collect();
