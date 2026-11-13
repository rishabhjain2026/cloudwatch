import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  Box,
  Container,
  Cloud,
  FileText,
  LayoutDashboard,
  Menu,
  Moon,
  Rocket,
  Search,
  Server,
  ShieldAlert,
  Sun,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { BrandMark } from '../components/BrandMark';
import { Badge, Button, Input } from '../design-system';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { cn } from '../utils/cn';
import { api } from '../services/apiClient';

const nav = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/dashboard/servers', label: 'Servers', icon: Server },
  { to: '/dashboard/aws-resources', label: 'AWS Resources', icon: Cloud },
  { to: '/dashboard/docker', label: 'Docker', icon: Container },
  { to: '/dashboard/alerts', label: 'Alerts', icon: AlertTriangle },
  { to: '/dashboard/incidents', label: 'Incidents', icon: Bell },
  { to: '/dashboard/logs', label: 'Logs', icon: FileText },
  { to: '/dashboard/deployments', label: 'Deployments', icon: Rocket },
  { to: '/dashboard/apis', label: 'APIs', icon: Box },
];

export function PublicShell() {
  const { theme, toggleTheme } = useTheme();
  const { isAdmin, user } = useAuth();
  const { push } = useToast();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const visibleNav = isAdmin ? [...nav, { to: '/admin/incidents', label: 'Incident management', icon: ShieldAlert }] : nav;
  const [notifications,setNotifications]=useState(null);
  const [notificationOpen,setNotificationOpen]=useState(false);
  useEffect(()=>{if(user)api.get('/api/v1/notifications').then(result=>setNotifications(result.data)).catch(()=>setNotifications(null));else setNotifications(null)},[user]);
  const markRead=async(id)=>{
    try { if(!id){await api.post('/api/v1/notifications/read-all',{});setNotifications(current=>current?{...current,unread:0,items:current.items.map(n=>({...n,readAt:new Date().toISOString()}))}:current)}
      else {await api.patch(`/api/v1/notifications/${id}/read`,{});setNotifications(current=>current?{...current,unread:Math.max(0,current.unread-1),items:current.items.map(n=>n.id===id?{...n,readAt:new Date().toISOString()}:n)}:current)}
    } catch {}
  };

  const crumb = [...visibleNav].reverse().find((item) =>
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
            <Badge tone="demo">Public · read-only</Badge>
          </div>
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
            {visibleNav.map((item) => {
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
            Resource and metric availability is shown from the latest successful or partial sync.
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
            {user&&<div className="relative"><Button variant="ghost" size="icon" aria-label="Notifications" onClick={()=>setNotificationOpen(v=>!v)}><Bell className="h-4 w-4"/>{notifications?.unread>0&&<span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-danger"/>}</Button>{notificationOpen&&<div className="absolute right-0 z-50 mt-2 w-80 rounded-md border border-border bg-surface p-3 shadow-xl"><div className="flex justify-between"><p className="text-sm font-medium">Notifications</p>{notifications?.unread>0&&<button className="text-xs text-accent" onClick={()=>markRead(null)}>Mark all read</button>}</div><div className="mt-2 max-h-80 space-y-1 overflow-y-auto">{notifications?.items?.slice(0,10).map(n=><button key={n.id} onClick={()=>markRead(n.id)} className={`block w-full rounded p-2 text-left ${n.readAt?'opacity-60':'bg-accent-soft'}`}><span className="block text-xs font-medium">{n.title}</span><span className="mt-1 block line-clamp-2 text-[11px] text-text-muted">{n.body}</span></button>)}{!notifications?.items?.length&&<p className="py-4 text-center text-xs text-text-muted">No notifications</p>}</div></div>}</div>}
            <Button as={NavLink} to={user ? (isAdmin ? '/admin' : '/dashboard') : '/login'} variant="secondary" size="sm">
              {user ? (isAdmin ? 'Admin' : user.name) : 'Sign in'}
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
              {visibleNav.map((item) => {
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
              Read-only live and demo data, clearly labeled.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
