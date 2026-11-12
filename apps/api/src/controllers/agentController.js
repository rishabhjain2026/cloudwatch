import {
  registerAgent,
  recordHeartbeat,
  ingestMetrics,
  syncDockerContainers,
  ingestLogs,
} from '../services/agentService.js';
import { ok } from '../utils/response.js';

/** POST /api/v1/admin/agents/register — admin-only */
export async function registerHandler(req, res) {
  const result = await registerAgent(req.body);
  // 201 Created — token shown exactly once
  return ok(res, result, undefined, 201);
}

/** POST /api/v1/agent/heartbeat — agent-authenticated */
export async function heartbeatHandler(req, res) {
  const result = await recordHeartbeat(req.agent.id, req.agent.serverId, req.body);
  return ok(res, result);
}

/** POST /api/v1/agent/metrics — agent-authenticated */
export async function metricsHandler(req, res) {
  const result = await ingestMetrics(req.agent.serverId, req.body);
  return ok(res, result);
}

/** POST /api/v1/agent/docker — agent-authenticated */
export async function dockerSyncHandler(req, res) {
  const result = await syncDockerContainers(req.agent.serverId, req.body.containers);
  return ok(res, result);
}

/** POST /api/v1/agent/logs — agent-authenticated */
export async function logsIngestHandler(req, res) {
  const result = await ingestLogs(req.agent.serverId, req.body.entries);
  return ok(res, result);
}
