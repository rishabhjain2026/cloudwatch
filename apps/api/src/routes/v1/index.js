import { Router } from 'express';
import publicRoutes from './public.js';
import adminAuthRoutes from './adminAuth.js';
import agentRoutes from './agent.js';
import adminRoutes from './admin.js';
import webhookRoutes from './webhook.js';
import notificationRoutes from './notifications.js';

const router = Router();

router.use('/public', publicRoutes);
router.use('/admin/auth', adminAuthRoutes);
router.use('/admin', adminRoutes);
router.use('/agent', agentRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/notifications', notificationRoutes);

export default router;
