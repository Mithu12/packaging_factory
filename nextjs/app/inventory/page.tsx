'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Stats {
  suppliers: {
    total_suppliers: number;
    active_suppliers: number;
    inactive_suppliers: number;
  };
  products: {
    total_products: number;
    active_products: number;
    low_stock_products: number;
    total_inventory_value: number;
  };
}

export default function InventoryPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
    }
  }, [isAuthenticated]);

  const fetchStats = async () => {
    try {
      const [suppliersRes, productsRes] = await Promise.all([
        fetch('/api/inventory/suppliers/stats', { credentials: 'include' }),
        fetch('/api/inventory/products/stats', { credentials: 'include' })
      ]);

      const suppliersData = await suppliersRes.json();
      const productsData = await productsRes.json();

      setStats({
        suppliers: suppliersData.data,
        products: productsData.data
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/dashboard" className="text-xl font-bold">
                ERP System
              </Link>
              <Link href="/inventory" className="text-blue-600 font-medium">
                Inventory
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {user.full_name} ({user.role})
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold mb-6">Inventory Management</h1>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-lg">Loading statistics...</div>
            </div>
          ) : (
            <>
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-sm font-medium text-gray-500">Total Products</h3>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stats?.products.total_products || 0}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {stats?.products.active_products || 0} active
                  </p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-sm font-medium text-gray-500">Total Suppliers</h3>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stats?.suppliers.total_suppliers || 0}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {stats?.suppliers.active_suppliers || 0} active
                  </p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-sm font-medium text-gray-500">Low Stock Items</h3>
                  <p className="text-3xl font-bold text-orange-600 mt-2">
                    {stats?.products.low_stock_products || 0}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Need attention</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-sm font-medium text-gray-500">Inventory Value</h3>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    ${(stats?.products.total_inventory_value || 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Total value</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow p-6 mb-8">
                <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Link
                    href="/inventory/products"
                    className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition"
                  >
                    <h3 className="font-semibold text-lg mb-2">Products</h3>
                    <p className="text-sm text-gray-600">
                      Manage products, stock levels, and pricing
                    </p>
                  </Link>

                  <Link
                    href="/inventory/suppliers"
                    className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition"
                  >
                    <h3 className="font-semibold text-lg mb-2">Suppliers</h3>
                    <p className="text-sm text-gray-600">
                      Manage supplier information and relationships
                    </p>
                  </Link>

                  <Link
                    href="/inventory/categories"
                    className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition"
                  >
                    <h3 className="font-semibold text-lg mb-2">Categories</h3>
                    <p className="text-sm text-gray-600">
                      Organize products with categories and subcategories
                    </p>
                  </Link>
                </div>
              </div>

              {/* Migration Status */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-2">✅ Inventory Module Migrated</h3>
                <p className="text-sm text-gray-700">
                  The inventory module has been successfully migrated to Next.js!
                  <br />
                  <br />
                  <strong>Available Features:</strong>
                  <br />
                  • Suppliers management (CRUD operations)
                  <br />
                  • Products management (CRUD operations)
                  <br />
                  • Categories management (CRUD operations)
                  <br />
                  • Statistics and analytics
                  <br />
                  • Search and filtering
                  <br />
                  <br />
                  <strong>API Endpoints:</strong>
                  <br />
                  • GET/POST /api/inventory/suppliers
                  <br />
                  • GET/PUT/DELETE /api/inventory/suppliers/[id]
                  <br />
                  • GET/POST /api/inventory/products
                  <br />
                  • GET/PUT/DELETE /api/inventory/products/[id]
                  <br />
                  • GET/POST /api/inventory/categories
                  <br />
                  • GET/PUT/DELETE /api/inventory/categories/[id]
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
