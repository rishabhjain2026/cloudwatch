import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Box, Cloud, HardDrive, RefreshCw, Search, Server, ShieldAlert } from 'lucide-react';
import { api } from '../services/apiClient';
import { useFetch } from '../hooks/useFetch';
import { PageShell } from '../components/PageShell';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState, Input, Select, Table, TBody, TD, TH, THead, TR } from '../design-system';
import { formatRelative } from '../utils/time';

const stateTone = { running: 'success', exited: 'neutral', created: 'info', paused: 'warning', restarting: 'warning', dead: 'danger', missing: 'warning' };
const value = (input, suffix = '') => input == null || !Number.isFinite(Number(input)) ? 'N/A' : `${Number(input).toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}`;
const hostName = (host) => host?.name || host?.hostname || 'Docker host';

function SummaryCard({ label, number, icon: Icon, note }) {
  return <Card><CardContent className="flex items-center justify-between gap-4 pt-4"><div><p className="text-xs text-text-subtle">{label}</p><p className="mt-1 font-display text-2xl font-semibold text-text">{number ?? 'N/A'}</p>{note && <p className="mt-1 text-xs text-text-muted">{note}</p>}</div><div className="rounded-md bg-accent-soft p-2 text-accent"><Icon className="h-5 w-5" /></div></CardContent></Card>;
}

export function DockerPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [hostId, setHostId] = useState('');
  const [state, setState] = useState('');
  const query = useMemo(() => new URLSearchParams({ page: String(page), pageSize: '25', ...(search ? { search } : {}), ...(hostId ? { hostId } : {}), ...(state ? { state } : {}) }).toString(), [hostId, page, search, state]);
  const { data, loading, error, refetch } = useFetch(() => api.publicDocker(query).then((result) => ({ ...result.data, meta: result.meta })), [query]);
  const hosts = data?.hosts || [];
  const containers = data?.containers || [];
  const summary = data?.summary || {};
  const pages = Math.max(1, data?.meta?.pages || 1);

  return (
    <PageShell title="Docker Monitoring" badge="Live agent data" loading={loading} error={error}>
      {!loading && !error && <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-2xl text-sm text-text-muted">Docker Engine inventory and resource metrics reported by your registered InfraPulse agents.</p>
          <Button variant="secondary" onClick={refetch}><RefreshCw className="h-4 w-4" />Refresh</Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Docker hosts" number={summary.totalHosts} icon={Server} note={`${summary.onlineHosts ?? 0} online · ${summary.offlineHosts ?? 0} offline`} />
          <SummaryCard label="Containers" number={summary.totalContainers} icon={Box} note={`${summary.runningContainers ?? 0} running · ${summary.stoppedContainers ?? 0} stopped`} />
          <SummaryCard label="Running containers" number={summary.runningContainers} icon={Cloud} />
          <SummaryCard label="Images" number={summary.totalImages} icon={HardDrive} />
        </div>

        {hosts.length === 0 ? <EmptyState icon={Box} title="No Docker hosts have reported yet" description="Register an InfraPulse agent on your Windows machine or EC2 instance and enable Docker monitoring. This page only displays live agent data." /> : <section className="space-y-3">
          <div><h2 className="font-display text-base font-semibold text-text">Docker hosts</h2><p className="text-xs text-text-muted">Engine availability is separate from agent heartbeat status.</p></div>
          <div className="grid gap-3 lg:grid-cols-2">
            {hosts.map((host) => <Card key={host.id}>
              <CardHeader>
                <div className="min-w-0"><CardTitle>{hostName(host)}</CardTitle><CardDescription>{host.hostType}{host.region ? ` · ${host.region}` : ''}{host.awsInstanceId ? ` · ${host.awsInstanceId}` : ''} · Host ID {host.id}</CardDescription></div>
                <div className="flex shrink-0 gap-2"><Badge tone={host.agentStatus === 'online' ? 'success' : 'neutral'}>{host.agentStatus}</Badge><Badge tone={host.dockerAvailable === true ? 'success' : host.dockerAvailable === false ? 'danger' : 'warning'}>{host.dockerAvailable === true ? 'Engine available' : host.dockerAvailable === false ? 'Engine unavailable' : 'Awaiting report'}</Badge></div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
                  <p className="text-text-muted">Host: <span className="text-text">{host.hostname || 'N/A'} · {host.os || 'OS unavailable'}</span></p>
                  <p className="text-text-muted">Docker: <span className="text-text">{host.dockerEngineVersion || 'N/A'} · API {host.dockerApiVersion || 'N/A'}</span></p>
                  <p className="text-text-muted">Containers: <span className="text-text">{host.runningContainers ?? 'N/A'} running / {host.totalContainers ?? 'N/A'} total</span></p>
                  <p className="text-text-muted">Images: <span className="text-text">{host.imageCount ?? 'N/A'}</span></p>
                  <p className="text-text-muted">Host CPU: <span className="text-text">{value(host.cpuPercent, '%')}</span></p>
                  <p className="text-text-muted">Host memory: <span className="text-text">{value(host.memoryPercent, '%')}</span></p>
                  <p className="text-text-muted sm:col-span-2">Last agent heartbeat: <span className="text-text">{formatRelative(host.lastHeartbeatAt)}</span></p>
                </div>
              </CardContent>
            </Card>)}
          </div>
        </section>}

        <Card>
          <CardHeader><div><CardTitle>Container inventory</CardTitle><CardDescription>Running, stopped, and last-seen containers across registered Docker hosts.</CardDescription></div></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 md:grid-cols-[minmax(200px,1fr)_220px_170px]">
              <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-text-subtle" /><Input className="pl-9" placeholder="Search name, image, ID, host" value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} /></div>
              <Select value={hostId} onChange={(event) => { setPage(1); setHostId(event.target.value); }}><option value="">All Docker hosts</option>{hosts.map((host) => <option key={host.id} value={host.id}>{hostName(host)}</option>)}</Select>
              <Select value={state} onChange={(event) => { setPage(1); setState(event.target.value); }}><option value="">All states</option>{['running', 'exited', 'created', 'paused', 'restarting', 'dead', 'missing'].map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</Select>
            </div>
            {containers.length === 0 ? <EmptyState icon={search || hostId || state ? ShieldAlert : Box} title={search || hostId || state ? 'No containers match these filters' : 'No containers discovered'} description={search || hostId || state ? 'Adjust the filters and try again.' : 'An available Docker Engine with no containers will be shown as an empty inventory.'} /> : <>
              <Table>
                <THead><TH>Container</TH><TH>Host</TH><TH>Image</TH><TH>State</TH><TH>CPU</TH><TH>Memory</TH><TH>Network RX / TX</TH><TH>Restarts</TH><TH>Last seen</TH></THead>
                <TBody>{containers.map((container) => <TR key={container.id}>
                  <TD><Link className="font-medium text-accent hover:underline" to={`/dashboard/docker/${container.id}`}>{container.name}</Link><p className="font-mono text-[10px] text-text-subtle">{container.containerId.slice(0, 12)}</p></TD>
                  <TD>{hostName(container.server)}<p className="text-[10px] text-text-subtle">{container.server?.hostType}</p></TD>
                  <TD className="max-w-52 truncate font-mono text-xs">{container.image || 'N/A'}</TD>
                  <TD><Badge tone={stateTone[container.state] || 'neutral'}>{container.state}</Badge>{container.health && <p className="mt-1 text-[10px] text-text-subtle">Health: {container.health}</p>}</TD>
                  <TD>{value(container.cpuPercent, '%')}</TD>
                  <TD>{value(container.memUsageMb, ' MiB')}</TD>
                  <TD>{value(container.networkRxBytes, ' B')} / {value(container.networkTxBytes, ' B')}</TD>
                  <TD>{container.restartCount}</TD>
                  <TD className="text-xs">{formatRelative(container.lastSeenAt)}</TD>
                </TR>)}</TBody>
              </Table>
              <div className="flex items-center justify-between text-xs text-text-muted"><span>{data?.meta?.total || 0} container records</span><div className="flex items-center gap-2"><Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((n) => Math.max(1, n - 1))}>Previous</Button><span>Page {page} of {pages}</span><Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage((n) => Math.min(pages, n + 1))}>Next</Button></div></div>
            </>}
          </CardContent>
        </Card>
      </div>}
    </PageShell>
  );
}
