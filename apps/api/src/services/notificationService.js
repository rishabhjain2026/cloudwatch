import nodemailer from 'nodemailer';
import { prisma } from '../lib/prisma.js';
import { notificationDedupeKey, safeDeliveryError, selectRoutingRules, eligibleChannels, retryDelaySeconds } from './alertPolicy.js';

const MAX_ATTEMPTS = 5;
const channels = (value) => Array.isArray(value) ? value.filter((item) => ['IN_APP', 'EMAIL'].includes(item)) : [];

export async function routeAlertEvent(alert, eventType = 'ALERT_FIRING') {
  const rules = await prisma.alertRoutingRule.findMany({
    where: { enabled: true, deletedAt: null },
    include: { recipients: { include: { member: { include: { user: { select: { isActive: true } } } } } } },
  });
  const selected = selectRoutingRules(rules, alert);
  if (!selected.matched) {
    await prisma.alertEvent.create({ data: { alertId: alert.id, type: 'ROUTING_NO_MATCH', message: 'No enabled routing rule matched this alert.' } });
    return;
  }
  const targets = new Map();
  for (const rule of selected.rules) for (const recipient of rule.recipients) {
    const member = recipient.member;
    for (const channel of eligibleChannels(member, channels(rule.channels), alert.severity, eventType)) {
      const key = `${member.id}:${channel}`;
      if (!targets.has(key)) targets.set(key, { rule, member, channel });
    }
  }
  if (!targets.size) {
    await prisma.alertEvent.create({ data: { alertId: alert.id, type: 'ROUTING_NO_ELIGIBLE_RECIPIENTS', message: 'Matching routing rules have no eligible recipients.' } });
    return;
  }
  for (const { rule, member, channel } of targets.values()) {
    const deduplicationKey = notificationDedupeKey(alert.id, alert.occurrenceCount, member.id, channel, eventType);
    const title = eventType === 'ALERT_RESOLVED' ? `Resolved: ${alert.title}` : alert.title;
    const body = `${alert.description || alert.title}${alert.resourceName ? `\nResource: ${alert.resourceName}` : ''}${alert.metricValue != null ? `\nCurrent value: ${alert.metricValue}${alert.threshold != null ? ` (threshold ${alert.threshold})` : ''}` : ''}`;
    try {
      const delivery = await prisma.notificationDelivery.create({ data: { alertId: alert.id, memberId: member.id, routingRuleId: rule.id, channel, recipientEmail: member.email, status: channel === 'IN_APP' ? 'SENT' : 'PENDING', sentAt: channel === 'IN_APP' ? new Date() : null, deduplicationKey, eventType } });
      if (channel === 'IN_APP' && member.userId) {
        await prisma.notification.create({ data: { userId: member.userId, alertId: alert.id, deduplicationKey, channel: 'IN_APP', title, body, meta: { alertId: alert.id, eventType } } });
      }
      if (channel === 'IN_APP') await prisma.notificationAttempt.create({ data: { deliveryId: delivery.id, attempt: 1, status: 'SENT' } });
    } catch (error) { if (error.code !== 'P2002') throw error; }
  }
}

export async function routeIncidentNotification(incidentId, eventKey, eventType, actorId = null) {
  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
    include: {
      assignee: { select: { id: true, alertTeamMember: { include: { user: { select: { isActive: true } } } } } },
      alerts: { include: { alert: true } },
    },
  });
  if (!incident) return;
  const primaryAlert = incident.alerts[0]?.alert;
  const routingTarget = {
    category: incident.category,
    severity: incident.severity,
    resourceType: incident.resourceType,
    resourceId: incident.resourceId,
    alertType: primaryAlert?.alertType || `INCIDENT_${eventType}`,
  };
  const rules = await prisma.alertRoutingRule.findMany({
    where: { enabled: true, deletedAt: null },
    include: { recipients: { include: { member: { include: { user: { select: { id: true, isActive: true } } } } } } },
  });
  const selected = selectRoutingRules(rules, routingTarget);
  const targets = new Map();
  for (const rule of selected.rules) {
    for (const { member } of rule.recipients) {
      for (const channel of eligibleChannels(member, channels(rule.channels), incident.severity, eventType === 'RESOLVED' || eventType === 'CLOSED' ? 'ALERT_RESOLVED' : 'ALERT_FIRING')) {
        targets.set(`${member.id}:${channel}`, { member, rule, channel });
      }
    }
  }
  const assigneeMember = incident.assignee?.alertTeamMember;
  if (assigneeMember) {
    const allowed = eligibleChannels(assigneeMember, ['IN_APP', ...(selected.rules.flatMap((rule) => channels(rule.channels)).includes('EMAIL') ? ['EMAIL'] : [])], incident.severity, eventType === 'RESOLVED' || eventType === 'CLOSED' ? 'ALERT_RESOLVED' : 'ALERT_FIRING');
    for (const channel of allowed) targets.set(`${assigneeMember.id}:${channel}`, { member: assigneeMember, rule: selected.rules[0] || null, channel });
  }
  if (!targets.size) return;
  const subject = `${eventType.replaceAll('_', ' ')}: ${incident.publicId} ${incident.title}`;
  const body = `Incident ${incident.publicId}: ${incident.title}\nStatus: ${incident.status}\nSeverity: ${incident.severity}\nCategory: ${incident.category}${incident.resourceName ? `\nResource: ${incident.resourceName}` : ''}`;
  for (const { member, rule, channel } of targets.values()) {
    if (actorId && member.userId === actorId) continue;
    const deduplicationKey = `incident:${incident.id}:${eventKey}:${member.id}:${channel}`;
    try {
      const delivery = await prisma.notificationDelivery.create({ data: { incidentId: incident.id, memberId: member.id, routingRuleId: rule?.id, channel, recipientEmail: member.email, subject, body, status: channel === 'IN_APP' ? 'SENT' : 'PENDING', sentAt: channel === 'IN_APP' ? new Date() : null, deduplicationKey, eventType: `INCIDENT_${eventType}` } });
      if (channel === 'IN_APP' && member.userId) {
        await prisma.notification.create({ data: { userId: member.userId, incidentId: incident.id, deduplicationKey, channel: 'IN_APP', title: subject, body, meta: { incidentId: incident.id, eventType } } });
      }
      if (channel === 'IN_APP') await prisma.notificationAttempt.create({ data: { deliveryId: delivery.id, attempt: 1, status: 'SENT' } });
    } catch (error) { if (error.code !== 'P2002') throw error; }
  }
}

function smtpSettings() {
  const host = process.env.SMTP_HOST;
  const from = process.env.SMTP_FROM_EMAIL;
  return host && from ? { host, from, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === 'true', user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : null;
}

function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }

async function sendEmail(delivery) {
  const config = smtpSettings();
  if (!config) { const error = new Error('SMTP is not configured'); error.code = 'SMTP_NOT_CONFIGURED'; throw error; }
  const transporter = nodemailer.createTransport({ host: config.host, port: config.port, secure: config.secure, auth: config.user ? { user: config.user, pass: config.pass } : undefined });
  const alert = delivery.alert;
  const title = delivery.subject || (delivery.eventType === 'ALERT_RESOLVED' ? `Resolved: ${alert?.title}` : alert?.title) || 'InfraPulse notification';
  const details = delivery.body || `${alert?.description || alert?.title || ''}${alert?.resourceName ? `\nResource: ${alert.resourceName}` : ''}${alert?.metricValue != null ? `\nCurrent value: ${alert.metricValue}` : ''}`;
  const senderName = String(process.env.SMTP_FROM_NAME || 'InfraPulse').replace(/[\r\n]/g, ' ').trim();
  const safeSubject = `[InfraPulse] ${String(title).replace(/[\r\n]/g, ' ').slice(0, 200)}`;
  return transporter.sendMail({ from: `${senderName} <${config.from}>`, to: delivery.recipientEmail, subject: safeSubject, text: `${title}\n\n${details}`, html: `<main style="font-family:Arial,sans-serif"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(details).replace(/\n/g, '<br>')}</p><p>InfraPulse monitoring notification</p></main>` });
}

export async function processNotificationQueue(batchSize = 20) {
  const now = new Date();
  await prisma.notificationDelivery.updateMany({ where: { status: 'SENDING', lockedUntil: { lt: now } }, data: { status: 'RETRYING', nextAttemptAt: now, lockedUntil: null } });
  const due = await prisma.notificationDelivery.findMany({ where: { channel: 'EMAIL', status: { in: ['PENDING', 'RETRYING'] }, OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }] }, select: { id: true }, take: batchSize, orderBy: { createdAt: 'asc' } });
  let sent = 0;
  for (const { id } of due) {
    const claimed = await prisma.notificationDelivery.updateMany({ where: { id, status: { in: ['PENDING', 'RETRYING'] } }, data: { status: 'SENDING', lockedUntil: new Date(Date.now() + 120_000), lastAttemptAt: new Date(), attemptCount: { increment: 1 } } });
    if (!claimed.count) continue;
    const delivery = await prisma.notificationDelivery.findUnique({ where: { id }, include: { alert: true, incident: true } });
    const priorAttempts = await prisma.notificationAttempt.aggregate({ where: { deliveryId: id }, _max: { attempt: true } });
    const attempt = (priorAttempts._max.attempt || 0) + 1;
    try {
      await sendEmail(delivery);
      await prisma.$transaction([prisma.notificationDelivery.update({ where: { id }, data: { status: 'SENT', sentAt: new Date(), lockedUntil: null, lastError: null } }), prisma.notificationAttempt.create({ data: { deliveryId: id, attempt, status: 'SENT' } })]);
      sent++;
    } catch (error) {
      const errorCode = safeDeliveryError(error);
      const failed = delivery.attemptCount >= MAX_ATTEMPTS;
      const nextAttemptAt = failed ? null : new Date(Date.now() + retryDelaySeconds(delivery.attemptCount) * 1000);
      await prisma.$transaction([prisma.notificationDelivery.update({ where: { id }, data: { status: failed ? 'FAILED' : 'RETRYING', nextAttemptAt, lockedUntil: null, lastError: errorCode } }), prisma.notificationAttempt.create({ data: { deliveryId: id, attempt, status: failed ? 'FAILED' : 'RETRYING', errorCode } })]);
    }
  }
  return { processed: due.length, sent };
}

export async function retryNotificationDelivery(id) {
  const row = await prisma.notificationDelivery.findUnique({ where: { id } });
  if (!row || row.channel !== 'EMAIL' || row.status === 'SENDING') return null;
  return prisma.notificationDelivery.update({ where: { id }, data: { status: 'PENDING', attemptCount: 0, nextAttemptAt: null, lockedUntil: null, lastError: null } });
}

export function smtpStatus() { return { configured: Boolean(smtpSettings()), fromConfigured: Boolean(process.env.SMTP_FROM_EMAIL) }; }
