'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useClientPagination } from '@/hooks/usePagination';
import { useAuth } from '@/contexts/AuthContext';
import { useRBAC } from '@/contexts/RBACContext';
import { PermissionGuard } from '@/components/rbac/PermissionGuard';
import { PermissionButton } from '@/components/rbac/PermissionButton';
import { PERMISSIONS } from '@/types/rbac';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Package,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { Product, ProductStats } from '@/types/inventory';
import { DataTablePagination } from '@/components/DataTablePagination';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AddProductForm } from '@/components/forms/AddProductForm';

export default function ProductsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { hasPermission } = useRBAC();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Simple formatting functions
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  // Filter products based on search term
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.supplier_name?.toString().toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Use client-side pagination for filtered products
  const pagination = useClientPagination(filteredProducts, {
    initialPageSize: 10,
  });

  // Fetch products and stats on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [productsResult, statsResult] = await Promise.all([
          fetch('/api/inventory/products?limit=100', {
            credentials: 'include',
          }).then((res) => res.json()),
          fetch('/api/inventory/products/stats', {
            credentials: 'include',
          }).then((res) => res.json()),
        ]);

        if (productsResult.success) {
          setProducts(productsResult.data);
        } else {
          throw new Error(productsResult.error || 'Failed to load products');
        }

        if (statsResult.success) {
          setStats(statsResult.data);
        } else {
          throw new Error(statsResult.error || 'Failed to load stats');
        }
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Failed to load products');
        }
        toast.error('Failed to load products', {
          description: 'Please try again later.',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStockStatus = (current: number, min: number) => {
    if (current <= min * 0.5)
      return { status: 'critical', color: 'text-destructive', icon: AlertTriangle };
    if (current <= min) return { status: 'low', color: 'text-warning', icon: AlertTriangle };
    return { status: 'good', color: 'text-success', icon: CheckCircle };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-success text-white';
      case 'discontinued':
        return 'bg-status-draft text-white';
      case 'out-of-stock':
        return 'bg-destructive text-white';
      default:
        return 'bg-muted';
    }
  };

  const handleToggleProductStatus = async (productId: number) => {
    const targetProduct = products.find((product) => product.id === productId);
    if (!targetProduct) {
      toast.error('Product not found');
      return;
    }

    try {
      const response = await fetch(`/api/inventory/products/${productId}/toggle-status`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setProducts((prev) =>
          prev.map((product) =>
            product.id === productId ? { ...product, status: data.data.status } : product
          )
        );

        try {
          const statsRes = await fetch('/api/inventory/products/stats', {
            credentials: 'include',
          });
          const statsResult = await statsRes.json();
          if (statsResult.success) {
            setStats(statsResult.data);
          }
        } catch (statsError) {
          console.error('Failed to refresh product stats:', statsError);
        }

        toast.success(
          data.data.status === 'active'
            ? 'Product activated successfully'
            : 'Product deactivated successfully'
        );
      } else {
        throw new Error(data.error || 'Failed to update product status');
      }
    } catch (err) {
      if (err instanceof Error) {
        toast.error('Failed to update product status', {
          description: err.message,
        });
      } else {
        toast.error('Failed to update product status', {
          description: 'Please try again later.',
        });
      }
    }
  };

  // Get unique categories from products
  const categories = products.reduce(
    (acc, product) => {
      if (product.category_name) {
        const existing = acc.find((cat) => cat.name === product.category_name);
        if (existing) {
          existing.count++;
        } else {
          acc.push({
            name: product.category_name,
            count: 1,
            color:
              acc.length % 4 === 0
                ? 'bg-blue-100 text-blue-800'
                : acc.length % 4 === 1
                ? 'bg-green-100 text-green-800'
                : acc.length % 4 === 2
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-purple-100 text-purple-800',
          });
        }
      }
      return acc;
    },
    [] as { name: string; count: number; color: string }[]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading products...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <PermissionGuard
      permission={PERMISSIONS.PRODUCTS_READ}
      fallback={
        <div className="container mx-auto py-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Access Denied</h2>
            <p className="text-muted-foreground">
              You don&#39;t have permission to view products.
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-6" data-testid="products-page">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Products</h1>
            <p className="text-muted-foreground">
              Manage your product catalog and inventory levels
            </p>
          </div>
          <PermissionButton
            permission={PERMISSIONS.PRODUCTS_CREATE}
            className="bg-primary hover:bg-primary/90"
            onClick={() => setShowAddForm(true)}
            data-testid="add-product-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </PermissionButton>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-card to-accent/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_products || 0}</div>
              <p className="text-xs text-success">{stats?.active_products || 0} active</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-card to-accent/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Low Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                {stats?.low_stock_products || 0}
              </div>
              <p className="text-xs text-muted-foreground">Need reordering</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-card to-accent/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.categories_count || 0}
              </div>
              <p className="text-xs text-muted-foreground">Active categories</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-card to-accent/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.total_inventory_value
                  ? formatCurrency(stats.total_inventory_value)
                  : formatCurrency(0)}
              </div>
              <p className="text-xs text-success">Inventory value</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {categories.map((category) => (
                <div
                  key={category.name}
                  className="flex items-center justify-between p-3 rounded-lg bg-accent/20 hover:bg-accent/30 transition-colors"
                >
                  <div>
                    <div className="font-medium text-sm">{category.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {category.count} products
                    </div>
                  </div>
                  <Badge className={category.color}>{category.count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Products Table */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <CardTitle>Product Catalog</CardTitle>
                <div className="flex gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-initial">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search products..."
                      data-testid="product-search-input"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-full sm:w-80"
                    />
                  </div>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Stock Status</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.data.map((product) => {
                    const stockInfo = getStockStatus(
                      product.current_stock,
                      product.min_stock_level
                    );
                    const StockIcon = stockInfo.icon;

                    return (
                      <TableRow
                        key={product.id}
                        className="hover:bg-accent/50"
                        data-testid="product-row"
                        data-product-id={product.id}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                              <Package className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-muted-foreground">
                                SKU: {product.sku}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-sm">
                              {product.category_name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {product.subcategory_name}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <StockIcon
                              className={`w-4 h-4 ${stockInfo.color}`}
                            />
                            <div>
                              <div className={`font-medium text-sm ${stockInfo.color}`}>
                                {product.current_stock} {product.unit_of_measure}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Min: {product.min_stock_level} {product.unit_of_measure}
                              </div>
                              {product.reserved_stock > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  Reserved: {product.reserved_stock} {product.unit_of_measure}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-sm">
                              {formatCurrency(product.selling_price)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Cost: {formatCurrency(product.cost_price)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {product.supplier_name}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(product.status)}>
                            {product.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover">
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(`/inventory/products/${product.id}`)
                                }
                              >
                                View Details
                              </DropdownMenuItem>
                              {hasPermission(PERMISSIONS.PRODUCTS_UPDATE) && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    router.push(`/inventory/products/${product.id}/edit`)
                                  }
                                >
                                  Edit Product
                                </DropdownMenuItem>
                              )}
                              {hasPermission(PERMISSIONS.INVENTORY_ADJUST) && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    router.push(`/inventory/products/${product.id}/adjust-stock`)
                                  }
                                >
                                  Adjust Stock
                                </DropdownMenuItem>
                              )}
                              {hasPermission(PERMISSIONS.PRODUCTS_DELETE) && (
                                <DropdownMenuItem
                                  className={
                                    product.status === 'active'
                                      ? 'text-destructive'
                                      : 'text-success'
                                  }
                                  onClick={() => handleToggleProductStatus(product.id)}
                                >
                                  {product.status === 'active' ? 'Deactivate' : 'Activate'}
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="mt-4">
                <DataTablePagination
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  pageSize={pagination.pageSize}
                  totalItems={pagination.totalItems}
                  onPageChange={pagination.setPage}
                  onPageSizeChange={pagination.setPageSize}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AddProductForm
        open={showAddForm}
        onOpenChange={setShowAddForm}
        onProductAdded={async () => {
          // Refresh the products list
          try {
            const [productsResult, statsResult] = await Promise.all([
              fetch('/api/inventory/products?limit=100', {
                credentials: 'include',
              }).then((res) => res.json()),
              fetch('/api/inventory/products/stats', {
                credentials: 'include',
              }).then((res) => res.json()),
            ]);

            if (productsResult.success) {
              setProducts(productsResult.data);
            }
            if (statsResult.success) {
              setStats(statsResult.data);
            }
          } catch (err) {
            console.error('Failed to refresh products:', err);
          }
        }}
      />
    </PermissionGuard>
  );
}