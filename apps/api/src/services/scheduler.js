import { env } from '../config/env.js';
import { evaluateHeartbeats } from './alertService.js';
import { runDueApiChecks } from './apiCheckerService.js';

let heartbeatTimer = null;
let apiCheckTimer = null;

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
  }

  console.log('[scheduler] started — heartbeat watchdog + API checker active');
}

export function stopScheduler() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  if (apiCheckTimer) clearInterval(apiCheckTimer);
}
