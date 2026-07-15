import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { ThemeToggle } from './ThemeToggle';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/services/api/authApi';
import { ROUTES } from '@/config/constants';

interface NavbarProps {
  title?: string;
}

export function Navbar({ title }: NavbarProps) {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore logout API errors
    }
    clearAuth();
    navigate(ROUTES.LOGIN);
    toast.success('Logged out successfully.');
  };

  const dashboardRoute =
    user?.role === 'ADMIN'
      ? ROUTES.ADMIN_DASHBOARD
      : user?.role === 'DOCTOR'
        ? ROUTES.DOCTOR_DASHBOARD
        : ROUTES.PATIENT_DASHBOARD;

  // Get user initials for Zebra-style circular user icon
  const getUserInitials = () => {
    if (!user?.email) return 'U';
    return user.email.slice(0, 2).toUpperCase();
  };

  return (
    <div className="w-full bg-[var(--bg-overlay)] border-b border-[var(--border-subtle)] relative z-40">
      {/* 1. Top Utility Navigation bar (Thin Dark/Gray Stripe) */}
      <div className="w-full bg-slate-950 text-slate-400 py-2.5 px-4 text-xs sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="hover:text-white transition-colors cursor-pointer">
              📞 Contact Support: 1-800-555-0199
            </span>
            <span className="hidden md:inline hover:text-white transition-colors cursor-pointer border-l border-slate-800 pl-4">
              🏢 Clinician Network
            </span>
          </div>
          <div className="flex items-center gap-4">
            {/* Language / Region selection */}
            <div className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors">
              <span>🌐</span>
              <span className="font-semibold text-slate-300">Asia Pacific - English</span>
            </div>
            {user ? (
              <span className="hidden sm:inline text-xs text-slate-500">
                Secure Session: <span className="text-[var(--brand-primary)] font-semibold">{user.role}</span>
              </span>
            ) : (
              <Link to={ROUTES.LOGIN} className="hover:text-white transition-colors font-medium">
                Log In
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Navigation Header Bar (White / Light Accent) */}
      <header className="w-full backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          
          {/* Logo Section */}
          <Link to={dashboardRoute} className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 shadow-md">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex flex-col">
                <span className="text-base font-extrabold tracking-widest text-[var(--text-primary)] uppercase leading-none">
                  HEALTHCARE
                </span>
                <span className="text-[10px] font-bold tracking-tight text-[var(--brand-primary)] uppercase mt-0.5">
                  PORTAL
                </span>
              </div>
              {title && (
                <span className="hidden sm:inline-block border-l border-[var(--border-subtle)] pl-2.5 text-sm font-semibold text-[var(--text-secondary)] mt-0.5">
                  {title}
                </span>
              )}
            </div>
          </Link>

          {/* Right Action Menu */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            {user ? (
              <div className="relative">
                {/* Zebra-style User Initials Profile Button */}
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 border border-slate-700 text-xs font-bold text-white shadow-sm transition-all hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20"
                >
                  {getUserInitials()}
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {dropdownOpen && (
                    <>
                      {/* Click outside backdrop */}
                      <div className="fixed inset-0 z-30" onClick={() => setDropdownOpen(false)} />
                      
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-overlay)] p-2 shadow-xl z-40 backdrop-blur-xl animate-fade-in"
                      >
                        <div className="px-3 py-2 border-b border-[var(--border-subtle)] mb-1">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Signed in as</p>
                          <p className="text-xs font-semibold text-[var(--text-primary)] truncate mt-0.5">{user.email}</p>
                          <span className="inline-block mt-1 text-[10px] font-medium bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] px-2 py-0.5 rounded-full uppercase">
                            {user.role} PORTAL
                          </span>
                        </div>
                        <button
                          onClick={() => { setDropdownOpen(false); navigate(dashboardRoute); }}
                          className="w-full text-left rounded-lg px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-colors"
                        >
                          Dashboard Home
                        </button>
                        <button
                          onClick={() => { setDropdownOpen(false); toast.success('Support Center is ready to help!'); }}
                          className="w-full text-left rounded-lg px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-colors"
                        >
                          Help & Support Documentation
                        </button>
                        <button
                          onClick={() => { setDropdownOpen(false); handleLogout(); }}
                          className="w-full text-left rounded-lg px-3 py-2 text-xs font-medium text-[var(--brand-danger)] hover:bg-[var(--brand-danger)]/10 transition-colors mt-1 pt-2 border-t border-[var(--border-subtle)]"
                        >
                          Sign Out
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                to={ROUTES.LOGIN}
                className="rounded-lg bg-slate-900 border border-slate-800 text-white px-3.5 py-1.5 text-xs font-semibold shadow-sm hover:bg-slate-800 transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>

        </div>
      </header>
    </div>
  );
}
