import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../../config/env.js';
import {
  alertsHandler,
  apisHandler,
  costsHandler,
  deploymentsHandler,
  domainsHandler,
  incidentsHandler,
  logsHandler,
  networkHandler,
  overviewHandler,
  serversHandler,
} from '../../controllers/publicController.js';
import { awsResourceDetailHandler, awsResourcesHandler, awsResourceSummaryHandler } from '../../controllers/awsController.js';
import { dockerContainerDetailHandler, dockerOverviewHandler } from '../../controllers/dockerController.js';

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
router.get('/docker', dockerOverviewHandler);
router.get('/docker/containers/:id', dockerContainerDetailHandler);
router.get('/network', networkHandler);
router.get('/costs', costsHandler);
router.get('/domains', domainsHandler);
router.get('/aws/resources/summary', awsResourceSummaryHandler);
router.get('/aws/resources/:id', awsResourceDetailHandler);
router.get('/aws/resources', awsResourcesHandler);

export default router;
