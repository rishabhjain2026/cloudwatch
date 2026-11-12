import { api } from '../services/apiClient';
import { useFetch } from '../hooks/useFetch';
import { PageShell } from '../components/PageShell';
import {
  Badge, Card, CardContent, CardDescription, CardHeader, CardTitle,
  StatusDot, Table, TBody, TD, TH, THead, TR,
} from '../design-system';
import { formatRelative } from '../utils/time';

const statusTone = { healthy: 'success', warning: 'warning', critical: 'critical', offline: 'neutral', unknown: 'neutral' };

function MetricBar({ value, status }) {
  const color = status === 'critical' ? 'bg-critical' : status === 'warning' ? 'bg-warning' : 'bg-accent';
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 text-right font-mono text-xs text-text">{value ?? '—'}{value != null ? '%' : ''}</span>
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-raised">
        {value != null && (
          <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
        )}
      </div>
    </div>
  );
}

export function ServersPage() {
  const { data, loading, error } = useFetch(() => api.publicServers().then((r) => r.data));

  const servers = data ?? [];
  const healthy = servers.filter((s) => s.status === 'healthy').length;
  const warning = servers.filter((s) => s.status === 'warning').length;
  const critical = servers.filter((s) => s.status === 'critical').length;

  return (
    <PageShell title="Servers" badge="Demo data" loading={loading} error={error}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="pt-4"><p className="text-xs text-text-subtle">Healthy</p><p className="mt-1 font-display text-2xl font-semibold text-success">{healthy}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-text-subtle">Warning</p><p className="mt-1 font-display text-2xl font-semibold text-warning">{warning}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-text-subtle">Critical</p><p className="mt-1 font-display text-2xl font-semibold text-critical">{critical}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div><CardTitle>Server inventory</CardTitle><CardDescription>All monitored servers · DEMO</CardDescription></div>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <Table>
            <THead>
              <TH>Server</TH><TH>Environment</TH><TH>OS</TH><TH>Status</TH>
              <TH>CPU</TH><TH>Memory</TH><TH>Disk</TH><TH>Last heartbeat</TH>
            </THead>
            <TBody>
              {servers.map((s) => (
                <TR key={s.id}>
                  <TD>
                    <div className="flex items-center gap-2">
                      <StatusDot status={s.status} />
                      <div>
                        <p className="font-medium text-text">{s.name}</p>
                        <p className="text-xs text-text-subtle">{s.hostname} · {s.region}</p>
                      </div>
                    </div>
                  </TD>
                  <TD><Badge tone="neutral">{s.environment}</Badge></TD>
                  <TD className="text-xs text-text-muted">{s.os ?? '—'}</TD>
                  <TD><Badge tone={statusTone[s.status] ?? 'neutral'}>{s.status}</Badge></TD>
                  <TD><MetricBar value={s.cpu} status={s.status} /></TD>
                  <TD><MetricBar value={s.memory} status={s.status} /></TD>
                  <TD><MetricBar value={s.disk} status={s.status} /></TD>
                  <TD className="text-xs text-text-muted">{formatRelative(s.lastHeartbeatAt)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  );
}
