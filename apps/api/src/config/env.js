import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const optionalSetting = z.preprocess(
  (value) => (typeof value === 'string' && !value.trim() ? undefined : value),
  z.string().trim().min(1).optional(),
);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('8h'),
  COOKIE_SECURE: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(10),
  ADMIN_NAME: z.string().default('InfraPulse Admin'),
  DEMO_MODE: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  RATE_LIMIT_PUBLIC_MAX: z.coerce.number().default(120),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().default(20),
  AGENT_HEARTBEAT_STALE_SEC: z.coerce.number().default(120),
  API_CHECK_INTERVAL_SEC: z.coerce.number().default(60),
  ALERT_EVAL_ENABLED: z
    .string()
    .optional()
    .transform((v) => v !== 'false'),
  WEBHOOK_SECRET: z.string().optional(),
  AWS_REGION: optionalSetting,
  AWS_PROFILE: optionalSetting,
  AWS_SYNC_INTERVAL_MINUTES: z.coerce.number().int().min(5).default(60),
  AI_PROVIDER: optionalSetting,
  AI_API_KEY: optionalSetting,
  AI_MODEL: optionalSetting,
  AI_BASE_URL: optionalSetting,
  AI_TIMEOUT_MS: z.coerce.number().int().min(5000).max(120000).default(30000),
  AI_ANALYSIS_ENABLED: z.string().optional().transform((v) => v !== 'false'),
  INCIDENT_UNACKNOWLEDGED_SEC: z.coerce.number().int().min(60).max(604800).default(900),
  API_MONITOR_ENCRYPTION_KEY: optionalSetting,
  API_MONITOR_CONCURRENCY: z.coerce.number().int().min(1).max(32).default(8),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
