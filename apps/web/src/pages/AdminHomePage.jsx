import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '../design-system';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/apiClient';

export function AdminHomePage() {
  const { user, logout } = useAuth();
  const { push } = useToast();
  const [aws, setAws] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const refreshAws = useCallback(async () => {
    try {
      const result = await api.awsStatus();
      setAws(result.data);
    } catch (error) {
      setAws({ status: 'unavailable', message: error.message });
    }
  }, []);

  useEffect(() => {
    refreshAws();
  }, [refreshAws]);

  const onAwsSync = async () => {
    setSyncing(true);
    try {
      const result = await api.awsSync();
      const {
        resourcesDiscovered = 0,
        resourcesCreated = 0,
        resourcesUpdated = 0,
        serviceErrors = [],
      } = result.data;
      setAws({
        status: result.data.status,
        region: result.data.region,
        message: `Sync ${result.data.status}: ${resourcesDiscovered} resources discovered (${resourcesCreated} new, ${resourcesUpdated} updated).${serviceErrors.length ? ` ${serviceErrors.length} service errors need attention.` : ''}`,
      });
      push(`AWS sync ${result.data.status}.`, result.data.status === 'success' ? 'success' : 'warning');
    } catch (error) {
      setAws({ status: error.code?.toLowerCase() || 'unavailable', message: error.message });
      push(error.message, 'error');
    } finally {
      setSyncing(false);
    }
  };

  const onLogout = async () => {
    await logout();
    push('Signed out.', 'info');
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-16">
      <Card className="w-full">
        <CardHeader>
          <div>
            <Badge tone="accent">Administrator</Badge>
            <CardTitle className="mt-3 text-xl">Welcome, {user?.name}</CardTitle>
            <CardDescription>
              Manage alert rules, team routing, notification delivery, and AWS discovery. Mutating requests require CSRF.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-border px-3 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-text">AWS EC2 integration</p>
                <p className="mt-1 text-xs text-text-muted">
                  {aws?.region ? `Region: ${aws.region} · ` : ''}
                  {aws?.message || 'Checking AWS configuration…'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  tone={aws?.status === 'connected' ? 'success' : aws?.status === 'partial' ? 'warning' : 'neutral'}
                >
                  {aws?.status || 'checking'}
                </Badge>
                <Button onClick={onAwsSync} disabled={syncing || aws?.status === 'not_configured'}>
                  {syncing ? 'Syncing…' : 'Sync AWS now'}
                </Button>
              </div>
            </div>
          </div>
          <div className="rounded-md border border-border bg-surface-raised/60 px-3 py-2 text-sm text-text-muted">
            <p>
              Signed in as <span className="font-medium text-text">{user?.email}</span> · role{' '}
              <span className="font-mono text-accent">{user?.role}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button as={Link} to="/admin/alerts" variant="secondary">Alert management</Button>
            <Button as={Link} to="/dashboard" variant="secondary">
              View public demo
            </Button>
            <Button variant="ghost" onClick={onLogout}>
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
