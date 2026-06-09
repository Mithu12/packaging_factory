"use client";

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { AddProductForm } from "@/modules/inventory/components/forms/AddProductForm"
import { DataTablePagination } from "@/components/DataTablePagination"
import { useClientPagination } from "@/hooks/usePagination"
import { useFormatting } from "@/hooks/useFormatting"
import { useAuth } from "@/contexts/AuthContext"
import { useRBAC } from "@/contexts/RBACContext"
import { PermissionGuard } from "@/components/rbac/PermissionGuard"
import { PermissionButton } from "@/components/rbac/PermissionButton"
import { PERMISSIONS } from "@/types/rbac"
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Package,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ApiService, Product, ProductStats, ApiError } from "@/services/api"
import { toast } from "@/components/ui/sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

const ALL = "__all__"
type StockFilter = "all" | "good" | "low" | "critical"

function ProductsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { formatCurrency, formatNumber, formatDate } = useFormatting()
  const { user } = useAuth()
  const { hasPermission } = useRBAC()
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [searching, setSearching] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [stats, setStats] = useState<ProductStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>(ALL)
  const [stockFilter, setStockFilter] = useState<StockFilter>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL)
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>(ALL)
  const [supplierFilter, setSupplierFilter] = useState<string>(ALL)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  // Deep link: honor ?category=&subcategory= (used by the sidebar catalog tree)
  // so a sidebar group opens Products pre-filtered to that group. Reacts to
  // every navigation, since the page stays mounted across client-side links.
  useEffect(() => {
    const cat = searchParams.get("category")
    const sub = searchParams.get("subcategory")
    setCategoryFilter(cat || ALL)
    setSubcategoryFilter(sub || ALL)
    if (cat) {
      setExpandedCategories(prev => new Set(prev).add(cat))
    }
  }, [searchParams])

  // Debounce the search term so we don't hit the API on every keystroke
  useEffect(() => {
    const trimmed = searchTerm.trim()
    if (trimmed === debouncedSearch) return
    setSearching(true)
    const handle = setTimeout(() => setDebouncedSearch(trimmed), 400)
    return () => clearTimeout(handle)
  }, [searchTerm, debouncedSearch])

  const getStockBucket = (current: number, min: number): Exclude<StockFilter, "all"> => {
    if (current <= min * 0.5) return "critical"
    if (current <= min) return "low"
    return "good"
  }

  // Search is handled server-side; only the toolbar filters apply on the client
  const filteredProducts = products.filter(product => {
    const matchesStatus = statusFilter === ALL || product.status === statusFilter
    const matchesStock =
      stockFilter === "all" ||
      getStockBucket(product.current_stock, product.min_stock_level) === stockFilter
    const matchesCategory =
      categoryFilter === ALL || product.category_name === categoryFilter
    const matchesSubcategory =
      subcategoryFilter === ALL || product.subcategory_name?.toString() === subcategoryFilter
    const matchesSupplier =
      supplierFilter === ALL || product.supplier_name?.toString() === supplierFilter

    return matchesStatus && matchesStock && matchesCategory && matchesSubcategory && matchesSupplier
  })

  const activeFilterCount =
    (statusFilter !== ALL ? 1 : 0) +
    (stockFilter !== "all" ? 1 : 0) +
    (categoryFilter !== ALL ? 1 : 0) +
    (subcategoryFilter !== ALL ? 1 : 0) +
    (supplierFilter !== ALL ? 1 : 0)

  const clearFilters = () => {
    setStatusFilter(ALL)
    setStockFilter("all")
    setCategoryFilter(ALL)
    setSubcategoryFilter(ALL)
    setSupplierFilter(ALL)
  }

  // Select a whole category (clears any subcategory) and reveal its children.
  const selectCategory = (name: string) => {
    const isActive = categoryFilter === name && subcategoryFilter === ALL
    setSubcategoryFilter(ALL)
    setCategoryFilter(isActive ? ALL : name)
    if (!isActive) {
      setExpandedCategories(prev => new Set(prev).add(name))
    }
  }

  // Drill into a single subcategory (implies its parent category).
  const selectSubcategory = (categoryName: string, subName: string) => {
    const isActive = categoryFilter === categoryName && subcategoryFilter === subName
    if (isActive) {
      setSubcategoryFilter(ALL)
    } else {
      setCategoryFilter(categoryName)
      setSubcategoryFilter(subName)
    }
  }

  const toggleCategoryExpanded = (name: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const categoryOptions = Array.from(
    new Set(products.map(p => p.category_name).filter(Boolean) as string[])
  ).sort((a, b) => a.localeCompare(b))

  const supplierOptions = Array.from(
    new Set(
      products
        .map(p => p.supplier_name?.toString())
        .filter((s): s is string => Boolean(s))
    )
  ).sort((a, b) => a.localeCompare(b))

  // Use client-side pagination for filtered products
  const pagination = useClientPagination(filteredProducts, {
    initialPageSize: 10
  })

  useEffect(() => {
    pagination.setPage(1)
  }, [debouncedSearch, statusFilter, stockFilter, categoryFilter, subcategoryFilter, supplierFilter])

  // Fetch products whenever the debounced search changes; stats only on mount
  useEffect(() => {
    let cancelled = false

    const fetchProducts = async () => {
      try {
        setError(null)
        const productsResult = await ApiService.getProducts({
          limit: 100,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
        })
        if (cancelled) return
        setProducts(productsResult.products)
      } catch (err) {
        if (cancelled) return
        if (err instanceof ApiError) {
          setError(err.message)
        } else {
          setError("Failed to load products")
        }
      } finally {
        if (cancelled) return
        setLoading(false)
        setSearching(false)
      }
    }

    fetchProducts()

    return () => {
      cancelled = true
    }
  }, [debouncedSearch])

  useEffect(() => {
    ApiService.getProductStats()
      .then(setStats)
      .catch((err) => console.error("Failed to load product stats:", err))
  }, [])

  const getStockStatus = (current: number, min: number) => {
    if (current <= min * 0.5) return { status: "critical", color: "text-destructive", icon: AlertTriangle }
    if (current <= min) return { status: "low", color: "text-warning", icon: AlertTriangle }
    return { status: "good", color: "text-success", icon: CheckCircle }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-success text-white"
      case "discontinued": return "bg-status-draft text-white"
      case "out-of-stock": return "bg-destructive text-white"
      default: return "bg-muted"
    }
  }

  const handleToggleProductStatus = async (productId: number) => {
    const targetProduct = products.find(product => product.id === productId);
    if (!targetProduct) {
      toast.error("Product not found");
      return;
    }

    try {
      const updatedProduct = await ApiService.toggleProductStatus(productId);

      setProducts(prev =>
        prev.map(product =>
          product.id === productId ? { ...product, status: updatedProduct.status } : product
        )
      );

      try {
        const statsResult = await ApiService.getProductStats();
        setStats(statsResult);
      } catch (statsError) {
        console.error("Failed to refresh product stats:", statsError);
      }

      toast.success(
        updatedProduct.status === "active"
          ? "Product activated successfully"
          : "Product deactivated successfully"
      );
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error("Failed to update product status", {
          description: err.message
        });
      } else {
        toast.error("Failed to update product status", {
          description: "Please try again later."
        });
      }
    }
  }
  // Get unique categories (with their subcategories) from products.
  // Ordered by the catalog's stored sort_order (then name) so groups always
  // appear in the deliberate sequence configured on the category/subcategory.
  type CategoryNode = {
    name: string
    count: number
    color: string
    sortOrder: number
    subcategories: { name: string; count: number; sortOrder: number }[]
  }
  const SORT_LAST = Number.MAX_SAFE_INTEGER
  const categories = products.reduce((acc, product) => {
    if (product.category_name) {
      let existing = acc.find(cat => cat.name === product.category_name)
      if (existing) {
        existing.count++
      } else {
        existing = {
          name: product.category_name,
          count: 1,
          color: acc.length % 4 === 0 ? "bg-blue-100 text-blue-800" :
                 acc.length % 4 === 1 ? "bg-green-100 text-green-800" :
                 acc.length % 4 === 2 ? "bg-yellow-100 text-yellow-800" :
                 "bg-purple-100 text-purple-800",
          sortOrder: product.category_sort_order ?? SORT_LAST,
          subcategories: []
        }
        acc.push(existing)
      }
      if (product.subcategory_name) {
        const subName = product.subcategory_name.toString()
        const sub = existing.subcategories.find(s => s.name === subName)
        if (sub) sub.count++
        else existing.subcategories.push({
          name: subName,
          count: 1,
          sortOrder: product.subcategory_sort_order ?? SORT_LAST,
        })
      }
    }
    return acc
  }, [] as CategoryNode[])

  const byOrderThenName = <T extends { sortOrder: number; name: string }>(a: T, b: T) =>
    a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
  categories.sort(byOrderThenName)
  categories.forEach(cat => cat.subcategories.sort(byOrderThenName))

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading products...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <PermissionGuard permission={PERMISSIONS.PRODUCTS_READ} fallback={
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to view products.</p>
        </div>
      </div>
    }>
      <div className="space-y-6" data-testid="products-page">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Products</h1>
            <p className="text-muted-foreground">Manage your product catalog and inventory levels</p>
          </div>
          <PermissionButton
            permission={PERMISSIONS.PRODUCTS_CREATE}
            variant="add"
            onClick={() => setShowAddForm(true)} data-testid="add-product-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </PermissionButton>
        </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_products || 0}</div>
            <p className="text-xs text-success">{stats?.active_products || 0} active</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats?.low_stock_products || 0}</div>
            <p className="text-xs text-muted-foreground">Need reordering</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.categories_count || 0}</div>
            <p className="text-xs text-muted-foreground">Active categories</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_inventory_value ? formatCurrency(stats.total_inventory_value) : formatCurrency(0)}</div>
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
            <button
              type="button"
              onClick={() => {
                setCategoryFilter(ALL)
                setSubcategoryFilter(ALL)
              }}
              aria-pressed={categoryFilter === ALL}
              className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
                categoryFilter === ALL
                  ? "bg-primary/10 ring-1 ring-primary"
                  : "bg-accent/20 hover:bg-accent/30"
              }`}
              data-testid="product-category-filter-all"
            >
              <div>
                <div className="font-medium text-sm">All</div>
                <div className="text-xs text-muted-foreground">{products.length} products</div>
              </div>
              <Badge variant="outline">{products.length}</Badge>
            </button>
            {categories.map((category) => {
              const isActive = categoryFilter === category.name && subcategoryFilter === ALL
              const hasSubs = category.subcategories.length > 0
              const expanded = expandedCategories.has(category.name)
              return (
                <div key={category.name}>
                  <div
                    className={`flex items-stretch rounded-lg transition-colors ${
                      isActive
                        ? "bg-primary/10 ring-1 ring-primary"
                        : "bg-accent/20 hover:bg-accent/30"
                    }`}
                  >
                    {hasSubs ? (
                      <button
                        type="button"
                        onClick={() => toggleCategoryExpanded(category.name)}
                        aria-expanded={expanded}
                        aria-label={`${expanded ? "Collapse" : "Expand"} ${category.name}`}
                        className="flex items-center pl-2 pr-1 text-muted-foreground hover:text-foreground"
                      >
                        <ChevronRight
                          className={cn("h-4 w-4 transition-transform", expanded && "rotate-90")}
                        />
                      </button>
                    ) : (
                      <span className="w-[26px]" aria-hidden />
                    )}
                    <button
                      type="button"
                      onClick={() => selectCategory(category.name)}
                      aria-pressed={isActive}
                      className="flex-1 flex items-center justify-between p-3 pl-1 text-left"
                      data-testid="product-category-filter"
                      data-category={category.name}
                    >
                      <div>
                        <div className="font-medium text-sm">{category.name}</div>
                        <div className="text-xs text-muted-foreground">{category.count} products</div>
                      </div>
                      <Badge className={category.color}>
                        {category.count}
                      </Badge>
                    </button>
                  </div>
                  {hasSubs && expanded && (
                    <div className="mt-1 ml-5 pl-2 border-l space-y-1">
                      {category.subcategories.map((sub) => {
                        const subActive =
                          categoryFilter === category.name && subcategoryFilter === sub.name
                        return (
                          <button
                            key={sub.name}
                            type="button"
                            onClick={() => selectSubcategory(category.name, sub.name)}
                            aria-pressed={subActive}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-colors ${
                              subActive
                                ? "bg-primary/10 ring-1 ring-primary"
                                : "hover:bg-accent/30"
                            }`}
                            data-testid="product-subcategory-filter"
                            data-category={category.name}
                            data-subcategory={sub.name}
                          >
                            <span className="text-sm text-muted-foreground">{sub.name}</span>
                            <Badge variant="outline">{sub.count}</Badge>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
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
                    placeholder="Search products..." data-testid="product-search-input"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-10 w-full sm:w-80"
                  />
                  {searching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="relative"
                      data-testid="product-filter-button"
                      aria-label="Filter products"
                    >
                      <Filter className="h-4 w-4" />
                      {activeFilterCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                          {activeFilterCount}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-72 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">Filters</h4>
                      {activeFilterCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={clearFilters}
                          data-testid="product-filter-clear"
                        >
                          Clear all
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Status</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger data-testid="product-filter-status">
                          <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ALL}>All statuses</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="discontinued">Discontinued</SelectItem>
                          <SelectItem value="out_of_stock">Out of stock</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Stock level</Label>
                      <Select
                        value={stockFilter}
                        onValueChange={(value) => setStockFilter(value as StockFilter)}
                      >
                        <SelectTrigger data-testid="product-filter-stock">
                          <SelectValue placeholder="All stock levels" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All stock levels</SelectItem>
                          <SelectItem value="good">Good (above min)</SelectItem>
                          <SelectItem value="low">Low (at or below min)</SelectItem>
                          <SelectItem value="critical">Critical (≤ 50% of min)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Category</Label>
                      <Select
                        value={categoryFilter}
                        onValueChange={(value) => {
                          setCategoryFilter(value)
                          setSubcategoryFilter(ALL)
                        }}
                      >
                        <SelectTrigger data-testid="product-filter-category">
                          <SelectValue placeholder="All categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ALL}>All categories</SelectItem>
                          {categoryOptions.map((name) => (
                            <SelectItem key={name} value={name}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Supplier</Label>
                      <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                        <SelectTrigger data-testid="product-filter-supplier">
                          <SelectValue placeholder="All suppliers" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ALL}>All suppliers</SelectItem>
                          {supplierOptions.map((name) => (
                            <SelectItem key={name} value={name}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </PopoverContent>
                </Popover>
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
                  <TableHead>Reel</TableHead>
                  <TableHead>Cutting</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.data.map((product) => {
                  const stockInfo = getStockStatus(product.current_stock, product.min_stock_level)
                  const StockIcon = stockInfo.icon
                  
                  return (
                    <TableRow key={product.id} className="hover:bg-accent/50" data-testid="product-row" data-product-id={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Package className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-muted-foreground">SKU: {product.sku}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">{product.category_name}</div>
                          <div className="text-xs text-muted-foreground">{product.subcategory_name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <StockIcon className={`w-4 h-4 ${stockInfo.color}`} />
                          <div>
                            <div className={`font-medium text-sm ${stockInfo.color}`}>
                              {product.current_stock} {product.unit_of_measure}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Min: {product.min_stock_level} {product.unit_of_measure}
                            </div>
                            {product.reserved_stock > 0 && <div className="text-xs text-muted-foreground">
                              Reserved: {product.reserved_stock} {product.unit_of_measure}
                            </div>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">
                            Normal: {formatCurrency(product.selling_price)}
                          </div>
                          {product.wholesale_price !== undefined && product.wholesale_price !== null && (
                            <div className="text-xs text-muted-foreground">
                              Wholesale: {formatCurrency(product.wholesale_price)}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            Cost: {formatCurrency(product.cost_price)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {product.reel_size || '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {product.cutting_size || '—'}
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
                            <DropdownMenuItem onClick={() => router.push(`/inventory/products/${product.id}`)}>
                              View Details
                            </DropdownMenuItem>
                            {hasPermission(PERMISSIONS.PRODUCTS_UPDATE) && (
                              <DropdownMenuItem onClick={() => router.push(`/inventory/products/${product.id}/edit`)}>
                                Edit Product
                              </DropdownMenuItem>
                            )}
                            {hasPermission(PERMISSIONS.INVENTORY_ADJUST) && (
                              <DropdownMenuItem onClick={() => router.push(`/inventory/products/${product.id}/adjust-stock`)}>
                                Adjust Stock
                              </DropdownMenuItem>
                            )}
                            {hasPermission(PERMISSIONS.PRODUCTS_DELETE) && (
                              <DropdownMenuItem
                                className={product.status === "active" ? "text-destructive" : "text-success"}
                                onClick={() => handleToggleProductStatus(product.id)}
                              >
                                {product.status === "active" ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
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

      <AddProductForm 
        open={showAddForm} 
        onOpenChange={setShowAddForm}
        onProductAdded={async () => {
          // Refresh the products list, preserving the active search term
          try {
            const [productsResult, statsResult] = await Promise.all([
              ApiService.getProducts({
                limit: 100,
                ...(debouncedSearch ? { search: debouncedSearch } : {}),
              }),
              ApiService.getProductStats()
            ])

            setProducts(productsResult.products)
            setStats(statsResult)
          } catch (err) {
            console.error("Failed to refresh products:", err)
          }
        }}
      />
      </div>
    </PermissionGuard>
  )
}

// useSearchParams() requires a Suspense boundary in the App Router.
export default function Products() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    }>
      <ProductsContent />
    </Suspense>
  )
}

