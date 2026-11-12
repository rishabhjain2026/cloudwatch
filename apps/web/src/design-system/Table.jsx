import { cn } from '../utils/cn';

export function Table({ className, children }) {
  return (
    <div className={cn('w-full overflow-x-auto ip-scrollbar', className)}>
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }) {
  return (
    <thead>
      <tr className="border-b border-border text-xs uppercase tracking-wide text-text-subtle">
        {children}
      </tr>
    </thead>
  );
}

export function TH({ className, children }) {
  return <th className={cn('px-4 py-2.5 font-medium', className)}>{children}</th>;
}

export function TBody({ children }) {
  return <tbody className="divide-y divide-border">{children}</tbody>;
}

export function TR({ className, children, ...props }) {
  return (
    <tr className={cn('transition-colors hover:bg-surface-raised/70', className)} {...props}>
      {children}
    </tr>
  );
}

export function TD({ className, children }) {
  return <td className={cn('px-4 py-3 text-text-muted', className)}>{children}</td>;
}
