'use client';

import { usePathname } from 'next/navigation';
import { DashboardLayout } from './DashboardLayout';
import { ReactNode } from 'react';

interface LayoutWrapperProps {
  children: ReactNode;
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname();

  // Pages that should NOT have the dashboard layout (auth pages)
  const publicPages = ['/login', '/register', '/'];

  const isPublicPage = publicPages.includes(pathname);

  if (isPublicPage) {
    return <>{children}</>;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
