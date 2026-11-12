import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Cloud } from 'lucide-react';
import { api } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '../design-system';
import { formatRelative } from '../utils/time';

export function AwsResourceDetailPage() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const [resource, setResource] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const request = isAdmin ? api.adminAwsResource(id) : api.publicAwsResource(id);
    request.then((result) => { if (!cancelled) setResource(result.data); })
      .catch((loadError) => { if (!cancelled) setError(loadError.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, isAdmin]);

  if (loading) return <p className="py-10 text-center text-sm text-text-muted">Loading AWS resource…</p>;
  if (error || !resource) {
    return <Card><CardHeader><CardTitle>Unable to load resource</CardTitle><CardDescription>{error || 'Resource not found.'}</CardDescription></CardHeader><CardContent><Button as={Link} to="/dashboard/aws-resources" variant="secondary"><ArrowLeft className="h-4 w-4" />Back to AWS resources</Button></CardContent></Card>;
  }

  const state = resource.missingSince ? 'missing' : resource.status;
  const metadata = resource.metadata || {};
  return (
    <div className="space-y-5">
      <Button as={Link} to="/dashboard/aws-resources" variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" />AWS Resources</Button>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-md bg-accent-soft p-2 text-accent"><Cloud className="h-5 w-5" /></div>
            <div><CardTitle>{resource.name || resource.resourceId}</CardTitle><CardDescription>{resource.resourceType} · {resource.region || 'Global'} · {resource.service}</CardDescription></div>
            <Badge className="ml-auto" tone={state === 'available' ? 'success' : state === 'missing' ? 'warning' : 'info'}>{state}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Detail label="Resource ID" value={resource.resourceId} />
          <Detail label="AWS account" value={isAdmin ? resource.accountId : 'Hidden in public view'} />
          {isAdmin ? <Detail label="ARN" value={resource.arn || 'Not supplied'} /> : null}
          <Detail label="Last discovered" value={formatRelative(resource.lastDiscoveredAt)} />
          {resource.missingSince ? <Detail label="Marked missing" value={formatRelative(resource.missingSince)} /> : null}
          {Object.entries(metadata).map(([key, value]) => (
            <Detail key={key} label={humanize(key)} value={formatValue(key, value)} wide={Array.isArray(value) || (value && typeof value === 'object')} />
          ))}
        </CardContent>
      </Card>
      {metadata.unavailableDetails?.length ? (
        <Card><CardHeader><div><CardTitle>Unavailable fields</CardTitle><CardDescription>These individual AWS calls failed or returned no available metric.</CardDescription></div></CardHeader><CardContent className="flex flex-wrap gap-2">{metadata.unavailableDetails.map((item) => <Badge key={`${item.operation}-${item.status}`} tone="warning">{item.operation}: {item.status}</Badge>)}</CardContent></Card>
      ) : null}
    </div>
  );
}

function Detail({ label, value, wide = false }) {
  return <div className={wide ? 'sm:col-span-2' : ''}><p className="text-xs text-text-subtle">{label}</p><div className="mt-1 break-all text-sm text-text">{value == null || value === '' ? 'Unavailable' : value}</div></div>;
}

function formatValue(key, value) {
  if (value == null) return 'Unavailable';
  if (key === 'storageBytes') {
    if (!Number.isFinite(value)) return 'Unavailable';
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    let size = value;
    let unit = 0;
    while (size >= 1000 && unit < units.length - 1) { size /= 1000; unit += 1; }
    return `${size.toFixed(2)} ${units[unit]}`;
  }
  if (key === 'objectCount' && typeof value === 'number') return new Intl.NumberFormat().format(Math.round(value));
  if (typeof value === 'object') return <pre className="overflow-auto rounded-md bg-surface-raised p-3 text-xs">{JSON.stringify(value, null, 2)}</pre>;
  return String(value);
}

function humanize(value) {
  return value.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`).replace(/^./, (letter) => letter.toUpperCase());
}
