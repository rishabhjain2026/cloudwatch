import { cn } from '../utils/cn';

export function Card({ className, children, interactive = false, ...props }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-surface shadow-(--shadow-panel)',
        interactive && 'transition-colors hover:border-border-strong hover:bg-surface-raised',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children }) {
  return (
    <div className={cn('flex items-start justify-between gap-3 px-4 pt-4 pb-2', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children }) {
  return (
    <h3 className={cn('font-display text-sm font-semibold tracking-tight text-text', className)}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children }) {
  return <p className={cn('mt-0.5 text-xs text-text-muted', className)}>{children}</p>;
}

export function CardContent({ className, children }) {
  return <div className={cn('px-4 pb-4', className)}>{children}</div>;
}
