export function Footer() {
  return (
    <footer className="w-full border-t border-[var(--border-subtle)] bg-[var(--bg-overlay)] py-8 mt-auto relative z-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          {/* Left section: copyright and corporate styling */}
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center gap-2 md:justify-start">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--brand-primary)]"></span>
              <span className="text-base font-bold tracking-tight text-[var(--text-primary)]">
                Healthcare Manager
              </span>
            </div>
            <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
              &copy; {new Date().getFullYear()} Healthcare Portal System. All rights reserved.
            </p>
          </div>

          {/* Right section: Links */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-[var(--text-secondary)]">
            <a href="#" className="transition-colors hover:text-[var(--text-primary)] hover:underline">
              Privacy Policy
            </a>
            <a href="#" className="transition-colors hover:text-[var(--text-primary)] hover:underline">
              Terms of Use
            </a>
            <a href="#" className="transition-colors hover:text-[var(--text-primary)] hover:underline">
              Security Standards
            </a>
            <a href="#" className="transition-colors hover:text-[var(--text-primary)] hover:underline">
              Cookie Preferences
            </a>
            <a href="#" className="transition-colors hover:text-[var(--text-primary)] hover:underline">
              Contact Support
            </a>
          </div>
        </div>

        {/* System info bar */}
        <div className="mt-6 flex flex-col items-center justify-between border-t border-[var(--border-subtle)] pt-4 md:flex-row">
          <p className="text-xs text-[var(--text-secondary)]">
            Product Platform Version: <span className="font-semibold text-[var(--text-primary)]">v1.2.4-stable</span>
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            Connected Node Environment: <span className="font-semibold text-[var(--brand-success)]">Active (TLS 1.3)</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
