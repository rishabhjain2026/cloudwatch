import { login, logout, currentUser } from '../services/authService.js';
import { ok } from '../utils/response.js';
import { CSRF_COOKIE } from '../middleware/auth.js';

export async function loginHandler(req, res) {
  const result = await login(req.body.email, req.body.password, res, { ip: req.ip });
  return ok(res, result);
}

export async function logoutHandler(req, res) {
  const result = await logout(req, res);
  return ok(res, result);
}

export async function meHandler(req, res) {
  return ok(res, {
    user: currentUser(req),
    csrfToken: req.cookies?.[CSRF_COOKIE] ?? null,
  });
}
