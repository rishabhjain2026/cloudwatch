import { api } from '../services/apiClient';
import { useFetch } from '../hooks/useFetch';
import { PageShell } from '../components/PageShell';
import {
  Badge, Card, CardContent, CardDescription, CardHeader, CardTitle,
  Table, TBody, TD, TH, THead, TR,
} from '../design-system';
import { formatRelative } from '../utils/time';

const stateTone = { running: 'success', exited: 'danger', paused: 'warning', restarting: 'warning' };
const healthTone = { healthy: 'success', unhealthy: 'critical', starting: 'warning' };

export function DockerPage() {
  const { data, loading, error } = useFetch(() => api.publicDocker().then((r) => r.data));
  const containers = data ?? [];
  const running = containers.filter((c) => c.state === 'running').length;
  const unhealthy = containers.filter((c) => c.health === 'unhealthy').length;

  return (
    <PageShell title="Docker Containers" badge="Demo data" loading={loading} error={error}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="pt-4"><p className="text-xs text-text-subtle">Total containers</p><p className="mt-1 font-display text-2xl font-semibold text-text">{containers.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-text-subtle">Running</p><p className="mt-1 font-display text-2xl font-semibold text-success">{running}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-text-subtle">Unhealthy</p><p className="mt-1 font-display text-2xl font-semibold text-critical">{unhealthy}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div><CardTitle>Container inventory</CardTitle><CardDescription>All demo containers across servers</CardDescription></div>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <Table>
            <THead>
              <TH>Container</TH><TH>Server</TH><TH>Image</TH><TH>State</TH>
              <TH>Health</TH><TH>CPU %</TH><TH>Memory (MB)</TH><TH>Restarts</TH><TH>Started</TH>
            </THead>
            <TBody>
              {containers.map((c) => (
                <TR key={c.id}>
                  <TD><p className="font-medium text-text">{c.name}</p><p className="font-mono text-[10px] text-text-subtle">{c.containerId}</p></TD>
                  <TD className="text-text-muted">{c.server?.name ?? '—'}</TD>
                  <TD className="font-mono text-xs text-text-muted">{c.image ?? '—'}</TD>
                  <TD><Badge tone={stateTone[c.state] ?? 'neutral'}>{c.state}</Badge></TD>
                  <TD>{c.health ? <Badge tone={healthTone[c.health] ?? 'neutral'}>{c.health}</Badge> : <span className="text-text-subtle">—</span>}</TD>
                  <TD className="font-mono text-text">{c.cpuPercent != null ? `${c.cpuPercent}%` : '—'}</TD>
                  <TD className="font-mono text-text">{c.memUsageMb != null ? c.memUsageMb : '—'}</TD>
                  <TD className="font-mono text-text">{c.restartCount}</TD>
                  <TD className="text-xs text-text-muted">{formatRelative(c.startedAt)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  );
}
