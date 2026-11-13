import { prisma } from '../lib/prisma.js';
import { compareMetric, evaluateMetricWindow } from './alertPolicy.js';
import { routeAlertEvent } from './notificationService.js';

const activeStatuses = ['OPEN', 'ACKNOWLEDGED'];
const metricKinds = { CPU: 'CPU', MEM: 'MEM', DISK: 'DISK', NET_IN: 'NET_IN', NET_OUT: 'NET_OUT', LOAD: 'LOAD' };

export async function evaluateAlerts(serverId, metricValues = {}) {
  const [server, rules] = await Promise.all([
    prisma.server.findUnique({ where: { id: serverId }, select: { id: true, name: true, provider: true, awsInstanceId: true } }),
    prisma.alertRule.findMany({ where: { enabled: true, isDemo: false, deletedAt: null } }),
  ]);
  if (!server) return;
  for (const rule of rules) {
    if (rule.resourceId && rule.resourceId !== serverId && rule.resourceId !== server.awsInstanceId) continue;
    if (rule.resourceType && !['HOST', server.provider === 'AWS' ? 'EC2_INSTANCE' : null].includes(rule.resourceType)) continue;
    if (rule.category && !['INFRASTRUCTURE', server.provider === 'AWS' ? 'AWS' : null].includes(rule.category)) continue;
    if (!rule.metric || rule.threshold == null) continue;
    const kind = metricKinds[rule.metric];
    if (!kind) continue;
    const latest = await prisma.metricSample.findFirst({ where: { serverId, kind }, orderBy: { collectedAt: 'desc' }, select: { value: true, collectedAt: true } });
    if (!latest) continue;
    let evaluation = { triggered: compareMetric(latest.value, rule.operator, rule.threshold), complete: true, latestValue: latest.value };
    if (rule.evaluationDurationSec > 0) {
      const samples = await prisma.metricSample.findMany({ where: { serverId, kind, collectedAt: { gte: new Date(Date.now() - (rule.evaluationDurationSec + 120) * 1000) } }, orderBy: { collectedAt: 'asc' }, select: { value: true, collectedAt: true } });
      evaluation = evaluateMetricWindow(samples, { operator: rule.operator, threshold: rule.threshold, durationSec: rule.evaluationDurationSec, maxGapSec: server.provider === 'AWS' ? 360 : 90 });
    }
    if (!evaluation.complete) continue;
    const category = server.provider === 'AWS' ? 'AWS' : 'INFRASTRUCTURE';
    const deduplicationKey = `rule:${rule.id}:resource:${serverId}`;
    await recordEvaluation({ rule, server, category, resourceType: server.provider === 'AWS' ? 'EC2_INSTANCE' : 'HOST', resourceId: serverId, resourceName: server.name, deduplicationKey, metricValue: evaluation.latestValue, triggered: Boolean(evaluation.triggered), title: rule.name, description: `${rule.metric} ${rule.operator} ${rule.threshold} for ${rule.evaluationDurationSec}s` });
  }
}

async function recordEvaluation({ rule, server, category, resourceType, resourceId, resourceName, deduplicationKey, metricValue, triggered, title, description, alertType = 'METRIC_THRESHOLD', severity }) {
  const existing = await prisma.alert.findUnique({ where: { deduplicationKey } });
  const now = new Date();
  if (triggered) {
    if (existing && activeStatuses.includes(existing.status)) {
      await prisma.alert.update({ where: { id: existing.id }, data: { metricValue, threshold: rule?.threshold ?? existing.threshold, lastEvaluatedAt: now } });
      return existing;
    }
    const withinCooldown = existing?.lastNotifiedAt && now.getTime() - existing.lastNotifiedAt.getTime() < (rule?.cooldownSec ?? 300) * 1000;
    const alert = await prisma.alert.upsert({
      where: { deduplicationKey },
      create: { ruleId: rule?.id, serverId: server?.id, category, alertType, resourceType, resourceId, resourceName, deduplicationKey, title, description, severity: severity || rule?.severity || 'HIGH', status: 'OPEN', metricValue, threshold: rule?.threshold ?? null, evaluationDurationSec: rule?.evaluationDurationSec ?? null, lastEvaluatedAt: now, lastNotifiedAt: now, isDemo: false },
      update: { ruleId: rule?.id, category, alertType, resourceType, resourceId, resourceName, title, description, severity: severity || rule?.severity || existing?.severity || 'HIGH', status: 'OPEN', metricValue, threshold: rule?.threshold ?? null, evaluationDurationSec: rule?.evaluationDurationSec ?? null, lastEvaluatedAt: now, resolvedAt: null, ackAt: null, ackById: null, occurrenceCount: { increment: 1 }, ...(withinCooldown ? {} : { lastNotifiedAt: now }) },
    });
    if (!existing || existing.status === 'RESOLVED') {
      const eventType = existing ? 'ALERT_REOPENED' : 'ALERT_CREATED';
      await prisma.alertEvent.create({ data: { alertId: alert.id, type: eventType, message: existing ? 'Alert condition returned after resolution.' : 'Alert condition detected.' } });
      if (!withinCooldown) await routeAlertEvent(alert);
      if (alert.severity === 'CRITICAL' && server?.id) await maybeCreateIncident(alert, server.id);
    }
    return alert;
  }
  if (existing && activeStatuses.includes(existing.status)) {
    const resolved = await prisma.alert.update({ where: { id: existing.id }, data: { status: 'RESOLVED', resolvedAt: now, lastEvaluatedAt: now } });
    await prisma.alertEvent.create({ data: { alertId: existing.id, type: 'ALERT_RESOLVED', message: 'Alert condition cleared.' } });
    await routeAlertEvent(resolved, 'ALERT_RESOLVED');
    return resolved;
  }
  return existing;
}

export async function evaluateSignal({ key, alertType, category, resourceType, resourceId, resourceName, title, description, triggered, severity = 'HIGH', serverId = null, apiMonitorId = null, meta = null }) {
  const existing = await prisma.alert.findUnique({ where: { deduplicationKey: key } });
  if (triggered) {
    if (existing && activeStatuses.includes(existing.status)) { await prisma.alert.update({ where: { id: existing.id }, data: { lastEvaluatedAt: new Date() } }); return; }
    const alert = await prisma.alert.upsert({ where: { deduplicationKey: key }, create: { deduplicationKey: key, category, alertType, resourceType, resourceId, resourceName, serverId, apiMonitorId, title, description, severity, status: 'OPEN', lastEvaluatedAt: new Date(), lastNotifiedAt: new Date() }, update: { category, alertType, resourceType, resourceId, resourceName, serverId, apiMonitorId, title, description, severity, status: 'OPEN', resolvedAt: null, ackAt: null, ackById: null, occurrenceCount: { increment: 1 }, lastEvaluatedAt: new Date(), lastNotifiedAt: new Date() } });
    if (!existing || existing.status === 'RESOLVED') {
      await prisma.alertEvent.create({ data: { alertId: alert.id, type: existing ? 'ALERT_REOPENED' : 'ALERT_CREATED', message: description || title, meta: meta || undefined } });
      await routeAlertEvent(alert);
    }
  } else if (existing && activeStatuses.includes(existing.status)) {
    const alert = await prisma.alert.update({ where: { deduplicationKey: key }, data: { status: 'RESOLVED', resolvedAt: new Date(), lastEvaluatedAt: new Date() } });
    await prisma.alertEvent.create({ data: { alertId: alert.id, type: 'ALERT_RESOLVED', message: 'Alert condition cleared.' } });
    await routeAlertEvent(alert, 'ALERT_RESOLVED');
  }
}

export async function evaluateApiMonitorRules(monitor) {
  const rules = await prisma.alertRule.findMany({ where: { enabled:true, isDemo:false, deletedAt:null, category:'APPLICATION', resourceType:{in:['API','API_MONITOR']}, OR:[{resourceId:null},{resourceId:monitor.id}] } });
  if (!rules.length) return;
  const maxLookbackSec=Math.max(900,...rules.map(rule=>rule.evaluationDurationSec+monitor.intervalSec*2));
  const checks=await prisma.apiCheck.findMany({where:{apiMonitorId:monitor.id,checkedAt:{gte:new Date(Date.now()-maxLookbackSec*1000)}},orderBy:{checkedAt:'asc'},take:500});
  const maxGapSec=Math.max(90,monitor.intervalSec*2);
  for (const rule of rules) {
    if (rule.threshold == null) continue;
    let value = null;
    let evaluation=null;
    if (rule.metric === 'API_LATENCY') {
      const latencyChecks=checks.filter(check=>check.latencyMs!=null);
      if(rule.evaluationDurationSec>0) evaluation=evaluateMetricWindow(latencyChecks.map(check=>({value:check.latencyMs,collectedAt:check.checkedAt})),{operator:rule.operator,threshold:rule.threshold,durationSec:rule.evaluationDurationSec,maxGapSec});
      else value=latencyChecks.at(-1)?.latencyMs??null;
    }
    if (rule.metric === 'API_ERROR_RATE') {
      const durationSec=rule.evaluationDurationSec||900;
      const start=Date.now()-durationSec*1000;
      const recent=checks.filter(check=>check.checkedAt.getTime()>=start);
      const fresh=recent.at(-1)&&Date.now()-recent.at(-1).checkedAt.getTime()<=maxGapSec*1000;
      const coverage=recent[0]&&recent[0].checkedAt.getTime()-start<=maxGapSec*1000;
      if(recent.length>=3&&fresh&&(rule.evaluationDurationSec===0||coverage)) value=recent.filter(check=>!check.success).length*100/recent.length;
    }
    if(evaluation){if(!evaluation.complete)continue;value=evaluation.latestValue;}
    if (value == null) continue;
    const triggered = evaluation ? evaluation.triggered : compareMetric(value,rule.operator,rule.threshold);
    await evaluateSignal({key:`api-rule:${rule.id}:monitor:${monitor.id}`,alertType:rule.metric==='API_LATENCY'?'API_LATENCY':'API_ERROR_RATE',category:'APPLICATION',resourceType:'API_MONITOR',resourceId:monitor.id,resourceName:monitor.name,apiMonitorId:monitor.id,title:rule.name,description:`${rule.metric} is ${value.toFixed(1)} (threshold ${rule.threshold}).`,triggered,severity:rule.severity,meta:{metric:rule.metric,value,threshold:rule.threshold}});
  }
}

export async function evaluateDockerContainerRules(containerId) {
  const container = await prisma.dockerContainer.findUnique({where:{id:containerId},include:{server:{select:{id:true,name:true}}}});
  if (!container) return;
  const rules = await prisma.alertRule.findMany({where:{enabled:true,isDemo:false,deletedAt:null,category:'DOCKER',resourceType:'DOCKER_CONTAINER',OR:[{resourceId:null},{resourceId:container.id},{resourceId:container.containerId}]}});
  for (const rule of rules) {
    const field = rule.metric === 'CONTAINER_CPU' ? 'cpuPercent' : rule.metric === 'CONTAINER_MEM' ? 'memoryPercent' : null;
    if (!field || rule.threshold == null) continue;
    const latest = await prisma.dockerContainerMetric.findFirst({where:{containerDbId:container.id,[field]:{not:null}},orderBy:{collectedAt:'desc'},select:{[field]:true,collectedAt:true}});
    if (!latest) continue;
    let evaluation = {triggered:compareMetric(latest[field],rule.operator,rule.threshold),complete:true,latestValue:latest[field]};
    if (rule.evaluationDurationSec>0) {
      const samples=await prisma.dockerContainerMetric.findMany({where:{containerDbId:container.id,[field]:{not:null},collectedAt:{gte:new Date(Date.now()-(rule.evaluationDurationSec+120)*1000)}},orderBy:{collectedAt:'asc'},select:{[field]:true,collectedAt:true}});
      evaluation=evaluateMetricWindow(samples.map(sample=>({value:sample[field],collectedAt:sample.collectedAt})),{operator:rule.operator,threshold:rule.threshold,durationSec:rule.evaluationDurationSec});
    }
    if (!evaluation.complete) continue;
    await recordEvaluation({rule,server:{id:container.server.id,name:container.server.name},category:'DOCKER',resourceType:'DOCKER_CONTAINER',resourceId:container.id,resourceName:container.name,deduplicationKey:`rule:${rule.id}:resource:${container.id}`,metricValue:evaluation.latestValue,triggered:Boolean(evaluation.triggered),title:rule.name,description:`${rule.metric} ${rule.operator} ${rule.threshold} for ${rule.evaluationDurationSec}s`});
  }
}

export async function acknowledgeAlert(id, actorId) {
  const alert = await prisma.alert.findUnique({ where: { id } });
  if (!alert) return null;
  if (alert.status === 'RESOLVED') return alert;
  if (alert.status === 'ACKNOWLEDGED') return alert;
  const updated = await prisma.alert.update({ where: { id }, data: { status: 'ACKNOWLEDGED', ackAt: new Date(), ackById: actorId } });
  await prisma.alertEvent.create({ data: { alertId: id, type: 'ALERT_ACKNOWLEDGED', message: 'Alert acknowledged by an administrator.', actorId } });
  return updated;
}

export async function evaluateHeartbeats(staleSec) {
  const staleThreshold = new Date(Date.now() - staleSec * 1000);
  const servers = await prisma.server.findMany({ where: { isDemo: false, agent: { is: { status: 'ACTIVE' } }, lastHeartbeatAt: { not: null } }, select: { id: true, name: true, lastHeartbeatAt: true } });
  for (const server of servers) {
    const stale = server.lastHeartbeatAt < staleThreshold;
    if (stale) await prisma.server.updateMany({ where: { id: server.id, status: { not: 'OFFLINE' } }, data: { status: 'OFFLINE' } });
    await evaluateSignal({ key: `agent-disconnected:${server.id}`, alertType: 'AGENT_DISCONNECTED', category: 'AGENT', resourceType: 'HOST', resourceId: server.id, resourceName: server.name, serverId: server.id, title: `Agent disconnected: ${server.name}`, description: `No agent heartbeat received for at least ${staleSec} seconds.`, triggered: stale, severity: 'HIGH' });
    if (!stale) await prisma.server.updateMany({ where: { id: server.id, status: 'OFFLINE' }, data: { status: 'HEALTHY' } });
  }
}

async function maybeCreateIncident(alert, serverId) {
  const existing = await prisma.incident.findFirst({ where: { serverId, isDemo: false, status: { in: ['DETECTED', 'OPEN', 'ACKNOWLEDGED', 'INVESTIGATING'] } } });
  if (existing) { await prisma.incidentAlert.create({ data: { incidentId: existing.id, alertId: alert.id } }).catch(() => {}); return; }
  const server = await prisma.server.findUnique({ where: { id: serverId } });
  const last = await prisma.incident.findFirst({ orderBy: { createdAt: 'desc' }, select: { publicId: true } });
  const next = Number(last?.publicId?.match(/\d+/)?.[0] || 999) + 1;
  await prisma.incident.create({ data: { publicId: `INC-${next}`, title: `${alert.title} on ${server?.name ?? serverId}`, description: alert.description, severity: alert.severity, status: 'DETECTED', serverId, isDemo: false, events: { create: [{ type: 'DETECTED', message: `Incident auto-created from alert: ${alert.title}` }] }, alerts: { create: [{ alertId: alert.id }] } } });
}
