import { motion } from 'framer-motion';

interface SuccessMessageProps {
  title: string;
  message: string;
  action?: React.ReactNode;
}

export function SuccessMessage({ title, message, action }: SuccessMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center gap-4 py-4 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-success)]/10">
        <svg className="h-7 w-7 text-[var(--brand-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{message}</p>
      </div>
      {action && <div className="mt-2 w-full">{action}</div>}
    </motion.div>
  );
}
