import { Router } from 'express';
import { z } from 'zod';
import { requireCsrf } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { ok, fail } from '../../utils/response.js';
import { prisma } from '../../lib/prisma.js';
import { monitorAnalytics, monitorChecks, createMonitor, deleteMonitor, getMonitor, listMonitors, updateMonitor } from '../../services/apiMonitorService.js';
import { runMonitorCheck } from '../../services/apiCheckerService.js';

const headerRecord = z.record(z.string().min(1).max(100), z.string().max(4000).refine((value) => !/[\r\n]/.test(value), 'Header values cannot contain newlines')).superRefine((headers, ctx) => {
  if (Object.keys(headers).length > 25) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'At most 25 headers are allowed' });
  const allowed = new Set(['accept', 'content-type', 'authorization', 'x-api-key', 'user-agent']);
  for (const key of Object.keys(headers)) if (!allowed.has(key.toLowerCase())) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: 'Header is not allowed for monitoring requests' });
});
const fields = {
  name: z.string().trim().min(1).max(200), url: z.string().url().max(2000), method: z.enum(['GET','HEAD','POST']).default('GET'),
  intervalSec: z.number().int().min(30).max(3600).default(60), enabled: z.boolean().default(true),
  expectedStatus: z.number().int().min(100).max(599).default(200), expectedContent: z.string().max(2048).optional().nullable(),
  timeoutMs: z.number().int().min(1000).max(60000).default(10000), warningLatencyMs: z.number().int().min(1).max(60000).optional().nullable(),
  criticalLatencyMs: z.number().int().min(1).max(60000).optional().nullable(), sslWarnDays: z.number().int().min(1).max(365).default(14),
  requestHeaders: headerRecord.optional(), requestBody: z.string().max(16384).optional().nullable(),
};
const createSchema = z.object(fields).strict().superRefine((value, ctx) => {
  if (value.method !== 'POST' && value.requestBody) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['requestBody'], message: 'A request body is supported only for POST' });
  if (value.warningLatencyMs != null && value.criticalLatencyMs != null && value.criticalLatencyMs <= value.warningLatencyMs) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['criticalLatencyMs'], message: 'Critical threshold must exceed the warning threshold' });
});
const updateSchema = z.object({ ...Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value.optional()])), clearRequestConfig: z.boolean().optional() }).strict().superRefine((value, ctx) => {
  if (value.warningLatencyMs != null && value.criticalLatencyMs != null && value.criticalLatencyMs <= value.warningLatencyMs) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['criticalLatencyMs'], message: 'Critical threshold must exceed the warning threshold' });
});
const router = Router();

router.get('/analytics', async (req, res) => ok(res, await monitorAnalytics({ range: String(req.query.range || '24h') })));
router.get('/compare', async (req, res) => {
  const ids = String(req.query.ids || '').split(',').filter(Boolean).slice(0, 10);
  return ok(res, await monitorAnalytics({ range: String(req.query.range || '24h'), compareIds: ids }));
});
router.get('/', async (_req, res) => ok(res, await listMonitors({ admin: true })));
router.post('/', requireCsrf, validate(createSchema), async (req, res) => {
  const row = await createMonitor(req.body);
  await prisma.auditLog.create({ data: { actorId: req.user.id, action: 'API_MONITOR_CREATED', resourceType: 'ApiMonitor', resourceId: row.id, meta: { name: row.name, targetHost: row.targetHost } } });
  return ok(res, row, undefined, 201);
});
router.get('/:id', async (req, res) => { const row = await getMonitor(req.params.id, { admin: true }); return row ? ok(res, row) : fail(res, 404, 'NOT_FOUND', 'API monitor not found'); });
router.patch('/:id', requireCsrf, validate(updateSchema), async (req, res) => { const row = await updateMonitor(req.params.id, req.body); return row ? ok(res, row) : fail(res, 404, 'NOT_FOUND', 'API monitor not found'); });
router.patch('/:id/pause', requireCsrf, async (req, res) => {
  const body = z.object({ enabled: z.boolean() }).parse(req.body);
  const updated = await updateMonitor(req.params.id, { enabled: body.enabled, ...(body.enabled ? { nextCheckAt: new Date() } : {}) });
  return updated ? ok(res, updated) : fail(res, 404, 'NOT_FOUND', 'API monitor not found');
});
router.delete('/:id', requireCsrf, async (req, res) => { const deleted = await deleteMonitor(req.params.id); return deleted ? ok(res, { deleted: true }) : fail(res, 404, 'NOT_FOUND', 'API monitor not found'); });
router.post('/:id/check', requireCsrf, async (req, res) => {
  const result = await runMonitorCheck(req.params.id, { force: true });
  if (!result) return fail(res, 404, 'NOT_FOUND_OR_CHECK_RUNNING', 'Monitor was not found or a check is already running');
  const monitor = await getMonitor(req.params.id, { admin: true });
  return ok(res, { check: result, monitor });
});
router.get('/:id/checks', async (req, res) => {
  const exists = await prisma.apiMonitor.findFirst({ where: { id: req.params.id, isDemo: false }, select: { id: true } });
  if (!exists) return fail(res, 404, 'NOT_FOUND', 'API monitor not found');
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize) || 100));
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;
  if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) return fail(res, 400, 'INVALID_DATE', 'Invalid check history date range');
  if (req.query.status && !['success', 'failure'].includes(String(req.query.status))) return fail(res, 400, 'INVALID_STATUS', 'Status must be success or failure');
  return ok(res, await monitorChecks(req.params.id, { page, pageSize, from, to, status: req.query.status && String(req.query.status) }));
});
router.get('/:id/analytics', async (req, res) => {
  const exists = await prisma.apiMonitor.findFirst({ where: { id: req.params.id, isDemo: false }, select: { id: true } });
  return exists ? ok(res, await monitorAnalytics({ id: req.params.id, range: String(req.query.range || '24h') })) : fail(res, 404, 'NOT_FOUND', 'API monitor not found');
});

export default router;
