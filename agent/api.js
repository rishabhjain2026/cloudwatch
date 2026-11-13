/**
 * Minimal HTTP client for the InfraPulse agent.
 * Uses Node.js built-in https/http — no external dependencies.
 * Never logs the agent token.
 */

import https from 'node:https';
import http from 'node:http';
import { URL } from 'node:url';

export function createApiClient(apiUrl, token, timeoutMs = 10000) {
  const base = new URL(apiUrl);
  const lib = base.protocol === 'https:' ? https : http;

  function post(path, body, retries = 3, delayMs = 3000) {
    const data = JSON.stringify(body);
    const options = {
      hostname: base.hostname,
      port: base.port || (base.protocol === 'https:' ? 443 : 80),
      path,
      method: 'POST',
      timeout: timeoutMs,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'InfraPulse-Agent/1.0',
      },
    };

    return new Promise((resolve, reject) => {
      const req = lib.request(options, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(raw);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              const error = new Error(`HTTP ${res.statusCode}: ${parsed?.error?.message || raw}`);
              error.statusCode = res.statusCode;
              reject(error);
            }
          } catch {
            reject(new Error(`HTTP ${res.statusCode}: non-JSON response`));
          }
        });
      });

      req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
      req.on('error', reject);
      req.write(data);
      req.end();
    }).catch(async (err) => {
      const retryable = err.statusCode == null || err.statusCode === 429 || err.statusCode >= 500;
      if (retries > 0 && retryable) {
        await new Promise(r => setTimeout(r, delayMs));
        return post(path, body, retries - 1, delayMs * 1.5);
      }
      throw err;
    });
  }

  return { post };
}
