import { Router } from 'express';
import { requireAuth, requireRole, requireCsrf } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { ok, fail } from '../../utils/response.js';
import { agentRegisterRouter } from './agent.js';
import { awsErrorStatus, getAwsConnectionStatus, getLatestAwsSync, syncAwsResources } from '../../services/awsService.js';
import alertManagementRoutes from './alertManagement.js';
import incidentManagementRoutes from './incidentManagement.js';
import apiMonitorRoutes from './apiMonitors.js';

const router = Router();

// All admin routes require authentication
router.use(requireAuth, requireRole('ADMIN'));
router.use('/alert-center', alertManagementRoutes);
router.use(incidentManagementRoutes);
router.use('/api-monitors', apiMonitorRoutes);

// ── Agent registration ────────────────────────────────────────────────────────
router.use('/agents', agentRegisterRouter);

router.get('/aws/status', async (_req, res) => {
  const [connection, latestSync] = await Promise.all([getAwsConnectionStatus(), getLatestAwsSync()]);
  return ok(res, { ...connection, latestSync });
});

router.get('/aws/runs', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const runs = await prisma.awsSyncRun.findMany({
    orderBy: { startedAt: 'desc' },
    skip: (page - 1) * 20,
    take: 20,
  });
  return ok(res, runs, { page, pageSize: 20 });
});

router.get('/aws/resources/:id', async (req, res) => {
  const resource = await prisma.awsResource.findUnique({ where: { id: req.params.id } });
  if (!resource) return fail(res, 404, 'NOT_FOUND', 'AWS resource not found');
  return ok(res, resource);
});

router.post('/aws/sync', requireCsrf, async (_req, res) => {
  try {
    return ok(res, await syncAwsResources('manual'));
  } catch (error) {
    const result = awsErrorStatus(error);
    const statusCode = result.status === 'missing_permissions' ? 403
      : result.status === 'invalid_credentials' ? 401
        : result.status === 'not_configured' ? 503 : 502;
    return fail(res, statusCode, result.status.toUpperCase(), result.message);
  }
});

// ── List registered agents/servers ───────────────────────────────────────────
router.get('/agents', async (_req, res) => {
  const agents = await prisma.agent.findMany({
    include: { server: { select: { id: true, name: true, hostname: true, status: true, lastHeartbeatAt: true, environment: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return ok(res, agents.map((a) => ({
    id: a.id,
    serverId: a.serverId,
    status: a.status,
    lastSeenAt: a.lastSeenAt,
    createdAt: a.createdAt,
    server: a.server,
  })));
});

// ── Revoke agent ──────────────────────────────────────────────────────────────
router.post('/agents/:id/revoke', requireCsrf, async (req, res) => {
  const agent = await prisma.agent.findUnique({ where: { id: req.params.id } });
  if (!agent) return fail(res, 404, 'NOT_FOUND', 'Agent not found');
  await prisma.agent.update({
    where: { id: req.params.id },
    data: { status: 'REVOKED', revokedAt: new Date() },
  });
  return ok(res, { revoked: true });
});

// ── Alert rules ───────────────────────────────────────────────────────────────
const alertRuleSchema = z.object({
  name: z.string().min(1).max(200),
  metric: z.enum(['CPU', 'MEM', 'DISK', 'NET_IN', 'NET_OUT', 'LOAD']),
  operator: z.enum(['gt', 'gte', 'lt', 'lte', 'eq']),
  threshold: z.number(),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  cooldownSec: z.number().int().min(30).default(300),
  enabled: z.boolean().default(true),
});

router.get('/alert-rules', async (_req, res) => {
  const rules = await prisma.alertRule.findMany({
    where: { isDemo: false },
    orderBy: { createdAt: 'desc' },
  });
  return ok(res, rules);
});

router.post('/alert-rules', requireCsrf, validate(alertRuleSchema), async (req, res) => {
  const rule = await prisma.alertRule.create({
    data: { ...req.body, isDemo: false, createdById: req.user.id },
  });
  return ok(res, rule, undefined, 201);
});

router.patch('/alert-rules/:id', requireCsrf, async (req, res) => {
  const rule = await prisma.alertRule.findFirst({ where: { id: req.params.id, isDemo: false } });
  if (!rule) return fail(res, 404, 'NOT_FOUND', 'Alert rule not found');
  const updated = await prisma.alertRule.update({
    where: { id: req.params.id },
    data: req.body,
  });
  return ok(res, updated);
});

router.delete('/alert-rules/:id', requireCsrf, async (req, res) => {
  const rule = await prisma.alertRule.findFirst({ where: { id: req.params.id, isDemo: false } });
  if (!rule) return fail(res, 404, 'NOT_FOUND', 'Alert rule not found');
  await prisma.alertRule.delete({ where: { id: req.params.id } });
  return ok(res, { deleted: true });
});

// ── Incidents — acknowledge / update status ───────────────────────────────────
export default router;
