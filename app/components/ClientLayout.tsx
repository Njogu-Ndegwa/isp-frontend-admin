'use client';

import { usePathname } from 'next/navigation';
import CollapsibleSidebar from './CollapsibleSidebar';
import MobileBottomNav from './MobileBottomNav';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <>
      {/* Desktop Sidebar - Collapsible */}
      <CollapsibleSidebar />
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
      
      {/* Main Content Area */}
      {/* md:ml-16 (collapsed) or md:ml-64 (expanded) - handled by responsive classes */}
      <main className="min-h-screen p-4 md:p-8 md:ml-16 lg:ml-64 pb-24 md:pb-8">
        {children}
      </main>
    </>
  );
}
