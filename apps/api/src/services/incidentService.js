import { randomBytes } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { routeIncidentNotification } from './notificationService.js';
import { ACTIVE_INCIDENT_STATUSES, canCorrelateIncident, correlationKeyForAlert, matchesAutomationRule, SEVERITY_RANK, severityAtLeast } from './incidentPolicy.js';

const noDemo = { isDemo: false };
const active = { in: ACTIVE_INCIDENT_STATUSES };
const userSelect = { id: true, name: true, email: true };
const detailInclude = {
  server: { select: { id: true, name: true, provider: true, region: true, awsInstanceId: true, awsState: true, awsInstanceType: true, awsAvailabilityZone: true, awsSyncedAt: true, dockerAvailable: true, dockerEngineVersion: true } },
  assignee: { select: userSelect },
  alerts: { include: { alert: { include: { server: { select: { id: true, name: true } }, apiMonitor: { select: { id: true, name: true } } } } }, orderBy: { createdAt: 'asc' } },
  events: { include: { actor: { select: userSelect } }, orderBy: { createdAt: 'asc' } },
  postmortem: true,
  analyses: { orderBy: { version: 'desc' }, select: { id: true, status: true, provider: true, model: true, version: true, failureCode: true, requestedAt: true, completedAt: true } },
};

export function publicIncidentId() {
  return `INC-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

export async function listIncidents({ page = 1, pageSize = 25, status, severity, category, search, assigneeId } = {}) {
  const where = { ...noDemo, ...(status ? { status } : {}), ...(severity ? { severity } : {}), ...(category ? { category } : {}), ...(assigneeId === 'unassigned' ? { assigneeId: null } : assigneeId ? { assigneeId } : {}), ...(search ? { OR: [{ publicId: { contains: search, mode: 'insensitive' } }, { title: { contains: search, mode: 'insensitive' } }, { resourceName: { contains: search, mode: 'insensitive' } }] } : {}) };
  const [items, total] = await Promise.all([
    prisma.incident.findMany({ where, include: { assignee:{select:userSelect},server:{select:{id:true,name:true,provider:true}},alerts:{take:3,include:{alert:{select:{id:true,title:true,severity:true,status:true,category:true,alertType:true,metricValue:true,threshold:true,triggeredAt:true,resolvedAt:true}}}} }, orderBy: [{ detectedAt: 'desc' }], skip: (page - 1) * pageSize, take: pageSize }),
    prisma.incident.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getIncident(id) {
  const incident = await prisma.incident.findFirst({ where: { id, ...noDemo }, include: detailInclude });
  if (!incident) return null;
  const [metrics, container, apiMonitor, awsResource] = await Promise.all([
    incident.serverId ? prisma.metricSample.findMany({ where: { serverId: incident.serverId }, orderBy: { collectedAt: 'desc' }, take: 100, select: { kind: true, value: true, unit: true, collectedAt: true } }) : [],
    incident.resourceType === 'DOCKER_CONTAINER' && incident.resourceId ? prisma.dockerContainer.findFirst({ where: { OR: [{ id: incident.resourceId }, { containerId: incident.resourceId }] }, include: { server: { select: { id: true, name: true, dockerAvailable: true, dockerEngineVersion: true } }, metrics: { orderBy: { collectedAt: 'desc' }, take: 50 } } }) : null,
    incident.resourceType === 'API_MONITOR' && incident.resourceId ? prisma.apiMonitor.findUnique({ where: { id: incident.resourceId }, include: { checks: { orderBy: { checkedAt: 'desc' }, take: 50 } } }) : null,
    incident.server?.awsInstanceId ? prisma.awsResource.findFirst({ where:{service:'ec2',resourceId:incident.server.awsInstanceId,missingSince:null},select:{accountId:true,arn:true} }) : null,
  ]);
  return { ...incident, metrics, container, apiMonitor, awsResource };
}

export async function incidentResourceCatalog() {
  const [servers, containers, applications] = await Promise.all([
    prisma.server.findMany({ where: { isDemo: false }, select: { id:true,name:true,provider:true,region:true,awsInstanceId:true,awsState:true }, orderBy: { name:'asc' } }),
    prisma.dockerContainer.findMany({ where: { missingSince:null, server:{isDemo:false} }, select: { id:true,containerId:true,name:true,state:true,health:true,server:{select:{id:true,name:true}} }, orderBy: { name:'asc' }, take:500 }),
    prisma.apiMonitor.findMany({ where: { isDemo:false }, select: { id:true,name:true,enabled:true }, orderBy: { name:'asc' } }),
  ]);
  return { servers, containers, applications };
}

async function resolveResource(tx, { resourceType, resourceId }) {
  if (!resourceId) return { serverId: null, name: null, type: resourceType || null, id: null };
  if (resourceType === 'HOST' || resourceType === 'EC2_INSTANCE' || resourceType === 'DOCKER_HOST') {
    const server = await tx.server.findFirst({ where: { isDemo: false, OR: [{ id: resourceId }, { awsInstanceId: resourceId }] }, select: { id: true, name: true } });
    if (!server) throw Object.assign(new Error('Selected host does not exist'), { status: 400, code: 'RESOURCE_NOT_FOUND' });
    return { serverId: server.id, name: server.name, type: resourceType, id: server.id };
  }
  if (resourceType === 'DOCKER_CONTAINER') {
    const container = await tx.dockerContainer.findFirst({ where: { isDemo: false, OR: [{ id: resourceId }, { containerId: resourceId }], server: { isDemo: false } }, include: { server: { select: { id: true, name: true } } } });
    if (!container) throw Object.assign(new Error('Selected container does not exist'), { status: 400, code: 'RESOURCE_NOT_FOUND' });
    return { serverId: container.serverId, name: `${container.server.name} / ${container.name}`, type: resourceType, id: container.id };
  }
  if (resourceType === 'API_MONITOR') {
    const monitor = await tx.apiMonitor.findFirst({ where: { id: resourceId, isDemo: false }, select: { id: true, name: true } });
    if (!monitor) throw Object.assign(new Error('Selected application monitor does not exist'), { status: 400, code: 'RESOURCE_NOT_FOUND' });
    return { serverId: null, name: monitor.name, type: resourceType, id: monitor.id };
  }
  throw Object.assign(new Error('Unsupported resource type'), { status: 400, code: 'INVALID_RESOURCE_TYPE' });
}

async function validateAssignee(tx, assigneeId) {
  if (!assigneeId) return null;
  const user = await tx.user.findFirst({ where: { id: assigneeId, isActive: true, alertTeamMember: { is: { isActive: true, memberType: 'INTERNAL' } } }, select: { id: true } });
  if (!user) throw Object.assign(new Error('Assignee must be an active internal team member'), { status: 400, code: 'INVALID_ASSIGNEE' });
  return user.id;
}

export async function createManualIncident(input, actorId) {
  const result = await prisma.$transaction(async (tx) => {
    const resource = await resolveResource(tx, input);
    const assigneeId = await validateAssignee(tx, input.assigneeId);
    const alerts = input.alertIds?.length ? await tx.alert.findMany({ where: { id: { in: input.alertIds }, isDemo: false }, select: { id: true } }) : [];
    if (alerts.length !== new Set(input.alertIds || []).size) throw Object.assign(new Error('One or more selected alerts are unavailable'), { status: 400, code: 'INVALID_ALERTS' });
    const incident = await tx.incident.create({ data: {
      publicId: publicIncidentId(), title: input.title, description: input.description || null, impactDescription: input.impactDescription || null,
      severity: input.severity, priority: input.priority, category: input.category, status: 'OPEN',
      resourceType: resource.type, resourceId: resource.id, resourceName: resource.name, serverId: resource.serverId, assigneeId,
      alerts: { create: alerts.map((alert) => ({ alertId: alert.id })) },
      events: { create: [
        { type: 'CREATED', message: 'Incident manually created.', actorId, meta: { source: 'MANUAL', alertCount: alerts.length } },
        ...(assigneeId ? [{ type: 'ASSIGNED', message: 'Incident assigned at creation.', actorId, meta: { assigneeId } }] : []),
      ] },
    }, include: { assignee: { select: userSelect } } });
    await tx.auditLog.create({ data: { actorId, action: 'INCIDENT_CREATED', resourceType: 'Incident', resourceId: incident.id, meta: { source: 'MANUAL', publicId: incident.publicId } } });
    return incident;
  });
  await routeIncidentNotification(result.id, `created:${result.id}`, 'CREATED', actorId);
  if (result.assigneeId) await routeIncidentNotification(result.id, `assigned:${result.id}`, 'ASSIGNED', actorId);
  return getIncident(result.id);
}

export async function createIncidentFromAlert(alertId) {
  const alert = await prisma.alert.findFirst({ where: { id: alertId, isDemo: false } });
  if (!alert) return null;
  const policies = await prisma.incidentAutomationRule.findMany({ where: { enabled: true } });
  const matching = policies.filter((rule) => matchesAutomationRule(rule, alert)).sort((a, b) => {
    const aSpecific = Number(Boolean(a.resourceType)) + Number(Boolean(a.alertType)) + Number(Boolean(a.category));
    const bSpecific = Number(Boolean(b.resourceType)) + Number(Boolean(b.alertType)) + Number(Boolean(b.category));
    return bSpecific - aSpecific;
  });
  if (!matching.length) return null;
  const rule = matching[0];
  const correlationKey = correlationKeyForAlert(alert, rule);
  const lockKey = correlationKey || `alert:${alert.id}`;
  let result;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      result = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
        const alreadyLinked = await tx.incidentAlert.findFirst({ where: { alertId: alert.id }, select: { incidentId: true } });
        if (alreadyLinked) return { incidentId: alreadyLinked.incidentId, created: false, severityRaised: false, associated: false };
        const candidates = correlationKey ? await tx.incident.findMany({ where: { isDemo: false, status: active, detectedAt: { gte: new Date(Date.now() - rule.correlationWindowSec * 1000) }, ...(rule.correlateByCategory ? { category: alert.category } : {}), ...(rule.correlateByResource ? { resourceType: alert.resourceType, resourceId: alert.resourceId } : {}) }, include: { alerts: { include: { alert: { select: { alertType: true } } } } }, orderBy: { detectedAt: 'desc' }, take: 20 }) : [];
        const linked = candidates.find((incident) => canCorrelateIncident(incident, alert, rule));
        if (linked) {
          const severity = SEVERITY_RANK[alert.severity] > SEVERITY_RANK[linked.severity] ? alert.severity : linked.severity;
          await tx.incidentAlert.create({ data: { incidentId: linked.id, alertId: alert.id } });
          await tx.incident.update({ where: { id: linked.id }, data: { severity, updatedAt: new Date(), events: { create: { type: 'ALERT_ASSOCIATED', message: `Alert associated: ${alert.title}`, meta: { alertId: alert.id } } } } });
          return { incidentId: linked.id, created: false, severityRaised: severity !== linked.severity, associated: true };
        }
        const created = await tx.incident.create({ data: {
          publicId: publicIncidentId(), title: alert.title, description: alert.description, severity: alert.severity,
          priority: alert.severity === 'CRITICAL' ? 'P1' : alert.severity === 'HIGH' ? 'P2' : 'P3',
          category: alert.category || 'INFRASTRUCTURE', status: 'OPEN', resourceType: alert.resourceType, resourceId: alert.resourceId,
          resourceName: alert.resourceName, serverId: alert.serverId, correlationKey, detectedAt: alert.triggeredAt,
          alerts: { create: { alertId: alert.id } },
          events: { create: { type: 'CREATED', message: `Incident automatically created from alert: ${alert.title}`, meta: { source: 'ALERT_AUTOMATION', alertId: alert.id, automationRuleId: rule.id, correlationKey } } },
        } });
        return { incidentId: created.id, created: true, severityRaised: false, associated: true };
      }, { isolationLevel: 'Serializable' });
      break;
    } catch (error) {
      if (error.code === 'P2002') {
        const existing = await prisma.incidentAlert.findUnique({ where: { incidentId_alertId: { incidentId: (await prisma.incident.findFirst({ where: { alerts: { some: { alertId } }, orderBy: { detectedAt: 'desc' }, select: { id: true } } }))?.id || '', alertId } } }).catch(() => null);
        if (existing) return getIncident(existing.incidentId);
      }
      if (error.code !== 'P2034' || attempt === 2) throw error;
    }
  }
  if (!result.associated) return getIncident(result.incidentId);
  if (result.created) await routeIncidentNotification(result.incidentId, `created:${result.incidentId}`, 'CREATED');
  else {
    await routeIncidentNotification(result.incidentId, `alert:${alert.id}`, 'ALERT_ASSOCIATED');
    if (result.severityRaised) await routeIncidentNotification(result.incidentId, `severity:${alert.id}`, 'SEVERITY_INCREASED');
  }
  return getIncident(result.incidentId);
}

export async function updateIncident(id, input, actorId) {
  const current = await getIncident(id);
  if (!current) return null;
  const data = {};
  const changes = [];
  for (const field of ['title', 'description', 'impactDescription', 'severity', 'priority', 'category', 'rootCause']) {
    if (input[field] !== undefined && input[field] !== current[field]) { data[field] = input[field]; changes.push({ field, from: current[field], to: input[field] }); }
  }
  if (input.assigneeId !== undefined && input.assigneeId !== current.assigneeId) {
    data.assigneeId = await validateAssignee(prisma, input.assigneeId);
    changes.push({ field: 'assigneeId', from: current.assigneeId, to: data.assigneeId });
  }
  if (!changes.length) return current;
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.incident.update({ where: { id }, data: { ...data, ...(data.severity && SEVERITY_RANK[data.severity] > SEVERITY_RANK[current.severity] ? { priority: current.priority === 'P0' ? 'P0' : 'P1' } : {}) } });
    await tx.incidentEvent.create({ data: { incidentId: id, type: changes.some((change) => change.field === 'assigneeId') ? 'ASSIGNED' : 'UPDATED', message: 'Incident details updated.', actorId, meta: { changes } } });
    await tx.auditLog.create({ data: { actorId, action: 'INCIDENT_UPDATED', resourceType: 'Incident', resourceId: id, meta: { changes } } });
    return row;
  });
  if (changes.some((change) => change.field === 'assigneeId')) await routeIncidentNotification(id, `assignment:${Date.now()}`, 'ASSIGNED', actorId);
  if (changes.some((change) => change.field === 'severity' && SEVERITY_RANK[change.to] > SEVERITY_RANK[change.from])) await routeIncidentNotification(id, `severity:${Date.now()}`, 'SEVERITY_INCREASED', actorId);
  return getIncident(updated.id);
}

export async function transitionIncident(id, to, actorId, comment = '', resolution = {}) {
  const current = await getIncident(id);
  if (!current) return null;
  const allowed = {
    ACKNOWLEDGED: ['OPEN', 'DETECTED'], INVESTIGATING: ['ACKNOWLEDGED', 'OPEN', 'DETECTED'],
    RESOLVED: ['INVESTIGATING'], CLOSED: ['RESOLVED'], OPEN: ['RESOLVED', 'CLOSED'],
  };
  if (!allowed[to]?.includes(current.status)) throw Object.assign(new Error(`Cannot transition incident from ${current.status} to ${to}`), { status: 409, code: 'INVALID_TRANSITION' });
  if (to === 'RESOLVED' && !resolution.resolutionDescription?.trim()) throw Object.assign(new Error('A resolution description is required'), { status: 400, code: 'RESOLUTION_REQUIRED' });
  if (to === 'CLOSED' && current.postmortem?.status !== 'APPROVED') throw Object.assign(new Error('Approve the postmortem before closing the incident'), { status: 409, code: 'POSTMORTEM_NOT_APPROVED' });
  if (to === 'OPEN' && !comment.trim()) throw Object.assign(new Error('A reason is required to reopen an incident'), { status: 400, code: 'REOPEN_REASON_REQUIRED' });
  const now = new Date();
  const data = { status: to };
  if (to === 'ACKNOWLEDGED') { data.ackAt = now; data.mttaMs = Math.max(0, now.getTime() - current.detectedAt.getTime()); if (!current.assigneeId) data.assigneeId = actorId; }
  if (to === 'INVESTIGATING') data.investigatingAt = now;
  if (to === 'RESOLVED') { data.resolvedAt = now; data.mttrMs = Math.max(0, now.getTime() - current.detectedAt.getTime()); data.resolutionDescription = resolution.resolutionDescription.trim(); data.rootCause = resolution.rootCause ?? current.rootCause; data.actionsTaken = resolution.actionsTaken ?? null; data.preventiveActions = resolution.preventiveActions ?? null; }
  if (to === 'CLOSED') data.closedAt = now;
  if (to === 'OPEN') { data.resolvedAt = null; data.closedAt = null; data.ackAt = null; data.investigatingAt = null; data.reopenedCount = { increment: 1 }; data.lastReopenedAt = now; }
  const row = await prisma.$transaction(async (tx) => {
    const updated = await tx.incident.update({ where: { id }, data });
    if(to==='OPEN') await tx.incidentPostmortem.updateMany({where:{incidentId:id,status:'APPROVED'},data:{status:'DRAFT',approvedAt:null,approvedById:null}});
    await tx.incidentEvent.create({ data: { incidentId: id, type: to === 'OPEN' ? 'REOPENED' : to, message: comment.trim() || `Status changed to ${to}.`, actorId, previousStatus: current.status, newStatus: to, meta: to === 'RESOLVED' ? { ...resolution } : undefined } });
    await tx.auditLog.create({ data: { actorId, action: `INCIDENT_${to}`, resourceType: 'Incident', resourceId: id, meta: { from: current.status, to, comment } } });
    return updated;
  });
  if (to === 'RESOLVED' || to === 'CLOSED' || to === 'ACKNOWLEDGED') await routeIncidentNotification(id, `status:${row.updatedAt.toISOString()}`, to, actorId);
  if (to === 'OPEN') await routeIncidentNotification(id, `reopen:${row.reopenedCount}`, 'REOPENED', actorId);
  return getIncident(row.id);
}

export async function addIncidentComment(id, content, actorId) {
  const incident = await getIncident(id);
  if (!incident) return null;
  const event = await prisma.incidentEvent.create({ data: { incidentId: id, type: 'COMMENT', message: content, actorId } });
  return event;
}

export async function associateAlerts(id, alertIds, actorId) {
  const incident = await getIncident(id);
  if (!incident) return null;
  const alerts = await prisma.alert.findMany({ where: { id: { in: alertIds }, isDemo: false }, select: { id: true, title: true } });
  if (alerts.length !== new Set(alertIds).size) throw Object.assign(new Error('One or more alerts are unavailable'), { status: 400, code: 'INVALID_ALERTS' });
  await prisma.$transaction(async (tx) => {
    await tx.incidentAlert.createMany({ data: alerts.map((alert) => ({ incidentId: id, alertId: alert.id })), skipDuplicates: true });
    await tx.incidentEvent.create({ data: { incidentId: id, type: 'ALERTS_ASSOCIATED', message: `${alerts.length} alert(s) associated.`, actorId, meta: { alertIds: alerts.map((alert) => alert.id) } } });
  });
  return getIncident(id);
}

export async function incidentAnalytics(days = 30) {
  const since = new Date(Date.now() - days * 86400000);
  const incidents = await prisma.incident.findMany({ where: { isDemo: false, detectedAt: { gte: since } }, select: { id: true, publicId: true, title: true, severity: true, status: true, category: true, resourceType: true, resourceId: true, resourceName: true, assigneeId: true, detectedAt: true, ackAt: true, resolvedAt: true, closedAt: true, mttaMs: true, mttrMs: true, reopenedCount: true } });
  const counts = (key) => Object.entries(incidents.reduce((acc, row) => { const value = row[key] || 'UNKNOWN'; acc[value] = (acc[value] || 0) + 1; return acc; }, {})).map(([name, value]) => ({ name, value }));
  const trendMap = new Map();
  for (const incident of incidents) { const day = incident.detectedAt.toISOString().slice(0, 10); trendMap.set(day, (trendMap.get(day) || 0) + 1); }
  const average = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  const durations = incidents.filter((incident) => incident.resolvedAt).map((incident) => incident.resolvedAt.getTime() - incident.detectedAt.getTime()).filter((value) => value >= 0);
  const activeRows = incidents.filter((incident) => ACTIVE_INCIDENT_STATUSES.includes(incident.status));
  const repeated = Object.values(incidents.reduce((acc, incident) => { const key = incident.resourceId ? `${incident.category}:${incident.resourceType}:${incident.resourceId}` : null; if (key) (acc[key] ||= []).push(incident); return acc; }, {})).filter((group) => group.length > 1).map((group) => ({ key: group[0].resourceName || group[0].resourceId, count: group.length, incidents: group.map(({ publicId, title, status, detectedAt }) => ({ publicId, title, status, detectedAt })) })).sort((a, b) => b.count - a.count).slice(0, 10);
  return {
    total: incidents.length, bySeverity: counts('severity'), byCategory: counts('category'), byStatus: counts('status'),
    mttaMs: average(incidents.map((incident) => incident.mttaMs).filter(Number.isFinite)),
    mttrMs: average(incidents.map((incident) => incident.mttrMs).filter(Number.isFinite)),
    averageDurationMs: average(durations),
    trend: [...trendMap].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count })),
    unassigned: activeRows.filter((incident) => !incident.assigneeId).length,
    longRunning: activeRows.filter((incident) => Date.now() - incident.detectedAt.getTime() > 86400000).sort((a, b) => a.detectedAt - b.detectedAt).slice(0, 10),
    repeated,
    mostAffectedResources: Object.values(incidents.reduce((acc, incident) => { const key=incident.resourceId?`${incident.resourceType}:${incident.resourceId}`:null;if(key){const group=acc[key]||={resource:incident.resourceName||incident.resourceId,type:incident.resourceType,count:0};group.count++;}return acc;},{})).sort((a,b)=>b.count-a.count).slice(0,10),
  };
}

export async function incidentOverview(days = 30) {
  const statuses = ['OPEN','ACKNOWLEDGED','INVESTIGATING','RESOLVED','CLOSED','DETECTED'];
  const [total, byStatus, critical, unassigned, requiringAttention, analytics] = await Promise.all([
    prisma.incident.count({ where: noDemo }),
    Promise.all(statuses.map(async (status) => [status, await prisma.incident.count({ where: { ...noDemo, status } })])),
    prisma.incident.count({ where: { ...noDemo, severity: 'CRITICAL', status: { in: ACTIVE_INCIDENT_STATUSES } } }),
    prisma.incident.count({ where: { ...noDemo, assigneeId: null, status: { in: ACTIVE_INCIDENT_STATUSES } } }),
    prisma.incident.count({ where: { ...noDemo, status: { in: ACTIVE_INCIDENT_STATUSES }, OR: [{ severity: 'CRITICAL' }, { assigneeId: null }, { detectedAt: { lt: new Date(Date.now()-4*60*60_000) } }] } }),
    incidentAnalytics(days),
  ]);
  const statusCounts = Object.fromEntries(byStatus);
  return { total, open: statusCounts.OPEN + statusCounts.DETECTED, acknowledged: statusCounts.ACKNOWLEDGED, investigating: statusCounts.INVESTIGATING, critical, resolved: statusCounts.RESOLVED, closed: statusCounts.CLOSED, unassigned, requiringAttention, mttaMs: analytics.mttaMs, mttrMs: analytics.mttrMs, averageDurationMs: analytics.averageDurationMs, trends: analytics.trend, severityDistribution: analytics.bySeverity, categoryDistribution: analytics.byCategory, statusDistribution: analytics.byStatus, mostAffectedResources: analytics.mostAffectedResources, recentlyCreated: await prisma.incident.findMany({ where: noDemo, include: { assignee: { select: userSelect } }, orderBy: { detectedAt: 'desc' }, take: 8 }), longRunning: analytics.longRunning, repeated: analytics.repeated };
}

export async function listAssignableUsers() {
  return prisma.user.findMany({ where: { isActive: true, alertTeamMember: { is: { isActive: true, memberType: 'INTERNAL' } } }, select: userSelect, orderBy: { name: 'asc' } });
}

export async function listAutomationRules() {
  return prisma.incidentAutomationRule.findMany({ orderBy: [{ enabled: 'desc' }, { createdAt: 'desc' }] });
}

export async function saveAutomationRule(input, actorId, id) {
  if (id) return prisma.incidentAutomationRule.update({ where: { id }, data: input });
  return prisma.incidentAutomationRule.create({ data: { ...input, createdById: actorId } });
}

export async function notifyUnacknowledgedIncidents(seconds) {
  const due = await prisma.incident.findMany({ where: { isDemo:false, status:{in:['OPEN','DETECTED']}, assigneeId:null, detectedAt:{lt:new Date(Date.now()-seconds*1000)} }, select:{id:true,publicId:true}, take:100, orderBy:{detectedAt:'asc'} });
  for(const incident of due){
    const prior=await prisma.incidentEvent.findFirst({where:{incidentId:incident.id,type:'UNACKNOWLEDGED_REMINDER'},select:{id:true}});
    if(prior)continue;
    try{
      await prisma.incidentEvent.create({data:{incidentId:incident.id,type:'UNACKNOWLEDGED_REMINDER',message:`Incident remains unacknowledged beyond ${seconds} seconds.`}});
      await routeIncidentNotification(incident.id,`unacknowledged:${incident.id}`,'UNACKNOWLEDGED');
    }catch(error){if(error.code!=='P2002')throw error;}
  }
  return {reminders:due.length};
}
