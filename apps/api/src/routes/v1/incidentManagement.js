import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { requireCsrf } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { ok, fail } from '../../utils/response.js';
import { prisma } from '../../lib/prisma.js';
import {
  addIncidentComment, associateAlerts, createManualIncident, getIncident, incidentAnalytics,
  incidentOverview, incidentResourceCatalog, listAssignableUsers, listAutomationRules, listIncidents, saveAutomationRule,
  savePostmortem, transitionIncident, updateIncident,
} from '../../services/incidentService.js';
import {
  askIncidentQuestion, createAiPostmortemDraft, getIncidentAnalysis, incidentChatHistory,
  requestIncidentAnalysis, similarIncidents,
} from '../../services/incidentAiService.js';
import { aiProviderStatus } from '../../services/aiProvider.js';

const router = Router();
const severity = z.enum(['CRITICAL','HIGH','MEDIUM','LOW']);
const priority = z.enum(['P0','P1','P2','P3']);
const categories = z.enum(['AWS','DOCKER','APPLICATION','INFRASTRUCTURE','AGENT']);
const createSchema = z.object({ title: z.string().trim().min(3).max(240), description: z.string().max(12000).optional().nullable(), severity, priority: priority.default('P2'), category: categories.default('INFRASTRUCTURE'), impactDescription: z.string().max(6000).optional().nullable(), resourceType: z.enum(['HOST','EC2_INSTANCE','DOCKER_HOST','DOCKER_CONTAINER','API_MONITOR']).optional().nullable(), resourceId: z.string().max(200).optional().nullable(), assigneeId: z.string().optional().nullable(), alertIds: z.array(z.string()).max(100).default([]) });
const updateSchema = z.object({ title: z.string().trim().min(3).max(240).optional(), description: z.string().max(12000).optional().nullable(), severity: severity.optional(), priority: priority.optional(), category: categories.optional(), impactDescription: z.string().max(6000).optional().nullable(), rootCause: z.string().max(12000).optional().nullable(), assigneeId: z.string().optional().nullable() }).strict();
const automationSchema = z.object({ name: z.string().trim().min(1).max(160), category: categories.optional().nullable(), alertType: z.string().max(80).optional().nullable(), resourceType: z.string().max(80).optional().nullable(), minimumSeverity: severity.default('CRITICAL'), enabled: z.boolean().default(true), correlationWindowSec: z.number().int().min(60).max(604800).default(900), correlateByResource: z.boolean().default(true), correlateByCategory: z.boolean().default(true), correlateByAlertType: z.boolean().default(false) });
const postmortemSchema = z.object({ summary: z.string().max(12000).optional().nullable(), rootCause: z.string().max(12000).optional().nullable(), impact: z.string().max(12000).optional().nullable(), startedAt: z.string().datetime().optional().nullable(), detectedAt: z.string().datetime().optional().nullable(), acknowledgedAt: z.string().datetime().optional().nullable(), resolvedAt: z.string().datetime().optional().nullable(), downtimeMs: z.number().int().min(0).optional().nullable(), resolutionSteps: z.string().max(20000).optional().nullable(), lessonsLearned: z.string().max(12000).optional().nullable(), preventiveActions: z.string().max(12000).optional().nullable(), responsibleUserId: z.string().optional().nullable(), status: z.enum(['DRAFT','APPROVED']).default('DRAFT') }).strict().transform((data) => Object.fromEntries(Object.entries(data).map(([key,value]) => [key, ['startedAt','detectedAt','acknowledgedAt','resolvedAt'].includes(key) && value ? new Date(value) : value])));
const chatLimiter = rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false, keyGenerator: (req) => req.user?.id || req.ip });
const analysisLimiter = rateLimit({ windowMs: 60_000, max: 5, standardHeaders: true, legacyHeaders: false, keyGenerator: (req) => req.user?.id || req.ip });

router.get('/overview', async (req,res) => ok(res, await incidentOverview(Math.min(365,Math.max(1,Number(req.query.days)||30)))));
router.get('/analytics', async (req,res) => ok(res, await incidentAnalytics(Math.min(365,Math.max(1,Number(req.query.days)||30)))));
router.get('/team', async (_req,res) => ok(res, await listAssignableUsers()));
router.get('/resources', async (_req,res) => ok(res, await incidentResourceCatalog()));
router.get('/automation-rules', async (_req,res) => ok(res, await listAutomationRules()));
router.post('/automation-rules', requireCsrf, validate(automationSchema), async (req,res) => ok(res, await saveAutomationRule(req.body,req.user.id),undefined,201));
router.patch('/automation-rules/:id', requireCsrf, async (req,res) => {
  const parsed=automationSchema.partial().strict().safeParse(req.body); if(!parsed.success)return fail(res,400,'VALIDATION_ERROR','Invalid automation rule fields');
  const exists=await prisma.incidentAutomationRule.findUnique({where:{id:req.params.id}});if(!exists)return fail(res,404,'NOT_FOUND','Automation rule not found');
  return ok(res,await saveAutomationRule(parsed.data,req.user.id,req.params.id));
});
router.get('/incidents', async (req,res) => {
  const page=Math.max(1,Number(req.query.page)||1); const pageSize=Math.min(100,Math.max(1,Number(req.query.pageSize)||25));
  const statuses=['DETECTED','OPEN','ACKNOWLEDGED','INVESTIGATING','RESOLVED','CLOSED'];
  if(req.query.status&&!statuses.includes(String(req.query.status)))return fail(res,400,'INVALID_STATUS','Unknown incident status');
  if(req.query.severity&&!severity.safeParse(String(req.query.severity)).success)return fail(res,400,'INVALID_SEVERITY','Unknown severity');
  const result=await listIncidents({page,pageSize,status:req.query.status&&String(req.query.status),severity:req.query.severity&&String(req.query.severity),category:req.query.category&&String(req.query.category),search:req.query.search&&String(req.query.search).slice(0,200),assigneeId:req.query.assigneeId&&String(req.query.assigneeId)});
  return ok(res,result.items,{page,pageSize,total:result.total});
});
router.post('/incidents', requireCsrf, validate(createSchema), async (req,res) => ok(res,await createManualIncident(req.body,req.user.id),undefined,201));
router.get('/incidents/:id', async (req,res) => { const row=await getIncident(req.params.id);return row?ok(res,row):fail(res,404,'NOT_FOUND','Incident not found'); });
router.patch('/incidents/:id', requireCsrf, validate(updateSchema), async (req,res) => { const row=await updateIncident(req.params.id,req.body,req.user.id);return row?ok(res,row):fail(res,404,'NOT_FOUND','Incident not found'); });
router.post('/incidents/:id/acknowledge', requireCsrf, async (req,res) => { const row=await transitionIncident(req.params.id,'ACKNOWLEDGED',req.user.id,String(req.body?.comment||''));return row?ok(res,row):fail(res,404,'NOT_FOUND','Incident not found'); });
router.post('/incidents/:id/investigate', requireCsrf, async (req,res) => { const row=await transitionIncident(req.params.id,'INVESTIGATING',req.user.id,String(req.body?.comment||''));return row?ok(res,row):fail(res,404,'NOT_FOUND','Incident not found'); });
router.post('/incidents/:id/resolve', requireCsrf, async (req,res) => { const resolution=z.object({comment:z.string().max(4000).optional(),resolutionDescription:z.string().trim().min(3).max(12000),rootCause:z.string().max(12000).optional().nullable(),actionsTaken:z.string().max(12000).optional().nullable(),preventiveActions:z.string().max(12000).optional().nullable()}).parse(req.body);const row=await transitionIncident(req.params.id,'RESOLVED',req.user.id,resolution.comment,resolution);return row?ok(res,row):fail(res,404,'NOT_FOUND','Incident not found'); });
router.post('/incidents/:id/close', requireCsrf, async (req,res) => { const row=await transitionIncident(req.params.id,'CLOSED',req.user.id,String(req.body?.comment||''));return row?ok(res,row):fail(res,404,'NOT_FOUND','Incident not found'); });
router.post('/incidents/:id/reopen', requireCsrf, async (req,res) => { const body=z.object({reason:z.string().trim().min(3).max(4000)}).parse(req.body);const row=await transitionIncident(req.params.id,'OPEN',req.user.id,body.reason);return row?ok(res,row):fail(res,404,'NOT_FOUND','Incident not found'); });
router.post('/incidents/:id/comments', requireCsrf, async (req,res) => { const {content}=z.object({content:z.string().trim().min(1).max(8000)}).parse(req.body);const row=await addIncidentComment(req.params.id,content,req.user.id);return row?ok(res,row,undefined,201):fail(res,404,'NOT_FOUND','Incident not found'); });
router.post('/incidents/:id/alerts', requireCsrf, async (req,res) => { const {alertIds}=z.object({alertIds:z.array(z.string()).min(1).max(100)}).parse(req.body);const row=await associateAlerts(req.params.id,alertIds,req.user.id);return row?ok(res,row):fail(res,404,'NOT_FOUND','Incident not found'); });
router.get('/incidents/:id/similar', async (req,res) => {const rows=await similarIncidents(req.params.id);return rows?ok(res,rows):fail(res,404,'NOT_FOUND','Incident not found');});
router.get('/ai/status', async (_req,res) => ok(res,aiProviderStatus()));
router.post('/incidents/:id/ai/analyses', requireCsrf, analysisLimiter, async (req,res) => { const result=await requestIncidentAnalysis(req.params.id,req.user.id);if(!result)return fail(res,404,'NOT_FOUND','Incident not found');if(!result.configured)return fail(res,503,'AI_NOT_CONFIGURED','Configure AI_PROVIDER, AI_API_KEY, and AI_MODEL in the API environment to run analysis.',{analysisId:result.analysis.id});return ok(res,result,undefined,result.duplicate?200:202); });
router.get('/incidents/:id/ai/analyses', async (req,res) => {const rows=await prisma.incidentAIAnalysis.findMany({where:{incidentId:req.params.id},orderBy:{version:'desc'},select:{id:true,status:true,provider:true,model:true,version:true,failureCode:true,requestedAt:true,startedAt:true,completedAt:true}});return ok(res,rows);});
router.get('/incidents/:id/ai/analyses/:analysisId', async (req,res) => {const row=await getIncidentAnalysis(req.params.id,req.params.analysisId);return row?ok(res,row):fail(res,404,'NOT_FOUND','Analysis not found');});
router.post('/incidents/:id/ai/chat', requireCsrf, chatLimiter, async (req,res) => {const {question}=z.object({question:z.string().trim().min(1).max(4000)}).parse(req.body);const result=await askIncidentQuestion(req.params.id,req.user.id,question);return result?ok(res,result,undefined,201):fail(res,404,'NOT_FOUND','Incident not found');});
router.get('/incidents/:id/ai/chat', async (req,res) => ok(res,await incidentChatHistory(req.params.id,Math.max(1,Number(req.query.page)||1))));
router.post('/incidents/:id/postmortem/ai-draft', requireCsrf, async (req,res) => {const row=await createAiPostmortemDraft(req.params.id,req.user.id);return row?ok(res,row):fail(res,404,'NOT_FOUND','Incident not found');});
router.get('/incidents/:id/postmortem', async (req,res) => {const incident=await prisma.incident.findFirst({where:{id:req.params.id,isDemo:false},select:{id:true}});if(!incident)return fail(res,404,'NOT_FOUND','Incident not found');return ok(res,await prisma.incidentPostmortem.findUnique({where:{incidentId:req.params.id},include:{responsibleUser:{select:{id:true,name:true}},approvedBy:{select:{id:true,name:true}}}}));});
router.put('/incidents/:id/postmortem', requireCsrf, async (req,res) => {const data=postmortemSchema.parse(req.body);const row=await savePostmortem(req.params.id,data,req.user.id);return row?ok(res,row):fail(res,404,'NOT_FOUND','Incident not found');});

export default router;
