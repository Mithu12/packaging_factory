import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";

interface Origin {
  id: string;
  name: string;
  description?: string;
  status: "active" | "inactive";
  createdAt: string;
  productCount: number;
}

export default function Origins() {
  const [origins, setOrigins] = useState<Origin[]>([
    {
      id: "1",
      name: "China",
      description: "Products manufactured in China",
      status: "active",
      createdAt: "2024-01-15",
      productCount: 67,
    },
    {
      id: "2",
      name: "Germany",
      description: "High-quality German manufactured products",
      status: "active",
      createdAt: "2024-01-20",
      productCount: 23,
    },
    {
      id: "3",
      name: "Local Factory",
      description: "Locally manufactured products",
      status: "active",
      createdAt: "2024-02-01",
      productCount: 15,
    },
    {
      id: "4",
      name: "Japan",
      description: "Japanese manufactured products",
      status: "active",
      createdAt: "2024-02-10",
      productCount: 8,
    },
    {
      id: "5",
      name: "USA",
      description: "Products manufactured in the United States",
      status: "inactive",
      createdAt: "2024-02-15",
      productCount: 0,
    },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingOrigin, setEditingOrigin] = useState<Origin | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "active" as "active" | "inactive",
  });

  const filteredOrigins = origins.filter(
    (origin) =>
      origin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      origin.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const handleDelete = (originId: string) => {
    const origin = origins.find((o) => o.id === originId);
    if (origin && origin.productCount > 0) {
      toast.error("Cannot delete origin", {
        description:
          "This origin is used by existing products. Please remove products first.",
      });
      return;
    }

    setOrigins(origins.filter((o) => o.id !== originId));
    toast.success("Origin deleted", {
      description: "Origin has been removed successfully.",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Validation Error", {
        description: "Origin name is required.",
      });
      return;
    }

    if (editingOrigin) {
      setOrigins(
        origins.map((origin) =>
          origin.id === editingOrigin.id ? { ...origin, ...formData } : origin
        )
      );
      toast.success("Origin updated", {
        description: "Origin information has been updated successfully.",
      });
    } else {
      const newOrigin: Origin = {
        id: Date.now().toString(),
        ...formData,
        createdAt: new Date().toISOString().split("T")[0],
        productCount: 0,
      };
      setOrigins([...origins, newOrigin]);
      toast.success("Origin added", {
        description: "New origin has been added successfully.",
      });
    }

    setShowAddDialog(false);
    setFormData({ name: "", description: "", status: "active" });
    setEditingOrigin(null);
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
            <div className="text-2xl font-bold">{origins.length}</div>
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
            <div className="text-2xl font-bold">
              {origins.filter((o) => o.status === "active").length}
            </div>
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
            <div className="text-2xl font-bold">
              {origins.filter((o) => o.status === "inactive").length}
            </div>
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
            <div className="text-2xl font-bold">
              {origins.reduce((acc, origin) => acc + origin.productCount, 0)}
            </div>
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
              {filteredOrigins.map((origin) => (
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
                  <TableCell>{origin.productCount}</TableCell>
                  <TableCell>{origin.createdAt}</TableCell>
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
              ))}
            </TableBody>
          </Table>
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
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingOrigin ? "Update Origin" : "Add Origin"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
