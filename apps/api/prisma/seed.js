import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

const demoServers = [
  {
    key: 'api',
    name: 'Production API Server',
    hostname: 'api-prod-01',
    os: 'Ubuntu 22.04',
    environment: 'production',
    region: 'us-east-1',
    provider: 'AWS',
    status: 'HEALTHY',
    cpu: 38,
    memory: 54,
    disk: 61,
  },
  {
    key: 'db',
    name: 'Database Server',
    hostname: 'db-prod-01',
    os: 'Ubuntu 22.04',
    environment: 'production',
    region: 'us-east-1',
    provider: 'AWS',
    status: 'WARNING',
    cpu: 72,
    memory: 88,
    disk: 79,
  },
  {
    key: 'staging',
    name: 'Staging Server',
    hostname: 'app-staging-01',
    os: 'Debian 12',
    environment: 'staging',
    region: 'eu-west-1',
    provider: 'AWS',
    status: 'HEALTHY',
    cpu: 22,
    memory: 41,
    disk: 35,
  },
  {
    key: 'worker',
    name: 'Docker Worker',
    hostname: 'worker-01',
    os: 'Ubuntu 24.04',
    environment: 'production',
    region: 'us-west-2',
    provider: 'VPS',
    status: 'CRITICAL',
    cpu: 94,
    memory: 91,
    disk: 67,
  },
  {
    key: 'pay',
    name: 'Payment API',
    hostname: 'pay-api-01',
    os: 'Ubuntu 22.04',
    environment: 'production',
    region: 'us-east-1',
    provider: 'AWS',
    status: 'WARNING',
    cpu: 66,
    memory: 58,
    disk: 44,
  },
  {
    key: 'fe',
    name: 'Frontend Server',
    hostname: 'web-edge-01',
    os: 'Ubuntu 22.04',
    environment: 'production',
    region: 'us-east-1',
    provider: 'AWS',
    status: 'HEALTHY',
    cpu: 18,
    memory: 36,
    disk: 28,
  },
];

function series(points, base, variance, trend = 0) {
  const now = Date.now();
  const step = (24 * 60 * 60 * 1000) / Math.max(points - 1, 1);
  return Array.from({ length: points }, (_, i) => {
    const wobble = Math.sin(i / 3) * variance + ((i * 17) % 7) - 3;
    const value = Math.max(1, Math.min(99, base + trend * (i / points) + wobble * 0.6));
    return {
      collectedAt: new Date(now - (points - 1 - i) * step),
      value: Number(value.toFixed(1)),
    };
  });
}

async function main() {
  console.log('Seeding InfraPulse…');

  await prisma.incidentAlert.deleteMany();
  await prisma.incidentEvent.deleteMany();
  await prisma.anomaly.deleteMany();
  await prisma.logEntry.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.remediationAction.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.alertRule.deleteMany();
  await prisma.apiCheck.deleteMany();
  await prisma.apiMonitor.deleteMany();
  await prisma.deployment.deleteMany();
  await prisma.domainMonitor.deleteMany();
  await prisma.infrastructureCost.deleteMany();
  await prisma.metricSample.deleteMany();
  await prisma.dockerContainer.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.server.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();

  const adminRole = await prisma.role.create({
    data: {
      name: 'ADMIN',
      permissions: ['*'],
    },
  });

  await prisma.role.create({
    data: {
      name: 'VIEWER',
      permissions: ['public:read'],
    },
  });

  const password = process.env.ADMIN_PASSWORD || 'InfraPulseAdmin!234';
  const email = (process.env.ADMIN_EMAIL || 'admin@infrapulse.local').toLowerCase();
  const name = process.env.ADMIN_NAME || 'InfraPulse Admin';

  const admin = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash: await bcrypt.hash(password, 12),
      roleId: adminRole.id,
    },
  });

  const serverMap = {};
  for (const spec of demoServers) {
    const server = await prisma.server.create({
      data: {
        name: spec.name,
        hostname: spec.hostname,
        os: spec.os,
        environment: spec.environment,
        region: spec.region,
        provider: spec.provider,
        // Demo public data must not expose real IPs — placeholder only, never returned publicly.
        ipAddress: null,
        status: spec.status,
        isDemo: true,
        lastHeartbeatAt: new Date(),
      },
    });
    serverMap[spec.key] = { ...server, ...spec };

    const cpuSeries = series(48, spec.cpu, 8, spec.status === 'CRITICAL' ? 12 : 2);
    const memSeries = series(48, spec.memory, 6, spec.status === 'WARNING' ? 5 : 1);
    const diskSeries = series(48, spec.disk, 3, 1);
    const netIn = series(48, 20 + spec.cpu / 5, 10, 0);
    const netOut = series(48, 15 + spec.cpu / 6, 8, 0);

    const metricRows = [];
    for (const point of cpuSeries) {
      metricRows.push({
        serverId: server.id,
        kind: 'CPU',
        value: point.value,
        unit: '%',
        collectedAt: point.collectedAt,
      });
    }
    for (const point of memSeries) {
      metricRows.push({
        serverId: server.id,
        kind: 'MEM',
        value: point.value,
        unit: '%',
        collectedAt: point.collectedAt,
      });
    }
    for (const point of diskSeries) {
      metricRows.push({
        serverId: server.id,
        kind: 'DISK',
        value: point.value,
        unit: '%',
        collectedAt: point.collectedAt,
      });
    }
    for (const point of netIn) {
      metricRows.push({
        serverId: server.id,
        kind: 'NET_IN',
        value: point.value,
        unit: 'MB/s',
        collectedAt: point.collectedAt,
      });
    }
    for (const point of netOut) {
      metricRows.push({
        serverId: server.id,
        kind: 'NET_OUT',
        value: point.value,
        unit: 'MB/s',
        collectedAt: point.collectedAt,
      });
    }
    await prisma.metricSample.createMany({ data: metricRows });
  }

  await prisma.dockerContainer.createMany({
    data: [
      {
        serverId: serverMap.worker.id,
        containerId: 'democtr01',
        name: 'queue-consumer',
        image: 'infrapulse/demo-worker:1.9.0',
        state: 'running',
        health: 'unhealthy',
        cpuPercent: 88.2,
        memUsageMb: 1450,
        restartCount: 3,
        startedAt: new Date(Date.now() - 7 * 3600_000),
      },
      {
        serverId: serverMap.worker.id,
        containerId: 'democtr02',
        name: 'log-shipper',
        image: 'infrapulse/demo-shipper:0.4.1',
        state: 'running',
        health: 'healthy',
        cpuPercent: 6.1,
        memUsageMb: 220,
        restartCount: 0,
        startedAt: new Date(Date.now() - 3 * 86400_000),
      },
      {
        serverId: serverMap.api.id,
        containerId: 'democtr03',
        name: 'api-gateway',
        image: 'infrapulse/demo-api:2.4.1',
        state: 'running',
        health: 'healthy',
        cpuPercent: 21.4,
        memUsageMb: 640,
        restartCount: 1,
        startedAt: new Date(Date.now() - 12 * 86400_000),
      },
    ],
  });

  const cpuRule = await prisma.alertRule.create({
    data: {
      name: 'CPU greater than 85%',
      metric: 'CPU',
      operator: 'gt',
      threshold: 85,
      severity: 'CRITICAL',
      cooldownSec: 300,
      isDemo: true,
      createdById: admin.id,
    },
  });
  const memRule = await prisma.alertRule.create({
    data: {
      name: 'Memory greater than 90%',
      metric: 'MEM',
      operator: 'gt',
      threshold: 90,
      severity: 'HIGH',
      cooldownSec: 300,
      isDemo: true,
      createdById: admin.id,
    },
  });
  await prisma.alertRule.create({
    data: {
      name: 'Disk utilization greater than 90%',
      metric: 'DISK',
      operator: 'gt',
      threshold: 90,
      severity: 'HIGH',
      cooldownSec: 600,
      isDemo: true,
      createdById: admin.id,
    },
  });

  const alertWorker = await prisma.alert.create({
    data: {
      ruleId: cpuRule.id,
      serverId: serverMap.worker.id,
      title: 'CPU above 85%',
      description: 'DEMO: Docker Worker CPU exceeded critical threshold.',
      severity: 'CRITICAL',
      status: 'OPEN',
      metricValue: 94,
      threshold: 85,
      isDemo: true,
      triggeredAt: new Date(Date.now() - 6 * 60_000),
    },
  });
  const alertDb = await prisma.alert.create({
    data: {
      ruleId: memRule.id,
      serverId: serverMap.db.id,
      title: 'Memory above 90%',
      description: 'DEMO: Database Server memory pressure.',
      severity: 'HIGH',
      status: 'ACKNOWLEDGED',
      metricValue: 91,
      threshold: 90,
      isDemo: true,
      triggeredAt: new Date(Date.now() - 22 * 60_000),
      ackAt: new Date(Date.now() - 15 * 60_000),
      ackById: admin.id,
    },
  });
  const alertPay = await prisma.alert.create({
    data: {
      serverId: serverMap.pay.id,
      title: 'API latency > 2s',
      description: 'DEMO: Payment API p95 latency elevated.',
      severity: 'MEDIUM',
      status: 'OPEN',
      metricValue: 2400,
      threshold: 2000,
      isDemo: true,
      triggeredAt: new Date(Date.now() - 41 * 60_000),
    },
  });

  const incidentCritical = await prisma.incident.create({
    data: {
      publicId: 'INC-1042',
      title: 'Worker node resource saturation',
      description: 'DEMO incident grouped from CPU saturation alerts on Docker Worker.',
      severity: 'CRITICAL',
      status: 'INVESTIGATING',
      assigneeId: admin.id,
      serverId: serverMap.worker.id,
      isDemo: true,
      detectedAt: new Date(Date.now() - 18 * 60_000),
      events: {
        create: [
          {
            type: 'DETECTED',
            message: 'Incident opened from critical CPU alert.',
            actorId: null,
          },
          {
            type: 'ACKNOWLEDGED',
            message: 'Administrator acknowledged incident.',
            actorId: admin.id,
          },
          {
            type: 'INVESTIGATING',
            message: 'Correlating container restarts and recent deployment.',
            actorId: admin.id,
          },
        ],
      },
      alerts: {
        create: [{ alertId: alertWorker.id }],
      },
    },
  });

  await prisma.incident.create({
    data: {
      publicId: 'INC-1041',
      title: 'Elevated payment API latency',
      description: 'DEMO: latency and error-rate correlation under review.',
      severity: 'HIGH',
      status: 'ACKNOWLEDGED',
      assigneeId: admin.id,
      serverId: serverMap.pay.id,
      isDemo: true,
      detectedAt: new Date(Date.now() - 60 * 60_000),
      mttaMs: 8 * 60_000,
      events: {
        create: [
          { type: 'DETECTED', message: 'Latency alert escalated to incident.' },
          {
            type: 'ACKNOWLEDGED',
            message: 'On-call acknowledged.',
            actorId: admin.id,
          },
        ],
      },
      alerts: { create: [{ alertId: alertPay.id }] },
    },
  });

  await prisma.incident.create({
    data: {
      publicId: 'INC-1038',
      title: 'Staging deploy health flap',
      description: 'DEMO: resolved after rollback window.',
      severity: 'MEDIUM',
      status: 'RESOLVED',
      serverId: serverMap.staging.id,
      isDemo: true,
      detectedAt: new Date(Date.now() - 26 * 60 * 60_000),
      resolvedAt: new Date(Date.now() - 20 * 60 * 60_000),
      mttaMs: 5 * 60_000,
      mttrMs: 6 * 60 * 60_000,
      events: {
        create: [
          { type: 'DETECTED', message: 'Health check flaps detected.' },
          { type: 'RESOLVED', message: 'Service stabilized.', actorId: admin.id },
        ],
      },
    },
  });

  const apis = [
    { name: 'Public Website', url: 'https://example.com', latency: 142, success: true },
    { name: 'Core API', url: 'https://httpbin.org/status/200', latency: 210, success: true },
    { name: 'Payment API', url: 'https://httpbin.org/delay/2', latency: 1860, success: true },
    { name: 'Auth Service', url: 'https://httpbin.org/status/200', latency: 118, success: true },
  ];

  for (const api of apis) {
    const monitor = await prisma.apiMonitor.create({
      data: {
        name: api.name,
        url: api.url,
        intervalSec: 60,
        isDemo: true,
        enabled: true,
      },
    });
    const checks = Array.from({ length: 20 }, (_, i) => {
      const fail = api.name === 'Payment API' && i % 7 === 0;
      return {
        apiMonitorId: monitor.id,
        statusCode: fail ? 503 : 200,
        latencyMs: fail ? 3200 : api.latency + (i % 5) * 20,
        success: !fail,
        checkedAt: new Date(Date.now() - (20 - i) * 15 * 60_000),
      };
    });
    await prisma.apiCheck.createMany({ data: checks });
  }

  await prisma.deployment.createMany({
    data: [
      {
        appName: 'payment-api',
        version: 'v2.4.1',
        environment: 'production',
        status: 'SUCCESS',
        commitId: 'a1b2c3d',
        commitMessage: 'Improve checkout retry budget',
        webhookSource: 'demo',
        isDemo: true,
        deployedAt: new Date(Date.now() - 2 * 3600_000),
      },
      {
        appName: 'worker',
        version: 'v1.9.0',
        environment: 'production',
        status: 'SUCCESS',
        commitId: 'e4f5a6b',
        commitMessage: 'Tune queue concurrency',
        webhookSource: 'demo',
        isDemo: true,
        deployedAt: new Date(Date.now() - 5 * 3600_000),
      },
    ],
  });

  await prisma.logEntry.createMany({
    data: [
      {
        serverId: serverMap.worker.id,
        application: 'queue-consumer',
        level: 'ERROR',
        message: 'Worker stalled: CPU starvation (token=super-secret-should-mask)',
        maskedMessage: 'Worker stalled: CPU starvation (token=***MASKED***)',
        incidentId: incidentCritical.id,
        isDemo: true,
        collectedAt: new Date(Date.now() - 10 * 60_000),
      },
      {
        serverId: serverMap.pay.id,
        application: 'payment-api',
        level: 'WARN',
        message: 'Upstream latency budget exceeded',
        maskedMessage: 'Upstream latency budget exceeded',
        isDemo: true,
        collectedAt: new Date(Date.now() - 35 * 60_000),
      },
      {
        serverId: serverMap.api.id,
        application: 'api-gateway',
        level: 'INFO',
        message: 'Deployment health checks passed',
        maskedMessage: 'Deployment health checks passed',
        isDemo: true,
        collectedAt: new Date(Date.now() - 2 * 3600_000),
      },
    ],
  });

  await prisma.anomaly.create({
    data: {
      serverId: serverMap.worker.id,
      metric: 'CPU',
      baseline: 41.2,
      actual: 94.0,
      zScore: 3.4,
      isDemo: true,
      relatedIncidentId: incidentCritical.id,
    },
  });

  await prisma.domainMonitor.createMany({
    data: [
      {
        domain: 'demo.infrapulse.dev',
        isDemo: true,
        lastStatus: 'up',
        sslExpiresAt: new Date(Date.now() + 45 * 86400_000),
        hostnameMatch: true,
        httpStatus: 200,
        checkedAt: new Date(),
      },
    ],
  });

  await prisma.infrastructureCost.createMany({
    data: demoServers.map((spec) => ({
      serverId: serverMap[spec.key].id,
      periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      periodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
      amountUsd: Number((40 + spec.cpu / 2 + spec.memory / 3).toFixed(2)),
      source: 'ESTIMATE',
      isDemo: true,
      breakdown: { note: 'Labeled estimate for DEMO — not AWS billing.' },
    })),
  });

  await prisma.auditLog.createMany({
    data: [
      {
        actorId: admin.id,
        action: 'SEED_COMPLETED',
        resourceType: 'System',
        resourceId: 'demo',
        meta: { servers: demoServers.length },
      },
      {
        actorId: admin.id,
        action: 'ALERT_ACKNOWLEDGED',
        resourceType: 'Alert',
        resourceId: alertDb.id,
      },
    ],
  });

  console.log('Seed complete.');
  console.log(`Admin: ${email}`);
  console.log('Password: (from ADMIN_PASSWORD in apps/api/.env)');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
