import { prisma } from '../lib/prisma.js';
import { createAgentToken } from '../utils/crypto.js';
import { evaluateAlerts } from './alertService.js';

/**
 * Register a new server + agent. Returns the raw token (shown once only).
 */
export async function registerAgent({ hostname, os, name, environment, region, provider }) {
  const { raw, prefix, hash } = createAgentToken();

  const server = await prisma.server.create({
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

  return {
    serverId: server.id,
    agentId: server.agent.id,
    token: raw, // returned once — never stored in plaintext
  };
}

/**
 * Update heartbeat timestamp and optional system info.
 */
export async function recordHeartbeat(agentId, serverId, { uptime, loadAvg, os, kernelVersion }) {
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
        ...(kernelVersion ? { os: kernelVersion } : os ? { os } : {}),
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
export async function syncDockerContainers(serverId, containers) {
  const now = new Date();
  let upserted = 0;

  for (const c of containers) {
    await prisma.dockerContainer.upsert({
      where: { serverId_containerId: { serverId, containerId: c.containerId } },
      create: {
        serverId,
        containerId: c.containerId,
        name: c.name,
        image: c.image,
        state: c.state,
        health: c.health,
        cpuPercent: c.cpuPercent,
        memUsageMb: c.memUsageMb,
        restartCount: c.restartCount ?? 0,
        startedAt: c.startedAt ? new Date(c.startedAt) : null,
        syncedAt: now,
      },
      update: {
        name: c.name,
        image: c.image,
        state: c.state,
        health: c.health,
        cpuPercent: c.cpuPercent,
        memUsageMb: c.memUsageMb,
        restartCount: c.restartCount ?? 0,
        startedAt: c.startedAt ? new Date(c.startedAt) : null,
        syncedAt: now,
      },
    });
    upserted++;
  }

  // Mark containers not in this sync as exited
  const activeIds = containers.map((c) => c.containerId);
  if (activeIds.length > 0) {
    await prisma.dockerContainer.updateMany({
      where: {
        serverId,
        containerId: { notIn: activeIds },
        state: { not: 'exited' },
      },
      data: { state: 'exited', syncedAt: now },
    });
  }

  return { upserted };
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
