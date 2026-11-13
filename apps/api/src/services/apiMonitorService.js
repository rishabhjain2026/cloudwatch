import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { encryptMonitorConfig, decryptMonitorConfig } from './apiMonitorCrypto.js';
import { resolvePublicAddress, validateEndpointUrl } from './apiCheckerService.js';

export function monitorHealth(monitor, latest) {
  if (!monitor.enabled) return 'PAUSED';
  if (!latest) return 'UNKNOWN';
  if (Date.now() - new Date(latest.checkedAt).getTime() > monitor.intervalSec * 3 * 1000) return 'UNKNOWN';
  if (!latest.success) return 'DOWN';
  if (monitor.warningLatencyMs != null && latest.latencyMs != null && latest.latencyMs >= monitor.warningLatencyMs) return 'DEGRADED';
  return 'UP';
}

function safeMonitor(monitor, { admin = false } = {}) {
  const latest = monitor.checks?.[0] || null;
  let displayUrl = null;
  try {
    const parsed = new URL(monitor.url);
    parsed.username = '';
    parsed.password = '';
    for (const key of [...parsed.searchParams.keys()]) if (/token|secret|password|api.?key|auth/i.test(key)) parsed.searchParams.set(key, '[redacted]');
    displayUrl = parsed.toString();
  } catch { displayUrl = 'Invalid stored endpoint URL'; }
  return {
    id: monitor.id, name: monitor.name, url: admin ? displayUrl : undefined, targetHost: (()=>{try{return new URL(monitor.url).host}catch{return 'invalid endpoint'}})(),
    method: monitor.method, intervalSec: monitor.intervalSec, enabled: monitor.enabled, isDemo: monitor.isDemo,
    expectedStatus: monitor.expectedStatus, expectedContent: admin ? monitor.expectedContent : undefined,
    timeoutMs: admin ? monitor.timeoutMs : undefined, warningLatencyMs: monitor.warningLatencyMs,
    criticalLatencyMs: monitor.criticalLatencyMs, sslWarnDays: monitor.sslWarnDays,
    hasRequestConfig: Boolean(monitor.requestConfigEncrypted), nextCheckAt: monitor.nextCheckAt,
    createdAt: monitor.createdAt, updatedAt: monitor.updatedAt,
    health: monitorHealth(monitor, latest), latestCheck: latest,
  };
}

export async function listMonitors({ admin = false, includePaused = true } = {}) {
  const demoOnly = !admin && env.DEMO_MODE;
  const monitors = await prisma.apiMonitor.findMany({
    where: { isDemo: Boolean(demoOnly), ...(!admin && !demoOnly ? { enabled: true } : {}) },
    include: { checks: { orderBy: { checkedAt: 'desc' }, take: 1 } }, orderBy: { name: 'asc' },
  });
  const grouped = await prisma.apiCheck.groupBy({ by: ['apiMonitorId', 'success'], where: { apiMonitorId: { in: monitors.map((monitor) => monitor.id) }, checkedAt: { gte: new Date(Date.now() - 86400000) } }, _count: { _all: true } });
  const uptimes = new Map();
  for (const group of grouped) { const item = uptimes.get(group.apiMonitorId) || { total: 0, successful: 0 }; item.total += group._count._all; if (group.success) item.successful += group._count._all; uptimes.set(group.apiMonitorId, item); }
  return monitors.filter((monitor) => includePaused || monitor.enabled).map((monitor) => ({ ...safeMonitor(monitor, { admin }), uptimePercent: uptimes.has(monitor.id) ? uptimes.get(monitor.id).successful * 100 / uptimes.get(monitor.id).total : null }));
}

export async function getMonitor(id, { admin = false, demoOnly = false } = {}) {
  const row = await prisma.apiMonitor.findFirst({ where: { id, isDemo: admin ? false : Boolean(demoOnly || env.DEMO_MODE), ...(!admin && !demoOnly && !env.DEMO_MODE ? { enabled: true } : {}) }, include: { checks: { orderBy: { checkedAt: 'desc' }, take: 1 } } });
  if (!row) return null;
  const [lastSuccessfulCheck, lastFailedCheck] = await Promise.all([
    prisma.apiCheck.findFirst({ where: { apiMonitorId: id, success: true }, orderBy: { checkedAt: 'desc' } }),
    prisma.apiCheck.findFirst({ where: { apiMonitorId: id, success: false }, orderBy: { checkedAt: 'desc' } }),
  ]);
  return { ...safeMonitor(row, { admin }), lastSuccessfulCheck, lastFailedCheck };
}

export async function createMonitor(input) {
  const endpoint = validateEndpointUrl(input.url);
  if (endpoint.protocol !== 'https:' && Object.keys(input.requestHeaders || {}).some((key) => ['authorization', 'x-api-key'].includes(key.toLowerCase()))) throw Object.assign(new Error('Authentication headers require an HTTPS endpoint'), { status: 400, code: 'HTTPS_REQUIRED' });
  await resolvePublicAddress(endpoint.hostname);
  const { requestHeaders = {}, requestBody = null, ...fields } = input;
  const requestConfigEncrypted = encryptMonitorConfig({ headers: requestHeaders, body: requestBody });
  const monitor = await prisma.apiMonitor.create({ data: { ...fields, requestConfigEncrypted, isDemo: false, nextCheckAt: new Date() } });
  return getMonitor(monitor.id, { admin: true });
}

export async function updateMonitor(id, input) {
  const current = await prisma.apiMonitor.findFirst({ where: { id, isDemo: false } });
  if (!current) return null;
  const { requestHeaders, requestBody, clearRequestConfig, ...fields } = input;
  const warningLatencyMs = input.warningLatencyMs !== undefined ? input.warningLatencyMs : current.warningLatencyMs;
  const criticalLatencyMs = input.criticalLatencyMs !== undefined ? input.criticalLatencyMs : current.criticalLatencyMs;
  if (warningLatencyMs != null && criticalLatencyMs != null && criticalLatencyMs <= warningLatencyMs) throw Object.assign(new Error('Critical threshold must exceed the warning threshold'), { status: 400, code: 'INVALID_THRESHOLDS' });
  if ((input.method ?? current.method) !== 'POST' && requestBody) throw Object.assign(new Error('A request body is supported only for POST'), { status: 400, code: 'INVALID_REQUEST_BODY' });
  const endpoint = input.url ? validateEndpointUrl(input.url) : new URL(current.url);
  if (input.url) await resolvePublicAddress(endpoint.hostname);
  if (endpoint.protocol !== 'https:' && !clearRequestConfig) {
    const existingConfig = requestHeaders !== undefined || requestBody !== undefined ? decryptMonitorConfig(current.requestConfigEncrypted) : { headers: {} };
    const nextHeaders = requestHeaders ?? existingConfig.headers;
    if (Object.keys(nextHeaders || {}).some((key) => ['authorization', 'x-api-key'].includes(key.toLowerCase()))) throw Object.assign(new Error('Authentication headers require an HTTPS endpoint'), { status: 400, code: 'HTTPS_REQUIRED' });
  }
  const data = { ...fields };
  if (clearRequestConfig) data.requestConfigEncrypted = null;
  else if (requestHeaders !== undefined || requestBody !== undefined) {
    const existing = decryptMonitorConfig(current.requestConfigEncrypted);
    data.requestConfigEncrypted = encryptMonitorConfig({ headers: requestHeaders ?? existing.headers, body: requestBody !== undefined ? requestBody : existing.body });
  }
  if (input.intervalSec && input.intervalSec !== current.intervalSec) data.nextCheckAt = new Date();
  const row = await prisma.apiMonitor.update({ where: { id }, data });
  return getMonitor(row.id, { admin: true });
}

export async function deleteMonitor(id) {
  const result = await prisma.apiMonitor.deleteMany({ where: { id, isDemo: false } });
  return result.count > 0;
}

function periodStart(range) {
  const duration = { '1h': 3600000, '6h': 21600000, '24h': 86400000, '7d': 604800000, '30d': 2592000000 }[range] || 86400000;
  return new Date(Date.now() - duration);
}

function percentile(values, ratio) {
  if (values.length < 20) return null;
  return values[Math.min(values.length - 1, Math.ceil(values.length * ratio) - 1)];
}

function aggregateChecks(checks, from, intervalMs) {
  const groups = new Map();
  for (const check of checks) {
    const timestamp = Math.floor(check.checkedAt.getTime() / intervalMs) * intervalMs;
    const group = groups.get(timestamp) || { timestamp: new Date(timestamp).toISOString(), total: 0, successful: 0, latencies: [] };
    group.total++;
    if (check.success) group.successful++;
    if (check.latencyMs != null) group.latencies.push(check.latencyMs);
    groups.set(timestamp, group);
  }
  const result = [];
  for (let time = Math.floor(from.getTime() / intervalMs) * intervalMs; time <= Date.now(); time += intervalMs) {
    const group = groups.get(time);
    result.push({ timestamp: new Date(time).toISOString(), responseTimeMs: group?.latencies.length ? group.latencies.reduce((a, b) => a + b, 0) / group.latencies.length : null, uptimePercent: group ? group.successful * 100 / group.total : null, checks: group?.total || 0 });
  }
  return result;
}

export async function monitorAnalytics({ id = null, range = '24h', compareIds = [], demoOnly = false } = {}) {
  const from = periodStart(range);
  const where = { apiMonitor: { isDemo: Boolean(demoOnly) }, checkedAt: { gte: from }, ...(id ? { apiMonitorId: id } : compareIds.length ? { apiMonitorId: { in: compareIds } } : {}) };
  const checks = await prisma.apiCheck.findMany({ where, orderBy: { checkedAt: 'asc' }, take: 20000, include: { apiMonitor: { select: { id: true, name: true, intervalSec: true } } } });
  const latencies = checks.map((check) => check.latencyMs).filter((value) => value != null).sort((a, b) => a - b);
  const histogramRanges = [{ range: '0–100 ms', min: 0, max: 100 }, { range: '100–250 ms', min: 100, max: 250 }, { range: '250–500 ms', min: 250, max: 500 }, { range: '500–1 s', min: 500, max: 1000 }, { range: '1 s+', min: 1000, max: Infinity }];
  const total = checks.length;
  const monitorIds = id ? [id] : compareIds;
  const monitors = await prisma.apiMonitor.findMany({ where: { ...(monitorIds.length ? { id: { in: monitorIds } } : {}), isDemo: Boolean(demoOnly) }, select: { id: true, name: true, intervalSec: true, enabled: true, warningLatencyMs: true } });
  const latestChecks = await Promise.all(monitors.map((monitor) => prisma.apiCheck.findFirst({ where: { apiMonitorId: monitor.id }, orderBy: { checkedAt: 'desc' }, select: { apiMonitorId: true, success: true, latencyMs: true, checkedAt: true } })));
  const latestById = new Map(latestChecks.filter(Boolean).map((check) => [check.apiMonitorId, check]));
  const healthCounts = monitors.reduce((counts, monitor) => {
    const latest = latestById.get(monitor.id);
    const health = !monitor.enabled ? 'paused' : !latest || Date.now() - latest.checkedAt.getTime() > monitor.intervalSec * 3 * 1000 ? 'awaitingFirstCheck' : !latest.success ? 'down' : monitor.warningLatencyMs != null && latest.latencyMs != null && latest.latencyMs >= monitor.warningLatencyMs ? 'degraded' : 'operational';
    counts[health]++;
    return counts;
  }, { operational: 0, degraded: 0, down: 0, paused: 0, awaitingFirstCheck: 0 });
  const summary = {
    totalMonitors: monitors.length,
    ...healthCounts,
    averageResponseTimeMs: latencies.length ? latencies.reduce((sum, value) => sum + value, 0) / latencies.length : null,
    uptimePercent: total ? checks.filter((check) => check.success).length * 100 / total : null,
  };
  const bucketMs = range === '1h' ? 60000 : range === '6h' ? 300000 : range === '24h' ? 3600000 : range === '7d' ? 21600000 : 86400000;
  return {
    range, from, to: new Date(), summary,
    responseTimeTrend: aggregateChecks(checks, from, bucketMs),
    uptimeHistory: aggregateChecks(checks, from, bucketMs).map(({ timestamp, uptimePercent }) => ({ timestamp, uptimePercent })),
    latencyDistribution: { average: latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : null, min: latencies.length ? latencies[0] : null, max: latencies.length ? latencies.at(-1) : null, p95: percentile(latencies, .95), p99: percentile(latencies, .99), samples: latencies.length, histogram: histogramRanges.map((bin) => ({ range: bin.range, count: latencies.filter((value) => value >= bin.min && value < bin.max).length })) },
    endpointComparison: monitors.map((monitor) => {
      const samples = checks.filter((check) => check.apiMonitorId === monitor.id);
      const values = samples.map((check) => check.latencyMs).filter((value) => value != null);
      return { id: monitor.id, name: monitor.name, uptimePercent: samples.length ? samples.filter((check) => check.success).length * 100 / samples.length : null, averageResponseTimeMs: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null, checks: samples.length };
    }),
  };
}

export async function monitorChecks(id, { page = 1, pageSize = 100, from, to, status, demoOnly = false } = {}) {
  const where = { apiMonitorId: id, apiMonitor: { isDemo: Boolean(demoOnly) }, ...(from || to ? { checkedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}), ...(status === 'success' ? { success: true } : status === 'failure' ? { success: false } : {}) };
  const [items, total] = await Promise.all([prisma.apiCheck.findMany({ where, orderBy: { checkedAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }), prisma.apiCheck.count({ where })]);
  return { items, total, page, pageSize };
}
