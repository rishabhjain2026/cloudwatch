import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

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
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
