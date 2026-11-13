import { z } from 'zod';

export const registerAgentSchema = z.object({
  hostname: z.string().min(1).max(253),
  os: z.string().max(100).optional(),
  name: z.string().max(200).optional(),
  environment: z.string().max(50).optional(),
  region: z.string().max(100).optional(),
  provider: z.string().max(50).optional(),
  awsInstanceId: z.string().regex(/^i-[0-9a-f]{8,17}$/).optional(),
});

export const heartbeatSchema = z.object({
  uptime: z.number().nonnegative().optional(),
  loadAvg: z.array(z.number()).max(3).optional(),
  os: z.string().max(100).optional(),
  kernelVersion: z.string().max(100).optional(),
});

export const metricsSchema = z.object({
  collectedAt: z.string().datetime().optional(),
  cpu: z.object({ usagePercent: z.number().min(0).max(100) }).optional(),
  memory: z
    .object({
      totalBytes: z.number().nonnegative(),
      usedBytes: z.number().nonnegative(),
      availableBytes: z.number().nonnegative(),
      usagePercent: z.number().min(0).max(100),
    })
    .optional(),
  disk: z
    .object({
      totalBytes: z.number().nonnegative(),
      usedBytes: z.number().nonnegative(),
      availableBytes: z.number().nonnegative(),
      usagePercent: z.number().min(0).max(100),
      mountpoint: z.string().optional(),
    })
    .optional(),
  network: z
    .object({
      rxBytes: z.number().nonnegative(),
      txBytes: z.number().nonnegative(),
      rxThroughputBps: z.number().nonnegative().optional(),
      txThroughputBps: z.number().nonnegative().optional(),
      interface: z.string().optional(),
    })
    .optional(),
  load: z
    .object({
      avg1: z.number().nonnegative(),
      avg5: z.number().nonnegative(),
      avg15: z.number().nonnegative(),
    })
    .optional(),
});

const dockerBytes = z.number().nonnegative().max(Number.MAX_SAFE_INTEGER).optional().nullable();
const dockerContainerSchema = z.object({
  containerId: z.string().min(1).max(128),
  name: z.string().min(1).max(200),
  image: z.string().max(500).nullable().optional(),
  state: z.enum(['running', 'exited', 'created', 'paused', 'restarting', 'dead', 'removing', 'unknown']),
  status: z.string().max(200).nullable().optional(),
  health: z.string().max(50).nullable().optional(),
  createdAt: z.string().datetime().nullable().optional(),
  startedAt: z.string().datetime().nullable().optional(),
  restartCount: z.number().int().nonnegative().optional(),
  ports: z.array(z.object({ ip: z.string().nullable(), privatePort: z.number().int().nonnegative(), publicPort: z.number().int().nonnegative().nullable(), type: z.string().max(20) })).max(100).optional(),
  networks: z.array(z.object({ name: z.string().max(200), ipAddress: z.string().nullable(), gateway: z.string().nullable() })).max(100).optional(),
  mounts: z.array(z.object({ type: z.string().max(50).nullable(), source: z.string().max(2000).nullable(), destination: z.string().max(2000), mode: z.string().max(100).nullable(), rw: z.boolean().nullable() })).max(100).optional(),
});

const dockerMetricSchema = z.object({
  containerId: z.string().min(1).max(128),
  cpuPercent: z.number().nonnegative().max(100000).nullable(),
  memoryUsageBytes: dockerBytes,
  memoryLimitBytes: dockerBytes,
  memoryPercent: z.number().nonnegative().max(100000).nullable(),
  networkRxBytes: dockerBytes,
  networkTxBytes: dockerBytes,
  blockReadBytes: dockerBytes,
  blockWriteBytes: dockerBytes,
});

export const dockerSyncSchema = z.object({
  available: z.boolean(),
  dockerError: z.enum(['DOCKER_ENGINE_UNAVAILABLE', 'DOCKER_API_ERROR']).optional(),
  collectedAt: z.string().datetime(),
  host: z.object({
    engineVersion: z.string().max(100).nullable().optional(),
    apiVersion: z.string().max(100).nullable().optional(),
    os: z.string().max(100).nullable().optional(),
    architecture: z.string().max(100).nullable().optional(),
  }).optional(),
  containerCount: z.number().int().nonnegative().max(10000).nullable().optional(),
  runningCount: z.number().int().nonnegative().max(10000).nullable().optional(),
  stoppedCount: z.number().int().nonnegative().max(10000).nullable().optional(),
  imageCount: z.number().int().nonnegative().max(100000).nullable().optional(),
  containers: z.array(dockerContainerSchema).max(10000).optional(),
  metrics: z.array(dockerMetricSchema).max(10000).optional(),
}).superRefine((payload, ctx) => {
  if (payload.available && !payload.host) ctx.addIssue({ code: 'custom', path: ['host'], message: 'Host info required when Docker is available' });
  if (!payload.available && (payload.containers || payload.metrics?.length)) ctx.addIssue({ code: 'custom', path: ['available'], message: 'Unavailable Docker snapshots cannot include inventory or metrics' });
});

export const logIngestSchema = z.object({
  entries: z.array(
    z.object({
      application: z.string().max(200).optional(),
      level: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']),
      message: z.string().max(10000),
      collectedAt: z.string().datetime().optional(),
    }),
  ).max(500),
});
