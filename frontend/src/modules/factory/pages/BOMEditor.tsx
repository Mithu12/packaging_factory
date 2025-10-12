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
  Loader2,
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
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  BillOfMaterials, 
  BOMComponent, 
  CreateBOMRequest, 
  UpdateBOMRequest,
  CreateBOMComponentRequest,
  UpdateBOMComponentRequest,
  BOMApiService, 
  bomQueryKeys 
} from "@/services/bom-api";
import { ProductApi, Product } from "@/services/api";

export default function BOMEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formatCurrency, formatDate } = useFormatting();
  const isEditing = Boolean(id);

  const [components, setComponents] = useState<BOMComponent[]>([]);
  const [showAddComponent, setShowAddComponent] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newComponent, setNewComponent] = useState({
    component_product_id: "",
    quantity_required: 1,
    unit_of_measure: "",
    is_optional: false,
    scrap_factor: 0,
    specifications: "",
    notes: "",
  });

  const [formData, setFormData] = useState({
    parent_product_id: "",
    parent_product_name: "",
    parent_product_sku: "",
    version: "1.0",
    effective_date: new Date().toISOString().split("T")[0],
    is_active: true,
    notes: "",
  });

  // Fetch products for component selection
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => ProductApi.getProducts({ limit: 100 }),
  });

  // Fetch existing BOM data if editing
  const { data: existingBOM, isLoading: bomLoading } = useQuery({
    queryKey: bomQueryKeys.detail(id || ''),
    queryFn: () => BOMApiService.getBOMById(id!),
    enabled: isEditing && !!id,
  });

  // Create BOM mutation
  const createBOMMutation = useMutation({
    mutationFn: (data: CreateBOMRequest) => BOMApiService.createBOM(data),
    onSuccess: (data) => {
      toast.success("BOM created successfully");
      queryClient.invalidateQueries({ queryKey: bomQueryKeys.lists() });
      navigate("/factory/bom");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create BOM");
    },
  });

  // Update BOM mutation
  const updateBOMMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBOMRequest }) => 
      BOMApiService.updateBOM(id, data),
    onSuccess: (data) => {
      toast.success("BOM updated successfully");
      queryClient.invalidateQueries({ queryKey: bomQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: bomQueryKeys.detail(id!) });
      navigate("/factory/bom");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update BOM");
    },
  });

  // Initialize form data when editing
  useEffect(() => {
    if (isEditing && existingBOM) {
      setFormData({
        parent_product_id: existingBOM.parent_product_id,
        parent_product_name: existingBOM.parent_product_name || "",
        parent_product_sku: existingBOM.parent_product_sku || "",
        version: existingBOM.version,
        effective_date: existingBOM.effective_date.split('T')[0],
        is_active: existingBOM.is_active,
        notes: existingBOM.notes || "",
      });
      setComponents(existingBOM.components || []);
    }
  }, [isEditing, existingBOM]);

  const products = productsData?.products || [];

  const handleAddComponent = () => {
    if (!selectedProduct) return;

    const component: BOMComponent = {
      id: `COMP-${Date.now()}`,
      bom_id: id || "",
      component_product_id: selectedProduct.id.toString(),
      component_product_name: selectedProduct.name,
      component_product_sku: selectedProduct.sku,
      quantity_required: newComponent.quantity_required,
      unit_of_measure: selectedProduct.unit_of_measure,
      is_optional: newComponent.is_optional,
      scrap_factor: newComponent.scrap_factor,
      unit_cost: selectedProduct.cost_price,
      total_cost: selectedProduct.cost_price * newComponent.quantity_required,
      lead_time_days: 0, // Default value since Product doesn't have this field
      supplier_id: selectedProduct.supplier_id?.toString(),
      supplier_name: undefined, // Will be populated by backend
      specifications: newComponent.specifications,
      notes: newComponent.notes,
      created_at: new Date().toISOString(),
    };

    setComponents((prev) => [...prev, component]);
    setShowAddComponent(false);
    setNewComponent({
      component_product_id: "",
      quantity_required: 1,
      unit_of_measure: "",
      is_optional: false,
      scrap_factor: 0,
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

  const handleSave = async () => {
    if (!formData.parent_product_id) {
      toast.error("Please select a parent product");
      return;
    }

    if (components.length === 0) {
      toast.error("Please add at least one component");
      return;
    }

    if (isEditing && id) {
      // Update existing BOM
      const updateData: UpdateBOMRequest = {
        version: formData.version,
        effective_date: formData.effective_date,
        is_active: formData.is_active,
        notes: formData.notes,
        components: components.map((comp): UpdateBOMComponentRequest => ({
          id: comp.id.startsWith('COMP-') ? undefined : comp.id, // Only include ID for existing components
          component_product_id: comp.component_product_id,
          quantity_required: comp.quantity_required,
          unit_of_measure: comp.unit_of_measure,
          is_optional: comp.is_optional,
          scrap_factor: comp.scrap_factor,
          specifications: comp.specifications,
          notes: comp.notes,
        })),
      };

      updateBOMMutation.mutate({ id, data: updateData });
    } else {
      // Create new BOM
      const createData: CreateBOMRequest = {
        parent_product_id: formData.parent_product_id,
        version: formData.version,
        effective_date: formData.effective_date,
        components: components.map((comp): CreateBOMComponentRequest => ({
          component_product_id: comp.component_product_id,
          quantity_required: comp.quantity_required,
          unit_of_measure: comp.unit_of_measure,
          is_optional: comp.is_optional,
          scrap_factor: comp.scrap_factor,
          specifications: comp.specifications,
          notes: comp.notes,
        })),
        notes: formData.notes,
      };

      createBOMMutation.mutate(createData);
    }
  };

  const getTotalCost = () => {
    return components.reduce((sum, comp) => sum + comp.total_cost, 0);
  };

  const getComponentCount = () => {
    return components.length;
  };

  const getCriticalComponents = () => {
    return components.filter((comp) => !comp.is_optional).length;
  };

  const isLoading = bomLoading || productsLoading;
  const isSaving = createBOMMutation.isPending || updateBOMMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="bom-editor-loading">
        <Loader2 className="h-8 w-8 animate-spin" data-testid="loading-spinner" />
        <span className="ml-2" data-testid="loading-text">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="bom-editor-container">
      {/* Header */}
      <div className="flex items-center justify-between" data-testid="bom-editor-header">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/factory/bom")}
            data-testid="back-button"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold" data-testid="bom-editor-title">
              {isEditing ? "Edit BOM" : "Create BOM"}
            </h1>
            <p className="text-muted-foreground" data-testid="bom-editor-subtitle">
              {isEditing
                ? "Modify bill of materials"
                : "Define product component structure"}
            </p>
          </div>
        </div>
        <div className="flex gap-2" data-testid="bom-editor-actions">
          <Button variant="outline" data-testid="preview-button">Preview</Button>
          <Button onClick={handleSave} disabled={isSaving} data-testid="save-bom-button">
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isSaving ? "Saving..." : "Save BOM"}
          </Button>
        </div>
      </div>

      {/* BOM Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" data-testid="bom-summary-stats">
        <Card data-testid="components-stat-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium" data-testid="components-stat-title">Components</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" data-testid="components-stat-icon" />
          </CardHeader>
          <CardContent data-testid="components-stat-content">
            <div className="text-2xl font-bold" data-testid="components-count">{getComponentCount()}</div>
            <p className="text-xs text-muted-foreground" data-testid="critical-components-count">
              {getCriticalComponents()} critical
            </p>
          </CardContent>
        </Card>

        <Card data-testid="total-cost-stat-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium" data-testid="total-cost-stat-title">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" data-testid="total-cost-stat-icon" />
          </CardHeader>
          <CardContent data-testid="total-cost-stat-content">
            <div className="text-2xl font-bold" data-testid="total-cost-value">
              {formatCurrency(getTotalCost())}
            </div>
            <p className="text-xs text-muted-foreground" data-testid="total-cost-label">material cost</p>
          </CardContent>
        </Card>

        <Card data-testid="max-lead-time-stat-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium" data-testid="max-lead-time-stat-title">Max Lead Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" data-testid="max-lead-time-stat-icon" />
          </CardHeader>
          <CardContent data-testid="max-lead-time-stat-content">
            <div className="text-2xl font-bold" data-testid="max-lead-time-value">
              {components.length > 0
                ? Math.max(...components.map((c) => c.lead_time_days))
                : 0}{" "}
              days
            </div>
            <p className="text-xs text-muted-foreground" data-testid="max-lead-time-label">longest component</p>
          </CardContent>
        </Card>

        <Card data-testid="suppliers-stat-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium" data-testid="suppliers-stat-title">Suppliers</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" data-testid="suppliers-stat-icon" />
          </CardHeader>
          <CardContent data-testid="suppliers-stat-content">
            <div className="text-2xl font-bold" data-testid="suppliers-count">
              {
                new Set(components.map((c) => c.supplier_id).filter(Boolean))
                  .size
              }
            </div>
            <p className="text-xs text-muted-foreground" data-testid="suppliers-label">unique suppliers</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" data-testid="bom-editor-grid">
        {/* BOM Details Form */}
        <div className="lg:col-span-1" data-testid="bom-details-section">
          <Card data-testid="bom-details-card">
            <CardHeader>
              <CardTitle data-testid="bom-details-title">BOM Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4" data-testid="bom-details-content">
              <div className="space-y-2" data-testid="parent-product-field">
                <Label htmlFor="parentProduct" data-testid="parent-product-label">Parent Product</Label>
                <Select
                  value={formData.parent_product_id}
                  onValueChange={(value) => {
                    const product = products.find((p) => p.id.toString() === value);
                    setFormData((prev) => ({
                      ...prev,
                      parent_product_id: value,
                      parent_product_name: product?.name || "",
                      parent_product_sku: product?.sku || "",
                    }));
                  }}
                  data-testid="parent-product-select"
                >
                  <SelectTrigger data-testid="parent-product-select-trigger">
                    <SelectValue placeholder="Select parent product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id.toString()}>
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
                  value={formData.effective_date}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      effective_date: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      is_active: checked as boolean,
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
                              {component.component_product_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {component.component_product_sku}
                            </div>
                            {component.is_optional && (
                              <Badge variant="outline" className="mt-1">
                                Optional
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {component.quantity_required}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {component.unit_of_measure}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatCurrency(component.unit_cost)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(component.total_cost)}
                        </TableCell>
                        <TableCell>
                          {component.supplier_name || (
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
                  value={selectedProduct?.id.toString() || ""}
                  onValueChange={(value) => {
                    const product = products.find((p) => p.id.toString() === value);
                    setSelectedProduct(product || null);
                    if (product) {
                      setNewComponent((prev) => ({
                        ...prev,
                        component_product_id: product.id.toString(),
                        unit_of_measure: product.unit_of_measure,
                      }));
                    }
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a component" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id.toString()}>
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
                    value={newComponent.quantity_required}
                    onChange={(e) =>
                      setNewComponent((prev) => ({
                        ...prev,
                        quantity_required: parseFloat(e.target.value) || 0,
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
                    value={newComponent.scrap_factor}
                    onChange={(e) =>
                      setNewComponent((prev) => ({
                        ...prev,
                        scrap_factor: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isOptional"
                checked={newComponent.is_optional}
                onCheckedChange={(checked) =>
                  setNewComponent((prev) => ({
                    ...prev,
                    is_optional: checked as boolean,
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
                      {formatCurrency(selectedProduct.cost_price)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Lead Time:</span>
                    <span className="ml-2 font-medium">
                      0 days
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Supplier:</span>
                    <span className="ml-2 font-medium">
                      Not assigned
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Cost:</span>
                    <span className="ml-2 font-medium">
                      {formatCurrency(
                        selectedProduct.cost_price *
                          newComponent.quantity_required
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
