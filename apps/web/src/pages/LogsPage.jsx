import { useState } from 'react';
import { api } from '../services/apiClient';
import { useFetch } from '../hooks/useFetch';
import { PageShell } from '../components/PageShell';
import {
  Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle,
  Select, Table, TBody, TD, TH, THead, TR,
} from '../design-system';
import { formatRelative } from '../utils/time';

const levelTone = { error: 'danger', fatal: 'critical', warn: 'warning', info: 'info', debug: 'neutral' };

export function LogsPage() {
  const [level, setLevel] = useState('');
  const [page, setPage] = useState(1);

  const { data, loading, error } = useFetch(
    () => api.publicLogs(page, 20, level).then((r) => ({ logs: r.data, meta: r.meta })),
    [page, level],
  );

  const logs = data?.logs ?? [];
  const meta = data?.meta ?? { total: 0, page: 1, pageSize: 20 };
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.pageSize));

  function changeLevel(v) { setLevel(v); setPage(1); }

  return (
    <PageShell title="Logs" badge="Demo data · masked" loading={loading} error={error}>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Log stream</CardTitle>
            <CardDescription>Sensitive values are masked · DEMO · {meta.total} total entries</CardDescription>
          </div>
          <Select value={level} onChange={(e) => changeLevel(e.target.value)}>
            <option value="">All levels</option>
            <option value="fatal">Fatal</option>
            <option value="error">Error</option>
            <option value="warn">Warn</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </Select>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <Table>
            <THead>
              <TH>Time</TH><TH>Level</TH><TH>Application</TH><TH>Server</TH><TH>Message</TH>
            </THead>
            <TBody>
              {logs.length === 0 && (
                <TR><TD colSpan={5} className="py-8 text-center text-text-subtle">No log entries found.</TD></TR>
              )}
              {logs.map((log) => (
                <TR key={log.id}>
                  <TD className="whitespace-nowrap text-xs text-text-muted">{formatRelative(log.collectedAt)}</TD>
                  <TD><Badge tone={levelTone[log.level] ?? 'neutral'}>{log.level}</Badge></TD>
                  <TD className="text-xs text-text-muted">{log.application ?? '—'}</TD>
                  <TD className="text-xs text-text-muted">{log.server?.name ?? '—'}</TD>
                  <TD className="max-w-md truncate font-mono text-xs text-text">{log.message}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-text-muted">
          <span>Page {meta.page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </PageShell>
  );
}
