import { prisma } from '../lib/prisma.js';

const OPERATORS = {
  gt: (v, t) => v > t,
  gte: (v, t) => v >= t,
  lt: (v, t) => v < t,
  lte: (v, t) => v <= t,
  eq: (v, t) => v === t,
};

/**
 * Evaluate all enabled alert rules against the provided metric values.
 * metricValues: { CPU: 94.2, MEM: 88.1, DISK: 45.0 }
 */
export async function evaluateAlerts(serverId, metricValues) {
  const rules = await prisma.alertRule.findMany({
    where: { enabled: true, isDemo: false },
  });

  for (const rule of rules) {
    const value = metricValues[rule.metric];
    if (value == null) continue;

    const op = OPERATORS[rule.operator];
    if (!op) continue;

    const triggered = op(value, rule.threshold);

    if (triggered) {
      await openAlert(rule, serverId, value);
    } else {
      await resolveAlert(rule, serverId);
    }
  }
}

async function openAlert(rule, serverId, metricValue) {
  // Check cooldown — don't re-open if an OPEN alert exists within cooldown window
  const cooldownSince = new Date(Date.now() - rule.cooldownSec * 1000);
  const existing = await prisma.alert.findFirst({
    where: {
      ruleId: rule.id,
      serverId,
      status: { in: ['OPEN', 'ACKNOWLEDGED'] },
      triggeredAt: { gte: cooldownSince },
    },
  });

  if (existing) return; // still within cooldown, do not duplicate

  const alert = await prisma.alert.create({
    data: {
      ruleId: rule.id,
      serverId,
      title: rule.name,
      description: `${rule.metric} is ${metricValue.toFixed(1)} (threshold: ${rule.threshold})`,
      severity: rule.severity,
      status: 'OPEN',
      metricValue,
      threshold: rule.threshold,
      isDemo: false,
      triggeredAt: new Date(),
    },
  });

  // Auto-create incident for CRITICAL severity
  if (rule.severity === 'CRITICAL') {
    await maybeCreateIncident(alert, serverId);
  }
}

async function resolveAlert(rule, serverId) {
  // Resolve any open alerts for this rule+server
  await prisma.alert.updateMany({
    where: {
      ruleId: rule.id,
      serverId,
      status: { in: ['OPEN', 'ACKNOWLEDGED'] },
    },
    data: {
      status: 'RESOLVED',
      resolvedAt: new Date(),
    },
  });
}

async function maybeCreateIncident(alert, serverId) {
  // Don't create duplicate open incidents for the same server
  const existing = await prisma.incident.findFirst({
    where: {
      serverId,
      isDemo: false,
      status: { in: ['DETECTED', 'OPEN', 'ACKNOWLEDGED', 'INVESTIGATING'] },
    },
  });
  if (existing) {
    // Link alert to existing incident
    await prisma.incidentAlert.create({
      data: { incidentId: existing.id, alertId: alert.id },
    }).catch(() => {}); // ignore duplicate
    return;
  }

  const server = await prisma.server.findUnique({ where: { id: serverId } });
  const publicId = await nextPublicId();

  const incident = await prisma.incident.create({
    data: {
      publicId,
      title: `${alert.title} on ${server?.name ?? serverId}`,
      description: alert.description,
      severity: alert.severity,
      status: 'DETECTED',
      serverId,
      isDemo: false,
      detectedAt: new Date(),
      events: {
        create: [
          {
            type: 'DETECTED',
            message: `Incident auto-created from alert: ${alert.title}`,
          },
        ],
      },
      alerts: {
        create: [{ alertId: alert.id }],
      },
    },
  });

  return incident;
}

async function nextPublicId() {
  const last = await prisma.incident.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { publicId: true },
  });
  const num = last?.publicId?.match(/\d+/)?.[0];
  const next = num ? parseInt(num, 10) + 1 : 1000;
  return `INC-${next}`;
}

/**
 * Evaluate heartbeat staleness for all real servers.
 * Called by the watchdog scheduler.
 */
export async function evaluateHeartbeats(staleSec) {
  const staleThreshold = new Date(Date.now() - staleSec * 1000);

  // Mark stale servers as OFFLINE
  await prisma.server.updateMany({
    where: {
      isDemo: false,
      status: { not: 'OFFLINE' },
      lastHeartbeatAt: { lt: staleThreshold },
    },
    data: { status: 'OFFLINE' },
  });

  // Resolve heartbeat alerts for servers that came back online
  const onlineServers = await prisma.server.findMany({
    where: {
      isDemo: false,
      status: 'HEALTHY',
      lastHeartbeatAt: { gte: staleThreshold },
    },
    select: { id: true },
  });

  for (const s of onlineServers) {
    await prisma.alert.updateMany({
      where: {
        serverId: s.id,
        title: { contains: 'heartbeat' },
        status: { in: ['OPEN', 'ACKNOWLEDGED'] },
      },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
    });
  }
}
