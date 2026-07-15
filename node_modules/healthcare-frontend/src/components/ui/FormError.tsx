import { motion, AnimatePresence } from 'framer-motion';

interface FormErrorProps {
  message?: string;
}

export function FormError({ message }: FormErrorProps) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          role="alert"
          initial={{ opacity: 0, y: -4, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -4, height: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-2 rounded-lg border border-[var(--brand-danger)]/20 bg-[var(--brand-danger)]/5 px-3 py-2 text-sm text-[var(--brand-danger)]"
        >
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
