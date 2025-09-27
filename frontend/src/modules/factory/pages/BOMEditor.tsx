import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Save,
  Plus,
  Trash2,
  ArrowLeft,
  Package,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Filter,
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
import { BillOfMaterials, BOMComponent, CreateBOMRequest } from "../types/bom";

interface Product {
  id: string;
  name: string;
  sku: string;
  unitOfMeasure: string;
  costPrice: number;
  supplierId?: string;
  supplierName?: string;
  leadTimeDays: number;
}

export default function BOMEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatCurrency, formatDate } = useFormatting();
  const isEditing = Boolean(id);

  const [bom, setBOM] = useState<BillOfMaterials | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [components, setComponents] = useState<BOMComponent[]>([]);
  const [showAddComponent, setShowAddComponent] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newComponent, setNewComponent] = useState({
    componentId: "",
    quantityRequired: 1,
    unitOfMeasure: "",
    isOptional: false,
    scrapFactor: 0,
    specifications: "",
    notes: "",
  });

  const [formData, setFormData] = useState({
    parentProductId: "",
    parentProductName: "",
    parentProductSku: "",
    version: "1.0",
    effectiveDate: new Date().toISOString().split("T")[0],
    isActive: true,
    notes: "",
  });

  useEffect(() => {
    // Mock products data
    setProducts([
      {
        id: "MAT-001",
        name: "Steel Frame",
        sku: "SF-001",
        unitOfMeasure: "pcs",
        costPrice: 25.0,
        supplierId: "SUP-001",
        supplierName: "Steel Works Ltd",
        leadTimeDays: 7,
      },
      {
        id: "MAT-002",
        name: "Electronic Module",
        sku: "EM-001",
        unitOfMeasure: "pcs",
        costPrice: 45.0,
        supplierId: "SUP-002",
        supplierName: "ElectroTech Inc",
        leadTimeDays: 14,
      },
      {
        id: "MAT-003",
        name: "Aluminum Frame",
        sku: "AF-001",
        unitOfMeasure: "pcs",
        costPrice: 15.0,
        supplierId: "SUP-003",
        supplierName: "Aluminum Co",
        leadTimeDays: 5,
      },
      {
        id: "MAT-004",
        name: "Plastic Housing",
        sku: "PH-001",
        unitOfMeasure: "pcs",
        costPrice: 8.5,
        supplierId: "SUP-004",
        supplierName: "Plastic Molds Inc",
        leadTimeDays: 10,
      },
    ]);

    if (isEditing && id) {
      // Load existing BOM data
      setBOM({
        id: id,
        parentProductId: "PROD-001",
        parentProductName: "Premium Widget A",
        parentProductSku: "PWA-001",
        version: "1.2",
        effectiveDate: "2024-03-01",
        isActive: true,
        components: [],
        totalCost: 0,
        createdBy: "John Smith",
        createdDate: "2024-02-15T10:30:00Z",
      });

      setFormData({
        parentProductId: "PROD-001",
        parentProductName: "Premium Widget A",
        parentProductSku: "PWA-001",
        version: "1.2",
        effectiveDate: "2024-03-01",
        isActive: true,
        notes: "Updated with new electronic module",
      });
    }
  }, [id, isEditing]);

  const handleAddComponent = () => {
    if (!selectedProduct) return;

    const component: BOMComponent = {
      id: `COMP-${Date.now()}`,
      componentId: selectedProduct.id,
      componentName: selectedProduct.name,
      componentSku: selectedProduct.sku,
      quantityRequired: newComponent.quantityRequired,
      unitOfMeasure: selectedProduct.unitOfMeasure,
      isOptional: newComponent.isOptional,
      scrapFactor: newComponent.scrapFactor,
      unitCost: selectedProduct.costPrice,
      totalCost: selectedProduct.costPrice * newComponent.quantityRequired,
      leadTimeDays: selectedProduct.leadTimeDays,
      supplierId: selectedProduct.supplierId,
      supplierName: selectedProduct.supplierName,
      specifications: newComponent.specifications,
      notes: newComponent.notes,
    };

    setComponents((prev) => [...prev, component]);
    setShowAddComponent(false);
    setNewComponent({
      componentId: "",
      quantityRequired: 1,
      unitOfMeasure: "",
      isOptional: false,
      scrapFactor: 0,
      specifications: "",
      notes: "",
    });
    setSelectedProduct(null);
  };

  const handleRemoveComponent = (componentId: string) => {
    setComponents((prev) => prev.filter((comp) => comp.id !== componentId));
  };

  const handleCancel = () => {
    navigate("/factory/bom");
  };

  const handleSave = () => {
    const totalCost = components.reduce((sum, comp) => sum + comp.totalCost, 0);

    const bomData: CreateBOMRequest = {
      parentProductId: formData.parentProductId,
      version: formData.version,
      effectiveDate: formData.effectiveDate,
      components: components.map((comp) => ({
        componentId: comp.componentId,
        quantityRequired: comp.quantityRequired,
        unitOfMeasure: comp.unitOfMeasure,
        isOptional: comp.isOptional,
        scrapFactor: comp.scrapFactor,
        specifications: comp.specifications,
        notes: comp.notes,
      })),
      notes: formData.notes,
    };

    console.log("Saving BOM:", bomData);
    // In real app, call API to save BOM
    navigate("/factory/bom");
  };

  const getTotalCost = () => {
    return components.reduce((sum, comp) => sum + comp.totalCost, 0);
  };

  const getComponentCount = () => {
    return components.length;
  };

  const getCriticalComponents = () => {
    return components.filter((comp) => !comp.isOptional).length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/factory/bom")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isEditing ? "Edit BOM" : "Create BOM"}
            </h1>
            <p className="text-muted-foreground">
              {isEditing
                ? "Modify bill of materials"
                : "Define product component structure"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Preview</Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save BOM
          </Button>
        </div>
      </div>

      {/* BOM Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Components</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getComponentCount()}</div>
            <p className="text-xs text-muted-foreground">
              {getCriticalComponents()} critical
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(getTotalCost())}
            </div>
            <p className="text-xs text-muted-foreground">material cost</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Max Lead Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {components.length > 0
                ? Math.max(...components.map((c) => c.leadTimeDays))
                : 0}{" "}
              days
            </div>
            <p className="text-xs text-muted-foreground">longest component</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suppliers</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                new Set(components.map((c) => c.supplierId).filter(Boolean))
                  .size
              }
            </div>
            <p className="text-xs text-muted-foreground">unique suppliers</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* BOM Details Form */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>BOM Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="parentProduct">Parent Product</Label>
                <Input
                  id="parentProduct"
                  value={formData.parentProductName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      parentProductName: e.target.value,
                    }))
                  }
                  placeholder="Select or enter product name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="version">Version</Label>
                <Input
                  id="version"
                  value={formData.version}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      version: e.target.value,
                    }))
                  }
                  placeholder="1.0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="effectiveDate">Effective Date</Label>
                <Input
                  id="effectiveDate"
                  type="date"
                  value={formData.effectiveDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      effectiveDate: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      isActive: checked as boolean,
                    }))
                  }
                />
                <Label htmlFor="isActive">Active BOM</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  placeholder="Additional notes about this BOM..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Components List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Components</CardTitle>
                <Button onClick={() => setShowAddComponent(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Component
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {components.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No Components Added
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Add components to define the bill of materials structure
                  </p>
                  <Button onClick={() => setShowAddComponent(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Component
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Component</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Total Cost</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {components.map((component) => (
                      <TableRow key={component.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {component.componentName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {component.componentSku}
                            </div>
                            {component.isOptional && (
                              <Badge variant="outline" className="mt-1">
                                Optional
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {component.quantityRequired}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {component.unitOfMeasure}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatCurrency(component.unitCost)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(component.totalCost)}
                        </TableCell>
                        <TableCell>
                          {component.supplierName || (
                            <span className="text-muted-foreground">
                              Not assigned
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveComponent(component.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Component Dialog */}
      <Dialog open={showAddComponent} onOpenChange={setShowAddComponent}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Component</DialogTitle>
            <DialogDescription>
              Select a component to add to the bill of materials
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="component">Component</Label>
              <div className="flex gap-2">
                <Select
                  value={selectedProduct?.id || ""}
                  onValueChange={(value) => {
                    const product = products.find((p) => p.id === value);
                    setSelectedProduct(product || null);
                    if (product) {
                      setNewComponent((prev) => ({
                        ...prev,
                        componentId: product.id,
                        unitOfMeasure: product.unitOfMeasure,
                      }));
                    }
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a component" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{product.name}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            {product.sku}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/factory/raw-materials")}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add New
                </Button>
              </div>
            </div>

            {selectedProduct && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity Required</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={newComponent.quantityRequired}
                    onChange={(e) =>
                      setNewComponent((prev) => ({
                        ...prev,
                        quantityRequired: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scrapFactor">Scrap Factor (%)</Label>
                  <Input
                    id="scrapFactor"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={newComponent.scrapFactor}
                    onChange={(e) =>
                      setNewComponent((prev) => ({
                        ...prev,
                        scrapFactor: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isOptional"
                checked={newComponent.isOptional}
                onCheckedChange={(checked) =>
                  setNewComponent((prev) => ({
                    ...prev,
                    isOptional: checked as boolean,
                  }))
                }
              />
              <Label htmlFor="isOptional">Optional Component</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="specifications">Specifications</Label>
              <Textarea
                id="specifications"
                value={newComponent.specifications}
                onChange={(e) =>
                  setNewComponent((prev) => ({
                    ...prev,
                    specifications: e.target.value,
                  }))
                }
                placeholder="Component specifications..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={newComponent.notes}
                onChange={(e) =>
                  setNewComponent((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                placeholder="Additional notes..."
                rows={2}
              />
            </div>

            {selectedProduct && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Component Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Unit Cost:</span>
                    <span className="ml-2 font-medium">
                      {formatCurrency(selectedProduct.costPrice)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Lead Time:</span>
                    <span className="ml-2 font-medium">
                      {selectedProduct.leadTimeDays} days
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Supplier:</span>
                    <span className="ml-2 font-medium">
                      {selectedProduct.supplierName || "Not assigned"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Cost:</span>
                    <span className="ml-2 font-medium">
                      {formatCurrency(
                        selectedProduct.costPrice *
                          newComponent.quantityRequired
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAddComponent(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAddComponent} disabled={!selectedProduct}>
                Add Component
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
