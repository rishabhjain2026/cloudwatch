import { cn } from '../utils/cn';

const tones = {
  neutral: 'bg-surface-raised text-text-muted border-border',
  accent: 'bg-accent-soft text-accent border-accent/25',
  success: 'bg-success/15 text-success border-success/25',
  warning: 'bg-warning/15 text-warning border-warning/25',
  danger: 'bg-danger/15 text-danger border-danger/25',
  critical: 'bg-critical/15 text-critical border-critical/25',
  info: 'bg-info/15 text-info border-info/25',
  demo: 'bg-info/10 text-info border-info/30 uppercase tracking-wider',
};

export function Badge({ tone = 'neutral', className, children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium',
        tones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function StatusDot({ status = 'healthy', className }) {
  const color = {
    healthy: 'bg-success',
    warning: 'bg-warning',
    critical: 'bg-critical',
    offline: 'bg-text-subtle',
    unknown: 'bg-text-subtle',
  }[status];

  return (
    <span className={cn('relative flex h-2 w-2', className)} aria-hidden>
      <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-40', color)} />
      <span className={cn('relative inline-flex h-2 w-2 rounded-full', color)} />
    </span>
  );
}
