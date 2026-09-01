'use client';

import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { usePathname, useRouter } from 'next/navigation';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAuthPage = pathname === '/login' || pathname === '/setup';
  const isStandalonePage = pathname?.startsWith('/surveys');

  useEffect(() => {
    // Global setup check for any page
    if (pathname !== '/setup') {
      fetch('/api/v1/setup/status')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.is_setup === false) {
            router.push('/setup');
          }
        })
        .catch(() => {});
    }
  }, [pathname, router]);

  if (isAuthPage) {
    return <main className="min-h-screen bg-slate-900">{children}</main>;
  }

  if (isStandalonePage) {
    return <main className="min-h-screen bg-slate-50">{children}</main>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 antialiased">
      <Navbar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
      <div className="flex flex-1 relative overflow-x-hidden">
        <Sidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />
        <main className="flex-1 p-3 sm:p-5 lg:p-6 overflow-y-auto w-full min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
