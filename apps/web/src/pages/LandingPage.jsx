
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Boxes,
  CheckCircle2,
  Cloud,
  Code2,
  Container,
  Database,
  Github,
  Layers3,
  Network,
  Server,
  ShieldCheck,
  Terminal,
  Workflow,
  Zap,
} from 'lucide-react';
import { Button } from '../design-system';

const capabilities = [
  {
    icon: Server,
    title: 'Server Monitoring',
    description:
      'Track CPU, memory, disk utilization and server health with centralized infrastructure visibility.',
    tag: 'Infrastructure',
  },
  {
    icon: Cloud,
    title: 'AWS Monitoring',
    description:
      'Discover and monitor your AWS resources, including EC2 instances and cloud infrastructure.',
    tag: 'Cloud',
  },
  {
    icon: Container,
    title: 'Docker Monitoring',
    description:
      'Inspect containers, resource consumption, runtime status and container health.',
    tag: 'Containers',
  },
  {
    icon: Activity,
    title: 'API Monitoring',
    description:
      'Monitor endpoint availability, response latency, HTTP status codes and SSL certificates.',
    tag: 'Performance',
  },
  {
    icon: Bell,
    title: 'Alert Management',
    description:
      'Centralize infrastructure alerts and identify problems before they become bigger incidents.',
    tag: 'Reliability',
  },
  {
    icon: Workflow,
    title: 'Incident Management',
    description:
      'Track incidents, manage their lifecycle and maintain a clear operational history.',
    tag: 'Operations',
  },
];

const workflow = [
  {
    number: '01',
    icon: Network,
    title: 'Connect',
    description:
      'Connect your infrastructure and monitoring targets to InfraPulse.',
  },
  {
    number: '02',
    icon: Activity,
    title: 'Collect',
    description:
      'Collect operational metrics, health checks and monitoring events.',
  },
  {
    number: '03',
    icon: Bell,
    title: 'Respond',
    description:
      'Review alerts, investigate incidents and understand system health.',
  },
];

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center">
      <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-accent uppercase">
        {eyebrow}
      </p>
      <h2 className="font-display text-3xl font-semibold tracking-tight text-text sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-sm leading-7 text-text-muted sm:text-base">
        {description}
      </p>
    </div>
  );
}

export function LandingPage() {
  return (
    <main className="overflow-hidden bg-canvas text-text">
      {/* Hero */}
      <section className="relative isolate min-h-[760px]">
        <div className="ip-noise absolute inset-0 -z-10" />
        <div className="ip-grid-bg absolute inset-0 -z-10 opacity-50" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-64 bg-linear-to-t from-canvas to-transparent" />

        <div className="mx-auto grid min-h-[760px] max-w-7xl items-center gap-14 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:gap-10">
          <div className="max-w-2xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3 py-1.5 text-xs font-medium text-accent">
              <span className="h-2 w-2 rounded-full bg-success" />
              Infrastructure observability platform
            </div>

            <h1 className="font-display text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl">
              Your entire infrastructure.
              <span className="block text-accent">
                One control plane.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-text-muted sm:text-lg">
              Monitor servers, AWS resources, Docker containers and APIs.
              Detect issues, manage incidents and understand your
              infrastructure from one unified platform.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Button as={Link} to="/dashboard" size="lg">
                Explore dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>

              <Button as={Link} to="/login" variant="secondary" size="lg">
                Administrator login
              </Button>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-text-subtle">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Centralized visibility
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Real infrastructure integrations
              </span>
            </div>
          </div>

          {/* Dashboard preview */}
          <div className="relative mx-auto w-full max-w-xl lg:ml-auto">
            <div className="absolute -inset-10 -z-10 rounded-full bg-accent/10 blur-3xl" />

            <div className="overflow-hidden rounded-2xl border border-border bg-surface/90 shadow-(--shadow-panel) backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Activity size={19} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text">
                      InfraPulse Overview
                    </p>
                    <p className="text-[11px] text-text-subtle">
                      Platform preview
                    </p>
                  </div>
                </div>
                <span className="rounded-md border border-info/30 bg-info/10 px-2 py-1 text-[10px] font-medium text-info">
                  PREVIEW
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
                {[
                  { icon: Server, label: 'Servers' },
                  { icon: Cloud, label: 'AWS Resources' },
                  { icon: Container, label: 'Containers' },
                  { icon: Activity, label: 'API Checks' },
                  { icon: Bell, label: 'Alerts' },
                  { icon: Workflow, label: 'Incidents' },
                ].map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="rounded-xl border border-border bg-canvas/70 p-4"
                  >
                    <Icon className="mb-4 h-5 w-5 text-accent" />
                    <p className="text-xs font-medium text-text">{label}</p>
                    <p className="mt-1 text-[10px] text-text-subtle">
                      Monitoring module
                    </p>
                  </div>
                ))}
              </div>

              <div className="mx-4 mb-4 rounded-xl border border-border bg-canvas/70 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-xs font-semibold text-text">
                    Infrastructure visibility
                  </p>
                  <Layers3 className="h-4 w-4 text-accent" />
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  {[
                    'Infrastructure',
                    'Metrics',
                    'Monitoring',
                    'Response',
                  ].map((item, index) => (
                    <div key={item} className="flex items-center gap-2">
                      <span className="rounded-lg border border-border bg-surface px-3 py-2 text-[10px] font-medium text-text-muted">
                        {item}
                      </span>
                      {index !== 3 && (
                        <ArrowRight className="h-3 w-3 text-text-subtle" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-border px-5 py-3">
                <p className="text-center text-[10px] text-text-subtle">
                  A unified view of your infrastructure operations
                </p>
              </div>
            </div>

            <div className="absolute -right-3 top-20 hidden items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 shadow-lg sm:flex">
              <ShieldCheck className="h-4 w-4 text-success" />
              <span className="text-xs font-medium text-text">
                Operational visibility
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="border-t border-border px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Platform capabilities"
            title="Everything under one roof."
            description="Bring your infrastructure monitoring workflows together. From cloud resources to application endpoints, get a unified operational view."
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map(({ icon: Icon, title, description, tag }) => (
              <div
                key={title}
                className="group rounded-2xl border border-border bg-surface p-6 transition-all duration-200 hover:-translate-y-1 hover:border-accent/40 hover:shadow-(--shadow-panel)"
              >
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent/20 bg-accent/10 text-accent">
                    <Icon size={21} />
                  </div>
                  <span className="rounded-md border border-border px-2 py-1 text-[10px] text-text-subtle">
                    {tag}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-text">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-text-muted">
                  {description}
                </p>
                <div className="mt-5 flex items-center gap-1 text-xs font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
                  Explore platform
                  <ArrowUpRight size={14} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="border-y border-border bg-surface/40 px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="How it works"
            title="From infrastructure to insight."
            description="A straightforward monitoring workflow that helps you understand what is happening across your systems."
          />

          <div className="grid gap-8 md:grid-cols-3">
            {workflow.map(({ number, icon: Icon, title, description }, index) => (
              <div key={number} className="relative">
                {index !== 2 && (
                  <div className="absolute left-16 top-7 hidden h-px w-[calc(100%-32px)] border-t border-dashed border-border md:block" />
                )}

                <div className="relative mb-6 flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 text-accent">
                    <Icon size={24} />
                  </div>
                  <span className="font-mono text-sm text-text-subtle">
                    / {number}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-text">{title}</h3>
                <p className="mt-3 max-w-sm text-sm leading-7 text-text-muted">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Built for operations */}
      <section className="px-4 py-24 sm:px-6">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-accent uppercase">
              Built for operations
            </p>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-text sm:text-4xl">
              Visibility is only the beginning.
              <span className="block text-accent">
                Take control of operations.
              </span>
            </h2>
            <p className="mt-5 text-sm leading-7 text-text-muted sm:text-base">
              InfraPulse brings monitoring, alert management and incident
              workflows into one place, helping teams move from identifying
              problems to investigating and managing them.
            </p>

            <Button as={Link} to="/dashboard" size="lg" className="mt-8">
              Open InfraPulse
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-3">
            {[
              {
                icon: Zap,
                title: 'Identify problems',
                description: 'See infrastructure health and monitoring events.',
              },
              {
                icon: Bell,
                title: 'Stay informed',
                description: 'Review alerts and understand their severity.',
              },
              {
                icon: Workflow,
                title: 'Manage incidents',
                description: 'Follow incidents through their operational lifecycle.',
              },
              {
                icon: Database,
                title: 'Maintain visibility',
                description: 'Keep operational information in one platform.',
              },
            ].map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="flex items-start gap-4 rounded-xl border border-border bg-surface p-4"
              >
                <div className="rounded-lg bg-accent/10 p-2.5 text-accent">
                  <Icon size={19} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text">{title}</h3>
                  <p className="mt-1 text-xs leading-6 text-text-muted">
                    {description}
                  </p>
                </div>
                <CheckCircle2 className="ml-auto mt-1 h-4 w-4 shrink-0 text-success" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-24 sm:px-6">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-2xl border border-accent/20 bg-surface px-6 py-16 text-center sm:px-12">
          <div className="ip-grid-bg absolute inset-0 opacity-30" />
          <div className="relative">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Terminal size={23} />
            </div>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-text sm:text-4xl">
              Get a clearer view of your infrastructure.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-text-muted">
              Explore the InfraPulse dashboard and see how centralized
              infrastructure monitoring can simplify operations.
            </p>
            <div className="mt-8">
              <Button as={Link} to="/dashboard" size="lg">
                Explore the platform
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface/50 px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Activity size={17} />
              </div>
              <span className="font-display text-base font-semibold text-text">
                InfraPulse
              </span>
            </Link>
            <p className="mt-2 text-xs text-text-subtle">
              Infrastructure monitoring. One unified control plane.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-xs text-text-muted">
            <Link to="/dashboard" className="transition-colors hover:text-accent">
              Dashboard
            </Link>
            <Link to="/login" className="transition-colors hover:text-accent">
              Admin Login
            </Link>
            
            
          </div>
        </div>

        <div className="mx-auto mt-7 flex max-w-7xl flex-col gap-2 border-t border-border pt-5 text-xs text-text-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} InfraPulse. All rights reserved.</p>
          <p>
            Designed &amp; Developed by{' '}
            <a href='https://hellorishabh.me'
            target="_blank"
            className="font-medium text-text transition-colors hover:text-accent hover:underline">Rishabh Jain</a>
          </p>
        </div>
      </footer>
    </main>
  );
}
