import healthcareHero from '@/assets/healthcare_hero.png';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col bg-white text-slate-900 font-sans">
      {/* 1. Top Utility Navigation bar (Thin Light Stripe) */}
      <div className="w-full border-b border-slate-100 bg-white px-4 py-3.5 text-[13px] text-slate-600 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex gap-4">
            <span className="hover:text-slate-900 transition-colors cursor-pointer">
              Newsroom
            </span>
            <span className="hover:text-slate-900 transition-colors cursor-pointer border-l border-slate-200 pl-4">
              Blog
            </span>
            <span className="hover:text-slate-900 transition-colors cursor-pointer border-l border-slate-200 pl-4">
              Careers
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 cursor-pointer hover:text-slate-900">
              <span>🌐</span>
              <span className="font-semibold text-slate-700">Asia Pacific - English</span>
              <span className="text-[10px]">▼</span>
            </div>
            <div className="flex items-center gap-1 pl-4 border-l border-slate-200 cursor-pointer hover:text-slate-900 font-semibold">
              <span>👤</span>
              <span>Login</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Navigation Header Bar (White background) */}
      <header className="w-full border-b border-slate-200 bg-white px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          
          {/* Logo Section */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <svg className="h-7 w-7 text-[var(--brand-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <div className="flex flex-col leading-none">
                <span className="text-xl font-black tracking-tight text-slate-950 uppercase">
                  HEALTHCARE PORTAL
                </span>
              </div>
            </div>
          </div>

          {/* Nav Links */}
          <div className="hidden lg:flex items-center gap-8 text-sm font-bold text-slate-700 uppercase tracking-wider">
            <span className="hover:text-black cursor-pointer">Portal Overview</span>
            <span className="hover:text-black cursor-pointer">Find Doctors</span>
            <span className="hover:text-black cursor-pointer">Symptom Checker</span>
            <span className="hover:text-black cursor-pointer">Clinical Services</span>
            <span className="hover:text-black cursor-pointer">Support</span>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <input
                type="text"
                placeholder="Search"
                className="w-56 rounded-full border border-slate-300 bg-slate-50 px-4 py-2 pr-8 text-sm text-slate-800 focus:border-slate-400 focus:outline-none"
              />
              <span className="absolute right-3 top-2.5 text-slate-400 text-sm">🔍</span>
            </div>
            <button className="flex items-center gap-1.5 rounded-full bg-slate-950 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-900">
              <span>Contact Support</span>
              <span className="text-[10px]">▶</span>
            </button>
          </div>

        </div>
      </header>

      {/* 3. Sub-header Breadcrumb Bar */}
      <div className="w-full bg-white px-4 py-3 text-xs font-bold sm:px-8 border-b border-slate-100">
        <div className="mx-auto flex max-w-7xl items-center gap-2 text-slate-500 uppercase tracking-wider">
          <span className="text-blue-600 hover:underline cursor-pointer">BY DIRECTORY</span>
          <span>&gt;</span>
          <span className="text-slate-800">CLINICAL OPERATION SOLUTIONS</span>
        </div>
      </div>

      {/* 4. Full-Screen Cover Hero Section */}
      <div
        className="flex-1 relative w-full flex items-center bg-cover bg-center"
        style={{
          backgroundImage: `url(${healthcareHero})`,
        }}
      >
        {/* Soft dark tint overlay on background image */}
        <div className="absolute inset-0 bg-black/40 z-0" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-8 py-12 md:py-20">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Column: Glassmorphic Zebra Card with active Login/Auth Form */}
            <div className="col-span-full lg:col-span-6 xl:col-span-5">
              {children}
            </div>

            {/* Right Column: Dynamic empty space */}
            <div className="hidden lg:block lg:col-span-6 xl:col-span-7" />

          </div>
        </div>
      </div>

      {/* 5. Footer Stripe */}
      <footer className="w-full bg-white border-t border-slate-200 py-8 px-4 sm:px-8">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-semibold">
          <p>&copy; {new Date().getFullYear()} Healthcare Portal System. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:underline">Privacy Policy</a>
            <a href="#" className="hover:underline">Terms of Use</a>
            <a href="#" className="hover:underline">Contact Support</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
