import { prisma } from '../lib/prisma.js';
import { createAgentToken } from '../utils/crypto.js';
import { evaluateAlerts } from './alertService.js';

/**
 * Register a new server + agent. Returns the raw token (shown once only).
 */
export async function registerAgent({ hostname, os, name, environment, region, provider, awsInstanceId }) {
  const { raw, prefix, hash } = createAgentToken();
  let server;
  if (awsInstanceId) {
    const existing = await prisma.server.findUnique({ where: { awsInstanceId }, include: { agent: true } });
    if (existing?.agent) {
      const error = new Error('This EC2 instance already has a registered InfraPulse agent.');
      error.status = 409;
      error.code = 'AGENT_ALREADY_REGISTERED';
      throw error;
    }
    server = existing
      ? await prisma.server.update({
          where: { id: existing.id },
          data: { hostname, os: os || existing.os, ...(name ? { name } : {}), agent: { create: { tokenHash: hash, tokenPrefix: prefix, status: 'ACTIVE' } } },
          include: { agent: true },
        })
      : await prisma.server.create({
          data: {
            name: name || hostname,
            hostname,
            os,
            environment: environment || 'production',
            region,
            provider: provider || 'AWS',
            awsInstanceId,
            status: 'UNKNOWN',
            isDemo: false,
            lastHeartbeatAt: new Date(),
            agent: { create: { tokenHash: hash, tokenPrefix: prefix, status: 'ACTIVE' } },
          },
          include: { agent: true },
        });
  } else {
    server = await prisma.server.create({
      data: {
      name: name || hostname,
      hostname,
      os,
      environment: environment || 'production',
      region,
      provider,
      status: 'UNKNOWN',
      isDemo: false,
      lastHeartbeatAt: new Date(),
      agent: {
        create: {
          tokenHash: hash,
          tokenPrefix: prefix,
          status: 'ACTIVE',
        },
      },
      },
      include: { agent: true },
    });
  }

  return {
    serverId: server.id,
    agentId: server.agent.id,
    token: raw, // returned once — never stored in plaintext
  };
}

/**
 * Update heartbeat timestamp and optional system info.
 */
export async function recordHeartbeat(agentId, serverId, { uptime, loadAvg, os }) {
  const now = new Date();

  await Promise.all([
    prisma.agent.update({
      where: { id: agentId },
      data: { lastSeenAt: now },
    }),
    prisma.server.update({
      where: { id: serverId },
      data: {
        lastHeartbeatAt: now,
        status: 'HEALTHY',
        ...(os ? { os } : {}),
      },
    }),
  ]);

  return { lastSeenAt: now };
}

/**
 * Ingest a metric payload from the agent.
 * Stores MetricSample rows and triggers alert evaluation.
 */
export async function ingestMetrics(serverId, payload) {
  const collectedAt = payload.collectedAt ? new Date(payload.collectedAt) : new Date();
  const rows = [];

  if (payload.cpu?.usagePercent != null) {
    rows.push({ serverId, kind: 'CPU', value: payload.cpu.usagePercent, unit: '%', collectedAt });
  }
  if (payload.memory?.usagePercent != null) {
    rows.push({ serverId, kind: 'MEM', value: payload.memory.usagePercent, unit: '%', collectedAt });
  }
  if (payload.disk?.usagePercent != null) {
    rows.push({ serverId, kind: 'DISK', value: payload.disk.usagePercent, unit: '%', collectedAt });
  }
  if (payload.network?.rxThroughputBps != null) {
    const rxMbps = payload.network.rxThroughputBps / 1_000_000;
    rows.push({ serverId, kind: 'NET_IN', value: Number(rxMbps.toFixed(4)), unit: 'MB/s', collectedAt });
  }
  if (payload.network?.txThroughputBps != null) {
    const txMbps = payload.network.txThroughputBps / 1_000_000;
    rows.push({ serverId, kind: 'NET_OUT', value: Number(txMbps.toFixed(4)), unit: 'MB/s', collectedAt });
  }
  if (payload.load?.avg1 != null) {
    rows.push({ serverId, kind: 'LOAD', value: payload.load.avg1, unit: '', collectedAt });
  }

  if (rows.length > 0) {
    await prisma.metricSample.createMany({ data: rows });
  }

  // Update server heartbeat and status
  await prisma.server.update({
    where: { id: serverId },
    data: { lastHeartbeatAt: collectedAt, status: 'HEALTHY' },
  });

  // Evaluate alert rules against the new readings (non-blocking)
  const metricValues = {};
  if (payload.cpu?.usagePercent != null) metricValues.CPU = payload.cpu.usagePercent;
  if (payload.memory?.usagePercent != null) metricValues.MEM = payload.memory.usagePercent;
  if (payload.disk?.usagePercent != null) metricValues.DISK = payload.disk.usagePercent;

  if (Object.keys(metricValues).length > 0) {
    evaluateAlerts(serverId, metricValues).catch((err) =>
      console.error('[alert-eval] error:', err.message),
    );
  }

  return { stored: rows.length };
}

/**
 * Sync Docker container list from the agent.
 */
export async function syncDockerContainers(serverId, payload) {
  const now = payload.collectedAt ? new Date(payload.collectedAt) : new Date();
  const counts = new Map();
  let upserted = 0;

  await prisma.server.update({
    where: { id: serverId },
    data: {
      dockerEnabled: true,
      dockerAvailable: payload.available,
      ...(payload.available ? {
        dockerEngineVersion: payload.host?.engineVersion ?? null,
        dockerApiVersion: payload.host?.apiVersion ?? null,
        dockerRunningContainers: payload.runningCount ?? 0,
        dockerStoppedContainers: payload.stoppedCount ?? 0,
        dockerTotalContainers: payload.containerCount ?? 0,
        dockerImageCount: payload.imageCount ?? 0,
      } : {}),
    },
  });

  await prisma.dockerAgentHeartbeat.create({ data: {
    serverId,
    dockerAvailable: payload.available,
    dockerError: payload.available ? null : payload.dockerError || 'DOCKER_ENGINE_UNAVAILABLE',
    engineVersion: payload.host?.engineVersion ?? null,
    apiVersion: payload.host?.apiVersion ?? null,
    containerCount: payload.containerCount ?? null,
    imageCount: payload.imageCount ?? null,
    receivedAt: now,
  } });

  if (!payload.available) return { available: false, upserted: 0, metricsStored: 0 };

  for (const c of payload.containers || []) {
    const current = {
      name: c.name,
      image: c.image ?? null,
      state: c.state,
      health: c.health ?? null,
      restartCount: c.restartCount ?? 0,
      startedAt: c.startedAt ? new Date(c.startedAt) : null,
      createdAtDocker: c.createdAt ? new Date(c.createdAt) : null,
      ports: c.ports ?? [],
      networks: c.networks ?? [],
      mounts: c.mounts ?? [],
      syncedAt: now,
      lastSeenAt: now,
      missingSince: null,
    };
    const row = await prisma.dockerContainer.upsert({
      where: { serverId_containerId: { serverId, containerId: c.containerId } },
      create: {
        serverId,
        containerId: c.containerId,
        ...current,
      },
      update: current,
    });
    counts.set(c.containerId, row.id);
    upserted++;
  }

  // A full successful inventory marks absent records stale without deleting or changing their last known state.
  if (Array.isArray(payload.containers)) {
    const activeIds = payload.containers.map((c) => c.containerId);
    await prisma.dockerContainer.updateMany({
      where: {
        serverId,
        ...(activeIds.length ? { containerId: { notIn: activeIds } } : {}),
        missingSince: null,
      },
      data: { missingSince: now },
    });
  }

  let metricsStored = 0;
  for (const metric of payload.metrics || []) {
    const containerDbId = counts.get(metric.containerId) || (await prisma.dockerContainer.findUnique({ where: { serverId_containerId: { serverId, containerId: metric.containerId } }, select: { id: true } }))?.id;
    if (!containerDbId) continue;
    const values = {
      cpuPercent: metric.cpuPercent ?? null,
      memoryUsageBytes: metric.memoryUsageBytes == null ? null : BigInt(Math.trunc(metric.memoryUsageBytes)),
      memoryLimitBytes: metric.memoryLimitBytes == null ? null : BigInt(Math.trunc(metric.memoryLimitBytes)),
      memoryPercent: metric.memoryPercent ?? null,
      networkRxBytes: metric.networkRxBytes == null ? null : BigInt(Math.trunc(metric.networkRxBytes)),
      networkTxBytes: metric.networkTxBytes == null ? null : BigInt(Math.trunc(metric.networkTxBytes)),
      blockReadBytes: metric.blockReadBytes == null ? null : BigInt(Math.trunc(metric.blockReadBytes)),
      blockWriteBytes: metric.blockWriteBytes == null ? null : BigInt(Math.trunc(metric.blockWriteBytes)),
    };
    if (Object.values(values).every((value) => value == null)) continue;
    await prisma.dockerContainerMetric.create({ data: { containerDbId, collectedAt: now, ...values } });
    await prisma.dockerContainer.update({
      where: { id: containerDbId },
      data: {
        ...(metric.cpuPercent != null ? { cpuPercent: metric.cpuPercent } : {}),
        ...(metric.memoryUsageBytes != null ? {
          memUsageMb: metric.memoryUsageBytes / 1024 / 1024,
          memoryUsageBytes: BigInt(Math.trunc(metric.memoryUsageBytes)),
        } : {}),
        ...(metric.memoryLimitBytes != null ? { memoryLimitBytes: BigInt(Math.trunc(metric.memoryLimitBytes)) } : {}),
        ...(metric.networkRxBytes != null ? { networkRxBytes: BigInt(Math.trunc(metric.networkRxBytes)) } : {}),
        ...(metric.networkTxBytes != null ? { networkTxBytes: BigInt(Math.trunc(metric.networkTxBytes)) } : {}),
        ...(metric.blockReadBytes != null ? { blockReadBytes: BigInt(Math.trunc(metric.blockReadBytes)) } : {}),
        ...(metric.blockWriteBytes != null ? { blockWriteBytes: BigInt(Math.trunc(metric.blockWriteBytes)) } : {}),
      },
    });
    metricsStored++;
  }

  return { available: true, upserted, metricsStored };
}

/**
 * Ingest log entries from the agent.
 * Masks common secret patterns before storing.
 */
export async function ingestLogs(serverId, entries) {
  const rows = entries.map((e) => ({
    serverId,
    application: e.application,
    level: e.level,
    message: e.message,
    maskedMessage: maskSecrets(e.message),
    isDemo: false,
    collectedAt: e.collectedAt ? new Date(e.collectedAt) : new Date(),
  }));

  await prisma.logEntry.createMany({ data: rows });
  return { stored: rows.length };
}

const SECRET_PATTERNS = [
  /(?:password|passwd|secret|token|key|api_key|apikey|auth)[=:\s]+\S+/gi,
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  /ip_agent_[0-9a-f]{48}/gi,
];

function maskSecrets(message) {
  let masked = message;
  for (const pattern of SECRET_PATTERNS) {
    masked = masked.replace(pattern, (match) => {
      const eqIdx = match.search(/[=:\s]/);
      const prefix = eqIdx >= 0 ? match.slice(0, eqIdx + 1) : '';
      return `${prefix}***MASKED***`;
    });
  }
  return masked;
}
