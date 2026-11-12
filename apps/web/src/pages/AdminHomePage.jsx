import { Link } from 'react-router-dom';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '../design-system';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function AdminHomePage() {
  const { user, logout } = useAuth();
  const { push } = useToast();

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
              Auth is live. Full admin modules (servers, rules, remediation) land in Phases 5–10.
              Your session uses an httpOnly cookie; mutating requests require CSRF.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-border bg-surface-raised/60 px-3 py-2 text-sm text-text-muted">
            <p>
              Signed in as <span className="font-medium text-text">{user?.email}</span> · role{' '}
              <span className="font-mono text-accent">{user?.role}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
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
