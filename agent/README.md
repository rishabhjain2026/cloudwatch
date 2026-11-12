# InfraPulse Docker Agent

The agent reads the Docker Engine through its local named pipe/socket. It does not open or require Docker TCP port 2375. It posts inventory, host summaries, and metrics using the existing per-server InfraPulse agent token. Each agent token is bound to one `Server` record, which keeps local and EC2 containers isolated.

`Server` is the Docker host record in this project; its existing `Agent` relation stores the token hash and last-seen time. Docker inventory is idempotently keyed by `(serverId, containerId)`. Missing containers are marked stale and retained. Metric history is stored in `DockerContainerMetric`; Docker availability and agent heartbeats are stored independently.

## Local Windows + Docker Desktop

Run these from the project root in PowerShell. Docker Desktop must be installed and signed in to the same Windows user that will run the agent. Confirm Docker Engine is available:

```powershell
docker version --format '{{.Server.Version}}'
docker ps -a
```

Run database and API, and run the frontend in another terminal:

```powershell
npm.cmd run db:up
npm.cmd run db:generate -w @infrapulse/api
npm.cmd run db:migrate:deploy -w @infrapulse/api
npm.cmd run dev:api
```

```powershell
npm.cmd run dev:web
```

Register one local agent. This prompts without echoing the admin password. The one-time agent token is written directly to the ignored local config file and is not printed.

```powershell
$env:INFRAPULSE_API_URL = 'http://localhost:4000'
$env:INFRAPULSE_ADMIN_EMAIL = Read-Host 'InfraPulse admin email'
$securePassword = Read-Host 'InfraPulse admin password' -AsSecureString
$env:INFRAPULSE_ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $securePassword).Password
$env:AGENT_NAME = "$env:COMPUTERNAME Docker Desktop"
$env:AGENT_HOSTNAME = $env:COMPUTERNAME
$env:AGENT_PROVIDER = 'LOCAL'
$env:AGENT_TOKEN_FILE = '.\agent\.env.agent'
node .\agent\register.js
Remove-Item Env:INFRAPULSE_ADMIN_PASSWORD, Env:INFRAPULSE_ADMIN_EMAIL, Env:AGENT_TOKEN_FILE
```

The registration created `agent\.env.agent` with the token and Docker settings. Review the API URL and other settings if needed. The default collector uses `//./pipe/docker_engine`; no Docker API TCP listener is needed. Start and verify it:

```powershell
notepad .\agent\.env.agent
powershell -NoProfile -ExecutionPolicy Bypass -File .\agent\run-agent.ps1
```

To start the agent when this Windows user signs in and restart it after process failure, register a Scheduled Task from an elevated PowerShell window:

```powershell
$agentPath = (Resolve-Path .\agent\run-agent.ps1).Path
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$agentPath`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
$settings = New-ScheduledTaskSettingsSet -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit (New-TimeSpan -Days 0)
Register-ScheduledTask -TaskName 'InfraPulse Docker Agent' -Action $action -Trigger $trigger -Settings $settings -User "$env:USERDOMAIN\$env:USERNAME" -RunLevel Limited -Force
```

The task uses the logged-in user because Docker Desktop's named pipe is user-scoped. If Docker Desktop is stopped, the agent reports Engine unavailable and retries on the next metrics interval; it does not mark the host offline while agent heartbeats continue.

## AWS EC2 Linux deployment

First ensure the existing EC2 instance appears in InfraPulse AWS resources, so registration can attach its `Agent` to the existing EC2 `Server` record. In the AWS console, confirm the instance ID and OS. This deployment does not modify security groups, IAM, or the Docker daemon listener. The API endpoint must be reachable from EC2 over outbound HTTPS; do not expose TCP 2375. Use a valid TLS certificate in production (never send an agent token over public plain HTTP).

From the Windows project directory, register a separate agent bound to the EC2 instance. Replace the placeholders with that instance's actual values. The API admin credentials are prompted, not included in a command literal:

```powershell
$env:INFRAPULSE_API_URL = 'https://YOUR-INFRAPULSE-API-HOST'
$env:INFRAPULSE_ADMIN_EMAIL = Read-Host 'InfraPulse admin email'
$securePassword = Read-Host 'InfraPulse admin password' -AsSecureString
$env:INFRAPULSE_ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $securePassword).Password
$env:AGENT_PROVIDER = 'AWS'
$env:AGENT_AWS_INSTANCE_ID = 'i-REPLACE_WITH_REAL_INSTANCE_ID'
$env:AGENT_HOSTNAME = 'REPLACE_WITH_EC2_HOSTNAME'
$env:AGENT_NAME = 'EC2 Docker host'
$env:AGENT_REGION = 'ap-southeast-2'
$env:AGENT_OS = 'REPLACE_WITH_EC2_OS'
$env:AGENT_TOKEN_FILE = '.\agent\.env.ec2-agent'
node .\agent\register.js
Remove-Item Env:INFRAPULSE_ADMIN_PASSWORD, Env:INFRAPULSE_ADMIN_EMAIL, Env:AGENT_TOKEN_FILE
```

Copy the `agent` directory and its `.env.agent` file to the instance over SSH/SCP. Example for Ubuntu (use the actual SSH host and account):

```powershell
$ec2Host = 'ubuntu@YOUR_EC2_PUBLIC_DNS_OR_IP'
scp -r .\agent "$ec2Host`:/home/ubuntu/infrapulse-agent"
scp .\agent\.env.ec2-agent "$ec2Host`:/home/ubuntu/infrapulse-agent/.env.agent"
```

On Ubuntu, install Docker Engine and Node.js 20 only if they are not already installed. Review the commands for your AMI/Ubuntu release before running them:

```bash
sudo apt-get update
sudo apt-get install -y docker.io curl ca-certificates
sudo systemctl enable --now docker
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
docker version
```

The Docker socket grants root-equivalent control of the host. This agent only calls read endpoints, but membership in the `docker` group is still privileged. Run it as a dedicated user and keep its token file root-owned and mode `0600`:

```bash
sudo useradd --system --create-home --home-dir /opt/infrapulse --shell /usr/sbin/nologin infrapulse
sudo usermod -aG docker infrapulse
sudo install -d -o root -g infrapulse -m 0750 /opt/infrapulse/agent
sudo cp -a /home/ubuntu/infrapulse-agent/. /opt/infrapulse/agent/
sudo chown -R root:infrapulse /opt/infrapulse/agent
sudo chmod 0640 /opt/infrapulse/agent/.env.agent
sudo chmod 0750 /opt/infrapulse/agent
```

Create `/etc/systemd/system/infrapulse-agent.service` with:

```ini
[Unit]
Description=InfraPulse host and Docker monitoring agent
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=simple
User=infrapulse
Group=infrapulse
SupplementaryGroups=docker
WorkingDirectory=/opt/infrapulse/agent
EnvironmentFile=/opt/infrapulse/agent/.env.agent
ExecStart=/usr/bin/node /opt/infrapulse/agent/agent.js
Restart=always
RestartSec=10
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true

[Install]
WantedBy=multi-user.target
```

Then enable and inspect the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now infrapulse-agent
sudo systemctl status infrapulse-agent --no-pager
sudo journalctl -u infrapulse-agent -n 100 --no-pager
```

The instance needs outbound HTTPS to the InfraPulse API and local access to `/var/run/docker.sock`. No inbound Docker port is required. If the API is hosted only on your Windows loopback address, EC2 cannot reach it; use an HTTPS-reachable deployment or VPN/reverse proxy that you control.

## Data and operating behavior

- Host heartbeat and Docker Engine availability are separate. A stopped Docker Desktop/daemon reports Engine unavailable while the host remains online as long as the agent can heartbeat.
- Inventory and metrics intervals are configurable with `INFRAPULSE_DOCKER_INVENTORY_INTERVAL_SEC` (default 60) and `INFRAPULSE_DOCKER_METRICS_INTERVAL_SEC` (default 30). Host metrics/heartbeats use `INFRAPULSE_INTERVAL_SEC` (default 30).
- Metrics unavailable from Docker remain `null`; stats requests that race with a container stop/removal are skipped. Full inventory syncs mark absent containers stale and retain their history.
- Public detail responses omit mount host source paths and container environment variables. No container logs or image layers are collected.
- The agent uses the existing bearer credential; registration binds that token to one host. Revoke it from the InfraPulse admin agent page if the machine is decommissioned.

Open `/dashboard/docker` to view hosts and inventory. Select a container for metric history and details. To verify isolation, run containers on both hosts: each appears under its own registered host record.
