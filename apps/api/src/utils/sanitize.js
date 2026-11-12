/** Public serializers — never expose IPs, tokens, or internal secrets. */

export function publicServer(server) {
  if (!server) return null;
  return {
    id: server.id,
    name: server.name,
    hostname: server.hostname,
    os: server.os,
    environment: server.environment,
    region: server.region,
    provider: server.provider,
    status: server.status?.toLowerCase?.() ?? server.status,
    isDemo: server.isDemo,
    lastHeartbeatAt: server.lastHeartbeatAt,
    registeredAt: server.registeredAt,
    cpu: server.cpu ?? null,
    memory: server.memory ?? null,
    disk: server.disk ?? null,
    uptime: server.uptime ?? null,
    dataStatus: server.dataStatus ?? null,
  };
}

export function publicAlert(alert) {
  return {
    id: alert.id,
    title: alert.title,
    description: alert.description,
    severity: alert.severity?.toLowerCase?.() ?? alert.severity,
    status: alert.status?.toLowerCase?.() ?? alert.status,
    server: alert.server ? { id: alert.server.id, name: alert.server.name } : null,
    metricValue: alert.metricValue,
    threshold: alert.threshold,
    isDemo: alert.isDemo,
    triggeredAt: alert.triggeredAt,
    resolvedAt: alert.resolvedAt,
  };
}

export function publicIncident(incident) {
  return {
    id: incident.id,
    publicId: incident.publicId,
    title: incident.title,
    description: incident.description,
    severity: incident.severity?.toLowerCase?.() ?? incident.severity,
    status: incident.status?.toLowerCase?.() ?? incident.status,
    server: incident.server ? { id: incident.server.id, name: incident.server.name } : null,
    isDemo: incident.isDemo,
    detectedAt: incident.detectedAt,
    resolvedAt: incident.resolvedAt,
    mttaMs: incident.mttaMs,
    mttrMs: incident.mttrMs,
  };
}

export function publicLog(log) {
  return {
    id: log.id,
    application: log.application,
    level: log.level?.toLowerCase?.() ?? log.level,
    message: log.maskedMessage,
    server: log.server ? { id: log.server.id, name: log.server.name } : null,
    incidentId: log.incidentId,
    isDemo: log.isDemo,
    collectedAt: log.collectedAt,
  };
}

export function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role?.name ?? user.role,
  };
}
