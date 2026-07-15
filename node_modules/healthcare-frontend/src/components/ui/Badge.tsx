import { cn } from '@/utils/cn';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

const variants = {
  default: 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)]',
  success: 'bg-[var(--brand-success)]/10 text-[var(--brand-success)] border-[var(--brand-success)]/20',
  warning: 'bg-[var(--brand-warning)]/10 text-[var(--brand-warning)] border-[var(--brand-warning)]/20',
  danger: 'bg-[var(--brand-danger)]/10 text-[var(--brand-danger)] border-[var(--brand-danger)]/20',
  info: 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border-[var(--brand-primary)]/20',
};

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
