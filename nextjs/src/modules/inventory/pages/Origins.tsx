"use client";

﻿import { useState, useEffect } from "react";
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
  MapPin,
  Loader2,
} from "lucide-react";
import { OriginApi, Origin, OriginStats } from "@/modules/inventory/services/origin-api";

// Remove the duplicate interface since we're importing it from the API service

export default function Origins() {
  const [origins, setOrigins] = useState<Origin[]>([]);
  const [stats, setStats] = useState<OriginStats>({
    total_origins: 0,
    active_origins: 0,
    inactive_origins: 0,
    total_products: 0,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingOrigin, setEditingOrigin] = useState<Origin | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "active" as "active" | "inactive",
  });

  // Filter origins based on search term
  const filteredOrigins = origins.filter(origin =>
    origin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    origin.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Use client-side pagination for filtered origins
  const originsPagination = useClientPagination(filteredOrigins, {
    initialPageSize: 10
  });

  // Load origins and stats on component mount
  useEffect(() => {
    loadOrigins();
    loadStats();
  }, []);

  const loadOrigins = async () => {
    try {
      setLoading(true);
      const data = await OriginApi.getAllOrigins();
      setOrigins(data);
    } catch (error) {
      console.error('Failed to load origins:', error);
      toast.error("Failed to load origins", {
        description: "Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await OriginApi.getOriginStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };


  const handleAdd = () => {
    setFormData({ name: "", description: "", status: "active" });
    setEditingOrigin(null);
    setShowAddDialog(true);
  };

  const handleEdit = (origin: Origin) => {
    setFormData({
      name: origin.name,
      description: origin.description || "",
      status: origin.status,
    });
    setEditingOrigin(origin);
    setShowAddDialog(true);
  };

  const handleDelete = async (originId: number) => {
    const origin = origins.find((o) => o.id === originId);
    if (origin && origin.product_count > 0) {
      toast.error("Cannot delete origin", {
        description:
          "This origin is used by existing products. Please remove products first.",
      });
      return;
    }

    try {
      await OriginApi.deleteOrigin(originId);
      setOrigins(origins.filter((o) => o.id !== originId));
      await loadStats(); // Refresh stats
      toast.success("Origin deleted", {
        description: "Origin has been removed successfully.",
      });
    } catch (error) {
      console.error('Failed to delete origin:', error);
      toast.error("Failed to delete origin", {
        description: "Please try again later.",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Validation Error", {
        description: "Origin name is required.",
      });
      return;
    }

    try {
      setSubmitting(true);
      
      if (editingOrigin) {
        const updatedOrigin = await OriginApi.updateOrigin(editingOrigin.id, formData);
        setOrigins(
          origins.map((origin) =>
            origin.id === editingOrigin.id ? updatedOrigin : origin
          )
        );
        toast.success("Origin updated", {
          description: "Origin information has been updated successfully.",
        });
      } else {
        const newOrigin = await OriginApi.createOrigin(formData);
        setOrigins([...origins, newOrigin]);
        toast.success("Origin added", {
          description: "New origin has been added successfully.",
        });
      }

      await loadStats(); // Refresh stats
      setShowAddDialog(false);
      setFormData({ name: "", description: "", status: "active" });
      setEditingOrigin(null);
    } catch (error) {
      console.error('Failed to save origin:', error);
      toast.error("Failed to save origin", {
        description: "Please try again later.",
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
            Origin Management
          </h1>
          <p className="text-muted-foreground">
            Manage product origins and manufacturing locations
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Origin
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Origins</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_origins}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Origins
            </CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active_origins}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Inactive Origins
            </CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inactive_origins}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Products
            </CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_products}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Origin List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search origins..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Origin Name</TableHead>
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
                      Loading origins...
                    </div>
                  </TableCell>
                </TableRow>
              ) : originsPagination.totalItems === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No origins found
                  </TableCell>
                </TableRow>
              ) : (
                originsPagination.data.map((origin) => (
                  <TableRow key={origin.id}>
                    <TableCell className="font-medium">{origin.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {origin.description}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(origin.status)}>
                        {origin.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{origin.product_count}</TableCell>
                    <TableCell>{new Date(origin.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(origin)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(origin.id)}
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
              currentPage={originsPagination.currentPage}
              totalPages={originsPagination.totalPages}
              pageSize={originsPagination.pageSize}
              totalItems={originsPagination.totalItems}
              onPageChange={originsPagination.setPage}
              onPageSizeChange={originsPagination.setPageSize}
            />
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingOrigin ? "Edit Origin" : "Add New Origin"}
            </DialogTitle>
            <DialogDescription>
              {editingOrigin
                ? "Update origin information"
                : "Add a new origin to your catalog"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Origin Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter origin name (e.g., China, Germany, Local Factory)"
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
                placeholder="Enter origin description (optional)"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddDialog(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingOrigin ? "Updating..." : "Adding..."}
                  </>
                ) : (
                  editingOrigin ? "Update Origin" : "Add Origin"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
