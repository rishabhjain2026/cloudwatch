import { Router } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { ok, fail } from '../../utils/response.js';
import { validate } from '../../middleware/validate.js';

const router = Router();

const deploySchema = z.object({
  appName: z.string().min(1).max(200),
  version: z.string().min(1).max(100),
  environment: z.string().min(1).max(50),
  status: z.enum(['PENDING', 'SUCCESS', 'FAILED', 'ROLLED_BACK']),
  commitId: z.string().max(100).optional(),
  commitMessage: z.string().max(500).optional(),
  deployedAt: z.string().datetime().optional(),
  meta: z.record(z.unknown()).optional(),
});

/**
 * Optional HMAC-SHA256 signature check.
 * Header: X-Webhook-Signature: sha256=<hex>
 * If WEBHOOK_SECRET is not set, signature check is skipped (dev mode).
 */
function checkSignature(req, res, next) {
  if (!env.WEBHOOK_SECRET) return next();
  const sig = req.headers['x-webhook-signature'];
  if (!sig) return fail(res, 401, 'WEBHOOK_AUTH_FAILED', 'Missing webhook signature');
  const body = JSON.stringify(req.body);
  const expected = `sha256=${crypto.createHmac('sha256', env.WEBHOOK_SECRET).update(body).digest('hex')}`;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return fail(res, 401, 'WEBHOOK_AUTH_FAILED', 'Invalid webhook signature');
    }
  } catch {
    return fail(res, 401, 'WEBHOOK_AUTH_FAILED', 'Invalid webhook signature');
  }
  return next();
}

router.post('/deploy', checkSignature, validate(deploySchema), async (req, res) => {
  const deployment = await prisma.deployment.create({
    data: {
      appName: req.body.appName,
      version: req.body.version,
      environment: req.body.environment,
      status: req.body.status,
      commitId: req.body.commitId,
      commitMessage: req.body.commitMessage,
      webhookSource: req.headers['x-webhook-source'] || 'webhook',
      isDemo: false,
      deployedAt: req.body.deployedAt ? new Date(req.body.deployedAt) : new Date(),
      meta: req.body.meta ?? null,
    },
  });
  return ok(res, { id: deployment.id }, undefined, 201);
});

export default router;
