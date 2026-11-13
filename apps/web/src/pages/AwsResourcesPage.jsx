import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Cloud, RefreshCw } from 'lucide-react';
import { api } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState, Input, Select, Table, TBody, TD, TH, THead, TR } from '../design-system';
import { formatRelative } from '../utils/time';

const statusTone = { available: 'success', reported: 'info', stale: 'warning', missing: 'warning' };

export function AwsResourcesPage() {
  const { isAdmin } = useAuth();
  const { push } = useToast();
  const [summary, setSummary] = useState(null);
  const [resources, setResources] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 25, total: 0 });
  const [filters, setFilters] = useState({ service: '', region: '', resourceType: '', status: '', search: '' });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(meta.pageSize) });
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
    return params.toString();
  }, [filters, meta.pageSize, page]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryResult, resourceResult] = await Promise.all([
        api.publicAwsSummary(),
        api.publicAwsResources(query),
      ]);
      setSummary(summaryResult.data);
      setResources(resourceResult.data);
      setMeta(resourceResult.meta || { page: 1, pageSize: 25, total: 0 });
    } catch (loadError) {
      setError(loadError.message || 'Unable to load AWS resources.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => { load(); }, [load]);

  const updateFilter = (key, value) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const sync = async () => {
    setSyncing(true);
    try {
      const result = await api.awsSync();
      push(`AWS sync ${result.data.status}: ${result.data.resourcesDiscovered ?? 0} resources.`, result.data.status === 'success' ? 'success' : 'warning');
      await load();
    } catch (syncError) {
      push(syncError.message || 'AWS sync failed.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const serviceOptions = summary?.byService || [];
  const regionOptions = summary?.byRegion || [];
  const typeOptions = summary?.byResourceType || [];
  const statusOptions = [...new Set((summary?.byStatus || []).map((item) => item.status))];
  const pages = Math.max(1, Math.ceil((meta.total || 0) / meta.pageSize));
  const latest = summary?.latestSync;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge tone={latest?.coverageStatus === 'complete' ? 'success' : latest ? 'warning' : 'neutral'}>
              {latest ? `${latest.coverageStatus} discovery coverage` : 'Not synced'}
            </Badge>
            <Badge tone="accent">Read-only AWS inventory</Badge>
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-text">AWS Resources</h1>
          <p className="mt-1 max-w-3xl text-sm text-text-muted">
            EC2 and S3 are enriched with service APIs. Other resources are listed when Resource Explorer reports them; indexing gaps and API errors are shown below.
          </p>
        </div>
        {isAdmin ? (
          <Button onClick={sync} disabled={syncing}>
            <RefreshCw className="h-4 w-4" />{syncing ? 'Syncing…' : 'Sync AWS now'}
          </Button>
        ) : null}
      </div>

      {error ? <p className="rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Discovered resources" value={summary?.total ?? '—'} detail={`${summary?.missing ?? 0} marked missing`} />
        <SummaryCard label="Last successful sync" value={summary?.lastSuccessfulSyncAt ? formatRelative(summary.lastSuccessfulSyncAt) : 'None'} detail={latest?.status ? `Latest run: ${latest.status}` : 'No sync history'} />
        <SummaryCard label="Regions in account" value={summary?.byRegion?.length ?? '—'} detail={latest?.incompleteRegions?.length ? `${latest.incompleteRegions.length} region(s) incomplete` : 'Coverage details below'} />
        <SummaryCard label="Service types" value={summary?.byService?.length ?? '—'} detail={latest?.serviceErrors?.length ? `${latest.serviceErrors.length} permission/API error group(s)` : 'No recorded service errors'} />
      </div>

        <Card>
        <CardHeader>
          <div><CardTitle>Inventory</CardTitle><CardDescription>{meta.total} resource(s) match the current filters.</CardDescription></div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            <Input aria-label="Search resources" placeholder="Search names or IDs" value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} />
            <Select aria-label="Filter by service" value={filters.service} onChange={(event) => updateFilter('service', event.target.value)}>
              <option value="">All services</option>{serviceOptions.map((item) => <option key={item.service} value={item.service}>{item.service} ({item.count})</option>)}
            </Select>
            <Select aria-label="Filter by region" value={filters.region} onChange={(event) => updateFilter('region', event.target.value)}>
              <option value="">All regions</option>{regionOptions.map((item) => <option key={item.region} value={item.region}>{item.region} ({item.count})</option>)}
            </Select>
            <Select aria-label="Filter by resource type" value={filters.resourceType} onChange={(event) => updateFilter('resourceType', event.target.value)}>
              <option value="">All resource types</option>{typeOptions.map((item) => <option key={item.resourceType} value={item.resourceType}>{item.resourceType} ({item.count})</option>)}
            </Select>
            <Select aria-label="Filter by state" value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
              <option value="">All states</option><option value="missing">Missing</option><option value="stale">Stale</option>{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
            </Select>
          </div>
          {loading ? <p className="py-8 text-center text-sm text-text-muted">Loading AWS inventory…</p> : resources.length ? (
            <Table>
              <THead><TH>Resource</TH><TH>Service / type</TH><TH>Region</TH><TH>State</TH><TH>Enrichment</TH><TH>Last discovered</TH></THead>
              <TBody>{resources.map((resource) => (
                <TR key={resource.id}>
                  <TD><Link className="font-medium text-accent hover:underline" to={`/dashboard/aws-resources/${resource.id}`}>{resource.name || resource.resourceId}</Link><p className="mt-0.5 font-mono text-xs text-text-subtle">{resource.resourceId}</p></TD>
                  <TD><span className="uppercase text-text">{resource.service}</span><p className="text-xs text-text-subtle">{resource.resourceType}</p></TD>
                  <TD className="text-text-muted">{resource.region || 'Global'}</TD>
                  <TD><Badge tone={statusTone[resource.status] || 'neutral'}>{resource.status}</Badge></TD>
                  <TD><Badge tone={resource.metadata?.enrichmentStatus === 'service-api' ? 'success' : 'warning'}>{resource.metadata?.enrichmentStatus || 'unavailable'}</Badge></TD>
                  <TD className="text-xs text-text-muted">{formatRelative(resource.lastDiscoveredAt)}{resource.missingSince ? <p className="text-warning">Missing since {formatRelative(resource.missingSince)}</p> : null}</TD>
                </TR>
              ))}</TBody>
            </Table>
          ) : (
            <EmptyState icon={Cloud} title="No AWS resources found" description={latest ? 'The last discovery returned no resources. Check its service status and permissions above.' : 'An administrator can run the first AWS sync after configuring AWS access.'} />
          )}
          <div className="flex items-center justify-between border-t border-border pt-3 text-sm text-text-muted">
            <span>Page {page} of {pages}</span>
            <div className="flex gap-2"><Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Next</Button></div>
          </div>
        </CardContent>
      </Card>
      
      {latest?.resourceExplorerStatus ? (
        <Card>
          <CardHeader>
            <div><CardTitle>Resource Explorer coverage</CardTitle><CardDescription>Explorer results depend on enabled indexes and per-region permissions.</CardDescription></div>
            <Badge tone={latest.resourceExplorerStatus.coverageComplete ? 'success' : 'warning'}>
              {latest.resourceExplorerStatus.coverageComplete ? 'Complete indexes' : 'Partial / unavailable'}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-text-muted">
              Aggregator: {latest.resourceExplorerStatus.aggregatorRegion || 'not configured'} · {latest.resourceExplorerStatus.supportedResourceTypeCount || 0} resource types supported by Resource Explorer.
            </p>
            <div className="flex flex-wrap gap-2">
              {(latest.resourceExplorerStatus.indexRegions || []).map((index) => (
                <Badge key={`${index.region}-${index.type}`} tone={index.type === 'AGGREGATOR' ? 'accent' : 'neutral'}>
                  {index.region} · {index.type.toLowerCase()} · {String(index.state || 'unknown').toLowerCase()}
                </Badge>
              ))}
              {!(latest.resourceExplorerStatus.indexRegions || []).length ? <span className="text-sm text-text-subtle">No user-owned indexes were returned.</span> : null}
            </div>
            {latest.incompleteRegions?.length ? <p className="text-sm text-warning">Incomplete regions: {latest.incompleteRegions.join(', ')}</p> : null}
            {latest.resourceExplorerStatus.viewFilters?.length ? <p className="text-sm text-warning">Restricted default views found in: {latest.resourceExplorerStatus.viewFilters.map((view) => view.region).join(', ')}</p> : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <CountsCard title="Resources by AWS service" rows={summary?.byService || []} labelKey="service" />
        <CountsCard title="Resources by region" rows={summary?.byRegion || []} labelKey="region" />
      </div>

      {/* <Card>
        <CardHeader>
          <div><CardTitle>Inventory2</CardTitle><CardDescription>{meta.total} resource(s) match the current filters.</CardDescription></div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            <Input aria-label="Search resources" placeholder="Search names or IDs" value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} />
            <Select aria-label="Filter by service" value={filters.service} onChange={(event) => updateFilter('service', event.target.value)}>
              <option value="">All services</option>{serviceOptions.map((item) => <option key={item.service} value={item.service}>{item.service} ({item.count})</option>)}
            </Select>
            <Select aria-label="Filter by region" value={filters.region} onChange={(event) => updateFilter('region', event.target.value)}>
              <option value="">All regions</option>{regionOptions.map((item) => <option key={item.region} value={item.region}>{item.region} ({item.count})</option>)}
            </Select>
            <Select aria-label="Filter by resource type" value={filters.resourceType} onChange={(event) => updateFilter('resourceType', event.target.value)}>
              <option value="">All resource types</option>{typeOptions.map((item) => <option key={item.resourceType} value={item.resourceType}>{item.resourceType} ({item.count})</option>)}
            </Select>
            <Select aria-label="Filter by state" value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
              <option value="">All states</option><option value="missing">Missing</option><option value="stale">Stale</option>{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
            </Select>
          </div>
          {loading ? <p className="py-8 text-center text-sm text-text-muted">Loading AWS inventory…</p> : resources.length ? (
            <Table>
              <THead><TH>Resource</TH><TH>Service / type</TH><TH>Region</TH><TH>State</TH><TH>Enrichment</TH><TH>Last discovered</TH></THead>
              <TBody>{resources.map((resource) => (
                <TR key={resource.id}>
                  <TD><Link className="font-medium text-accent hover:underline" to={`/dashboard/aws-resources/${resource.id}`}>{resource.name || resource.resourceId}</Link><p className="mt-0.5 font-mono text-xs text-text-subtle">{resource.resourceId}</p></TD>
                  <TD><span className="uppercase text-text">{resource.service}</span><p className="text-xs text-text-subtle">{resource.resourceType}</p></TD>
                  <TD className="text-text-muted">{resource.region || 'Global'}</TD>
                  <TD><Badge tone={statusTone[resource.status] || 'neutral'}>{resource.status}</Badge></TD>
                  <TD><Badge tone={resource.metadata?.enrichmentStatus === 'service-api' ? 'success' : 'warning'}>{resource.metadata?.enrichmentStatus || 'unavailable'}</Badge></TD>
                  <TD className="text-xs text-text-muted">{formatRelative(resource.lastDiscoveredAt)}{resource.missingSince ? <p className="text-warning">Missing since {formatRelative(resource.missingSince)}</p> : null}</TD>
                </TR>
              ))}</TBody>
            </Table>
          ) : (
            <EmptyState icon={Cloud} title="No AWS resources found" description={latest ? 'The last discovery returned no resources. Check its service status and permissions above.' : 'An administrator can run the first AWS sync after configuring AWS access.'} />
          )}
          <div className="flex items-center justify-between border-t border-border pt-3 text-sm text-text-muted">
            <span>Page {page} of {pages}</span>
            <div className="flex gap-2"><Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Next</Button></div>
          </div>
        </CardContent>
      </Card> */}

      {latest?.serviceErrors?.length ? (
        <Card>
          <CardHeader>
            <div><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" />Service errors</CardTitle><CardDescription>Failures are grouped by service, region and API operation.</CardDescription></div>
          </CardHeader>
          <CardContent className="space-y-2">
            {latest.serviceErrors.map((issue, index) => (
              <div key={`${issue.service}-${issue.region}-${issue.operation}-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
                <span className="text-text">{issue.service} · {issue.operation}{issue.region ? ` · ${issue.region}` : ''}</span>
                <span className="text-text-muted">{issue.status} · {issue.affectedResources} affected</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {latest?.unsupportedResourceTypes?.length ? (
        <Card><CardHeader><div><CardTitle>Unsupported resource types</CardTitle><CardDescription>These returned resource types are not present in the current Resource Explorer type catalog.</CardDescription></div></CardHeader><CardContent className="flex flex-wrap gap-2">{latest.unsupportedResourceTypes.map((type) => <Badge key={type} tone="warning">{type}</Badge>)}</CardContent></Card>
      ) : null}

      {latest?.unintegratedResourceTypes?.length ? (
        <Card><CardHeader><div><CardTitle>Resource Explorer only</CardTitle><CardDescription>These types are discovered but do not yet have service-specific detail enrichment.</CardDescription></div></CardHeader><CardContent className="flex flex-wrap gap-2">{latest.unintegratedResourceTypes.map((type) => <Badge key={type} tone="info">{type}</Badge>)}</CardContent></Card>
      ) : null}

      
    </div>
  );
}

function SummaryCard({ label, value, detail }) {
  return <Card><CardContent className="pt-4"><p className="text-xs text-text-subtle">{label}</p><p className="mt-1 font-display text-2xl font-semibold text-text">{value}</p><p className="mt-1 text-xs text-text-muted">{detail}</p></CardContent></Card>;
}

function CountsCard({ title, rows, labelKey }) {
  return (
    <Card>
      <CardHeader><div><CardTitle>{title}</CardTitle><CardDescription>Current inventory, including marked-missing records.</CardDescription></div></CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {rows.length ? rows.map((row) => <Badge key={row[labelKey]} tone="neutral">{row[labelKey] || 'Unknown'} · {row.count}</Badge>) : <span className="text-sm text-text-subtle">No resources discovered.</span>}
      </CardContent>
    </Card>
  );
}
