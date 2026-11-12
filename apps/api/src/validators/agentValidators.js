import { z } from 'zod';

export const registerAgentSchema = z.object({
  hostname: z.string().min(1).max(253),
  os: z.string().max(100).optional(),
  name: z.string().max(200).optional(),
  environment: z.string().max(50).optional(),
  region: z.string().max(100).optional(),
  provider: z.string().max(50).optional(),
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

export const dockerSyncSchema = z.object({
  containers: z.array(
    z.object({
      containerId: z.string().min(1).max(128),
      name: z.string().max(200),
      image: z.string().max(500).optional(),
      state: z.string().max(50),
      health: z.string().max(50).optional(),
      cpuPercent: z.number().min(0).optional(),
      memUsageMb: z.number().nonnegative().optional(),
      restartCount: z.number().int().nonnegative().optional(),
      startedAt: z.string().datetime().optional(),
    }),
  ),
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
