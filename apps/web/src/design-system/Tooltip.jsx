import { cn } from '../utils/cn';

export function Tooltip({ content, children, className }) {
  return (
    <span className={cn('group relative inline-flex', className)}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-surface-overlay px-2 py-1 text-[11px] text-text opacity-0 shadow-(--shadow-panel) transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {content}
      </span>
    </span>
  );
}
