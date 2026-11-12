import crypto from 'node:crypto';
import bcrypt from 'bcrypt';

export function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function createCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function createAgentToken() {
  const raw = `ip_agent_${crypto.randomBytes(24).toString('hex')}`;
  return {
    raw,
    prefix: raw.slice(0, 16),
    hash: hashToken(raw),
  };
}
