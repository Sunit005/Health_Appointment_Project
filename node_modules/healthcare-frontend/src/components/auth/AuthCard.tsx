import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

interface AuthCardProps {
  children: React.ReactNode;
  className?: string;
  title: string;
  subtitle?: string;
}

export function AuthCard({ children, className, title, subtitle }: AuthCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'dark w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950/90 p-8 sm:p-10 shadow-2xl backdrop-blur-md text-white',
        className,
      )}
    >
      {/* Signature Category Header */}
      <div className="mb-4 text-left">
        <span className="text-[12px] font-bold uppercase tracking-wider text-slate-400">CLINICAL PORTAL</span>
        <h1 className="text-4xl font-extrabold text-white tracking-tight mt-0.5">Healthcare Manager</h1>
        <div className="h-[1px] bg-zinc-800 my-4" />
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-white">{title}</h2>
        {subtitle && (
          <p className="mt-1.5 text-sm text-slate-400">{subtitle}</p>
        )}
      </div>
      {children}
    </motion.div>
  );
}
