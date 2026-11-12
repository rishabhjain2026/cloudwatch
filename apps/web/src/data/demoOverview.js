/**
 * Phase 3 local DEMO dataset for the public dashboard UI.
 * Replaced by GET /api/v1/public/* in later phases.
 * All records are simulated and must remain clearly labeled DEMO.
 */

function series(points, base, variance, trend = 0) {
  const now = Date.now();
  const step = (60 * 60 * 1000) / Math.max(points - 1, 1);
  return Array.from({ length: points }, (_, i) => {
    const wobble = Math.sin(i / 3) * variance + (Math.random() - 0.5) * variance * 0.4;
    const value = Math.max(0, Math.min(100, base + trend * (i / points) + wobble));
    return {
      t: new Date(now - (points - 1 - i) * step).toISOString(),
      label: new Date(now - (points - 1 - i) * step).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      value: Number(value.toFixed(1)),
    };
  });
}

export const TIME_RANGES = [
  { id: '15m', label: 'Last 15 min' },
  { id: '1h', label: 'Last 1 hour' },
  { id: '6h', label: 'Last 6 hours' },
  { id: '24h', label: 'Last 24 hours' },
  { id: '7d', label: 'Last 7 days' },
];

export const demoSummary = {
  isDemo: true,
  totalServers: 6,
  healthyServers: 3,
  warningServers: 2,
  criticalServers: 1,
  activeIncidents: 2,
  avgCpu: 47.2,
  avgMemory: 61.8,
  monitoredApps: 8,
};

export const demoServers = [
  {
    id: 'demo-srv-api',
    name: 'Production API Server',
    hostname: 'api-prod-01',
    environment: 'production',
    region: 'us-east-1',
    provider: 'AWS',
    status: 'healthy',
    cpu: 38,
    memory: 54,
    disk: 61,
    uptime: '42d 6h',
    isDemo: true,
  },
  {
    id: 'demo-srv-db',
    name: 'Database Server',
    hostname: 'db-prod-01',
    environment: 'production',
    region: 'us-east-1',
    provider: 'AWS',
    status: 'warning',
    cpu: 72,
    memory: 88,
    disk: 79,
    uptime: '91d 2h',
    isDemo: true,
  },
  {
    id: 'demo-srv-staging',
    name: 'Staging Server',
    hostname: 'app-staging-01',
    environment: 'staging',
    region: 'eu-west-1',
    provider: 'AWS',
    status: 'healthy',
    cpu: 22,
    memory: 41,
    disk: 35,
    uptime: '18d 11h',
    isDemo: true,
  },
  {
    id: 'demo-srv-worker',
    name: 'Docker Worker',
    hostname: 'worker-01',
    environment: 'production',
    region: 'us-west-2',
    provider: 'VPS',
    status: 'critical',
    cpu: 94,
    memory: 91,
    disk: 67,
    uptime: '7d 3h',
    isDemo: true,
  },
  {
    id: 'demo-srv-pay',
    name: 'Payment API',
    hostname: 'pay-api-01',
    environment: 'production',
    region: 'us-east-1',
    provider: 'AWS',
    status: 'warning',
    cpu: 66,
    memory: 58,
    disk: 44,
    uptime: '30d 9h',
    isDemo: true,
  },
  {
    id: 'demo-srv-fe',
    name: 'Frontend Server',
    hostname: 'web-edge-01',
    environment: 'production',
    region: 'us-east-1',
    provider: 'AWS',
    status: 'healthy',
    cpu: 18,
    memory: 36,
    disk: 28,
    uptime: '55d 14h',
    isDemo: true,
  },
];

export const demoMetrics = {
  cpu: series(24, 42, 12, 8),
  memory: series(24, 58, 10, 5),
  networkIn: series(24, 35, 18, 0).map((p) => ({ ...p, value: Number((p.value * 1.8).toFixed(1)) })),
  networkOut: series(24, 28, 14, 0).map((p) => ({ ...p, value: Number((p.value * 1.4).toFixed(1)) })),
  disk: series(24, 62, 4, 2),
  healthTrend: series(24, 92, 6, -4),
  alertFrequency: [
    { label: 'Mon', value: 3 },
    { label: 'Tue', value: 5 },
    { label: 'Wed', value: 2 },
    { label: 'Thu', value: 8 },
    { label: 'Fri', value: 4 },
    { label: 'Sat', value: 1 },
    { label: 'Sun', value: 2 },
  ],
  incidentSeverity: [
    { name: 'Critical', value: 1, fill: '#fb7185' },
    { name: 'High', value: 2, fill: '#f87171' },
    { name: 'Medium', value: 3, fill: '#fbbf24' },
    { name: 'Low', value: 4, fill: '#38bdf8' },
  ],
};

export const demoAlerts = [
  {
    id: 'demo-alert-1',
    title: 'CPU above 85%',
    server: 'Docker Worker',
    severity: 'critical',
    status: 'open',
    triggeredAt: '6 min ago',
    isDemo: true,
  },
  {
    id: 'demo-alert-2',
    title: 'Memory above 90%',
    server: 'Database Server',
    severity: 'high',
    status: 'acknowledged',
    triggeredAt: '22 min ago',
    isDemo: true,
  },
  {
    id: 'demo-alert-3',
    title: 'API latency > 2s',
    server: 'Payment API',
    severity: 'medium',
    status: 'open',
    triggeredAt: '41 min ago',
    isDemo: true,
  },
];

export const demoIncidents = [
  {
    id: 'INC-1042',
    title: 'Worker node resource saturation',
    severity: 'critical',
    status: 'investigating',
    server: 'Docker Worker',
    openedAt: '18 min ago',
    isDemo: true,
  },
  {
    id: 'INC-1041',
    title: 'Elevated payment API latency',
    severity: 'high',
    status: 'acknowledged',
    server: 'Payment API',
    openedAt: '1h ago',
    isDemo: true,
  },
  {
    id: 'INC-1038',
    title: 'Staging deploy health flap',
    severity: 'medium',
    status: 'resolved',
    server: 'Staging Server',
    openedAt: 'Yesterday',
    isDemo: true,
  },
];

export const demoDeployments = [
  {
    id: 'dep-1',
    app: 'payment-api',
    version: 'v2.4.1',
    environment: 'production',
    status: 'success',
    deployedAt: '2h ago',
    isDemo: true,
  },
  {
    id: 'dep-2',
    app: 'worker',
    version: 'v1.9.0',
    environment: 'production',
    status: 'success',
    deployedAt: '5h ago',
    isDemo: true,
  },
];

export const demoApiUptime = [
  { name: 'Public Website', uptime: 99.98, latency: 142 },
  { name: 'Core API', uptime: 99.91, latency: 210 },
  { name: 'Payment API', uptime: 98.72, latency: 1860 },
  { name: 'Auth Service', uptime: 99.95, latency: 118 },
];

export const demoActivity = [
  { id: 1, text: 'Alert auto-resolved: disk pressure on Staging Server', time: '12m ago' },
  { id: 2, text: 'Heartbeat restored: Frontend Server', time: '28m ago' },
  { id: 3, text: 'Deployment recorded: payment-api v2.4.1', time: '2h ago' },
  { id: 4, text: 'Incident INC-1038 marked resolved', time: 'Yesterday' },
];
