import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataTablePagination } from "@/components/DataTablePagination";
import { useClientPagination } from "@/hooks/usePagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/sonner";
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Package,
  Loader2,
} from "lucide-react";
import { BrandApi, Brand as BackendBrand } from "@/services/brand-api";
import { useFormatting } from "@/hooks/useFormatting";

interface Brand {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  product_count: number;
}

export default function Brands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_active: true,
  });
  const { formatDate } = useFormatting();

  // Fetch brands from API
  const fetchBrands = async () => {
    try {
      setLoading(true);
      const response = await BrandApi.getAllBrands();
      setBrands(response);
    } catch (error: any) {
      console.error('Failed to fetch brands:', error);
      toast.error("Error", {
        description: error.message || "Failed to fetch brands. Please try again.",
      });
    
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const filteredBrands = brands.filter(
    (brand) =>
      brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      brand.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Use client-side pagination for filtered brands
  const brandsPagination = useClientPagination(filteredBrands, {
    initialPageSize: 10
  });

  const handleAdd = () => {
    setFormData({ name: "", description: "", is_active: true });
    setEditingBrand(null);
    setShowAddDialog(true);
  };

  const handleEdit = (brand: Brand) => {
    setFormData({
      name: brand.name,
      description: brand.description || "",
      is_active: brand.is_active,
    });
    setEditingBrand(brand);
    setShowAddDialog(true);
  };

  const handleDelete = async (brandId: number) => {
    try {
      const brand = brands.find((b) => b.id === brandId);
      if (brand && brand.product_count > 0) {
        toast.error("Cannot delete brand", {
          description:
            "This brand is used by existing products. Please remove products first.",
        });
        return;
      }

      await BrandApi.deleteBrand(brandId);
      setBrands(brands.filter((b) => b.id !== brandId));
      toast.success("Brand deleted", {
        description: "Brand has been removed successfully.",
      });
    } catch (error: any) {
      console.error('Failed to delete brand:', error);
      toast.error("Error", {
        description: error.message || "Failed to delete brand. Please try again.",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Validation Error", {
        description: "Brand name is required.",
      });
      return;
    }

    try {
      setSubmitting(true);

      if (editingBrand) {
        const updatedBrand = await BrandApi.updateBrand(editingBrand.id, {
          name: formData.name,
          description: formData.description,
          is_active: formData.is_active,
        });
        
        setBrands(
          brands.map((brand) =>
            brand.id === editingBrand.id ? updatedBrand : brand
          )
        );
        toast.success("Brand updated", {
          description: "Brand information has been updated successfully.",
        });
      } else {
        const newBrand = await BrandApi.createBrand({
          name: formData.name,
          description: formData.description,
          is_active: formData.is_active,
        });
        
        setBrands([...brands, newBrand]);
        toast.success("Brand added", {
          description: "New brand has been added successfully.",
        });
      }

      setShowAddDialog(false);
      setFormData({ name: "", description: "", is_active: true });
      setEditingBrand(null);
    } catch (error: any) {
      console.error('Failed to save brand:', error);
      toast.error("Error", {
        description: error.message || "Failed to save brand. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300";
      case "inactive":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Brand Management
          </h1>
          <p className="text-muted-foreground">
            Manage product brands and their information
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Brand
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Brands</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{brands.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Brands</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {brands.filter((b) => b.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Inactive Brands
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {brands.filter((b) => !b.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Products
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {brands.reduce((acc, brand) => acc + brand.product_count, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Brand List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search brands..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      Loading brands...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredBrands.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No brands found
                  </TableCell>
                </TableRow>
              ) : (
                brandsPagination.data.map((brand) => (
                <TableRow key={brand.id}>
                  <TableCell className="font-medium">{brand.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {brand.description}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(brand.is_active ? 'active' : 'inactive')}>
                      {brand.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>{brand.product_count}</TableCell>
                  <TableCell>{formatDate(brand.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(brand)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(brand.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {/* Pagination */}
          <div className="mt-4">
            <DataTablePagination
              currentPage={brandsPagination.currentPage}
              totalPages={brandsPagination.totalPages}
              pageSize={brandsPagination.pageSize}
              totalItems={brandsPagination.totalItems}
              onPageChange={brandsPagination.setPage}
              onPageSizeChange={brandsPagination.setPageSize}
            />
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBrand ? "Edit Brand" : "Add New Brand"}
            </DialogTitle>
            <DialogDescription>
              {editingBrand
                ? "Update brand information"
                : "Add a new brand to your catalog"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Brand Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter brand name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Enter brand description (optional)"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingBrand ? "Updating..." : "Adding..."}
                  </>
                ) : (
                  editingBrand ? "Update Brand" : "Add Brand"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
