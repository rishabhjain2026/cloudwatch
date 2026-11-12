import React, { useState } from 'react';
import { api } from '../services/apiClient';
import { useFetch } from '../hooks/useFetch';
import { PageShell } from '../components/PageShell';
import {
  Badge, Card, CardContent, CardDescription, CardHeader, CardTitle,
  Select, Table, TBody, TD, TH, THead, TR,
} from '../design-system';
import { formatRelative } from '../utils/time';
import { ChevronDown, ChevronRight } from 'lucide-react';

const severityTone = { critical: 'critical', high: 'danger', medium: 'warning', low: 'info' };
const statusTone = {
  detected: 'info', open: 'danger', acknowledged: 'warning',
  investigating: 'info', resolved: 'success', closed: 'neutral',
};

function msToHuman(ms) {
  if (!ms) return '—';
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m}m`;
  return `${Math.round(m / 60)}h ${m % 60}m`;
}

export function IncidentsPage() {
  const { data, loading, error } = useFetch(() => api.publicIncidents().then((r) => r.data));
  const [expanded, setExpanded] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');

  const incidents = (data ?? []).filter((i) => !filterStatus || i.status === filterStatus);
  const active = (data ?? []).filter((i) => !['resolved', 'closed'].includes(i.status)).length;

  return (
    <PageShell title="Incidents" badge="Demo data" loading={loading} error={error}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="pt-4"><p className="text-xs text-text-subtle">Active</p><p className="mt-1 font-display text-2xl font-semibold text-danger">{active}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-text-subtle">Total</p><p className="mt-1 font-display text-2xl font-semibold text-text">{(data ?? []).length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-text-subtle">Resolved</p><p className="mt-1 font-display text-2xl font-semibold text-success">{(data ?? []).filter((i) => i.status === 'resolved').length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div><CardTitle>Incident list</CardTitle><CardDescription>Click a row to expand the timeline · DEMO</CardDescription></div>
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="investigating">Investigating</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </Select>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <Table>
            <THead>
              <TH></TH><TH>ID</TH><TH>Title</TH><TH>Server</TH>
              <TH>Severity</TH><TH>Status</TH><TH>MTTA</TH><TH>MTTR</TH><TH>Detected</TH>
            </THead>
            <TBody>
              {incidents.map((inc) => (
                <React.Fragment key={inc.id}>
                  <TR
                    className="cursor-pointer"
                    onClick={() => setExpanded(expanded === inc.id ? null : inc.id)}
                  >
                    <TD className="w-6">
                      {expanded === inc.id
                        ? <ChevronDown className="h-3.5 w-3.5 text-text-subtle" />
                        : <ChevronRight className="h-3.5 w-3.5 text-text-subtle" />}
                    </TD>
                    <TD className="font-mono text-xs text-accent">{inc.publicId}</TD>
                    <TD><p className="font-medium text-text">{inc.title}</p></TD>
                    <TD className="text-text-muted">{inc.server?.name ?? '—'}</TD>
                    <TD><Badge tone={severityTone[inc.severity] ?? 'neutral'}>{inc.severity}</Badge></TD>
                    <TD><Badge tone={statusTone[inc.status] ?? 'neutral'}>{inc.status}</Badge></TD>
                    <TD className="font-mono text-xs text-text-muted">{msToHuman(inc.mttaMs)}</TD>
                    <TD className="font-mono text-xs text-text-muted">{msToHuman(inc.mttrMs)}</TD>
                    <TD className="text-xs text-text-muted">{formatRelative(inc.detectedAt)}</TD>
                  </TR>
                  {expanded === inc.id && inc.events?.length > 0 && (
                    <TR>
                      <TD colSpan={9} className="bg-surface-raised/40 px-6 py-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-subtle">Timeline</p>
                        <ol className="space-y-2">
                          {inc.events.map((ev) => (
                            <li key={ev.id} className="flex items-start gap-3 text-sm">
                              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                              <div>
                                <span className="font-medium text-text">{ev.type}</span>
                                <span className="mx-1 text-text-subtle">·</span>
                                <span className="text-text-muted">{ev.message}</span>
                                <span className="ml-2 text-xs text-text-subtle">{formatRelative(ev.createdAt)}</span>
                              </div>
                            </li>
                          ))}
                        </ol>
                      </TD>
                    </TR>
                  )}
                </React.Fragment>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  );
}
