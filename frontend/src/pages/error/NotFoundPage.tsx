import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/config/constants';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--bg-base)] px-4 text-center">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <p className="text-7xl font-black text-[var(--text-secondary)]">404</p>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">Page not found</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">The page you're looking for doesn't exist.</p>
        <div className="mt-6">
          <Link to={ROUTES.HOME}>
            <Button>Go home</Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
