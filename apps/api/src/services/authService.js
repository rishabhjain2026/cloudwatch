import { prisma } from '../lib/prisma.js';
import { createCsrfToken, verifyPassword } from '../utils/crypto.js';
import { publicUser } from '../utils/sanitize.js';
import {
  ACCESS_COOKIE,
  CSRF_COOKIE,
  cookieOptions,
  csrfCookieOptions,
  signAccessToken,
} from '../middleware/auth.js';

export async function login(email, password, res, meta = {}) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { role: true },
  });

  if (!user || !user.isActive) {
    const err = new Error('Invalid email or password');
    err.code = 'CREDENTIALS';
    throw err;
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    const err = new Error('Invalid email or password');
    err.code = 'CREDENTIALS';
    throw err;
  }

  const token = signAccessToken({ sub: user.id, role: user.role.name });
  const csrf = createCsrfToken();

  res.cookie(ACCESS_COOKIE, token, cookieOptions());
  res.cookie(CSRF_COOKIE, csrf, csrfCookieOptions());

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: 'AUTH_LOGIN',
      resourceType: 'User',
      resourceId: user.id,
      ip: meta.ip,
    },
  });

  return { user: publicUser(user), csrfToken: csrf };
}

export async function logout(req, res) {
  if (req.user) {
    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'AUTH_LOGOUT',
        resourceType: 'User',
        resourceId: req.user.id,
        ip: req.ip,
      },
    });
  }

  res.clearCookie(ACCESS_COOKIE, { path: '/' });
  res.clearCookie(CSRF_COOKIE, { path: '/' });
  return { loggedOut: true };
}

export function currentUser(req) {
  return publicUser(req.user);
}
