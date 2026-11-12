import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { publicAlert, publicIncident, publicServer } from '../utils/sanitize.js';

const STALE_MS = env.AGENT_HEARTBEAT_STALE_SEC * 1000;

function statusKey(status) {
  return String(status || '').toLowerCase();
}

function serverDataStatus(server) {
  const lastSeenAt = server.provider === 'AWS' ? server.awsSyncedAt : server.lastHeartbeatAt;
  if (!lastSeenAt) return 'unavailable';
  const age = Date.now() - new Date(lastSeenAt).getTime();
  const staleAfterMs = server.provider === 'AWS'
    ? Math.max(STALE_MS * 2, env.AWS_SYNC_INTERVAL_MINUTES * 60_000 * 2)
    : STALE_MS * 2;
  if (age > staleAfterMs) return 'stale';
  return 'live';
}

async function latestMetricMap(serverIds, kind) {
  if (!serverIds.length) return new Map();
  const samples = await prisma.metricSample.findMany({
    where: { serverId: { in: serverIds }, kind },
    orderBy: { collectedAt: 'desc' },
    distinct: ['serverId'],
  });
  return new Map(samples.map((s) => [s.serverId, { value: s.value, collectedAt: s.collectedAt }]));
}

/** Build the server filter based on DEMO_MODE */
async function serverFilter() {
  if (!env.DEMO_MODE) return {};
  const hasAwsServers = await prisma.server.count({ where: { isDemo: false, provider: 'AWS' } });
  return hasAwsServers ? { isDemo: false, provider: 'AWS' } : { isDemo: true };
}

export async function getPublicOverview(range = '24h') {
  const servers = await prisma.server.findMany({
    where: await serverFilter(),
    orderBy: { name: 'asc' },
  });
  const serverIds = servers.map((s) => s.id);

  const [cpuMap, memMap, diskMap] = await Promise.all([
    latestMetricMap(serverIds, 'CPU'),
    latestMetricMap(serverIds, 'MEM'),
    latestMetricMap(serverIds, 'DISK'),
  ]);

  const enriched = servers.map((server) => {
    const dataStatus = server.isDemo ? 'demo' : serverDataStatus(server);
    return {
      ...publicServer(server),
      status: statusKey(server.status),
      cpu: cpuMap.get(server.id)?.value ?? null,
      memory: memMap.get(server.id)?.value ?? null,
      disk: diskMap.get(server.id)?.value ?? null,
      dataStatus,
    };
  });

  const healthy = enriched.filter((s) => s.status === 'healthy').length;
  const warning = enriched.filter((s) => s.status === 'warning').length;
  const critical = enriched.filter((s) => s.status === 'critical').length;
  const offline = enriched.filter((s) => s.status === 'offline').length;

  const cpuValues = enriched
    .filter((s) => s.dataStatus !== 'unavailable' && typeof s.cpu === 'number')
    .map((s) => s.cpu);
  const memValues = enriched
    .filter((s) => s.dataStatus !== 'unavailable' && typeof s.memory === 'number')
    .map((s) => s.memory);

  const alertFilter = env.DEMO_MODE ? { isDemo: true } : {};
  const incidentFilter = env.DEMO_MODE
    ? { isDemo: true }
    : {};

  const activeIncidents = await prisma.incident.count({
    where: {
      ...incidentFilter,
      status: { in: ['DETECTED', 'OPEN', 'ACKNOWLEDGED', 'INVESTIGATING'] },
    },
  });

  const monitoredApps = await prisma.apiMonitor.count({
    where: env.DEMO_MODE ? { isDemo: true } : { enabled: true },
  });

  const [alerts, incidents, deployments, apis, activity, metrics] = await Promise.all([
    prisma.alert.findMany({
      where: alertFilter,
      include: { server: true },
      orderBy: { triggeredAt: 'desc' },
      take: 10,
    }),
    prisma.incident.findMany({
      where: incidentFilter,
      include: { server: true },
      orderBy: { detectedAt: 'desc' },
      take: 10,
    }),
    prisma.deployment.findMany({
      where: env.DEMO_MODE ? { isDemo: true } : {},
      orderBy: { deployedAt: 'desc' },
      take: 5,
    }),
    prisma.apiMonitor.findMany({
      where: env.DEMO_MODE ? { isDemo: true } : { enabled: true },
      include: { checks: { orderBy: { checkedAt: 'desc' }, take: 20 } },
      orderBy: { name: 'asc' },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    getMetricSeries(serverIds, range),
  ]);

  const apiUptime = apis.map((api) => {
    const checks = api.checks;
    const success = checks.filter((c) => c.success).length;
    const uptime = checks.length ? Number(((success / checks.length) * 100).toFixed(2)) : null;
    const latency =
      checks.length > 0
        ? Math.round(checks.reduce((sum, c) => sum + (c.latencyMs || 0), 0) / checks.length)
        : null;
    return {
      name: api.name,
      uptime,
      latency,
      isDemo: api.isDemo,
      lastCheckedAt: checks[0]?.checkedAt ?? null,
    };
  });

  const severityCounts = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((name) => ({
    name: name.charAt(0) + name.slice(1).toLowerCase(),
    value: incidents.filter((i) => i.severity === name).length,
    fill:
      name === 'CRITICAL'
        ? '#fb7185'
        : name === 'HIGH'
          ? '#f87171'
          : name === 'MEDIUM'
            ? '#fbbf24'
            : '#38bdf8',
  }));

  return {
    isDemo: servers.length === 0 || servers.every((server) => server.isDemo),
    range,
    summary: {
      isDemo: servers.length === 0 || servers.every((server) => server.isDemo),
      totalServers: enriched.length,
      realServers: enriched.filter((s) => !s.isDemo).length,
      healthyServers: healthy,
      warningServers: warning,
      criticalServers: critical,
      offlineServers: offline,
      activeIncidents,
      avgCpu: cpuValues.length
        ? Number((cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length).toFixed(1))
        : null,
      avgMemory: memValues.length
        ? Number((memValues.reduce((a, b) => a + b, 0) / memValues.length).toFixed(1))
        : null,
      monitoredApps,
    },
    servers: enriched,
    metrics,
    alerts: alerts.map(publicAlert).map((a) => ({
      ...a,
      server: a.server?.name ?? 'Unknown',
      triggeredAt: a.triggeredAt,
    })),
    incidents: incidents.map((i) => ({
      ...publicIncident(i),
      id: i.publicId,
      server: i.server?.name ?? 'Unknown',
      openedAt: i.detectedAt,
    })),
    deployments: deployments.map((d) => ({
      id: d.id,
      app: d.appName,
      version: d.version,
      environment: d.environment,
      status: d.status.toLowerCase(),
      deployedAt: d.deployedAt,
      isDemo: d.isDemo,
    })),
    apiUptime,
    incidentSeverity: severityCounts,
    activity: activity.map((item) => ({
      id: item.id,
      text: `${item.action.replaceAll('_', ' ').toLowerCase()} · ${item.resourceType}`,
      time: item.createdAt,
    })),
  };
}

function rangeToWindow(range) {
  const now = Date.now();
  const map = {
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
  };
  const ms = map[range] ?? map['24h'];
  return { from: new Date(now - ms), to: new Date(now) };
}

async function getMetricSeries(serverIds, range) {
  if (!serverIds.length) return emptyMetrics();

  const { from, to } = rangeToWindow(range);
  const samples = await prisma.metricSample.findMany({
    where: {
      serverId: { in: serverIds },
      collectedAt: { gte: from, lte: to },
      kind: { in: ['CPU', 'MEM', 'DISK', 'NET_IN', 'NET_OUT'] },
    },
    orderBy: { collectedAt: 'asc' },
  });

  if (!samples.length) return emptyMetrics();

  const bucketMs =
    range === '7d' ? 60 * 60 * 1000 : range === '24h' ? 30 * 60 * 1000 : 5 * 60 * 1000;
  const buckets = new Map();

  for (const sample of samples) {
    const bucket = Math.floor(sample.collectedAt.getTime() / bucketMs) * bucketMs;
    if (!buckets.has(bucket)) {
      buckets.set(bucket, { t: new Date(bucket).toISOString(), CPU: [], MEM: [], DISK: [], NET_IN: [], NET_OUT: [] });
    }
    const value = sample.meta?.source === 'cloudwatch' && sample.kind.startsWith('NET_')
      ? sample.value / 300 / 1_000_000
      : sample.value;
    buckets.get(bucket)[sample.kind].push(value);
  }

  const avg = (arr) =>
    arr.length ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)) : null;

  const rows = [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ts, row]) => {
      const label = new Date(ts).toLocaleString([], {
        month: range === '7d' ? 'short' : undefined,
        day: range === '7d' ? 'numeric' : undefined,
        hour: '2-digit',
        minute: '2-digit',
      });
      return {
        t: row.t,
        label,
        cpu: avg(row.CPU),
        memory: avg(row.MEM),
        disk: avg(row.DISK),
        networkIn: avg(row.NET_IN),
        networkOut: avg(row.NET_OUT),
      };
    });

  const alertFrequency = await getAlertFrequency();

  return {
    cpu: rows.map((r) => ({ t: r.t, label: r.label, value: r.cpu })),
    memory: rows.map((r) => ({ t: r.t, label: r.label, value: r.memory })),
    disk: rows.map((r) => ({ t: r.t, label: r.label, value: r.disk })),
    networkIn: rows.map((r) => ({ t: r.t, label: r.label, value: r.networkIn })),
    networkOut: rows.map((r) => ({ t: r.t, label: r.label, value: r.networkOut })),
    alertFrequency,
  };
}

async function getAlertFrequency() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const where = env.DEMO_MODE
    ? { isDemo: true, triggeredAt: { gte: since } }
    : { triggeredAt: { gte: since } };
  const alerts = await prisma.alert.findMany({ where, select: { triggeredAt: true } });
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const counts = Object.fromEntries(days.map((d) => [d, 0]));
  for (const alert of alerts) {
    counts[days[alert.triggeredAt.getDay()]] += 1;
  }
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => ({
    label,
    value: counts[label],
  }));
}

function emptyMetrics() {
  return { cpu: [], memory: [], disk: [], networkIn: [], networkOut: [], alertFrequency: [] };
}

export async function listPublicServers() {
  const servers = await prisma.server.findMany({
    where: await serverFilter(),
    orderBy: [{ isDemo: 'asc' }, { name: 'asc' }],
  });
  const ids = servers.map((s) => s.id);
  const [cpuMap, memMap, diskMap] = await Promise.all([
    latestMetricMap(ids, 'CPU'),
    latestMetricMap(ids, 'MEM'),
    latestMetricMap(ids, 'DISK'),
  ]);
  return servers.map((server) => {
    const dataStatus = server.isDemo ? 'demo' : serverDataStatus(server);
    return publicServer({
      ...server,
      status: statusKey(server.status),
      cpu: cpuMap.get(server.id)?.value ?? null,
      memory: memMap.get(server.id)?.value ?? null,
      disk: diskMap.get(server.id)?.value ?? null,
      dataStatus,
    });
  });
}
