/**
 * InfraPulse monitoring agent — main loop.
 *
 * Reads config from environment variables (never hardcoded).
 * Collects real system metrics and pushes to the InfraPulse API.
 *
 * Required env vars:
 *   INFRAPULSE_API_URL   — e.g. http://localhost:4000
 *   INFRAPULSE_TOKEN     — agent token from register.js
 *
 * Optional:
 *   INFRAPULSE_INTERVAL_SEC  — collection interval (default: 30)
 *   INFRAPULSE_DOCKER        — 'true' to enable Docker sync
 */

import os from 'node:os';
import { collectAll, getSystemInfo } from './metrics.js';
import { createApiClient } from './api.js';

// ── Config ────────────────────────────────────────────────────────────────────
const API_URL = process.env.INFRAPULSE_API_URL;
const TOKEN = process.env.INFRAPULSE_TOKEN;
const INTERVAL_SEC = parseInt(process.env.INFRAPULSE_INTERVAL_SEC || '30', 10);
const DOCKER_ENABLED = process.env.INFRAPULSE_DOCKER === 'true';
const TIMEOUT_MS = parseInt(process.env.INFRAPULSE_TIMEOUT_MS || '10000', 10);

if (!API_URL || !TOKEN) {
  console.error('[agent] INFRAPULSE_API_URL and INFRAPULSE_TOKEN are required.');
  console.error('[agent] Run register.js first to get a token.');
  process.exit(1);
}

if (!TOKEN.startsWith('ip_agent_') || TOKEN.length !== 57) {
  console.error('[agent] Token format invalid. Expected ip_agent_<48 hex chars>.');
  process.exit(1);
}

const client = createApiClient(API_URL, TOKEN, TIMEOUT_MS);

// ── Docker collector ──────────────────────────────────────────────────────────
async function collectDocker() {
  if (!DOCKER_ENABLED) return null;
  try {
    const { default: dockerMetrics } = await import('./docker.js');
    return dockerMetrics();
  } catch (err) {
    console.warn('[agent] Docker collection failed:', err.message);
    return null;
  }
}

// ── Main loop ─────────────────────────────────────────────────────────────────
let iteration = 0;

async function tick() {
  iteration++;
  const { payload, sysinfo } = await collectAll();

  // Push metrics
  try {
    const result = await client.post('/api/v1/agent/metrics', payload);
    console.log(`[agent] tick #${iteration} — stored ${result.data?.stored ?? '?'} samples | CPU: ${payload.cpu?.usagePercent ?? 'n/a'}% | MEM: ${payload.memory?.usagePercent ?? 'n/a'}%`);
  } catch (err) {
    console.error(`[agent] metrics push failed: ${err.message}`);
  }

  // Heartbeat every 5 ticks
  if (iteration % 5 === 1) {
    try {
      await client.post('/api/v1/agent/heartbeat', {
        uptime: sysinfo.uptimeSec,
        os: sysinfo.os,
        kernelVersion: sysinfo.kernelVersion,
      });
    } catch (err) {
      console.error(`[agent] heartbeat failed: ${err.message}`);
    }
  }

  // Docker sync every 10 ticks
  if (DOCKER_ENABLED && iteration % 10 === 1) {
    const containers = await collectDocker();
    if (containers) {
      try {
        await client.post('/api/v1/agent/docker', { containers });
        console.log(`[agent] docker sync — ${containers.length} container(s)`);
      } catch (err) {
        console.error(`[agent] docker sync failed: ${err.message}`);
      }
    }
  }
}

async function main() {
  const sysinfo = await getSystemInfo();
  console.log(`[agent] starting on ${sysinfo.hostname} (${sysinfo.platform})`);
  console.log(`[agent] API: ${API_URL} | interval: ${INTERVAL_SEC}s | docker: ${DOCKER_ENABLED}`);
  console.log('[agent] token: ip_agent_***MASKED***');

  // First tick immediately
  await tick();

  // Then on interval
  setInterval(tick, INTERVAL_SEC * 1000);
}

main().catch(err => {
  console.error('[agent] fatal error:', err.message);
  process.exit(1);
});
