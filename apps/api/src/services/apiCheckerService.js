import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns/promises';
import net from 'node:net';
import { URL } from 'node:url';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { decryptMonitorConfig } from './apiMonitorCrypto.js';
import { evaluateSignal, evaluateApiMonitorRules } from './alertService.js';

const MAX_RESPONSE_BYTES = 64 * 1024;
const MAX_REQUEST_BYTES = 16 * 1024;
const SAFE_HEADERS = new Set(['accept', 'content-type', 'authorization', 'x-api-key', 'user-agent']);

export function isPublicAddress(address) {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, '');
  const family = net.isIP(normalized);
  if (family === 4) {
    const octets = normalized.split('.').map(Number);
    const [a, b, c] = octets;
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || (b === 0 && c === 0) || (b === 0 && c === 2) || (b === 88 && c === 99))) || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113) || a === 255);
  }
  if (family === 6) {
    if (normalized.startsWith('::ffff:')) return isPublicAddress(normalized.slice(7));
    const firstSegment = Number.parseInt(normalized.split(':')[0] || '0', 16);
    return firstSegment >= 0x2000 && firstSegment <= 0x3fff && !normalized.startsWith('2001:db8:') && !normalized.startsWith('2001:0:') && !normalized.startsWith('2002:') && !normalized.startsWith('3fff:') && !normalized.startsWith('64:ff9b:');
  }
  return false;
}

export function validateEndpointUrl(raw) {
  let parsed;
  try { parsed = new URL(raw); } catch { throw Object.assign(new Error('Invalid endpoint URL'), { code: 'INVALID_URL' }); }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw Object.assign(new Error('Only HTTP(S) URLs without embedded credentials are allowed'), { status: 400, code: 'INVALID_URL' });
  if (parsed.hostname === 'metadata.google.internal' || parsed.hostname.endsWith('.localhost') || parsed.hostname.endsWith('.internal')) throw Object.assign(new Error('Internal endpoint hosts are blocked'), { status: 400, code: 'SSRF_BLOCKED' });
  if ([...parsed.searchParams.keys()].some((key) => /token|secret|password|api.?key|authorization|credential|signature/i.test(key))) throw Object.assign(new Error('Credentials must be provided in encrypted request headers, not URL query parameters'), { status: 400, code: 'URL_CREDENTIALS_BLOCKED' });
  return parsed;
}

export async function resolvePublicAddress(hostname) {
  const host = hostname.replace(/^\[|\]$/g, '');
  const addresses = net.isIP(host) ? [{ address: host, family: net.isIP(host) }] : await dns.lookup(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) throw Object.assign(new Error('Endpoint resolved to a private or reserved network address'), { status: 400, code: 'SSRF_BLOCKED' });
  return addresses[0];
}

export async function checkEndpoint(monitor) {
  const started = Date.now();
  let parsed;
  try { parsed = validateEndpointUrl(monitor.url); }
  catch (error) { return failure(error.code || 'INVALID_URL', error.message, started); }
  let address;
  try { address = await resolvePublicAddress(parsed.hostname); }
  catch (error) { return failure(error.code === 'SSRF_BLOCKED' ? 'SSRF_BLOCKED' : 'DNS', error.code === 'SSRF_BLOCKED' ? error.message : 'Endpoint DNS lookup failed', started); }

  let config;
  try { config = decryptMonitorConfig(monitor.requestConfigEncrypted); }
  catch { return failure('CONFIG_DECRYPT', 'Stored request configuration is unavailable', started); }
  const body = config.body || null;
  if (body && Buffer.byteLength(body) > MAX_REQUEST_BYTES) return failure('REQUEST_TOO_LARGE', 'Request body exceeds the 16 KB limit', started);
  const headers = { 'User-Agent': 'InfraPulse-Monitor/1.0', Accept: '*/*' };
  for (const [key, value] of Object.entries(config.headers || {})) if (SAFE_HEADERS.has(key.toLowerCase())) headers[key] = value;
  headers.Host = parsed.host;
  if (body && !Object.keys(headers).some((key) => key.toLowerCase() === 'content-type')) headers['Content-Type'] = 'application/json';
  if (body) headers['Content-Length'] = Buffer.byteLength(body);
  const isHttps = parsed.protocol === 'https:';
  const lib = isHttps ? https : http;
  const requestOptions = {
    hostname: address.address,
    family: address.family,
    port: Number(parsed.port || (isHttps ? 443 : 80)),
    path: `${parsed.pathname}${parsed.search}`,
    method: monitor.method,
    headers,
    timeout: monitor.timeoutMs,
    ...(isHttps ? { servername: parsed.hostname.replace(/^\[|\]$/g, '') } : {}),
  };

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => { if (!settled) { settled = true; resolve({ ...result, latencyMs: Date.now() - started }); } };
    const req = lib.request(requestOptions, (res) => {
      const statusMatched = res.statusCode === monitor.expectedStatus;
      const cert = isHttps ? res.socket?.getPeerCertificate?.() : null;
      const expires = cert?.valid_to ? new Date(cert.valid_to) : null;
      const sslValid = isHttps ? Boolean(res.socket?.authorized && expires && expires.getTime() > Date.now()) : null;
      const chunks = [];
      let size = 0;
      res.on('data', (chunk) => {
        size += chunk.length;
        if (size <= MAX_RESPONSE_BYTES) { if (monitor.expectedContent && monitor.method !== 'HEAD') chunks.push(chunk); }
        else { req.destroy(); finish(failure('RESPONSE_TOO_LARGE', 'Response exceeded the 64 KB validation limit', started)); }
      });
      res.on('end', () => {
        if (settled) return;
        const responseBody = Buffer.concat(chunks).toString('utf8');
        const contentMatched = monitor.expectedContent ? responseBody.includes(monitor.expectedContent) : null;
        const latencyMs = Date.now() - started;
        const belowCritical = monitor.criticalLatencyMs == null || latencyMs < monitor.criticalLatencyMs;
        const valid = statusMatched && contentMatched !== false && sslValid !== false && belowCritical;
        const errorType = !statusMatched ? 'HTTP_STATUS' : contentMatched === false ? 'CONTENT_MISMATCH' : sslValid === false ? 'TLS_VALIDATION' : !belowCritical ? 'CRITICAL_LATENCY' : null;
        const error = errorType === 'HTTP_STATUS' ? `Expected HTTP ${monitor.expectedStatus}, received ${res.statusCode}`
          : errorType === 'CONTENT_MISMATCH' ? 'Expected response content was not found'
            : errorType === 'TLS_VALIDATION' ? 'TLS certificate validation failed'
              : errorType === 'CRITICAL_LATENCY' ? 'Response exceeded the critical latency threshold' : null;
        finish({ statusCode: res.statusCode ?? null, success: valid, error, errorType, timedOut: false, expectedStatusMatched: statusMatched, contentMatched, sslDaysRemaining: expires ? Math.floor((expires.getTime() - Date.now()) / 86400000) : null, sslIssuer: cert?.issuer?.O || cert?.issuer?.CN || null, sslExpiresAt: expires, sslValid });
      });
      res.on('error', () => finish(failure('RESPONSE_READ', 'Could not read endpoint response', started)));
    });
    req.setTimeout(monitor.timeoutMs, () => { req.destroy(); finish({ ...failure('TIMEOUT', 'Endpoint request timed out', started), timedOut: true }); });
    req.on('error', (error) => {
      const code = error.code || '';
      const type = code === 'CERT_HAS_EXPIRED' ? 'SSL_CERT_EXPIRED' : code.startsWith('CERT_') || code === 'ERR_TLS_CERT_ALTNAME_INVALID' ? 'TLS_VALIDATION' : ['ECONNREFUSED', 'ECONNRESET', 'EHOSTUNREACH', 'ENETUNREACH'].includes(code) ? 'CONNECTION' : 'REQUEST';
      finish(failure(type, type === 'SSL_CERT_EXPIRED' || type === 'TLS_VALIDATION' ? 'TLS certificate validation failed' : type === 'CONNECTION' ? 'Endpoint connection failed' : 'Endpoint request failed', started));
    });
    if (body && monitor.method !== 'HEAD') req.write(body);
    req.end();
  });
}

function failure(errorType, error, started) {
  return { statusCode: null, latencyMs: Date.now() - started, success: false, error, errorType, timedOut: errorType === 'TIMEOUT', expectedStatusMatched: false, contentMatched: null, sslDaysRemaining: null, sslIssuer: null, sslExpiresAt: null, sslValid: null };
}

async function runClaimedMonitor(monitor) {
  const result = await checkEndpoint(monitor);
  const checkedAt = new Date();
  await prisma.$transaction([
    prisma.apiCheck.create({ data: { apiMonitorId: monitor.id, statusCode: result.statusCode, latencyMs: result.latencyMs, success: result.success, error: result.error, errorType: result.errorType, timedOut: result.timedOut, expectedStatusMatched: result.expectedStatusMatched, contentMatched: result.contentMatched, sslDaysRemaining: result.sslDaysRemaining, sslIssuer: result.sslIssuer, sslExpiresAt: result.sslExpiresAt, sslValid: result.sslValid, checkedAt } }),
    prisma.apiMonitor.update({ where: { id: monitor.id }, data: { nextCheckAt: new Date(Date.now() + monitor.intervalSec * 1000) } }),
  ]);
  const latency = result.latencyMs;
  await evaluateSignal({ key: `api-unavailable:${monitor.id}`, alertType: 'API_UNAVAILABLE', category: 'APPLICATION', resourceType: 'API_MONITOR', resourceId: monitor.id, resourceName: monitor.name, apiMonitorId: monitor.id, title: `API unavailable: ${monitor.name}`, description: result.error || `Expected HTTP ${monitor.expectedStatus}; received ${result.statusCode ?? 'no response'}.`, triggered: !result.success, severity: 'HIGH', meta: { statusCode: result.statusCode, latencyMs: latency, errorType: result.errorType } });
  if (monitor.warningLatencyMs != null) await evaluateSignal({ key: `api-latency-warning:${monitor.id}`, alertType: 'API_LATENCY_WARNING', category: 'APPLICATION', resourceType: 'API_MONITOR', resourceId: monitor.id, resourceName: monitor.name, apiMonitorId: monitor.id, title: `API response time warning: ${monitor.name}`, description: `Response time was ${latency} ms; warning threshold is ${monitor.warningLatencyMs} ms.`, triggered: result.statusCode != null && latency >= monitor.warningLatencyMs, severity: 'MEDIUM', meta: { latencyMs: latency, threshold: monitor.warningLatencyMs } });
  if (monitor.criticalLatencyMs != null) await evaluateSignal({ key: `api-latency-critical:${monitor.id}`, alertType: 'API_LATENCY_CRITICAL', category: 'APPLICATION', resourceType: 'API_MONITOR', resourceId: monitor.id, resourceName: monitor.name, apiMonitorId: monitor.id, title: `API response time critical: ${monitor.name}`, description: `Response time was ${latency} ms; critical threshold is ${monitor.criticalLatencyMs} ms.`, triggered: result.statusCode != null && latency >= monitor.criticalLatencyMs, severity: 'CRITICAL', meta: { latencyMs: latency, threshold: monitor.criticalLatencyMs } });
  await evaluateApiMonitorRules(monitor);
  await evaluateSignal({ key: `ssl-certificate-invalid:${monitor.id}`, alertType: result.errorType === 'SSL_CERT_EXPIRED' ? 'SSL_CERT_EXPIRED' : 'SSL_CERT_INVALID', category: 'APPLICATION', resourceType: 'API_MONITOR', resourceId: monitor.id, resourceName: monitor.name, apiMonitorId: monitor.id, title: result.errorType === 'SSL_CERT_EXPIRED' ? `SSL certificate expired: ${monitor.name}` : `SSL certificate validation failed: ${monitor.name}`, description: result.error || 'TLS validation failed', triggered: ['SSL_CERT_EXPIRED', 'TLS_VALIDATION'].includes(result.errorType), severity: 'CRITICAL', meta: { errorType: result.errorType } });
  if (result.sslDaysRemaining != null) await evaluateSignal({ key: `ssl-certificate-expiring:${monitor.id}`, alertType: 'SSL_CERT_EXPIRING', category: 'APPLICATION', resourceType: 'API_MONITOR', resourceId: monitor.id, resourceName: monitor.name, apiMonitorId: monitor.id, title: `SSL certificate expiring: ${monitor.name}`, description: `Certificate expires in ${result.sslDaysRemaining} days.`, triggered: result.sslDaysRemaining <= monitor.sslWarnDays, severity: result.sslDaysRemaining < 7 ? 'CRITICAL' : 'HIGH', meta: { sslDaysRemaining: result.sslDaysRemaining, sslExpiresAt: result.sslExpiresAt } });
  await prisma.apiMonitor.updateMany({ where: { id: monitor.id }, data: { checkLockedUntil: null } });
  return result;
}

export async function runMonitorCheck(id, { force = false } = {}) {
  const now = new Date();
  const clauses = [{ OR: [{ checkLockedUntil: null }, { checkLockedUntil: { lt: now } }] }];
  if (!force) clauses.push({ enabled: true }, { OR: [{ nextCheckAt: null }, { nextCheckAt: { lte: now } }] });
  const monitor = await prisma.apiMonitor.findFirst({ where: { id, isDemo: false, AND: clauses } });
  if (!monitor) return null;
  const claim = await prisma.apiMonitor.updateMany({ where: { id, enabled: monitor.enabled, OR: [{ checkLockedUntil: null }, { checkLockedUntil: { lt: now } }] }, data: { checkLockedUntil: new Date(Date.now() + monitor.timeoutMs + 30_000) } });
  if (!claim.count) return null;
  try { return await runClaimedMonitor(monitor); }
  catch (error) {
    await prisma.apiMonitor.updateMany({ where: { id }, data: { checkLockedUntil: null, nextCheckAt: new Date(Date.now() + monitor.intervalSec * 1000) } });
    throw error;
  }
}

export async function runDueApiChecks() {
  const due = await prisma.apiMonitor.findMany({ where: { enabled: true, isDemo: false, OR: [{ nextCheckAt: null }, { nextCheckAt: { lte: new Date() } }] }, select: { id: true }, take: 500, orderBy: [{ nextCheckAt: 'asc' }, { createdAt: 'asc' }] });
  let cursor = 0;
  let ran = 0;
  const workers = Array.from({ length: Math.min(env.API_MONITOR_CONCURRENCY, due.length) }, async () => {
    while (cursor < due.length) {
      const item = due[cursor++];
      try { if (await runMonitorCheck(item.id)) ran++; }
      catch (error) { console.error('[api-monitor] check failed', { monitorId: item.id, code: error.code || 'CHECK_FAILED' }); }
    }
  });
  await Promise.all(workers);
  return { ran, due: due.length };
}
