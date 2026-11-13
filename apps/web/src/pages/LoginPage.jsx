import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { BrandMark } from '../components/BrandMark';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '../design-system';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function LoginPage() {
  const { login, user, loading } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/dashboard'} replace />;
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await login(email, password);
      push('Signed in.', 'success');
      navigate(result.user?.role === 'ADMIN' ? '/admin' : '/dashboard');
    } catch (err) {
      push(err.message || 'Login failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="absolute inset-0 ip-noise" />
      <div className="absolute inset-0 ip-grid-bg opacity-40" />
      <Card className="relative w-full max-w-md">
        <CardHeader>
          <div>
            <BrandMark />
            <CardTitle className="mt-4 text-lg">Sign in to InfraPulse</CardTitle>
            <CardDescription>
              Use your InfraPulse account. Sessions use a secure httpOnly cookie.
            </CardDescription>
          </div>
          <Badge tone="accent">Admin</Badge>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onSubmit}>
            <div>
              <label className="mb-1.5 block text-xs text-text-subtle" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-text-subtle" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-text-muted"><Link to="/dashboard" className="text-accent hover:underline">Continue as public viewer</Link></p>
        </CardContent>
      </Card>
    </div>
  );
}
