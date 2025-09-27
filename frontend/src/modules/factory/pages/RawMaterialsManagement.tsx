import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Package,
  DollarSign,
  Clock,
  TrendingUp,
  BarChart3,
  Download,
  Upload,
  MoreHorizontal,
  AlertTriangle,
  CheckCircle,
  Users,
  MapPin,
  Calendar,
} from "lucide-react";
import { useFormatting } from "@/hooks/useFormatting";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";

interface RawMaterial {
  id: string;
  name: string;
  sku: string;
  description: string;
  category: string;
  unitOfMeasure: string;
  costPrice: number;
  supplierId: string;
  supplierName: string;
  leadTimeDays: number;
  minimumStock: number;
  currentStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  isActive: boolean;
  specifications: string;
  notes: string;
  createdBy: string;
  createdDate: string;
  updatedBy?: string;
  updatedDate?: string;
}

interface RawMaterialStats {
  totalMaterials: number;
  activeMaterials: number;
  lowStockMaterials: number;
  outOfStockMaterials: number;
  totalValue: number;
  averageLeadTime: number;
  supplierCount: number;
  categoryCount: number;
}

interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
}

export default function RawMaterialsManagement() {
  const navigate = useNavigate();
  const { formatCurrency, formatDate, formatNumber } = useFormatting();
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stats, setStats] = useState<RawMaterialStats>({
    totalMaterials: 0,
    activeMaterials: 0,
    lowStockMaterials: 0,
    outOfStockMaterials: 0,
    totalValue: 0,
    averageLeadTime: 0,
    supplierCount: 0,
    categoryCount: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(
    null
  );
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(
    null
  );

  const [newMaterial, setNewMaterial] = useState({
    name: "",
    sku: "",
    description: "",
    category: "",
    unitOfMeasure: "",
    costPrice: 0,
    supplierId: "",
    leadTimeDays: 0,
    minimumStock: 0,
    reorderPoint: 0,
    reorderQuantity: 0,
    specifications: "",
    notes: "",
  });

  useEffect(() => {
    // Mock suppliers data
    setSuppliers([
      {
        id: "SUP-001",
        name: "Steel Works Ltd",
        contactPerson: "John Smith",
        email: "john@steelworks.com",
        phone: "+1-555-0101",
        address: "123 Steel Street, Industrial City",
        isActive: true,
      },
      {
        id: "SUP-002",
        name: "ElectroTech Inc",
        contactPerson: "Sarah Johnson",
        email: "sarah@electrotech.com",
        phone: "+1-555-0102",
        address: "456 Electronics Ave, Tech Park",
        isActive: true,
      },
      {
        id: "SUP-003",
        name: "Aluminum Co",
        contactPerson: "Mike Wilson",
        email: "mike@aluminum.com",
        phone: "+1-555-0103",
        address: "789 Metal Road, Factory District",
        isActive: true,
      },
      {
        id: "SUP-004",
        name: "Plastic Molds Inc",
        contactPerson: "Lisa Brown",
        email: "lisa@plasticmolds.com",
        phone: "+1-555-0104",
        address: "456 Plastic Lane, Molding Zone",
        isActive: true,
      },
    ]);

    // Mock materials data
    setMaterials([
      {
        id: "MAT-001",
        name: "Steel Frame",
        sku: "SF-001",
        description: "High-grade steel frame for structural components",
        category: "Metal",
        unitOfMeasure: "pcs",
        costPrice: 25.0,
        supplierId: "SUP-001",
        supplierName: "Steel Works Ltd",
        leadTimeDays: 7,
        minimumStock: 50,
        currentStock: 75,
        reorderPoint: 20,
        reorderQuantity: 100,
        isActive: true,
        specifications: "Grade A steel, 2mm thickness",
        notes: "Critical component for production",
        createdBy: "Admin",
        createdDate: "2024-01-15",
      },
      {
        id: "MAT-002",
        name: "Electronic Module",
        sku: "EM-001",
        description: "Advanced electronic control module",
        category: "Electronics",
        unitOfMeasure: "pcs",
        costPrice: 45.0,
        supplierId: "SUP-002",
        supplierName: "ElectroTech Inc",
        leadTimeDays: 14,
        minimumStock: 25,
        currentStock: 15,
        reorderPoint: 10,
        reorderQuantity: 50,
        isActive: true,
        specifications: "12V DC, 2A rating",
        notes: "Requires special handling",
        createdBy: "Admin",
        createdDate: "2024-01-20",
      },
      {
        id: "MAT-003",
        name: "Aluminum Frame",
        sku: "AF-001",
        description: "Lightweight aluminum frame component",
        category: "Metal",
        unitOfMeasure: "pcs",
        costPrice: 15.0,
        supplierId: "SUP-003",
        supplierName: "Aluminum Co",
        leadTimeDays: 5,
        minimumStock: 100,
        currentStock: 120,
        reorderPoint: 30,
        reorderQuantity: 150,
        isActive: true,
        specifications: "6061-T6 aluminum alloy",
        notes: "Good stock levels",
        createdBy: "Admin",
        createdDate: "2024-01-25",
      },
      {
        id: "MAT-004",
        name: "Plastic Housing",
        sku: "PH-001",
        description: "Injection molded plastic housing",
        category: "Plastic",
        unitOfMeasure: "pcs",
        costPrice: 8.5,
        supplierId: "SUP-004",
        supplierName: "Plastic Molds Inc",
        leadTimeDays: 10,
        minimumStock: 200,
        currentStock: 0,
        reorderPoint: 50,
        reorderQuantity: 300,
        isActive: true,
        specifications: "ABS plastic, black color",
        notes: "Out of stock - urgent reorder needed",
        createdBy: "Admin",
        createdDate: "2024-02-01",
      },
    ]);

    setStats({
      totalMaterials: 4,
      activeMaterials: 4,
      lowStockMaterials: 1,
      outOfStockMaterials: 1,
      totalValue: 125000,
      averageLeadTime: 9,
      supplierCount: 4,
      categoryCount: 3,
    });
  }, []);

  const handleAddMaterial = () => {
    setNewMaterial({
      name: "",
      sku: "",
      description: "",
      category: "",
      unitOfMeasure: "",
      costPrice: 0,
      supplierId: "",
      leadTimeDays: 0,
      minimumStock: 0,
      reorderPoint: 0,
      reorderQuantity: 0,
      specifications: "",
      notes: "",
    });
    setShowAddDialog(true);
  };

  const handleEditMaterial = (material: RawMaterial) => {
    setEditingMaterial(material);
    setNewMaterial({
      name: material.name,
      sku: material.sku,
      description: material.description,
      category: material.category,
      unitOfMeasure: material.unitOfMeasure,
      costPrice: material.costPrice,
      supplierId: material.supplierId,
      leadTimeDays: material.leadTimeDays,
      minimumStock: material.minimumStock,
      reorderPoint: material.reorderPoint,
      reorderQuantity: material.reorderQuantity,
      specifications: material.specifications,
      notes: material.notes,
    });
    setShowEditDialog(true);
  };

  const handleViewMaterial = (material: RawMaterial) => {
    setSelectedMaterial(material);
    setShowDetailsDialog(true);
  };

  const handleSaveMaterial = () => {
    if (editingMaterial) {
      // Update existing material
      setMaterials((prev) =>
        prev.map((mat) =>
          mat.id === editingMaterial.id
            ? {
                ...mat,
                ...newMaterial,
                updatedDate: new Date().toISOString().split("T")[0],
                updatedBy: "Current User",
              }
            : mat
        )
      );
      setShowEditDialog(false);
      setEditingMaterial(null);
    } else {
      // Add new material
      const newId = `MAT-${String(materials.length + 1).padStart(3, "0")}`;
      const supplier = suppliers.find((s) => s.id === newMaterial.supplierId);
      const newMat: RawMaterial = {
        id: newId,
        ...newMaterial,
        supplierName: supplier?.name || "",
        currentStock: 0,
        isActive: true,
        createdBy: "Current User",
        createdDate: new Date().toISOString().split("T")[0],
      };
      setMaterials((prev) => [...prev, newMat]);
      setShowAddDialog(false);
    }
  };

  const handleDeleteMaterial = (materialId: string) => {
    setMaterials((prev) => prev.filter((mat) => mat.id !== materialId));
  };

  const filteredMaterials = materials.filter((material) => {
    const matchesSearch =
      material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || material.category === categoryFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && material.isActive) ||
      (statusFilter === "inactive" && !material.isActive) ||
      (statusFilter === "low-stock" &&
        material.currentStock <= material.reorderPoint) ||
      (statusFilter === "out-of-stock" && material.currentStock === 0);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStockStatus = (material: RawMaterial) => {
    if (material.currentStock === 0) return "out-of-stock";
    if (material.currentStock <= material.reorderPoint) return "low-stock";
    return "in-stock";
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case "out-of-stock":
        return "bg-red-100 text-red-800";
      case "low-stock":
        return "bg-yellow-100 text-yellow-800";
      case "in-stock":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const categories = [
    "Metal",
    "Electronics",
    "Plastic",
    "Chemical",
    "Textile",
    "Other",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Raw Materials Management</h1>
          <p className="text-muted-foreground">
            Manage raw materials, components, and inventory
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button onClick={handleAddMaterial}>
            <Plus className="h-4 w-4 mr-2" />
            Add Material
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Materials
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMaterials}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeMaterials} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Status</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.outOfStockMaterials}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.lowStockMaterials} low stock
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalValue)}
            </div>
            <p className="text-xs text-muted-foreground">inventory value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Lead Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.averageLeadTime} days
            </div>
            <p className="text-xs text-muted-foreground">average delivery</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="materials" className="space-y-4">
        <TabsList>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="materials" className="space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search materials..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="low-stock">Low Stock</SelectItem>
                    <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Materials Table */}
          <Card>
            <CardHeader>
              <CardTitle>Raw Materials</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Lead Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaterials.map((material) => (
                    <TableRow key={material.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{material.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {material.sku}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{material.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {material.currentStock}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {material.unitOfMeasure}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Min: {material.minimumStock}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {formatCurrency(material.costPrice)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          per {material.unitOfMeasure}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{material.supplierName}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {material.leadTimeDays} days
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={getStockStatusColor(
                            getStockStatus(material)
                          )}
                        >
                          {getStockStatus(material)
                            .toUpperCase()
                            .replace("-", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleViewMaterial(material)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleEditMaterial(material)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteMaterial(material.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
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
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Material Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((category) => {
                  const categoryMaterials = materials.filter(
                    (m) => m.category === category
                  );
                  const categoryValue = categoryMaterials.reduce(
                    (sum, m) => sum + m.costPrice * m.currentStock,
                    0
                  );
                  return (
                    <Card key={category}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium">{category}</h3>
                          <Badge variant="outline">
                            {categoryMaterials.length}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(categoryValue)} total value
                        </div>
                        <div className="mt-2">
                          <Progress
                            value={
                              (categoryMaterials.length / materials.length) *
                              100
                            }
                            className="h-2"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Suppliers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suppliers.map((supplier) => {
                  const supplierMaterials = materials.filter(
                    (m) => m.supplierId === supplier.id
                  );
                  return (
                    <Card key={supplier.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium">{supplier.name}</h3>
                          <Badge variant="outline">
                            {supplierMaterials.length} materials
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">
                          {supplier.contactPerson} • {supplier.email}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {supplier.phone}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Material Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center"
                >
                  <BarChart3 className="h-6 w-6 mb-2" />
                  <span>Inventory Report</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center"
                >
                  <AlertTriangle className="h-6 w-6 mb-2" />
                  <span>Low Stock Report</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center"
                >
                  <TrendingUp className="h-6 w-6 mb-2" />
                  <span>Cost Analysis</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center"
                >
                  <Users className="h-6 w-6 mb-2" />
                  <span>Supplier Performance</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center"
                >
                  <Calendar className="h-6 w-6 mb-2" />
                  <span>Lead Time Report</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center"
                >
                  <Package className="h-6 w-6 mb-2" />
                  <span>Category Analysis</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Material Dialog */}
      <Dialog
        open={showAddDialog || showEditDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false);
            setShowEditDialog(false);
            setEditingMaterial(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingMaterial ? "Edit Material" : "Add New Material"}
            </DialogTitle>
            <DialogDescription>
              {editingMaterial
                ? "Update material information"
                : "Create a new raw material for your inventory"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Material Name</Label>
                <Input
                  id="name"
                  value={newMaterial.name}
                  onChange={(e) =>
                    setNewMaterial((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="Enter material name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={newMaterial.sku}
                  onChange={(e) =>
                    setNewMaterial((prev) => ({ ...prev, sku: e.target.value }))
                  }
                  placeholder="Enter SKU"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newMaterial.description}
                onChange={(e) =>
                  setNewMaterial((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Enter material description"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newMaterial.category}
                  onValueChange={(value) =>
                    setNewMaterial((prev) => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitOfMeasure">Unit of Measure</Label>
                <Select
                  value={newMaterial.unitOfMeasure}
                  onValueChange={(value) =>
                    setNewMaterial((prev) => ({
                      ...prev,
                      unitOfMeasure: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pcs">Pieces</SelectItem>
                    <SelectItem value="kg">Kilograms</SelectItem>
                    <SelectItem value="m">Meters</SelectItem>
                    <SelectItem value="l">Liters</SelectItem>
                    <SelectItem value="box">Boxes</SelectItem>
                    <SelectItem value="roll">Rolls</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="costPrice">Cost Price</Label>
                <Input
                  id="costPrice"
                  type="number"
                  step="0.01"
                  value={newMaterial.costPrice}
                  onChange={(e) =>
                    setNewMaterial((prev) => ({
                      ...prev,
                      costPrice: parseFloat(e.target.value) || 0,
                    }))
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier</Label>
                <Select
                  value={newMaterial.supplierId}
                  onValueChange={(value) =>
                    setNewMaterial((prev) => ({ ...prev, supplierId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="leadTimeDays">Lead Time (Days)</Label>
                <Input
                  id="leadTimeDays"
                  type="number"
                  value={newMaterial.leadTimeDays}
                  onChange={(e) =>
                    setNewMaterial((prev) => ({
                      ...prev,
                      leadTimeDays: parseInt(e.target.value) || 0,
                    }))
                  }
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minimumStock">Minimum Stock</Label>
                <Input
                  id="minimumStock"
                  type="number"
                  value={newMaterial.minimumStock}
                  onChange={(e) =>
                    setNewMaterial((prev) => ({
                      ...prev,
                      minimumStock: parseInt(e.target.value) || 0,
                    }))
                  }
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reorderPoint">Reorder Point</Label>
                <Input
                  id="reorderPoint"
                  type="number"
                  value={newMaterial.reorderPoint}
                  onChange={(e) =>
                    setNewMaterial((prev) => ({
                      ...prev,
                      reorderPoint: parseInt(e.target.value) || 0,
                    }))
                  }
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reorderQuantity">Reorder Quantity</Label>
                <Input
                  id="reorderQuantity"
                  type="number"
                  value={newMaterial.reorderQuantity}
                  onChange={(e) =>
                    setNewMaterial((prev) => ({
                      ...prev,
                      reorderQuantity: parseInt(e.target.value) || 0,
                    }))
                  }
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="specifications">Specifications</Label>
              <Textarea
                id="specifications"
                value={newMaterial.specifications}
                onChange={(e) =>
                  setNewMaterial((prev) => ({
                    ...prev,
                    specifications: e.target.value,
                  }))
                }
                placeholder="Enter material specifications"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={newMaterial.notes}
                onChange={(e) =>
                  setNewMaterial((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Enter additional notes"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddDialog(false);
                  setShowEditDialog(false);
                  setEditingMaterial(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveMaterial}>
                {editingMaterial ? "Update Material" : "Add Material"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Material Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Material Details</DialogTitle>
            <DialogDescription>
              Complete information about the selected material
            </DialogDescription>
          </DialogHeader>

          {selectedMaterial && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium">Material Name</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedMaterial.name}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium">SKU</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedMaterial.sku}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium">Category</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedMaterial.category}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium">Unit of Measure</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedMaterial.unitOfMeasure}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium">Cost Price</div>
                  <div className="text-sm text-muted-foreground">
                    {formatCurrency(selectedMaterial.costPrice)}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium">Current Stock</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedMaterial.currentStock}{" "}
                    {selectedMaterial.unitOfMeasure}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium">Supplier</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedMaterial.supplierName}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium">Lead Time</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedMaterial.leadTimeDays} days
                  </div>
                </div>
              </div>

              {selectedMaterial.description && (
                <div>
                  <div className="text-sm font-medium">Description</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedMaterial.description}
                  </div>
                </div>
              )}

              {selectedMaterial.specifications && (
                <div>
                  <div className="text-sm font-medium">Specifications</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedMaterial.specifications}
                  </div>
                </div>
              )}

              {selectedMaterial.notes && (
                <div>
                  <div className="text-sm font-medium">Notes</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedMaterial.notes}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
