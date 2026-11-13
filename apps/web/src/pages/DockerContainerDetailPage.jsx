import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Box } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../services/apiClient';
import { useFetch } from '../hooks/useFetch';
import { PageShell } from '../components/PageShell';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState } from '../design-system';
import { formatRelative } from '../utils/time';

const formatBytes = (n) => n == null ? 'N/A' : `${(Number(n) / 1024 / 1024).toFixed(2)} MiB`;
const chartTime = (value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function MetricChart({ title, dataKey, data, unit = '%' }) {
  const available = data.some((point) => point[dataKey] != null);
  return <Card>
    <CardHeader><div><CardTitle>{title}</CardTitle><CardDescription>Recent agent samples</CardDescription></div></CardHeader>
    <CardContent className="h-56">
      {available ? <ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
        <XAxis dataKey="collectedAt" tickFormatter={chartTime} tick={{ fill: 'var(--color-text-subtle)', fontSize: 10 }} />
        <YAxis unit={unit} width={48} tick={{ fill: 'var(--color-text-subtle)', fontSize: 10 }} />
        <Tooltip labelFormatter={(value) => new Date(value).toLocaleString()} formatter={(value) => [`${value}${unit}`, title]} contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8 }} />
        <Line type="monotone" dataKey={dataKey} stroke="var(--color-accent)" strokeWidth={2} dot={false} connectNulls />
      </LineChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-text-subtle">No metric samples available yet</div>}
    </CardContent>
  </Card>;
}

function Detail({ label, children }) {
  return <div><dt className="text-xs text-text-subtle">{label}</dt><dd className="mt-1 break-words text-sm text-text">{children ?? 'N/A'}</dd></div>;
}

export function DockerContainerDetailPage() {
  const { id } = useParams();
  const { data: container, loading, error } = useFetch(() => api.publicDockerContainer(id).then((result) => result.data), [id]);
  const metrics = container?.metrics || [];
  const name = container?.name || container?.containerId || 'Container';

  return <PageShell title={name} loading={loading} error={error}>
    {!loading && !error && container && <div className="space-y-5">
      <Button as={Link} to="/dashboard/docker" variant="secondary" size="sm"><ArrowLeft className="h-4 w-4" />Docker inventory</Button>
      <Card>
        <CardHeader><div><CardTitle className="flex items-center gap-2"><Box className="h-4 w-4 text-accent" />{container.name}</CardTitle><CardDescription className="font-mono">{container.containerId}</CardDescription></div><Badge tone={container.state === 'running' ? 'success' : container.state === 'missing' ? 'warning' : 'neutral'}>{container.state}</Badge></CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Detail label="Host">{container.server?.name} ({container.server?.hostType})</Detail>
            <Detail label="Hostname">{container.server?.hostname}</Detail>
            <Detail label="Docker Engine">{container.server?.dockerEngineVersion}</Detail>
            <Detail label="Image">{container.image}</Detail>
            <Detail label="Created">{container.createdAtDocker ? new Date(container.createdAtDocker).toLocaleString() : 'N/A'}</Detail>
            <Detail label="Started">{container.startedAt ? new Date(container.startedAt).toLocaleString() : 'N/A'}</Detail>
            <Detail label="Last seen">{formatRelative(container.lastSeenAt)}</Detail>
            <Detail label="Restart count">{container.restartCount}</Detail>
            <Detail label="CPU">{container.cpuPercent == null ? 'N/A' : `${container.cpuPercent}%`}</Detail>
            <Detail label="Memory">{formatBytes(container.memoryUsageBytes)} / {formatBytes(container.memoryLimitBytes)}</Detail>
            <Detail label="Network RX / TX">{formatBytes(container.networkRxBytes)} / {formatBytes(container.networkTxBytes)}</Detail>
            <Detail label="Block read / write">{formatBytes(container.blockReadBytes)} / {formatBytes(container.blockWriteBytes)}</Detail>
          </dl>
        </CardContent>
      </Card>
      <div className="grid gap-3 lg:grid-cols-2"><MetricChart title="CPU usage" dataKey="cpuPercent" data={metrics} /><MetricChart title="Memory usage" dataKey="memoryPercent" data={metrics} /></div>
      <div className="grid gap-3 lg:grid-cols-2"><MetricChart title="Network received" dataKey="networkRxBytes" data={metrics} unit=" B" /><MetricChart title="Network transmitted" dataKey="networkTxBytes" data={metrics} unit=" B" /></div>
      <div className="grid gap-3 lg:grid-cols-3">
        <JsonList title="Ports" items={container.ports} empty="No published ports" />
        <JsonList title="Networks" items={container.networks?.map(({ name, ipAddress, gateway }) => ({ name, ipAddress, gateway }))} empty="No network information" />
        <JsonList title="Mounts" items={container.mounts} empty="No mount information" />
      </div>
    </div>}
  </PageShell>;
}

function JsonList({ title, items = [], empty }) {
  return <Card><CardHeader><div><CardTitle>{title}</CardTitle></div></CardHeader><CardContent className="space-y-2">
    {items.length ? items.map((item, index) => <pre key={index} className="overflow-x-auto rounded bg-surface-raised p-2 text-[11px] text-text-muted">{JSON.stringify(item, null, 2)}</pre>) : <EmptyState title={empty} />}
  </CardContent></Card>;
}
