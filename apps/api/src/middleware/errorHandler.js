import { ZodError } from 'zod';
import { fail } from '../utils/response.js';
import { env } from '../config/env.js';

export function notFoundHandler(_req, res) {
  return fail(res, 404, 'NOT_FOUND', 'Route not found');
}

export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return fail(res, 400, 'VALIDATION_ERROR', 'Invalid request', err.flatten());
  }

  if (err?.code === 'CREDENTIALS') {
    return fail(res, 401, 'UNAUTHORIZED', err.message || 'Invalid credentials');
  }

  if (err?.code === 'FORBIDDEN') {
    return fail(res, 403, 'FORBIDDEN', err.message || 'Forbidden');
  }

  if (err?.code === 'CSRF') {
    return fail(res, 403, 'CSRF_INVALID', err.message || 'Invalid CSRF token');
  }

  console.error(err);
  const message =
    env.NODE_ENV === 'production' ? 'Internal server error' : err.message || 'Internal server error';
  return fail(res, err.status || 500, 'INTERNAL_ERROR', message);
}
