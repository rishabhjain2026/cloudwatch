/**
 * Agent configuration — all values from environment variables.
 * Never hardcode tokens or API URLs.
 */

function required(name) {
  const val = process.env[name];
  if (!val) {
    console.error(`[agent] Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return val;
}

export const config = {
  // Required
  apiUrl: required('INFRAPULSE_API_URL'),   // e.g. https://your-infrapulse.example.com
  agentToken: required('INFRAPULSE_TOKEN'), // ip_agent_<48 hex chars>

  // Optional
  intervalSec: parseInt(process.env.INFRAPULSE_INTERVAL_SEC || '30', 10),
  dockerEnabled: process.env.INFRAPULSE_DOCKER === 'true',
  dockerSocket: process.env.DOCKER_SOCKET || '/var/run/docker.sock',
  logShipEnabled: process.env.INFRAPULSE_LOGS === 'true',
  logFile: process.env.INFRAPULSE_LOG_FILE || '',
  timeoutMs: parseInt(process.env.INFRAPULSE_TIMEOUT_MS || '10000', 10),
  maxRetries: parseInt(process.env.INFRAPULSE_MAX_RETRIES || '3', 10),
  retryDelayMs: parseInt(process.env.INFRAPULSE_RETRY_DELAY_MS || '5000', 10),
};
