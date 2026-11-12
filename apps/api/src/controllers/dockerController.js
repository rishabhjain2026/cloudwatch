import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { ok, fail } from '../utils/response.js';

const staleMs = env.AGENT_HEARTBEAT_STALE_SEC * 2000;
const toJsonNumbers = (value) => {
  if (typeof value === 'bigint') return Number(value);
  if (Array.isArray(value)) return value.map(toJsonNumbers);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toJsonNumbers(item)]));
  }
  return value;
};
const hostSelect = {
  id: true, name: true, hostname: true, os: true, environment: true, provider: true, region: true,
  awsInstanceId: true, dockerAvailable: true, dockerEngineVersion: true, dockerApiVersion: true,
  dockerRunningContainers: true, dockerStoppedContainers: true, dockerTotalContainers: true,
  dockerImageCount: true, lastHeartbeatAt: true,
  agent: { select: { lastSeenAt: true } },
  metrics: {
    where: { kind: { in: ['CPU', 'MEM'] } },
    orderBy: { collectedAt: 'desc' },
    distinct: ['kind'],
    select: { kind: true, value: true, unit: true, collectedAt: true },
  },
};

function hostView(server) {
  const lastHeartbeatAt = server.agent?.lastSeenAt || server.lastHeartbeatAt;
  const ageMs = lastHeartbeatAt ? Date.now() - new Date(lastHeartbeatAt).getTime() : Infinity;
  return {
    id: server.id,
    name: server.name,
    hostname: server.hostname,
    os: server.os,
    environment: server.environment,
    hostType: server.provider === 'AWS' ? 'AWS EC2' : /windows/i.test(server.os || '') ? 'Local Windows' : 'Linux / self-hosted',
    provider: server.provider,
    region: server.region,
    awsInstanceId: server.awsInstanceId,
    dockerAvailable: server.dockerAvailable,
    agentStatus: ageMs <= staleMs ? 'online' : 'offline',
    lastHeartbeatAt,
    dockerEngineVersion: server.dockerEngineVersion,
    dockerApiVersion: server.dockerApiVersion,
    runningContainers: server.dockerRunningContainers,
    stoppedContainers: server.dockerStoppedContainers,
    totalContainers: server.dockerTotalContainers,
    imageCount: server.dockerImageCount,
    cpuPercent: server.metrics?.find((metric) => metric.kind === 'CPU')?.value ?? null,
    memoryPercent: server.metrics?.find((metric) => metric.kind === 'MEM')?.value ?? null,
  };
}

function containerView(container, { detail = false } = {}) {
  const { raw, metrics, server, ...row } = container;
  const mounts = Array.isArray(container.mounts)
    ? container.mounts.map((mount) => Object.fromEntries(Object.entries(mount).filter(([key]) => key !== 'source')))
    : [];
  return toJsonNumbers({
    ...row,
    state: container.missingSince ? 'missing' : container.state,
    mounts,
    ports: Array.isArray(container.ports) ? container.ports.map(({ privatePort, publicPort, type }) => ({ privatePort, publicPort, type })) : [],
    networks: Array.isArray(container.networks) ? container.networks.map(({ name }) => ({ name })) : [],
    server: server ? hostView(server) : undefined,
    ...(detail ? { metrics: metrics?.map(toJsonNumbers) || [] } : {}),
  });
}

export async function dockerOverviewHandler(req, res) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 50));
  const where = { server: { isDemo: false, dockerEnabled: true } };
  if (req.query.hostId) where.serverId = String(req.query.hostId).slice(0, 64);
  if (req.query.state) {
    const state = String(req.query.state).toLowerCase();
    if (state === 'missing') where.missingSince = { not: null };
    else where.state = state;
  }
  const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { containerId: { contains: search, mode: 'insensitive' } },
      { image: { contains: search, mode: 'insensitive' } },
      { server: { hostname: { contains: search, mode: 'insensitive' }, isDemo: false, dockerEnabled: true } },
    ];
  }
  const allContainersWhere = { server: { isDemo: false, dockerEnabled: true }, missingSince: null };
  const [hosts, total, containers, allContainers, allRunning, allStopped] = await Promise.all([
    prisma.server.findMany({ where: { isDemo: false, dockerEnabled: true }, select: hostSelect, orderBy: { name: 'asc' } }),
    prisma.dockerContainer.count({ where }),
    prisma.dockerContainer.findMany({
      where,
      include: { server: { select: hostSelect } },
      orderBy: [{ missingSince: 'asc' }, { syncedAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.dockerContainer.count({ where: allContainersWhere }),
    prisma.dockerContainer.count({ where: { ...allContainersWhere, state: 'running' } }),
    prisma.dockerContainer.count({ where: { ...allContainersWhere, state: { in: ['exited', 'created', 'paused', 'restarting', 'dead'] } } }),
  ]);
  const hostRows = hosts.map(hostView);
  const onlineHosts = hostRows.filter((host) => host.agentStatus === 'online').length;
  return ok(res, {
    summary: {
      totalHosts: hostRows.length,
      onlineHosts,
      offlineHosts: hostRows.length - onlineHosts,
      totalContainers: allContainers,
      runningContainers: allRunning,
      stoppedContainers: allStopped,
      totalImages: hostRows.reduce((sum, host) => sum + (host.imageCount ?? 0), 0),
    },
    hosts: hostRows,
    containers: containers.map((container) => containerView(container)),
  }, { page, pageSize, total, pages: Math.ceil(total / pageSize) });
}

export async function dockerContainerDetailHandler(req, res) {
  const container = await prisma.dockerContainer.findFirst({
    where: { id: req.params.id, server: { isDemo: false, dockerEnabled: true } },
    include: {
      server: { select: hostSelect },
      metrics: { orderBy: { collectedAt: 'desc' }, take: 120 },
    },
  });
  if (!container) return fail(res, 404, 'NOT_FOUND', 'Docker container not found');
  return ok(res, containerView({ ...container, metrics: container.metrics.reverse() }, { detail: true }));
}
