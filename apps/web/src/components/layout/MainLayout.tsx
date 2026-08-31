'use client';

import React, { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { usePathname } from 'next/navigation';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAuthPage = pathname === '/login';
  const isStandalonePage = pathname?.startsWith('/surveys');

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
