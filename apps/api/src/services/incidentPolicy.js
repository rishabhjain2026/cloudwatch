export const ACTIVE_INCIDENT_STATUSES = ['DETECTED', 'OPEN', 'ACKNOWLEDGED', 'INVESTIGATING'];
export const SEVERITY_RANK = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

export function severityAtLeast(severity, minimum) {
  return (SEVERITY_RANK[severity] || 0) >= (SEVERITY_RANK[minimum] || 0);
}

export function matchesAutomationRule(rule, alert) {
  return rule.enabled
    && (!rule.category || rule.category === alert.category)
    && (!rule.alertType || rule.alertType === alert.alertType)
    && (!rule.resourceType || rule.resourceType === alert.resourceType)
    && severityAtLeast(alert.severity, rule.minimumSeverity);
}

export function correlationKeyForAlert(alert, rule) {
  const parts = [];
  if (rule.correlateByCategory) parts.push(alert.category || 'UNKNOWN');
  if (rule.correlateByResource) {
    if (!alert.resourceType || !alert.resourceId) return null;
    parts.push(alert.resourceType, alert.resourceId);
  }
  if (rule.correlateByAlertType) parts.push(alert.alertType || 'UNKNOWN');
  return parts.length ? parts.join(':') : null;
}

export function canCorrelateIncident(incident, alert, rule, now = Date.now()) {
  if (!ACTIVE_INCIDENT_STATUSES.includes(incident.status)) return false;
  if (now - new Date(incident.detectedAt).getTime() > rule.correlationWindowSec * 1000) return false;
  if (rule.correlateByCategory && incident.category !== alert.category) return false;
  if (rule.correlateByResource && (incident.resourceType !== alert.resourceType || incident.resourceId !== alert.resourceId)) return false;
  if (rule.correlateByAlertType) {
    const types = (incident.alerts || []).map((item) => item.alert?.alertType).filter(Boolean);
    if (!types.includes(alert.alertType)) return false;
  }
  return true;
}

export const INCIDENT_TRANSITIONS = {
  DETECTED: ['ACKNOWLEDGED', 'INVESTIGATING'],
  OPEN: ['ACKNOWLEDGED', 'INVESTIGATING'],
  ACKNOWLEDGED: ['INVESTIGATING'],
  INVESTIGATING: ['RESOLVED'],
  RESOLVED: ['CLOSED', 'OPEN'],
  CLOSED: ['OPEN'],
};

export function nextIncidentTransition(from, to) {
  return INCIDENT_TRANSITIONS[from]?.includes(to) ?? false;
}

export function correlationScore(left, right) {
  let score = 0;
  if (left.category && left.category === right.category) score += 2;
  if (left.resourceType && left.resourceType === right.resourceType) score += 1;
  if (left.resourceId && left.resourceId === right.resourceId) score += 4;
  const leftTypes = new Set(left.alertTypes || []);
  const commonTypes = (right.alertTypes || []).filter((type) => leftTypes.has(type));
  if (commonTypes.length) score += 2;
  if (left.severity && left.severity === right.severity) score += 1;
  return score;
}
