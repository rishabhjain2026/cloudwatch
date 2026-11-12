import { useState } from 'react';
import { api } from '../services/apiClient';
import { useFetch } from '../hooks/useFetch';
import { PageShell } from '../components/PageShell';
import {
  Badge, Card, CardContent, CardDescription, CardHeader, CardTitle,
  Select, Table, TBody, TD, TH, THead, TR,
} from '../design-system';
import { formatRelative } from '../utils/time';

const severityTone = { critical: 'critical', high: 'danger', medium: 'warning', low: 'info' };
const statusTone = { open: 'danger', acknowledged: 'warning', resolved: 'success' };

export function AlertsPage() {
  const { data, loading, error } = useFetch(() => api.publicAlerts().then((r) => r.data));
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const alerts = (data ?? []).filter((a) => {
    if (filterSeverity && a.severity !== filterSeverity) return false;
    if (filterStatus && a.status !== filterStatus) return false;
    return true;
  });

  const open = (data ?? []).filter((a) => a.status === 'open').length;
  const acked = (data ?? []).filter((a) => a.status === 'acknowledged').length;
  const critical = (data ?? []).filter((a) => a.severity === 'critical').length;

  return (
    <PageShell title="Alerts" badge="Demo data" loading={loading} error={error}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="pt-4"><p className="text-xs text-text-subtle">Open</p><p className="mt-1 font-display text-2xl font-semibold text-danger">{open}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-text-subtle">Acknowledged</p><p className="mt-1 font-display text-2xl font-semibold text-warning">{acked}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-text-subtle">Critical severity</p><p className="mt-1 font-display text-2xl font-semibold text-critical">{critical}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div><CardTitle>Alert feed</CardTitle><CardDescription>All demo alerts · read-only</CardDescription></div>
          <div className="flex gap-2">
            <Select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)}>
              <option value="">All severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
            <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <Table>
            <THead>
              <TH>Title</TH><TH>Server</TH><TH>Severity</TH><TH>Status</TH>
              <TH>Value</TH><TH>Threshold</TH><TH>Triggered</TH>
            </THead>
            <TBody>
              {alerts.length === 0 && (
                <TR><TD colSpan={7} className="text-center text-text-subtle py-8">No alerts match the current filters.</TD></TR>
              )}
              {alerts.map((a) => (
                <TR key={a.id}>
                  <TD><p className="font-medium text-text">{a.title}</p>{a.description && <p className="text-xs text-text-subtle">{a.description}</p>}</TD>
                  <TD className="text-text-muted">{a.server?.name ?? '—'}</TD>
                  <TD><Badge tone={severityTone[a.severity] ?? 'neutral'}>{a.severity}</Badge></TD>
                  <TD><Badge tone={statusTone[a.status] ?? 'neutral'}>{a.status}</Badge></TD>
                  <TD className="font-mono text-text">{a.metricValue ?? '—'}</TD>
                  <TD className="font-mono text-text">{a.threshold ?? '—'}</TD>
                  <TD className="text-xs text-text-muted">{formatRelative(a.triggeredAt)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  );
}
