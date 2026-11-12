import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  Box,
  Container,
  FileText,
  LayoutDashboard,
  Menu,
  Moon,
  Rocket,
  Search,
  Server,
  Sun,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { BrandMark } from '../components/BrandMark';
import { Badge, Button, Input } from '../design-system';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { cn } from '../utils/cn';

const nav = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/dashboard/servers', label: 'Servers', icon: Server },
  { to: '/dashboard/docker', label: 'Docker', icon: Container },
  { to: '/dashboard/alerts', label: 'Alerts', icon: AlertTriangle },
  { to: '/dashboard/incidents', label: 'Incidents', icon: Bell },
  { to: '/dashboard/logs', label: 'Logs', icon: FileText },
  { to: '/dashboard/deployments', label: 'Deployments', icon: Rocket },
  { to: '/dashboard/apis', label: 'APIs', icon: Box },
];

export function PublicShell() {
  const { theme, toggleTheme } = useTheme();
  const { isAdmin } = useAuth();
  const { push } = useToast();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const crumb = [...nav].reverse().find((item) =>
    item.end
      ? location.pathname === item.to
      : location.pathname.startsWith(item.to),
  )?.label ?? 'Overview';

  return (
    <div className="min-h-screen bg-canvas text-text">
      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <aside className="hidden w-60 shrink-0 border-r border-border bg-surface lg:flex lg:flex-col">
          <div className="flex h-14 items-center border-b border-border px-4">
            <BrandMark />
          </div>
          <div className="px-3 py-3">
            <Badge tone="demo">Public demo · read-only</Badge>
          </div>
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end ?? false}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-text-muted transition-colors',
                      isActive
                        ? 'bg-accent-soft text-accent'
                        : 'hover:bg-surface-raised hover:text-text',
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
          <div className="border-t border-border p-3 text-xs text-text-subtle">
            Simulated infrastructure only. No real host IPs or secrets.
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top header */}
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-4 w-4" />
            </Button>

            <div className="hidden min-w-0 sm:block">
              <p className="text-[11px] uppercase tracking-wide text-text-subtle">Public</p>
              <p className="truncate text-sm font-medium text-text">{crumb}</p>
            </div>

            <div className="relative ml-auto hidden max-w-sm flex-1 md:block">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-subtle" />
              <Input
                className="pl-9"
                placeholder="Search servers, alerts, incidents…"
                aria-label="Global search"
                onFocus={() => push('Search is not yet implemented.', 'info')}
              />
            </div>

            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle theme"
              onClick={toggleTheme}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button as={NavLink} to={isAdmin ? '/admin' : '/login'} variant="secondary" size="sm">
              {isAdmin ? 'Admin' : 'Admin login'}
            </Button>
          </header>

          <main className="flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-border bg-surface">
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <BrandMark />
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
              {nav.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end ?? false}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2 rounded-md px-2.5 py-2 text-sm',
                        isActive ? 'bg-accent-soft text-accent' : 'text-text-muted hover:bg-surface-raised hover:text-text',
                      )
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
            <div className="border-t border-border p-3 text-xs text-text-subtle">
              Simulated infrastructure only.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
