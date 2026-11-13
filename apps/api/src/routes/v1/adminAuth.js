import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../../config/env.js';
import { loginHandler, logoutHandler, meHandler } from '../../controllers/authController.js';
import { optionalAuth, requireAuth, requireCsrf, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { loginSchema } from '../../validators/authValidators.js';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.RATE_LIMIT_AUTH_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many login attempts' },
  },
});

const router = Router();

router.post('/login', authLimiter, validate(loginSchema), loginHandler);
router.post('/logout', optionalAuth, requireCsrf, logoutHandler);
router.get('/me', requireAuth, meHandler);

export default router;
