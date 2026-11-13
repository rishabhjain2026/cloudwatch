import { env } from '../config/env.js';
import { evaluateHeartbeats } from './alertService.js';
import { runDueApiChecks } from './apiCheckerService.js';
import { syncAwsResources } from './awsService.js';
import { processNotificationQueue } from './notificationService.js';
import { processIncidentAnalysisQueue } from './incidentAiService.js';
import { notifyUnacknowledgedIncidents } from './incidentService.js';

let heartbeatTimer = null;
let apiCheckTimer = null;
let awsSyncTimer = null;
let notificationTimer = null;
let incidentAiTimer = null;
let incidentAiRunning = false;
let incidentReminderTimer = null;

export function startScheduler() {
  // Heartbeat watchdog — runs every 30 seconds
  heartbeatTimer = setInterval(async () => {
    try {
      await evaluateHeartbeats(env.AGENT_HEARTBEAT_STALE_SEC);
    } catch (err) {
      console.error('[scheduler] heartbeat watchdog error:', err.message);
    }
  }, 30_000);

  // API health checker — runs every 30 seconds, checks internally which monitors are due
  if (env.ALERT_EVAL_ENABLED) {
    apiCheckTimer = setInterval(async () => {
      try {
        const result = await runDueApiChecks();
        if (result.ran > 0) {
          console.log(`[scheduler] ran ${result.ran} API check(s)`);
        }
      } catch (err) {
        console.error('[scheduler] API checker error:', err.message);
      }
    }, 30_000);
    notificationTimer = setInterval(async () => {
      try { await processNotificationQueue(); }
      catch (err) { console.error('[scheduler] notification worker error:', err.message); }
    }, 15_000);
  }

  incidentAiTimer = setInterval(async () => {
    if (incidentAiRunning) return;
    incidentAiRunning = true;
    try { await processIncidentAnalysisQueue(); }
    catch (err) { console.error('[scheduler] incident AI worker error:', err.message); }
    finally { incidentAiRunning = false; }
  }, 5_000);
  incidentReminderTimer = setInterval(async () => {
    try { await notifyUnacknowledgedIncidents(env.INCIDENT_UNACKNOWLEDGED_SEC); }
    catch (err) { console.error('[scheduler] incident reminder error:', err.message); }
  }, 60_000);

  if (env.AWS_REGION) {
    const intervalMs = env.AWS_SYNC_INTERVAL_MINUTES * 60_000;
    awsSyncTimer = setInterval(async () => {
      try {
        const result = await syncAwsResources('scheduled');
        console.log(`[scheduler] AWS sync ${result.status}: ${result.resourcesDiscovered ?? 0} resources`);
      } catch (err) {
        console.error('[scheduler] AWS sync failed:', err.message);
      }
    }, intervalMs);
  }

  console.log('[scheduler] started — heartbeat watchdog + API checker active');
}

export function stopScheduler() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  if (apiCheckTimer) clearInterval(apiCheckTimer);
  if (awsSyncTimer) clearInterval(awsSyncTimer);
  if (notificationTimer) clearInterval(notificationTimer);
  if (incidentAiTimer) clearInterval(incidentAiTimer);
  if (incidentReminderTimer) clearInterval(incidentReminderTimer);
}
