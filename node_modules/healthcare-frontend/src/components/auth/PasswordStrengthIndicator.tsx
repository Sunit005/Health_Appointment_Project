import { motion } from 'framer-motion';
import { usePasswordStrength } from '@/hooks/usePasswordStrength';

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const { label, color, width, checks, level } = usePasswordStrength(password);

  if (level === 'empty') return null;

  return (
    <div className="mt-2 space-y-2">
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--border-subtle)]">
          <motion.div
            className={`h-full rounded-full ${color}`}
            initial={{ width: '0%' }}
            animate={{ width }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
        <span className="text-xs font-medium text-[var(--text-secondary)] w-16 text-right">
          {label}
        </span>
      </div>

      {/* Checklist */}
      <ul className="grid grid-cols-2 gap-x-2 gap-y-1">
        {checks.map((check) => (
          <li key={check.label} className="flex items-center gap-1.5 text-xs">
            <span
              className={check.passed ? 'text-[var(--brand-success)]' : 'text-[var(--text-secondary)]'}
              aria-hidden="true"
            >
              {check.passed ? '✓' : '·'}
            </span>
            <span className={check.passed ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}>
              {check.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
