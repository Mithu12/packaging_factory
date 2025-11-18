'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';
import Link from 'next/link';

interface InventoryLayoutProps {
  children: ReactNode;
  title: string;
  currentPage: 'dashboard' | 'suppliers' | 'products' | 'categories';
  actions?: ReactNode;
}

export default function InventoryLayout({ children, title, currentPage, actions }: InventoryLayoutProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const navItems = [
    { name: 'Dashboard', href: '/inventory', key: 'dashboard' },
    { name: 'Suppliers', href: '/inventory/suppliers', key: 'suppliers' },
    { name: 'Products', href: '/inventory/products', key: 'products' },
    { name: 'Categories', href: '/inventory/categories', key: 'categories' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/dashboard" className="text-xl font-bold text-gray-900 hover:text-gray-700">
                ERP System
              </Link>
              <div className="flex space-x-4">
                {navItems.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      currentPage === item.key
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {user.full_name} ({user.role})
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Page Header */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
            {actions && <div className="flex space-x-3">{actions}</div>}
          </div>

          {/* Page Content */}
          {children}
        </div>
      </main>
    </div>
  );
}
