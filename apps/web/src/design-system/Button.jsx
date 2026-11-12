import { cn } from '../utils/cn';

const variants = {
  primary:
    'bg-accent text-accent-fg hover:brightness-110 shadow-[0_0_0_1px_rgba(45,212,191,0.25)]',
  secondary:
    'bg-surface-raised text-text border border-border hover:border-border-strong hover:bg-surface-overlay',
  ghost: 'bg-transparent text-text-muted hover:text-text hover:bg-surface-raised',
  danger: 'bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25',
  soft: 'bg-accent-soft text-accent hover:brightness-110',
};

const sizes = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-3.5 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
  icon: 'h-9 w-9 p-0 justify-center',
};

export function Button({
  as: Comp = 'button',
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  children,
  ...props
}) {
  return (
    <Comp
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-all duration-150',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </Comp>
  );
}
