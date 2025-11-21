'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  Package,
  Users,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  ArrowRight,
  Loader2,
  FolderTree,
} from 'lucide-react';

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
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setLoading(true);
      setError(null);

      const [suppliersRes, productsRes] = await Promise.all([
        fetch('/api/inventory/suppliers/stats', { credentials: 'include' }),
        fetch('/api/inventory/products/stats', { credentials: 'include' })
      ]);

      const suppliersData = await suppliersRes.json();
      const productsData = await productsRes.json();

      if (suppliersData.success && productsData.success) {
        setStats({
          suppliers: suppliersData.data,
          products: productsData.data
        });
      }
    } catch (err) {
      setError('Failed to load statistics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => fetchStats()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Inventory Management</h1>
        <p className="text-muted-foreground">
          Manage your products, suppliers, and inventory levels
        </p>
      </div>

      {/* Statistics Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-card to-accent/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.products.total_products || 0}
                </div>
                <p className="text-xs text-success">
                  {stats?.products.active_products || 0} active
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card to-accent/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Suppliers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.suppliers.total_suppliers || 0}
                </div>
                <p className="text-xs text-success">
                  {stats?.suppliers.active_suppliers || 0} active
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card to-accent/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Low Stock Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-warning">
                  {stats?.products.low_stock_products || 0}
                </div>
                <p className="text-xs text-muted-foreground">Need attention</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card to-accent/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Inventory Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${(stats?.products.total_inventory_value || 0).toLocaleString()}
                </div>
                <p className="text-xs text-success flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Total value
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <Link href="/inventory/products">
                  <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition cursor-pointer">
                    <h3 className="font-semibold text-lg mb-2">Products</h3>
                    <p className="text-sm text-gray-600">
                      Manage products, stock levels, and pricing
                    </p>
                  </div>
                </Link>

                <Link href="/inventory/suppliers">
                  <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition cursor-pointer">
                    <h3 className="font-semibold text-lg mb-2">Suppliers</h3>
                    <p className="text-sm text-gray-600">
                      Manage supplier information and relationships
                    </p>
                  </div>
                </Link>

                <Link href="/inventory/categories">
                  <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition cursor-pointer">
                    <h3 className="font-semibold text-lg mb-2">Categories</h3>
                    <p className="text-sm text-gray-600">
                      Organize products with categories and subcategories
                    </p>
                  </div>
                </Link>

                <Link href="/inventory/brands">
                  <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition cursor-pointer">
                    <h3 className="font-semibold text-lg mb-2">Brands</h3>
                    <p className="text-sm text-gray-600">
                      Manage product brands and their information
                    </p>
                  </div>
                </Link>

                <Link href="/inventory/origins">
                  <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition cursor-pointer">
                    <h3 className="font-semibold text-lg mb-2">Origins</h3>
                    <p className="text-sm text-gray-600">
                      Manage product origins and manufacturing locations
                    </p>
                  </div>
                </Link>

                <Link href="/inventory/purchase-orders">
                  <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition cursor-pointer">
                    <h3 className="font-semibold text-lg mb-2">Purchase Orders</h3>
                    <p className="text-sm text-gray-600">
                      Create and manage purchase orders for suppliers
                    </p>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity / Alerts */}
          {stats && stats.products && stats.products.low_stock_products > 0 && (
            <Card className="border-orange-200 bg-orange-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-700">
                  <AlertTriangle className="w-5 h-5" />
                  Attention Required
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  You have {stats.products.low_stock_products} product(s) with low stock levels that need attention.
                </p>
                <Link href="/inventory/products?filter=low_stock">
                  <Button className="border-orange-300 hover:bg-orange-100">
                    View Low Stock Items
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
