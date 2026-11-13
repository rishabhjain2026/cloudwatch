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
const DOCKER_METRICS_INTERVAL_SEC = Math.max(5, parseInt(process.env.INFRAPULSE_DOCKER_METRICS_INTERVAL_SEC || '30', 10));
const DOCKER_INVENTORY_INTERVAL_SEC = Math.max(10, parseInt(process.env.INFRAPULSE_DOCKER_INVENTORY_INTERVAL_SEC || '60', 10));

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
let dockerCollector = null;
let lastDockerInventoryAt = 0;
let dockerTickActive = false;

// ── Docker collector ──────────────────────────────────────────────────────────
async function collectDocker() {
  if (!DOCKER_ENABLED) return null;
  try {
    if (!dockerCollector) {
      const { createDockerCollector } = await import('./docker.js');
      dockerCollector = createDockerCollector({ timeoutMs: TIMEOUT_MS });
    }
    const now = Date.now();
    const includeInventory = !lastDockerInventoryAt || now - lastDockerInventoryAt >= DOCKER_INVENTORY_INTERVAL_SEC * 1000;
    const result = await dockerCollector.collect({ includeInventory });
    if (includeInventory) lastDockerInventoryAt = now;
    return result;
  } catch (err) {
    console.warn('[agent] Docker Engine unavailable; will retry:', err.message);
    return { available: false, dockerError: 'DOCKER_ENGINE_UNAVAILABLE', collectedAt: new Date().toISOString() };
  }
}

async function dockerTick() {
  if (!DOCKER_ENABLED || dockerTickActive) return;
  dockerTickActive = true;
  try {
    const snapshot = await collectDocker();
    await client.post('/api/v1/agent/docker', snapshot);
    if (snapshot.available) {
      console.log(`[agent] Docker snapshot — ${snapshot.runningCount} running / ${snapshot.containerCount} total container(s), ${snapshot.imageCount} image(s)`);
      if (snapshot.statsUnavailableCount > 0) {
        console.warn(`[agent] Docker Engine is reachable; stats unavailable for ${snapshot.statsUnavailableCount} container(s).`);
      }
    }
  } catch (err) {
    console.error(`[agent] Docker sync failed: ${err.message}`);
  } finally {
    dockerTickActive = false;
  }
}

// ── Main loop ─────────────────────────────────────────────────────────────────
let iteration = 0;
let tickActive = false;

async function tick() {
  if (tickActive) return;
  tickActive = true;
  iteration++;
  try {
  const { payload, sysinfo } = await collectAll();

  // Push metrics
  try {
    const result = await client.post('/api/v1/agent/metrics', payload);
    console.log(`[agent] tick #${iteration} — stored ${result.data?.stored ?? '?'} samples | CPU: ${payload.cpu?.usagePercent ?? 'n/a'}% | MEM: ${payload.memory?.usagePercent ?? 'n/a'}%`);
  } catch (err) {
    console.error(`[agent] metrics push failed: ${err.message}`);
  }

  // Heartbeat on every host collection to keep online status independent of Docker stats.
  try {
    await client.post('/api/v1/agent/heartbeat', {
      uptime: sysinfo.uptimeSec,
      os: sysinfo.os,
      kernelVersion: sysinfo.kernelVersion,
    });
  } catch (err) {
    console.error(`[agent] heartbeat failed: ${err.message}`);
  }
  } finally {
    tickActive = false;
  }
}

async function main() {
  const sysinfo = await getSystemInfo();
  console.log(`[agent] starting on ${sysinfo.hostname} (${sysinfo.platform})`);
  console.log(`[agent] API: ${API_URL} | host interval: ${INTERVAL_SEC}s | docker: ${DOCKER_ENABLED}`);
  if (DOCKER_ENABLED) console.log(`[agent] Docker metrics: ${DOCKER_METRICS_INTERVAL_SEC}s | inventory: ${DOCKER_INVENTORY_INTERVAL_SEC}s`);
  console.log('[agent] token: ip_agent_***MASKED***');

  // First tick immediately
  await tick();
  if (DOCKER_ENABLED) {
    await dockerTick();
    setInterval(dockerTick, DOCKER_METRICS_INTERVAL_SEC * 1000);
  }

  // Then on interval
  setInterval(tick, INTERVAL_SEC * 1000);
}

main().catch(err => {
  console.error('[agent] fatal error:', err.message);
  process.exit(1);
});
