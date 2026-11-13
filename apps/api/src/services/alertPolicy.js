export const ALERT_CATEGORIES = ['AWS', 'DOCKER', 'APPLICATION', 'INFRASTRUCTURE', 'AGENT'];
export const ALERT_TYPES = [
  'METRIC_THRESHOLD', 'AWS_INSTANCE_STOPPED', 'AWS_INSTANCE_TERMINATED', 'AWS_EC2_UNAVAILABLE',
  'AWS_COLLECTION_FAILURE', 'AWS_MONITORING_STALE', 'DOCKER_CONTAINER_STOPPED', 'DOCKER_CONTAINER_UNHEALTHY',
  'DOCKER_ENGINE_UNAVAILABLE', 'DOCKER_HOST_UNAVAILABLE', 'DOCKER_MONITORING_STALE', 'AGENT_DISCONNECTED',
  'HOST_UNAVAILABLE', 'MONITORING_STALE', 'API_UNAVAILABLE', 'API_ERROR_RATE', 'API_LATENCY',
  'APPLICATION_UNAVAILABLE',
  'SSL_CERT_EXPIRING',
];
export const RULE_METRICS = ['CPU', 'MEM', 'DISK', 'CONTAINER_CPU', 'CONTAINER_MEM', 'API_ERROR_RATE', 'API_LATENCY'];

const operators = {
  gt: (value, threshold) => value > threshold,
  gte: (value, threshold) => value >= threshold,
  lt: (value, threshold) => value < threshold,
  lte: (value, threshold) => value <= threshold,
  eq: (value, threshold) => value === threshold,
  neq: (value, threshold) => value !== threshold,
};

export function compareMetric(value, operator, threshold) {
  if (typeof value !== 'number' || !Number.isFinite(value) || typeof threshold !== 'number' || !Number.isFinite(threshold)) return null;
  return operators[operator]?.(value, threshold) ?? null;
}

/** Require fresh, sufficiently dense samples before declaring a duration window valid. */
export function evaluateMetricWindow(samples, { operator, threshold, durationSec = 0, now = Date.now(), maxGapSec = 90 }) {
  const valid = (samples || [])
    .filter((sample) => typeof sample.value === 'number' && Number.isFinite(sample.value) && sample.collectedAt)
    .map((sample) => ({ value: sample.value, at: new Date(sample.collectedAt).getTime() }))
    .filter((sample) => Number.isFinite(sample.at) && sample.at <= now)
    .sort((a, b) => a.at - b.at);
  if (!valid.length) return { triggered: false, complete: false, latestValue: null };

  const maxGapMs = maxGapSec * 1000;
  const latest = valid.at(-1);
  if (now - latest.at > maxGapMs) return { triggered: false, complete: false, latestValue: latest.value };

  if (durationSec <= 0) {
    return { triggered: compareMetric(latest.value, operator, threshold), complete: true, latestValue: latest.value };
  }

  const start = now - durationSec * 1000;
  const window = valid.filter((sample) => sample.at >= start - maxGapMs);
  if (window.length < 2 || Math.abs(window[0].at - start) > maxGapMs || now - window.at(-1).at > maxGapMs
    || window.at(-1).at - window[0].at < Math.max(0, durationSec * 1000 - 2 * maxGapMs)) return { triggered: false, complete: false, latestValue: latest.value };
  for (let i = 1; i < window.length; i++) {
    if (window[i].at - window[i - 1].at > maxGapMs) return { triggered: false, complete: false, latestValue: latest.value };
  }
  const results = window.map((sample) => compareMetric(sample.value, operator, threshold));
  if (results.some((result) => result == null)) return { triggered: false, complete: false, latestValue: latest.value };
  return { triggered: results.every(Boolean), complete: true, latestValue: latest.value };
}

function ruleMatches(rule, alert) {
  if (rule.category && rule.category !== alert.category) return false;
  if (rule.resourceType && rule.resourceType !== alert.resourceType) return false;
  if (rule.resourceId && rule.resourceId !== alert.resourceId) return false;
  if (rule.alertType && rule.alertType !== alert.alertType) return false;
  const severities = Array.isArray(rule.severities) ? rule.severities : [];
  return severities.includes(alert.severity);
}

function specificity(rule) {
  if (rule.resourceId) return 3;
  if (rule.resourceType) return 2;
  if (rule.category) return 1;
  return 0;
}

/** Specific resource matches outrank type/category matches; ties use highest priority and combine equal-priority rules. */
export function selectRoutingRules(rules, alert) {
  const activeRules = (rules || []).filter((rule) => rule.enabled && !rule.deletedAt);
  const matching = activeRules.filter((rule) => !rule.isFallback && ruleMatches(rule, alert));
  const candidates = matching.length ? matching : activeRules.filter((rule) => rule.isFallback && ruleMatches(rule, alert));
  if (!candidates.length) return { rules: [], matched: false, fallback: false };
  const bestSpecificity = Math.max(...candidates.map(specificity));
  const specific = candidates.filter((rule) => specificity(rule) === bestSpecificity);
  const bestPriority = Math.max(...specific.map((rule) => Number(rule.priority) || 0));
  const selected = specific.filter((rule) => (Number(rule.priority) || 0) === bestPriority);
  return { rules: selected, matched: true, fallback: selected.every((rule) => rule.isFallback) };
}

export function eligibleChannels(member, configuredChannels, severity, eventType = 'ALERT_FIRING') {
  if (!member?.isActive || (member.memberType === 'INTERNAL' && member.user && !member.user.isActive)) return [];
  const preferences = member.preferences && typeof member.preferences === 'object' ? member.preferences : {};
  const result = [];
  for (const channel of new Set(configuredChannels || [])) {
    if (channel === 'IN_APP' && member.userId && preferences.inApp !== false
      && (eventType !== 'ALERT_RESOLVED' || preferences.inAppOnResolution === true)) result.push(channel);
    if (channel === 'EMAIL' && preferences.email !== false) {
      const allowedBySeverity = severity === 'CRITICAL' ? preferences.emailOnCritical !== false
        : ['HIGH', 'MEDIUM'].includes(severity) ? preferences.emailOnWarning !== false
          : preferences.emailOnInfo === true;
      const allowedByEvent = eventType !== 'ALERT_RESOLVED' || preferences.emailOnResolution === true;
      if (allowedBySeverity && allowedByEvent && (member.userId || member.memberType === 'EXTERNAL')) result.push(channel);
    }
  }
  return result;
}

export function notificationDedupeKey(alertId, occurrence, memberId, channel, eventType) {
  return `${alertId}:${occurrence}:${memberId}:${channel}:${eventType}`;
}

export function retryDelaySeconds(attempt, baseSeconds = 30, maxSeconds = 3600) {
  const n = Math.max(1, Math.trunc(attempt) || 1);
  return Math.min(maxSeconds, baseSeconds * (2 ** (n - 1)));
}

const safeCodes = new Set(['EAUTH', 'ECONNECTION', 'ECONNREFUSED', 'ETIMEDOUT', 'ESOCKET', 'EDNS', 'EENVELOPE', 'SMTP_NOT_CONFIGURED']);
export function safeDeliveryError(error) {
  const raw = typeof error === 'string' ? error : error?.code;
  const code = String(raw || 'DELIVERY_FAILED').toUpperCase();
  return safeCodes.has(code) ? code : 'DELIVERY_FAILED';
}
