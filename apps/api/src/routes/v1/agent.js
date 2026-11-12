import { Router } from 'express';
import { requireAgentAuth } from '../../middleware/agentAuth.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  heartbeatSchema,
  metricsSchema,
  dockerSyncSchema,
  logIngestSchema,
  registerAgentSchema,
} from '../../validators/agentValidators.js';
import {
  registerHandler,
  heartbeatHandler,
  metricsHandler,
  dockerSyncHandler,
  logsIngestHandler,
} from '../../controllers/agentController.js';

const router = Router();

// ── Agent-push routes (Bearer token auth) ────────────────────────────────────
router.post('/heartbeat', requireAgentAuth, validate(heartbeatSchema), heartbeatHandler);
router.post('/metrics', requireAgentAuth, validate(metricsSchema), metricsHandler);
router.post('/docker', requireAgentAuth, validate(dockerSyncSchema), dockerSyncHandler);
router.post('/logs', requireAgentAuth, validate(logIngestSchema), logsIngestHandler);

export default router;

// ── Admin registration route (exported separately for admin router) ───────────
export const agentRegisterRouter = Router();
agentRegisterRouter.post(
  '/register',
  requireAuth,
  requireRole('ADMIN'),
  validate(registerAgentSchema),
  registerHandler,
);
