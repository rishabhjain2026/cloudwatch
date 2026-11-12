import { Link } from 'react-router-dom';
import { ArrowRight, Activity } from 'lucide-react';
import { Button } from '../design-system';

export function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 ip-noise" />
      <div className="absolute inset-0 ip-grid-bg opacity-60" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-canvas to-transparent" />

      <section className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 pt-20 pb-16 sm:px-6">
        <div className="max-w-2xl">
          <p className="font-display text-sm font-semibold tracking-[0.2em] text-accent uppercase">
            InfraPulse
          </p>
          <h1 className="mt-4 font-display text-4xl leading-[1.08] font-semibold tracking-tight text-balance text-text sm:text-5xl md:text-6xl">
            Infrastructure clarity when every second counts.
          </h1>
          <p className="mt-5 max-w-xl text-base text-text-muted sm:text-lg">
            Monitor servers, containers, APIs, and incidents from one calm control plane — built for
            real agents, real metrics, and interview-ready engineering depth.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button as={Link} to="/dashboard" size="lg">
              Explore public demo
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button as={Link} to="/login" variant="secondary" size="lg">
              Administrator login
            </Button>
          </div>
        </div>

        <div className="pointer-events-none absolute top-28 right-4 hidden w-[min(42vw,420px)] lg:block">
          <div className="rounded-xl border border-border bg-surface/80 p-4 shadow-(--shadow-panel) backdrop-blur">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <Activity className="h-3.5 w-3.5 text-accent" />
                Live pulse preview
              </div>
              <span className="rounded-md border border-info/30 bg-info/10 px-1.5 py-0.5 text-[10px] font-medium tracking-wider text-info uppercase">
                Demo
              </span>
            </div>
            <svg viewBox="0 0 360 160" className="h-40 w-full text-accent" aria-hidden>
              <defs>
                <linearGradient id="pulseFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0 110 C40 110, 50 40, 80 40 S120 120, 150 120 S190 30, 220 30 S270 100, 300 100 S340 70, 360 70 L360 160 L0 160 Z"
                fill="url(#pulseFill)"
              />
              <path
                d="M0 110 C40 110, 50 40, 80 40 S120 120, 150 120 S190 30, 220 30 S270 100, 300 100 S340 70, 360 70"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="220" cy="30" r="4" fill="currentColor" />
            </svg>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px] text-text-subtle">
              <div>
                <p className="font-mono text-sm text-success">99.91%</p>
                API uptime
              </div>
              <div>
                <p className="font-mono text-sm text-warning">2</p>
                open alerts
              </div>
              <div>
                <p className="font-mono text-sm text-text">47%</p>
                avg CPU
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
