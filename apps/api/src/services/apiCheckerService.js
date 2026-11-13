import https from 'node:https';
import http from 'node:http';
import { URL } from 'node:url';
import { prisma } from '../lib/prisma.js';
import { evaluateSignal, evaluateApiMonitorRules } from './alertService.js';

/**
 * Run a single HTTP/HTTPS health check against a URL.
 * Returns { statusCode, latencyMs, success, error, sslDaysRemaining }
 */
export async function checkEndpoint(url, expectedStatus = 200, timeoutMs = 10000) {
  const start = Date.now();
  let parsed;

  try {
    parsed = new URL(url);
  } catch {
    return { statusCode: null, latencyMs: 0, success: false, error: 'Invalid URL', sslDaysRemaining: null };
  }

  const isHttps = parsed.protocol === 'https:';
  const lib = isHttps ? https : http;

  return new Promise((resolve) => {
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'GET',
      timeout: timeoutMs,
      headers: { 'User-Agent': 'InfraPulse-Monitor/1.0' },
    };

    const req = lib.request(options, (res) => {
      const latencyMs = Date.now() - start;
      let sslDaysRemaining = null;

      if (isHttps && res.socket?.getPeerCertificate) {
        try {
          const cert = res.socket.getPeerCertificate();
          if (cert?.valid_to) {
            const expiry = new Date(cert.valid_to);
            sslDaysRemaining = Math.floor((expiry - Date.now()) / 86400000);
          }
        } catch {
          // SSL info unavailable — not a failure
        }
      }

      // Drain the response body to free the socket
      res.resume();

      resolve({
        statusCode: res.statusCode,
        latencyMs,
        success: res.statusCode === expectedStatus,
        error: res.statusCode !== expectedStatus ? `HTTP ${res.statusCode}` : null,
        sslDaysRemaining,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        statusCode: null,
        latencyMs: timeoutMs,
        success: false,
        error: 'Timeout',
        sslDaysRemaining: null,
      });
    });

    req.on('error', (err) => {
      resolve({
        statusCode: null,
        latencyMs: Date.now() - start,
        success: false,
        error: err.message,
        sslDaysRemaining: null,
      });
    });

    req.end();
  });
}

/**
 * Run checks for all enabled, non-demo API monitors that are due.
 */
export async function runDueApiChecks() {
  const monitors = await prisma.apiMonitor.findMany({
    where: { enabled: true, isDemo: false },
    include: {
      checks: {
        orderBy: { checkedAt: 'desc' },
        take: 1,
      },
    },
  });

  const now = Date.now();
  let ran = 0;

  for (const monitor of monitors) {
    const lastCheck = monitor.checks[0];
    const intervalMs = monitor.intervalSec * 1000;
    const nextDue = lastCheck ? lastCheck.checkedAt.getTime() + intervalMs : 0;

    if (now < nextDue) continue;

    const result = await checkEndpoint(monitor.url, monitor.expectedStatus);

    await prisma.apiCheck.create({
      data: {
        apiMonitorId: monitor.id,
        statusCode: result.statusCode,
        latencyMs: result.latencyMs,
        success: result.success,
        error: result.error,
        sslDaysRemaining: result.sslDaysRemaining,
        checkedAt: new Date(),
      },
    });

    await evaluateSignal({ key:`api-unavailable:${monitor.id}`,alertType:'API_UNAVAILABLE',category:'APPLICATION',resourceType:'API_MONITOR',resourceId:monitor.id,resourceName:monitor.name,apiMonitorId:monitor.id,title:`API unavailable: ${monitor.name}`,description:result.error||`Expected HTTP ${monitor.expectedStatus}; received ${result.statusCode ?? 'no response'}.`,triggered:!result.success,severity:'HIGH',meta:{statusCode:result.statusCode,latencyMs:result.latencyMs} });
    await evaluateApiMonitorRules(monitor);

    if (result.sslDaysRemaining != null) await evaluateSignal({ key:`ssl-certificate-expiring:${monitor.id}`,alertType:'SSL_CERT_EXPIRING',category:'APPLICATION',resourceType:'API_MONITOR',resourceId:monitor.id,resourceName:monitor.name,apiMonitorId:monitor.id,title:`SSL certificate expiring: ${monitor.name}`,description:`Certificate expires in ${result.sslDaysRemaining} days.`,triggered:result.sslDaysRemaining<14,severity:result.sslDaysRemaining<7?'CRITICAL':'HIGH',meta:{sslDaysRemaining:result.sslDaysRemaining} });

    ran++;
  }

  return { ran };
}
