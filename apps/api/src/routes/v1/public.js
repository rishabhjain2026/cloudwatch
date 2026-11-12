import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../../config/env.js';
import {
  alertsHandler,
  apisHandler,
  costsHandler,
  deploymentsHandler,
  dockerHandler,
  domainsHandler,
  incidentsHandler,
  logsHandler,
  networkHandler,
  overviewHandler,
  serversHandler,
} from '../../controllers/publicController.js';

const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.RATE_LIMIT_PUBLIC_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests' },
  },
});

const router = Router();
router.use(publicLimiter);

router.get('/overview', overviewHandler);
router.get('/servers', serversHandler);
router.get('/alerts', alertsHandler);
router.get('/incidents', incidentsHandler);
router.get('/logs', logsHandler);
router.get('/deployments', deploymentsHandler);
router.get('/apis', apisHandler);
router.get('/docker', dockerHandler);
router.get('/network', networkHandler);
router.get('/costs', costsHandler);
router.get('/domains', domainsHandler);

export default router;
