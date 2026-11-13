import { getPublicOverview, listPublicServers } from '../services/overviewService.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { publicAlert, publicIncident, publicLog, publicServer } from '../utils/sanitize.js';
import { ok } from '../utils/response.js';

/** Returns { isDemo: true } in demo mode, {} in real mode (shows everything). */
function demoFilter() {
  return env.DEMO_MODE ? { OR: [{ isDemo: true }, { server: { isDemo: false, provider: 'AWS' } }] } : {};
}

export async function overviewHandler(req, res) {
  const range = typeof req.query.range === 'string' ? req.query.range : '24h';
  const data = await getPublicOverview(range);
  return ok(res, data);
}

export async function serversHandler(_req, res) {
  const data = await listPublicServers();
  return ok(res, data);
}

export async function alertsHandler(_req, res) {
  const alerts = await prisma.alert.findMany({
    where: demoFilter(),
    include: { server: true },
    orderBy: { triggeredAt: 'desc' },
    take: 50,
  });
  return ok(res, alerts.map(publicAlert));
}

export async function incidentsHandler(_req, res) {
  const incidents = await prisma.incident.findMany({
    // Real incidents are private unless an explicit publication workflow is added later.
    where: { OR: [{ isDemo: true }, { isPublic: true }] },
    include: { server: true, events: { orderBy: { createdAt: 'asc' } } },
    orderBy: { detectedAt: 'desc' },
    take: 50,
  });
  return ok(
    res,
    incidents.map((i) => ({
      ...publicIncident(i),
      events: i.events.filter((e)=>['DETECTED','CREATED','ACKNOWLEDGED','INVESTIGATING','RESOLVED','CLOSED','REOPENED'].includes(e.type)).map((e) => ({
        id: e.id,
        type: e.type,
        message: ({DETECTED:'Incident detected.',CREATED:'Incident created.',ACKNOWLEDGED:'Incident acknowledged.',INVESTIGATING:'Investigation started.',RESOLVED:'Incident resolved.',CLOSED:'Incident closed.',REOPENED:'Incident reopened.'})[e.type],
        createdAt: e.createdAt,
      })),
    })),
  );
}

export async function logsHandler(req, res) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
  const where = { ...demoFilter() };
  if (req.query.level) where.level = String(req.query.level).toUpperCase();

  const [total, logs] = await Promise.all([
    prisma.logEntry.count({ where }),
    prisma.logEntry.findMany({
      where,
      include: { server: true },
      orderBy: { collectedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return ok(res, logs.map(publicLog), { page, pageSize, total });
}

export async function deploymentsHandler(_req, res) {
  const deployments = await prisma.deployment.findMany({
    where: demoFilter(),
    orderBy: { deployedAt: 'desc' },
    take: 50,
  });
  return ok(
    res,
    deployments.map((d) => ({
      id: d.id,
      appName: d.appName,
      version: d.version,
      environment: d.environment,
      status: d.status.toLowerCase(),
      commitId: d.commitId,
      commitMessage: d.commitMessage,
      isDemo: d.isDemo,
      deployedAt: d.deployedAt,
    })),
  );
}

export async function apisHandler(_req, res) {
  const monitors = await prisma.apiMonitor.findMany({
    where: env.DEMO_MODE ? { isDemo: true } : { enabled: true },
    include: { checks: { orderBy: { checkedAt: 'desc' }, take: 1 } },
    orderBy: { name: 'asc' },
  });
  return ok(
    res,
    monitors.map((m) => ({
      id: m.id,
      name: m.name,
      method: m.method,
      targetHost: safeHost(m.url),
      enabled: m.enabled,
      isDemo: m.isDemo,
      lastCheck: m.checks[0]
        ? {
            statusCode: m.checks[0].statusCode,
            latencyMs: m.checks[0].latencyMs,
            success: m.checks[0].success,
            checkedAt: m.checks[0].checkedAt,
          }
        : null,
    })),
  );
}

export async function dockerHandler(_req, res) {
  const where = env.DEMO_MODE
    ? { server: { isDemo: true } }
    : {};
  const containers = await prisma.dockerContainer.findMany({
    where,
    include: { server: { select: { id: true, name: true, hostname: true, isDemo: true } } },
    orderBy: { syncedAt: 'desc' },
  });
  return ok(res, containers.map((c) => ({
    id: c.id,
    containerId: c.containerId,
    name: c.name,
    image: c.image,
    state: c.state,
    health: c.health,
    cpuPercent: c.cpuPercent,
    memUsageMb: c.memUsageMb,
    restartCount: c.restartCount,
    startedAt: c.startedAt,
    syncedAt: c.syncedAt,
    server: c.server,
    isDemo: c.server?.isDemo ?? false,
  })));
}

export async function networkHandler(_req, res) {
  const servers = await prisma.server.findMany({
    where: env.DEMO_MODE
      ? { OR: [{ isDemo: true }, { isDemo: false, provider: 'AWS' }] }
      : {},
  });
  const ids = servers.map((s) => s.id);
  if (!ids.length) return ok(res, []);

  const [inSamples, outSamples] = await Promise.all([
    prisma.metricSample.findMany({
      where: { serverId: { in: ids }, kind: 'NET_IN' },
      orderBy: { collectedAt: 'desc' },
      distinct: ['serverId'],
    }),
    prisma.metricSample.findMany({
      where: { serverId: { in: ids }, kind: 'NET_OUT' },
      orderBy: { collectedAt: 'desc' },
      distinct: ['serverId'],
    }),
  ]);
  const inMap = new Map(inSamples.map((s) => [s.serverId, { value: s.value, collectedAt: s.collectedAt }]));
  const outMap = new Map(outSamples.map((s) => [s.serverId, { value: s.value, collectedAt: s.collectedAt }]));

  return ok(res, servers.map((s) => ({
    id: s.id,
    name: s.name,
    hostname: s.hostname,
    environment: s.environment,
    region: s.region,
    netIn: inMap.get(s.id)?.value ?? null,
    netOut: outMap.get(s.id)?.value ?? null,
    lastSampleAt: inMap.get(s.id)?.collectedAt ?? null,
    isDemo: s.isDemo,
  })));
}

export async function costsHandler(_req, res) {
  const costs = await prisma.infrastructureCost.findMany({
    where: demoFilter(),
    include: { server: { select: { id: true, name: true, environment: true } } },
    orderBy: { periodStart: 'desc' },
  });
  return ok(res, costs.map((c) => ({
    id: c.id,
    server: c.server ? { id: c.server.id, name: c.server.name, environment: c.server.environment } : null,
    periodStart: c.periodStart,
    periodEnd: c.periodEnd,
    amountUsd: c.amountUsd,
    source: c.source,
    breakdown: c.breakdown,
    isDemo: c.isDemo,
  })));
}

export async function domainsHandler(_req, res) {
  const domains = await prisma.domainMonitor.findMany({
    where: env.DEMO_MODE ? { isDemo: true } : { enabled: true },
    orderBy: { domain: 'asc' },
  });
  return ok(res, domains.map((d) => ({
    id: d.id,
    domain: d.domain,
    enabled: d.enabled,
    lastStatus: d.lastStatus,
    sslExpiresAt: d.sslExpiresAt,
    hostnameMatch: d.hostnameMatch,
    httpStatus: d.httpStatus,
    checkedAt: d.checkedAt,
    isDemo: d.isDemo,
  })));
}

function safeHost(url) {
  try { return new URL(url).host; } catch { return 'unknown'; }
}
