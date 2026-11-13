/**
 * One-time agent registration script.
 * Run once per server. Prints the agent token — save it securely.
 *
 * Usage:
 *   INFRAPULSE_API_URL=http://localhost:4000 \
 *   INFRAPULSE_ADMIN_EMAIL=admin@infrapulse.local \
 *   INFRAPULSE_ADMIN_PASSWORD=InfraPulseAdmin!234 \
 *   node register.js
 *
 * Optional env vars:
 *   AGENT_NAME        — display name for this server
 *   AGENT_HOSTNAME    — override hostname
 *   AGENT_ENV         — environment (production/staging/dev)
 *   AGENT_REGION      — region label
 *   AGENT_PROVIDER    — provider label (AWS/GCP/VPS/etc)
 *   AGENT_AWS_INSTANCE_ID — associate this agent to an existing discovered EC2 instance
 */

import https from 'node:https';
import http from 'node:http';
import { writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { URL } from 'node:url';

const apiUrl = process.env.INFRAPULSE_API_URL;
const adminEmail = process.env.INFRAPULSE_ADMIN_EMAIL;
const adminPassword = process.env.INFRAPULSE_ADMIN_PASSWORD;

if (!apiUrl || !adminEmail || !adminPassword) {
  console.error('Required: INFRAPULSE_API_URL, INFRAPULSE_ADMIN_EMAIL, INFRAPULSE_ADMIN_PASSWORD');
  process.exit(1);
}

const base = new URL(apiUrl);
const lib = base.protocol === 'https:' ? https : http;

function request(path, method, body, headers = {}) {
  const data = body ? JSON.stringify(body) : null;
  const options = {
    hostname: base.hostname,
    port: base.port || (base.protocol === 'https:' ? 443 : 80),
    path,
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      ...headers,
    },
  };
  return new Promise((resolve, reject) => {
    const req = lib.request(options, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw), headers: res.headers }); }
        catch { reject(new Error(`Non-JSON response: ${raw}`)); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  console.log(`Connecting to ${apiUrl}...`);

  // Step 1: Login to get JWT cookie + CSRF token
  const loginRes = await request('/api/v1/admin/auth/login', 'POST', { email: adminEmail, password: adminPassword });
  if (loginRes.status !== 200) {
    console.error('Login failed:', loginRes.body?.error?.message || loginRes.status);
    process.exit(1);
  }

  const cookies = loginRes.headers['set-cookie'] || [];
  const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');
  const csrfMatch = cookies.find(c => c.includes('ip_csrf='));
  const csrfToken = csrfMatch ? csrfMatch.split('ip_csrf=')[1].split(';')[0] : null;

  if (!csrfToken) {
    console.error('Could not extract CSRF token from login response');
    process.exit(1);
  }

  console.log('Login successful.');

  // Step 2: Register the agent
  const hostname = process.env.AGENT_HOSTNAME || os.hostname();
  const payload = {
    hostname,
    name: process.env.AGENT_NAME || hostname,
    os: process.env.AGENT_OS || `${os.type()} ${os.release()}`,
    environment: process.env.AGENT_ENV || 'production',
    region: process.env.AGENT_REGION || '',
    provider: process.env.AGENT_PROVIDER || '',
    ...(process.env.AGENT_AWS_INSTANCE_ID ? { awsInstanceId: process.env.AGENT_AWS_INSTANCE_ID } : {}),
  };

  const regRes = await request('/api/v1/admin/agents/register', 'POST', payload, {
    Cookie: cookieHeader,
    'X-CSRF-Token': csrfToken,
  });

  if (regRes.status !== 201) {
    console.error('Registration failed:', regRes.body?.error?.message || regRes.status);
    process.exit(1);
  }

  const { serverId, agentId, token } = regRes.body.data;

  const tokenFile = process.env.AGENT_TOKEN_FILE;
  if (tokenFile) {
    const contents = [
      `INFRAPULSE_API_URL=${apiUrl}`,
      `INFRAPULSE_TOKEN=${token}`,
      `INFRAPULSE_INTERVAL_SEC=${process.env.INFRAPULSE_INTERVAL_SEC || '30'}`,
      'INFRAPULSE_DOCKER=true',
      `INFRAPULSE_DOCKER_METRICS_INTERVAL_SEC=${process.env.INFRAPULSE_DOCKER_METRICS_INTERVAL_SEC || '30'}`,
      `INFRAPULSE_DOCKER_INVENTORY_INTERVAL_SEC=${process.env.INFRAPULSE_DOCKER_INVENTORY_INTERVAL_SEC || '60'}`,
    ].join('\n') + '\n';
    await writeFile(path.resolve(tokenFile), contents, { flag: 'wx', mode: 0o600 });
    console.log(`Agent token was written to the requested local config file (${path.basename(tokenFile)}).`);
    console.log('The token will not be printed again.');
    console.log(`  Server ID : ${serverId}`);
    console.log(`  Agent ID  : ${agentId}`);
    console.log(`  Hostname  : ${hostname}`);
    return;
  }

  console.log('\n========================================');
  console.log('  Agent registered successfully!');
  console.log('========================================');
  console.log(`  Server ID : ${serverId}`);
  console.log(`  Agent ID  : ${agentId}`);
  console.log(`  Hostname  : ${hostname}`);
  console.log('\n  TOKEN (save this — shown only once):');
  console.log(`  ${token}`);
  console.log('\n  Add to your .env.agent file:');
  console.log(`  INFRAPULSE_API_URL=${apiUrl}`);
  console.log(`  INFRAPULSE_TOKEN=${token}`);
  console.log('========================================\n');
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
