import crypto from 'node:crypto';
import { env } from '../config/env.js';

function encryptionKey() {
  if (!env.API_MONITOR_ENCRYPTION_KEY) {
    throw Object.assign(new Error('API_MONITOR_ENCRYPTION_KEY is required to store request headers or a request body'), { status: 503, code: 'MONITOR_ENCRYPTION_NOT_CONFIGURED' });
  }
  const value = env.API_MONITOR_ENCRYPTION_KEY;
  const key = /^[\da-f]{64}$/i.test(value) ? Buffer.from(value, 'hex') : Buffer.from(value, 'base64');
  if (key.length !== 32) throw Object.assign(new Error('API monitor encryption key must be 32 bytes (64 hex characters or base64)'), { status: 503, code: 'MONITOR_ENCRYPTION_KEY_INVALID' });
  return key;
}

export function encryptMonitorConfig(value) {
  if (!value || (!Object.keys(value.headers || {}).length && !value.body)) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return `v1:${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptMonitorConfig(value) {
  if (!value) return { headers: {}, body: null };
  const [version, ivText, tagText, encryptedText] = value.split(':');
  if (version !== 'v1' || !ivText || !tagText || !encryptedText) throw Object.assign(new Error('Stored monitor request configuration cannot be decrypted'), { code: 'MONITOR_CONFIG_DECRYPT_FAILED' });
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivText, 'base64'));
    decipher.setAuthTag(Buffer.from(tagText, 'base64'));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(encryptedText, 'base64')), decipher.final()]).toString('utf8'));
  } catch {
    throw Object.assign(new Error('Stored monitor request configuration cannot be decrypted'), { code: 'MONITOR_CONFIG_DECRYPT_FAILED' });
  }
}
