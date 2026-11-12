import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { fail } from '../utils/response.js';

export const ACCESS_COOKIE = 'ip_access';
export const CSRF_COOKIE = 'ip_csrf';

export function signAccessToken(payload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE || env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 1000 * 60 * 60 * 8,
  };
}

export function csrfCookieOptions() {
  return {
    httpOnly: false,
    secure: env.COOKIE_SECURE || env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 1000 * 60 * 60 * 8,
  };
}

export async function optionalAuth(req, _res, next) {
  try {
    const token = req.cookies?.[ACCESS_COOKIE];
    if (!token) {
      req.user = null;
      return next();
    }
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      include: { role: true },
    });
    req.user = user && user.isActive ? user : null;
    return next();
  } catch {
    req.user = null;
    return next();
  }
}

export async function requireAuth(req, res, next) {
  await optionalAuth(req, res, () => {
    if (!req.user) {
      return fail(res, 401, 'UNAUTHORIZED', 'Authentication required');
    }
    return next();
  });
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return fail(res, 401, 'UNAUTHORIZED', 'Authentication required');
    }
    const roleName = req.user.role?.name;
    if (!roles.includes(roleName)) {
      return fail(res, 403, 'FORBIDDEN', 'Insufficient permissions');
    }
    return next();
  };
}

export function requireCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  const header = req.get('x-csrf-token');
  const cookie = req.cookies?.[CSRF_COOKIE];
  if (!header || !cookie || header !== cookie) {
    return fail(res, 403, 'CSRF_INVALID', 'Invalid CSRF token');
  }
  return next();
}
