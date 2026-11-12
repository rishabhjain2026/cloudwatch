import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SkeletonCard,
  StatusDot,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '../design-system';
import { SummaryCards } from '../components/dashboard/SummaryCards';
import { MetricAreaChart } from '../components/charts/MetricAreaChart';
import { SeverityDonut } from '../components/charts/SeverityDonut';
import { BarMetricChart } from '../components/charts/BarMetricChart';
import { TIME_RANGES } from '../data/demoOverview';
import { api } from '../services/apiClient';
import { formatRelative } from '../utils/time';
import { cn } from '../utils/cn';

const severityTone = {
  critical: 'critical',
  high: 'danger',
  medium: 'warning',
  low: 'info',
};

const statusTone = {
  open: 'danger',
  acknowledged: 'warning',
  investigating: 'info',
  resolved: 'success',
  detected: 'info',
  closed: 'neutral',
};

export function PublicDashboardPage() {
  const [range, setRange] = useState('24h');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .publicOverview(range)
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load overview');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [range]);

  const servers = data?.servers ?? [];
  const metrics = data?.metrics ?? {};
  const topConsumers = useMemo(
    () =>
      [...servers]
        .sort((a, b) => ((b.cpu ?? -1) + (b.memory ?? -1)) - ((a.cpu ?? -1) + (a.memory ?? -1)))
        .slice(0, 4),
    [servers],
  );

  if (loading && !data) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (error && !data) {
    return (
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Unable to load public overview</CardTitle>
            <CardDescription>
              Start Postgres and the API (`npm run db:up`, `npm run dev:api`), then refresh.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-danger">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {servers.some((server) => !server.isDemo) ? <Badge tone="success">AWS data connected</Badge> : <Badge tone="demo">Demo data</Badge>}
            <Badge tone="accent">Read-only public API</Badge>
            {error ? <Badge tone="warning">Stale / partial</Badge> : null}
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-text">
            Infrastructure overview
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-text-muted">
            Live response from <code className="font-mono text-xs">/api/v1/public/overview</code>. AWS inventory is sanitized; unavailable metrics remain blank.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="time-range" className="text-xs text-text-subtle">
            Time range
          </label>
          <Select
            id="time-range"
            value={range}
            onChange={(e) => setRange(e.target.value)}
            aria-label="Select time range"
          >
            {TIME_RANGES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <SummaryCards summary={data.summary} />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>CPU usage over time</CardTitle>
              <CardDescription>Recorded fleet average · {range}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <MetricAreaChart data={metrics.cpu || []} dataKey="value" unit="%" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Memory usage over time</CardTitle>
              <CardDescription>Linux agent metrics only · {range}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <MetricAreaChart data={metrics.memory || []} color="var(--ip-info)" unit="%" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Network traffic</CardTitle>
              <CardDescription>Network throughput from agent and CloudWatch samples</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <MetricAreaChart data={metrics.networkIn || []} color="var(--ip-success)" unit=" MB/s" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Disk utilization</CardTitle>
              <CardDescription>Linux agent metrics only</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <MetricAreaChart data={metrics.disk || []} color="var(--ip-warning)" unit="%" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Server health trend</CardTitle>
              <CardDescription>Derived score · DEMO</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <MetricAreaChart data={metrics.healthTrend || []} color="var(--ip-success)" unit="" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Alert frequency</CardTitle>
              <CardDescription>Last 7 days · DEMO</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <BarMetricChart data={metrics.alertFrequency || []} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Incident severity</CardTitle>
              <CardDescription>Distribution · DEMO</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <SeverityDonut data={data.incidentSeverity || []} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Infrastructure health</CardTitle>
              <CardDescription>AWS inventory and demo servers · sanitized public view</CardDescription>
            </div>
            <Badge tone={servers.some((server) => !server.isDemo) ? 'success' : 'demo'}>{servers.some((server) => !server.isDemo) ? 'AWS + DEMO' : 'DEMO'}</Badge>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <Table>
              <THead>
                <TH>Server</TH>
                <TH>Status</TH>
                <TH>CPU</TH>
                <TH>Memory</TH>
                <TH>Disk</TH>
              </THead>
              <TBody>
                {servers.map((server) => (
                  <TR key={server.id}>
                    <TD>
                      <div className="flex items-center gap-2 text-text">
                        <StatusDot status={server.status} />
                        <div>
                          <p className="font-medium">{server.name}</p>
                          <p className="text-xs text-text-subtle">
                            {server.awsInstanceId || server.hostname} · {server.awsState || server.region}
                          </p>
                        </div>
                      </div>
                    </TD>
                    <TD>
                      <Badge
                        tone={
                          server.status === 'healthy'
                            ? 'success'
                            : server.status === 'warning'
                              ? 'warning'
                              : 'critical'
                        }
                      >
                        {server.status}
                      </Badge>
                    </TD>
                    <TD className="font-mono text-text">{server.cpu ?? '—'}%</TD>
                    <TD className="font-mono text-text">{server.memory ?? '—'}%</TD>
                    <TD className="font-mono text-text">{server.disk ?? '—'}%</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Recent alerts</CardTitle>
                <CardDescription>Sanitized · DEMO</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {(data.alerts || []).map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-border bg-surface-raised/50 px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium text-text">{alert.title}</p>
                    <p className="text-xs text-text-subtle">
                      {typeof alert.server === 'string' ? alert.server : alert.server?.name} ·{' '}
                      {formatRelative(alert.triggeredAt)}
                    </p>
                  </div>
                  <Badge tone={severityTone[alert.severity] || 'neutral'}>{alert.severity}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Recent incidents</CardTitle>
                <CardDescription>Active and resolved · DEMO</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {(data.incidents || []).map((incident) => (
                <div
                  key={incident.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-border bg-surface-raised/50 px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium text-text">
                      <span className="font-mono text-text-subtle">
                        {incident.publicId || incident.id}
                      </span>{' '}
                      · {incident.title}
                    </p>
                    <p className="text-xs text-text-subtle">
                      {typeof incident.server === 'string' ? incident.server : incident.server?.name} ·{' '}
                      {formatRelative(incident.openedAt || incident.detectedAt)}
                    </p>
                  </div>
                  <Badge tone={statusTone[incident.status] || 'neutral'}>{incident.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Top resource consumers</CardTitle>
              <CardDescription>Available CPU and memory readings</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {topConsumers.map((server) => (
              <div key={server.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-text">{server.name}</span>
                  <span className="font-mono text-text-muted">
                    {server.cpu == null && server.memory == null ? '—' : `${server.cpu ?? '—'} / ${server.memory ?? '—'}`}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-raised">
                  {server.cpu != null || server.memory != null ? (
                    <div
                      className={cn(
                        'h-full rounded-full',
                        server.status === 'critical'
                          ? 'bg-critical'
                          : server.status === 'warning'
                            ? 'bg-warning'
                            : 'bg-accent',
                      )}
                      style={{ width: `${Math.min(100, ((server.cpu ?? 0) + (server.memory ?? 0)) / (server.cpu != null && server.memory != null ? 2 : 1))}%` }}
                    />
                  ) : null}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Latest deployments</CardTitle>
              <CardDescription>Webhook events · DEMO</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data.deployments || []).map((dep) => (
              <div key={dep.id} className="rounded-md border border-border px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-text">
                    {dep.app} <span className="font-mono text-accent">{dep.version}</span>
                  </p>
                  <Badge tone="success">{dep.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-text-subtle">
                  {dep.environment} · {formatRelative(dep.deployedAt)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>API uptime summary</CardTitle>
              <CardDescription>Health checks · DEMO</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data.apiUptime || []).map((apiItem) => (
              <div key={apiItem.name} className="flex items-center justify-between gap-3 text-sm">
                <div>
                  <p className="text-text">{apiItem.name}</p>
                  <p className="text-xs text-text-subtle">{apiItem.latency} ms</p>
                </div>
                <p className={cn('font-mono', apiItem.uptime < 99 ? 'text-warning' : 'text-success')}>
                  {apiItem.uptime}%
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Recent system activity</CardTitle>
            <CardDescription>Audit-style feed · DEMO</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {(data.activity || []).map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-1 border-b border-border py-2 last:border-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-sm text-text-muted">{item.text}</span>
                <span className="text-xs text-text-subtle">{formatRelative(item.time)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-text-subtle">
            Want the administrator console?{' '}
            <Link to="/login" className="text-accent hover:underline">
              Sign in
            </Link>
            . Public viewers cannot mutate data or run remediation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
