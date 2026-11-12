import https from 'node:https';
import http from 'node:http';
import { URL } from 'node:url';
import { prisma } from '../lib/prisma.js';

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

    // Alert on SSL expiry < 14 days
    if (result.sslDaysRemaining != null && result.sslDaysRemaining < 14) {
      const existingSslAlert = await prisma.alert.findFirst({
        where: {
          apiMonitorId: monitor.id,
          title: { contains: 'SSL certificate expiring' },
          status: { in: ['OPEN', 'ACKNOWLEDGED'] },
        },
      });
      if (!existingSslAlert) {
        await prisma.alert.create({
          data: {
            apiMonitorId: monitor.id,
            title: `SSL certificate expiring: ${monitor.name}`,
            description: `Certificate expires in ${result.sslDaysRemaining} days`,
            severity: result.sslDaysRemaining < 7 ? 'CRITICAL' : 'HIGH',
            status: 'OPEN',
            isDemo: false,
            triggeredAt: new Date(),
          },
        });
      }
    }

    // Resolve SSL alert if cert is now healthy
    if (result.sslDaysRemaining != null && result.sslDaysRemaining >= 14) {
      await prisma.alert.updateMany({
        where: {
          apiMonitorId: monitor.id,
          title: { contains: 'SSL certificate expiring' },
          status: { in: ['OPEN', 'ACKNOWLEDGED'] },
        },
        data: { status: 'RESOLVED', resolvedAt: new Date() },
      });
    }

    ran++;
  }

  return { ran };
}
