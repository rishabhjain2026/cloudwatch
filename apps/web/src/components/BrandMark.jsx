import { cn } from '../utils/cn';

export function BrandMark({ className, size = 'md', showWordmark = true }) {
  const box = size === 'lg' ? 'h-10 w-10' : 'h-8 w-8';
  const text = size === 'lg' ? 'text-xl' : 'text-base';

  return (
    <div className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'relative inline-flex items-center justify-center rounded-lg border border-border-strong bg-surface-raised',
          box,
        )}
        aria-hidden
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-accent">
          <path
            d="M4 14c2.2-5.2 4.4-7.8 8-7.8S17.8 8.8 20 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="12" cy="14" r="1.8" fill="currentColor" />
        </svg>
      </span>
      {showWordmark ? (
        <span className={cn('font-display font-semibold tracking-tight text-text', text)}>
          InfraPulse
        </span>
      ) : null}
    </div>
  );
}
