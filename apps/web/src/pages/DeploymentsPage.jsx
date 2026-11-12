import { api } from '../services/apiClient';
import { useFetch } from '../hooks/useFetch';
import { PageShell } from '../components/PageShell';
import {
  Badge, Card, CardContent, CardDescription, CardHeader, CardTitle,
  Table, TBody, TD, TH, THead, TR,
} from '../design-system';
import { formatRelative } from '../utils/time';

const statusTone = { success: 'success', failed: 'danger', pending: 'warning', rolled_back: 'warning' };

export function DeploymentsPage() {
  const { data, loading, error } = useFetch(() => api.publicDeployments().then((r) => r.data));
  const deployments = data ?? [];
  const succeeded = deployments.filter((d) => d.status === 'success').length;
  const failed = deployments.filter((d) => d.status === 'failed').length;

  return (
    <PageShell title="Deployments" badge="Demo data" loading={loading} error={error}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="pt-4"><p className="text-xs text-text-subtle">Total</p><p className="mt-1 font-display text-2xl font-semibold text-text">{deployments.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-text-subtle">Succeeded</p><p className="mt-1 font-display text-2xl font-semibold text-success">{succeeded}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-text-subtle">Failed</p><p className="mt-1 font-display text-2xl font-semibold text-danger">{failed}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div><CardTitle>Deployment history</CardTitle><CardDescription>Recent deployments · DEMO</CardDescription></div>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <Table>
            <THead>
              <TH>Application</TH><TH>Version</TH><TH>Environment</TH>
              <TH>Status</TH><TH>Commit</TH><TH>Message</TH><TH>Deployed</TH>
            </THead>
            <TBody>
              {deployments.length === 0 && (
                <TR><TD colSpan={7} className="py-8 text-center text-text-subtle">No deployments found.</TD></TR>
              )}
              {deployments.map((d) => (
                <TR key={d.id}>
                  <TD><p className="font-medium text-text">{d.appName}</p></TD>
                  <TD className="font-mono text-xs text-accent">{d.version}</TD>
                  <TD><Badge tone="neutral">{d.environment}</Badge></TD>
                  <TD><Badge tone={statusTone[d.status] ?? 'neutral'}>{d.status}</Badge></TD>
                  <TD className="font-mono text-xs text-text-muted">{d.commitId ?? '—'}</TD>
                  <TD className="max-w-xs truncate text-xs text-text-muted">{d.commitMessage ?? '—'}</TD>
                  <TD className="text-xs text-text-muted">{formatRelative(d.deployedAt)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  );
}
