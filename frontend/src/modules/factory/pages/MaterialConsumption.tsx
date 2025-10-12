import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MaterialConsumptionsApiService,
  materialConsumptionsQueryKeys,
  type MaterialConsumption,
  type MaterialConsumptionQueryParams,
  type CreateMaterialConsumptionRequest,
  type CreateBulkConsumptionRequest,
  type BulkConsumptionItem,
} from "@/services/material-consumptions-api";
import {
  BOMApiService,
  type WorkOrderMaterialRequirement,
} from "@/services/bom-api";
import {
  WorkOrdersApiService,
  type ProductionLine,
  type Operator,
} from "@/services/work-orders-api";
import { useFormatting } from "@/hooks/useFormatting";
import {
  Package,
  Clock,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Activity,
  TrendingUp,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";

type CreateConsumptionForm = {
  work_order_requirement_id: string;
  consumed_quantity: string;
  consumption_date: string;
  wastage_quantity: string;
  wastage_reason: string;
  production_line_id: string;
  operator_id: string;
  batch_number: string;
  notes: string;
};

export default function MaterialConsumptionPage() {
  const { formatDate, formatNumber } = useFormatting();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [workOrderFilter, setWorkOrderFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBulkCreateDialog, setShowBulkCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState<boolean>(false);
  const [selectedConsumption, setSelectedConsumption] =
    useState<MaterialConsumption | null>(null);
  const emptyForm: CreateConsumptionForm = {
    work_order_requirement_id: "",
    consumed_quantity: "",
    consumption_date: new Date().toISOString().slice(0, 16),
    wastage_quantity: "",
    wastage_reason: "",
    production_line_id: "",
    operator_id: "",
    batch_number: "",
    notes: "",
  };
  const [formState, setFormState] = useState<CreateConsumptionForm>(emptyForm);

  // Bulk consumption form state
  const emptyBulkForm: CreateBulkConsumptionRequest = {
    work_order_id: "",
    consumptions: [],
    production_line_id: "",
    operator_id: "",
    batch_number: "",
    notes: "",
  };
  const [bulkFormState, setBulkFormState] = useState<CreateBulkConsumptionRequest>(emptyBulkForm);

  const queryParams: MaterialConsumptionQueryParams = useMemo(
    () => ({
      search: searchTerm || undefined,
      work_order_id: workOrderFilter !== "all" ? workOrderFilter : undefined,
      sort_by: "consumption_date",
      sort_order: "desc",
      page: 1,
      limit: 100,
    }),
    [searchTerm, workOrderFilter]
  );

  const { data: consumptionsData, isLoading: consumptionsLoading } = useQuery({
    queryKey: materialConsumptionsQueryKeys.list(queryParams),
    queryFn: () => MaterialConsumptionsApiService.getConsumptions(queryParams),
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: materialConsumptionsQueryKeys.stats(),
    queryFn: () => MaterialConsumptionsApiService.getConsumptionStats(),
  });

  const { data: requirementsData, isLoading: requirementsLoading } = useQuery({
    queryKey: ["material-consumption", "requirements"],
    queryFn: () => BOMApiService.getMaterialRequirements({ limit: 500 }),
  });

  const { data: productionLinesData, isLoading: productionLinesLoading } =
    useQuery({
      queryKey: ["material-consumption", "production-lines"],
      queryFn: () => WorkOrdersApiService.getProductionLines(),
    });

  const { data: operatorsData, isLoading: operatorsLoading } = useQuery({
    queryKey: ["material-consumption", "operators"],
    queryFn: () => WorkOrdersApiService.getOperators(),
  });

  const { data: workOrdersData, isLoading: workOrdersLoading, error: workOrdersError } = useQuery({
    queryKey: ["material-consumption", "work-orders"],
    queryFn: () => WorkOrdersApiService.getWorkOrders({ limit: 200 }),
  });

  const createConsumptionMutation = useMutation({
    mutationFn: (payload: CreateMaterialConsumptionRequest) =>
      MaterialConsumptionsApiService.createConsumption(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: materialConsumptionsQueryKeys.all,
      });
      toast.success("Consumption recorded successfully");
      setShowCreateDialog(false);
      setFormState(emptyForm);
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to record consumption");
    },
  });

  const createBulkConsumptionMutation = useMutation({
    mutationFn: (payload: CreateBulkConsumptionRequest) =>
      MaterialConsumptionsApiService.createBulkConsumptions(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: materialConsumptionsQueryKeys.all,
      });
      toast.success(`Bulk consumption recorded successfully (${data.length} materials)`);
      setShowBulkCreateDialog(false);
      setBulkFormState(emptyBulkForm);
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to record bulk consumption");
    },
  });

  const consumptions = consumptionsData?.consumptions || [];
  const stats = statsData || {
    total_consumptions: 0,
    total_materials_consumed: 0,
    total_wastage: 0,
    average_wastage_percentage: 0,
    total_consumption_value: 0,
  };
  const requirements = requirementsData?.requirements || [];
  const productionLines = productionLinesData || [];
  const operators = operatorsData || [];
  const workOrders = workOrdersData?.work_orders || [];


  const isCreateDialogLoading =
    requirementsLoading || productionLinesLoading || operatorsLoading || workOrdersLoading;

  const parsedConsumedQuantity = Number(formState.consumed_quantity);
  const parsedWastageQuantity = Number(formState.wastage_quantity || "0");

  const canSubmit =
    formState.work_order_requirement_id !== "" &&
    formState.consumed_quantity !== "" &&
    !Number.isNaN(parsedConsumedQuantity) &&
    parsedConsumedQuantity > 0 &&
    !createConsumptionMutation.isPending;

  const handleOpenCreateDialog = () => {
    setFormState({
      ...emptyForm,
      consumption_date: new Date().toISOString().slice(0, 16),
    });
    setShowCreateDialog(true);
  };

  const handleSubmitConsumption = () => {
    if (!canSubmit) {
      toast.error("Provide requirement and positive consumed quantity.");
      return;
    }

    if (
      formState.wastage_quantity &&
      (Number.isNaN(parsedWastageQuantity) || parsedWastageQuantity < 0)
    ) {
      toast.error("Wastage quantity must be zero or greater.");
      return;
    }

    const payload: CreateMaterialConsumptionRequest = {
      work_order_id: "",
      work_order_requirement_id: formState.work_order_requirement_id,
      material_id: "", // backend derives from requirement, but schema expects? fallback from requirement selection
      consumed_quantity: parsedConsumedQuantity,
      consumption_date: new Date(formState.consumption_date).toISOString(),
      wastage_quantity:
        formState.wastage_quantity === "" ? undefined : parsedWastageQuantity,
      wastage_reason:
        formState.wastage_reason.trim() === ""
          ? undefined
          : formState.wastage_reason.trim(),
      production_line_id: formState.production_line_id || undefined,
      operator_id: formState.operator_id || undefined,
      batch_number:
        formState.batch_number.trim() === ""
          ? undefined
          : formState.batch_number.trim(),
      notes: formState.notes.trim() === "" ? undefined : formState.notes.trim(),
    };

    const requirement = requirements.find(
      (req) => req.id === formState.work_order_requirement_id
    );
    if (requirement) {
      payload.material_id = requirement.material_id?.toString();
      payload.work_order_id = requirement.work_order_id?.toString();
    }

    if (!payload.material_id || !payload.work_order_id) {
      toast.error("Selected requirement is missing material reference.");
      return;
    }

    createConsumptionMutation.mutate(payload);
  };

  const handleViewDetails = (consumption: MaterialConsumption) => {
    setSelectedConsumption(consumption);
    setShowDetailsDialog(true);
  };

  const handleOpenBulkCreateDialog = () => {
    setBulkFormState(emptyBulkForm);
    setShowBulkCreateDialog(true);
  };

  const handleBulkFormChange = (field: string, value: any) => {
    setBulkFormState((prev) => {
      const newState = { ...prev, [field]: value };

      // Auto-populate fields when work order is selected
      if (field === 'work_order_id' && value) {
        const selectedWorkOrder = workOrders.find(wo => wo.id === value);
        if (selectedWorkOrder) {
          // Auto-populate production line if available
          if (selectedWorkOrder.production_line_id && !prev.production_line_id) {
            newState.production_line_id = selectedWorkOrder.production_line_id;
          }

          // Auto-populate operator if only one operator is assigned
          if (selectedWorkOrder.assigned_operators && selectedWorkOrder.assigned_operators.length === 1 && !prev.operator_id) {
            newState.operator_id = selectedWorkOrder.assigned_operators[0].toString();
          }

          // Generate batch number based on work order if not set
          if (!prev.batch_number) {
            newState.batch_number = `WO-${selectedWorkOrder.work_order_number}-${new Date().toISOString().slice(0, 10)}`;
          }
        }
      }

      return newState;
    });
  };

  const handleAddBulkConsumptionItem = (material_id: string) => {
    const existingIndex = bulkFormState.consumptions.findIndex(
      (item) => item.material_id === material_id
    );

    if (existingIndex >= 0) {
      toast.warning("Material already added to consumption list");
      return;
    }

    const newItem: BulkConsumptionItem = {
      material_id,
      consumed_quantity: 0,
      wastage_quantity: 0,
    };

    setBulkFormState((prev) => ({
      ...prev,
      consumptions: [...prev.consumptions, newItem],
    }));
  };

  const handleUpdateBulkConsumptionItem = (
    material_id: string,
    field: keyof BulkConsumptionItem,
    value: number | string
  ) => {
    setBulkFormState((prev) => ({
      ...prev,
      consumptions: prev.consumptions.map((item) =>
        item.material_id === material_id
          ? { ...item, [field]: value }
          : item
      ),
    }));
  };

  const handleRemoveBulkConsumptionItem = (material_id: string) => {
    setBulkFormState((prev) => ({
      ...prev,
      consumptions: prev.consumptions.filter(
        (item) => item.material_id !== material_id
      ),
    }));
  };

  const handlePreFillFromBOM = () => {
    if (!bulkFormState.work_order_id) {
      toast.error("Please select a work order first");
      return;
    }

    // Get all requirements for the selected work order
    const workOrderRequirements = requirements.filter(
      (req) => req.work_order_id === bulkFormState.work_order_id
    );

    if (workOrderRequirements.length === 0) {
      toast.warning("No material requirements found for this work order");
      return;
    }

    // Clear existing consumptions and add all BOM materials
    const bomConsumptions: BulkConsumptionItem[] = workOrderRequirements.map((req) => ({
      material_id: req.material_id,
      consumed_quantity: req.required_quantity - req.consumed_quantity, // Remaining quantity to consume
      wastage_quantity: 0,
    }));

    setBulkFormState((prev) => ({
      ...prev,
      consumptions: bomConsumptions,
    }));

    toast.success(`Pre-filled ${bomConsumptions.length} materials from BOM`);
  };

  const handleConsumeAsPerBOM = () => {
    if (!bulkFormState.work_order_id) {
      toast.error("Please select a work order first");
      return;
    }

    // Get all requirements for the selected work order
    const workOrderRequirements = requirements.filter(
      (req) => req.work_order_id === bulkFormState.work_order_id
    );

    if (workOrderRequirements.length === 0) {
      toast.warning("No material requirements found for this work order");
      return;
    }

    // Set all materials to their required quantities (ignoring already consumed)
    const bomConsumptions: BulkConsumptionItem[] = workOrderRequirements.map((req) => ({
      material_id: req.material_id,
      consumed_quantity: req.required_quantity, // Full BOM quantity
      wastage_quantity: 0,
    }));

    setBulkFormState((prev) => ({
      ...prev,
      consumptions: bomConsumptions,
    }));

    toast.success(`Set all materials to BOM quantities (${bomConsumptions.length} materials)`);
  };

  const handleSubmitBulkConsumption = () => {
    if (!bulkFormState.work_order_id) {
      toast.error("Please select a work order");
      return;
    }

    if (bulkFormState.consumptions.length === 0) {
      toast.error("Please add at least one material to consume");
      return;
    }

    // Validate quantities
    const invalidItems = bulkFormState.consumptions.filter(
      (item) => item.consumed_quantity <= 0
    );

    if (invalidItems.length > 0) {
      toast.error("All materials must have a consumed quantity greater than 0");
      return;
    }

    createBulkConsumptionMutation.mutate(bulkFormState);
  };

  const workOrderOptions = useMemo(() => {
    return workOrders.filter(wo => wo.status === 'in_progress' || wo.status === 'released');
  }, [workOrders]);

  return (
    <div className="p-6 space-y-6" data-testid="material-consumption-container">
      <div className="flex items-center justify-between" data-testid="material-consumption-header">
        <div>
          <h1 className="text-3xl font-bold" data-testid="material-consumption-title">Material Consumption</h1>
          <p className="text-muted-foreground" data-testid="material-consumption-subtitle">
            Record material usage and capture wastage for production.
          </p>
        </div>
        <div className="flex gap-2" data-testid="material-consumption-actions">
          <Button
            onClick={handleOpenCreateDialog}
            disabled={createConsumptionMutation.isPending}
            variant="outline"
            data-testid="log-consumption-button"
          >
            {createConsumptionMutation.isPending ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" data-testid="logging-spinner" />
                Logging...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Log Consumption
              </>
            )}
          </Button>
          <Button
            onClick={handleOpenBulkCreateDialog}
            disabled={createBulkConsumptionMutation.isPending}
            data-testid="bulk-consumption-button"
          >
            {createBulkConsumptionMutation.isPending ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" data-testid="bulk-logging-spinner" />
                Bulk Logging...
              </>
            ) : (
              <>
                <Package className="h-4 w-4 mr-2" />
                Bulk Consumption
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4" data-testid="consumption-stats-grid">
        <Card data-testid="total-records-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground" data-testid="total-records-title">
              Total Records
            </CardTitle>
            <ClipboardList className="h-4 w-4 text-primary" data-testid="total-records-icon" />
          </CardHeader>
          <CardContent data-testid="total-records-content">
            <div className="text-2xl font-bold" data-testid="total-records-count">
              {statsLoading ? "..." : stats.total_consumptions}
            </div>
            <p className="text-xs text-muted-foreground" data-testid="total-records-label">Logged entries</p>
          </CardContent>
        </Card>

        <Card data-testid="materials-consumed-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground" data-testid="materials-consumed-title">
              Materials Consumed
            </CardTitle>
            <Package className="h-4 w-4 text-primary" data-testid="materials-consumed-icon" />
          </CardHeader>
          <CardContent data-testid="materials-consumed-content">
            <div className="text-2xl font-bold" data-testid="materials-consumed-count">
              {statsLoading ? "..." : stats.total_materials_consumed}
            </div>
            <p className="text-xs text-muted-foreground" data-testid="materials-consumed-label">Unique items</p>
          </CardContent>
        </Card>

        <Card data-testid="total-wastage-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground" data-testid="total-wastage-title">
              Total Wastage
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" data-testid="total-wastage-icon" />
          </CardHeader>
          <CardContent data-testid="total-wastage-content">
            <div className="text-2xl font-bold" data-testid="total-wastage-amount">
              {statsLoading ? "..." : formatNumber(stats.total_wastage)}
            </div>
            <p className="text-xs text-muted-foreground" data-testid="total-wastage-label">Units</p>
          </CardContent>
        </Card>

        <Card data-testid="avg-wastage-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground" data-testid="avg-wastage-title">
              Avg. Wastage %
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" data-testid="avg-wastage-icon" />
          </CardHeader>
          <CardContent data-testid="avg-wastage-content">
            <div className="text-2xl font-bold" data-testid="avg-wastage-percentage">
              {statsLoading
                ? "..."
                : `${stats.average_wastage_percentage.toFixed(2)}%`}
            </div>
            <p className="text-xs text-muted-foreground" data-testid="avg-wastage-label">Against consumption</p>
          </CardContent>
        </Card>

        <Card data-testid="consumption-value-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground" data-testid="consumption-value-title">
              Consumption Value
            </CardTitle>
            <Activity className="h-4 w-4 text-blue-500" data-testid="consumption-value-icon" />
          </CardHeader>
          <CardContent data-testid="consumption-value-content">
            <div className="text-2xl font-bold" data-testid="consumption-value-amount">
              {statsLoading
                ? "..."
                : formatNumber(stats.total_consumption_value)}
            </div>
            <p className="text-xs text-muted-foreground" data-testid="consumption-value-label">Cost basis</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by work order or material..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="w-full md:w-64">
              <Label className="sr-only" htmlFor="work-order-filter">
                Filter by Work Order
              </Label>
              <Select
                value={workOrderFilter}
                onValueChange={setWorkOrderFilter}
              >
                <SelectTrigger id="work-order-filter">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Filter by work order" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All work orders</SelectItem>
                  {workOrderOptions.map((wo) => (
                    <SelectItem key={wo.id} value={wo.id}>
                      {wo.work_order_number} - {wo.product_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Work Order</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Consumed</TableHead>
                  <TableHead>Wastage</TableHead>
                  <TableHead>Recorded By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consumptionsLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Loading consumptions...
                    </TableCell>
                  </TableRow>
                ) : consumptions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No consumption records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  consumptions.map((consumption) => (
                    <TableRow key={consumption.id}>
                      <TableCell className="font-medium">
                        {consumption.work_order_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {consumption.material_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {consumption.material_sku}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatNumber(consumption.consumed_quantity)}{" "}
                        {consumption.unit_of_measure}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            consumption.wastage_quantity > 0
                              ? "destructive"
                              : "outline"
                          }
                        >
                          {formatNumber(consumption.wastage_quantity)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {consumption.consumed_by_name ||
                          `User #${consumption.consumed_by}`}
                      </TableCell>
                      <TableCell>
                        {formatDate(consumption.consumption_date)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(consumption)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) {
            setFormState(emptyForm);
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Log Material Consumption</DialogTitle>
            <DialogDescription>
              Record consumed materials and any wastage generated.
            </DialogDescription>
          </DialogHeader>

          {isCreateDialogLoading && (
            <div className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              Loading work order requirements and resources...
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label>Work Order Requirement *</Label>
              <Select
                value={formState.work_order_requirement_id || undefined}
                onValueChange={(value) =>
                  setFormState((prev) => ({
                    ...prev,
                    work_order_requirement_id: value,
                  }))
                }
                disabled={requirementsLoading || requirements.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select requirement" />
                </SelectTrigger>
                <SelectContent>
                  {requirements.map((req) => (
                    <SelectItem key={req.id} value={req.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {req.material_name} ({req.material_sku})
                        </span>
                        <span className="text-xs text-muted-foreground">
                          WO: {req.work_order_id} • Required:{" "}
                          {formatNumber(req.required_quantity)}{" "}
                          {req.unit_of_measure} • Consumed:{" "}
                          {formatNumber(req.consumed_quantity)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="consumed_quantity">Consumed Quantity *</Label>
              <Input
                id="consumed_quantity"
                type="number"
                min={0}
                value={formState.consumed_quantity}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    consumed_quantity: e.target.value,
                  }))
                }
                placeholder="Enter consumed amount"
                className={
                  formState.work_order_requirement_id && formState.consumed_quantity
                    ? (() => {
                        const req = requirements.find(
                          (r) => r.id === formState.work_order_requirement_id
                        );
                        const bomRequired = req?.required_quantity || 0;
                        const consumed = parseFloat(formState.consumed_quantity) || 0;
                        const variance = consumed - bomRequired;
                        return variance > 0
                          ? "border-orange-500 focus:border-orange-500"
                          : variance < 0
                            ? "border-red-500 focus:border-red-500"
                            : "";
                      })()
                    : ""
                }
              />
              {formState.work_order_requirement_id && (
                <div className="text-sm text-muted-foreground">
                  {(() => {
                    const req = requirements.find(
                      (r) => r.id === formState.work_order_requirement_id
                    );
                    const bomRequired = req?.required_quantity || 0;
                    const consumed = parseFloat(formState.consumed_quantity) || 0;
                    const variance = consumed - bomRequired;
                    const variancePercentage = bomRequired > 0 ? (variance / bomRequired) * 100 : 0;

                    return (
                      <div className="flex items-center gap-2">
                        <span>BOM Required: {formatNumber(bomRequired)} {req?.unit_of_measure}</span>
                        {consumed > 0 && (
                          <>
                            <span>•</span>
                            <span className={`flex items-center gap-1 ${
                              variance > 0
                                ? "text-orange-600"
                                : variance < 0
                                  ? "text-red-600"
                                  : "text-green-600"
                            }`}>
                              {variance !== 0 && <AlertTriangle className="h-3 w-3" />}
                              Variance: {variance > 0 ? "+" : ""}{formatNumber(variancePercentage)}%
                            </span>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="consumption_date">Consumption Date *</Label>
              <Input
                id="consumption_date"
                type="datetime-local"
                value={formState.consumption_date}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    consumption_date: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wastage_quantity">Wastage Quantity</Label>
              <Input
                id="wastage_quantity"
                type="number"
                min={0}
                value={formState.wastage_quantity}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    wastage_quantity: e.target.value,
                  }))
                }
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wastage_reason">Wastage Reason</Label>
              <Input
                id="wastage_reason"
                value={formState.wastage_reason}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    wastage_reason: e.target.value,
                  }))
                }
                placeholder="Optional reason for wastage"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="production_line">Production Line</Label>
              <Select
                value={formState.production_line_id || undefined}
                onValueChange={(value) =>
                  setFormState((prev) => ({
                    ...prev,
                    production_line_id: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional production line" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Unassigned">Unassigned</SelectItem>
                  {productionLines.map((line: ProductionLine) => (
                    <SelectItem key={line.id} value={line.id.toString()}>
                      {line.name} ({line.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="operator">Operator</Label>
              <Select
                value={formState.operator_id || undefined}
                onValueChange={(value) =>
                  setFormState((prev) => ({
                    ...prev,
                    operator_id: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional operator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {operators.map((operator: Operator) => (
                    <SelectItem
                      key={operator.id}
                      value={operator.id.toString()}
                    >
                      {(operator.user_name || operator.employee_id) ??
                        "Operator"}{" "}
                      ({operator.availability_status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="batch_number">Batch Number</Label>
              <Input
                id="batch_number"
                value={formState.batch_number}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    batch_number: e.target.value,
                  }))
                }
                placeholder="Optional batch reference"
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={3}
                value={formState.notes}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                placeholder="Additional context..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitConsumption} disabled={!canSubmit}>
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showDetailsDialog}
        onOpenChange={(open) => setShowDetailsDialog(open)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Consumption Details</DialogTitle>
            <DialogDescription>
              Full record information for auditing.
            </DialogDescription>
          </DialogHeader>

          {selectedConsumption ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Work Order
                  </Label>
                  <div className="font-semibold">
                    {selectedConsumption.work_order_number}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Consumption Date
                  </Label>
                  <div className="font-semibold">
                    {formatDate(selectedConsumption.consumption_date)}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Material
                  </Label>
                  <div className="font-semibold">
                    {selectedConsumption.material_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selectedConsumption.material_sku}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Consumed Quantity
                  </Label>
                  <div className="font-semibold">
                    {formatNumber(selectedConsumption.consumed_quantity)}{" "}
                    {selectedConsumption.unit_of_measure}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Wastage Quantity
                  </Label>
                  <div className="font-semibold">
                    {formatNumber(selectedConsumption.wastage_quantity)}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Recorded By
                  </Label>
                  <div className="font-semibold">
                    {selectedConsumption.consumed_by_name ||
                      `User #${selectedConsumption.consumed_by}`}
                  </div>
                </div>
              </div>

              {selectedConsumption.wastage_reason && (
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Wastage Reason
                  </Label>
                  <div>{selectedConsumption.wastage_reason}</div>
                </div>
              )}

              {selectedConsumption.notes && (
                <div>
                  <Label className="text-xs text-muted-foreground">Notes</Label>
                  <div>{selectedConsumption.notes}</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Production Line
                  </Label>
                  <div>{selectedConsumption.production_line_id || "—"}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Operator
                  </Label>
                  <div>{selectedConsumption.operator_id || "—"}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-muted-foreground">
              No record selected.
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDetailsDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Consumption Dialog */}
      <Dialog open={showBulkCreateDialog} onOpenChange={setShowBulkCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Material Consumption</DialogTitle>
            <DialogDescription>
              Record consumption for multiple materials at once. Select a work order and add materials to consume.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Work Order Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bulk-work-order">Work Order</Label>
                <Select
                  value={bulkFormState.work_order_id}
                  onValueChange={(value) => handleBulkFormChange("work_order_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select work order" />
                  </SelectTrigger>
                  <SelectContent>
                    {workOrderOptions.map((wo) => (
                      <SelectItem key={wo.id} value={wo.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{wo.work_order_number}</span>
                          <span className="text-xs text-muted-foreground">
                            {wo.product_name} • Qty: {formatNumber(wo.quantity)} {wo.unit_of_measure}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bulk-production-line">Production Line (Optional)</Label>
                <Select
                  value={bulkFormState.production_line_id}
                  onValueChange={(value) => handleBulkFormChange("production_line_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select production line" />
                  </SelectTrigger>
                  <SelectContent>
                    {productionLines.map((line) => (
                      <SelectItem key={line.id} value={line.id}>
                        {line.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bulk-operator">Operator (Optional)</Label>
                <Select
                  value={bulkFormState.operator_id}
                  onValueChange={(value) => handleBulkFormChange("operator_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select operator" />
                  </SelectTrigger>
                  <SelectContent>
                    {operators.map((operator) => (
                      <SelectItem key={operator.id} value={operator.id}>
                        {operator.user_name || `Operator ${operator.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bulk-batch-number">Batch Number (Optional)</Label>
                <Input
                  id="bulk-batch-number"
                  value={bulkFormState.batch_number}
                  onChange={(e) => handleBulkFormChange("batch_number", e.target.value)}
                  placeholder="Enter batch number"
                />
              </div>
            </div>

            {/* Material Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Add Materials</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePreFillFromBOM}
                    disabled={!bulkFormState.work_order_id}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Pre-fill from BOM
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleConsumeAsPerBOM}
                    disabled={!bulkFormState.work_order_id}
                  >
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Consume as per BOM
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Select onValueChange={handleAddBulkConsumptionItem}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select material to add" />
                  </SelectTrigger>
                  <SelectContent>
                    {requirements
                      .filter((req) => req.work_order_id === bulkFormState.work_order_id)
                      .filter((req) => !bulkFormState.consumptions.some(c => c.material_id === req.material_id))
                      .map((req) => (
                        <SelectItem key={req.material_id} value={req.material_id}>
                          {req.material_name} ({req.material_sku})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Materials Table */}
            {bulkFormState.consumptions.length > 0 && (
              <div className="space-y-2">
                <Label>Materials to Consume</Label>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead className="w-28">BOM Required</TableHead>
                        <TableHead className="w-28">Consumed Qty</TableHead>
                        <TableHead className="w-28">Wastage Qty</TableHead>
                        <TableHead className="w-24">Variance</TableHead>
                        <TableHead className="w-32">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bulkFormState.consumptions.map((item) => {
                        const req = requirements.find(r => r.material_id === item.material_id);
                        const bomRequired = req?.required_quantity || 0;
                        const consumed = item.consumed_quantity || 0;
                        const variance = consumed - bomRequired;
                        const variancePercentage = bomRequired > 0 ? (variance / bomRequired) * 100 : 0;
                        const isOverConsumption = variance > 0;
                        const isUnderConsumption = variance < 0;

                        return (
                          <TableRow key={item.material_id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{req?.material_name}</div>
                                <div className="text-sm text-muted-foreground">{req?.material_sku}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {formatNumber(bomRequired)} {req?.unit_of_measure}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.consumed_quantity}
                                onChange={(e) => handleUpdateBulkConsumptionItem(
                                  item.material_id,
                                  "consumed_quantity",
                                  parseFloat(e.target.value) || 0
                                )}
                                className={`w-full ${isOverConsumption ? 'border-orange-500' : isUnderConsumption ? 'border-red-500' : ''}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.wastage_quantity || 0}
                                onChange={(e) => handleUpdateBulkConsumptionItem(
                                  item.material_id,
                                  "wastage_quantity",
                                  parseFloat(e.target.value) || 0
                                )}
                                className="w-full"
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {variance !== 0 && (
                                  <AlertTriangle
                                    className={`h-4 w-4 ${
                                      isOverConsumption ? 'text-orange-500' : 'text-red-500'
                                    }`}
                                  />
                                )}
                                <span
                                  className={`text-sm font-medium ${
                                    isOverConsumption
                                      ? 'text-orange-600'
                                      : isUnderConsumption
                                        ? 'text-red-600'
                                        : 'text-green-600'
                                  }`}
                                >
                                  {variance > 0 ? '+' : ''}{formatNumber(variancePercentage)}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveBulkConsumptionItem(item.material_id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                Remove
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="bulk-notes">Notes (Optional)</Label>
              <Textarea
                id="bulk-notes"
                value={bulkFormState.notes}
                onChange={(e) => handleBulkFormChange("notes", e.target.value)}
                placeholder="Add any notes for this bulk consumption"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBulkCreateDialog(false)}
              disabled={createBulkConsumptionMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitBulkConsumption}
              disabled={createBulkConsumptionMutation.isPending || bulkFormState.consumptions.length === 0}
            >
              {createBulkConsumptionMutation.isPending ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <Package className="h-4 w-4 mr-2" />
                  Record Bulk Consumption
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Consumption Details</DialogTitle>
            <DialogDescription>
              Detailed information about the material consumption record.
            </DialogDescription>
          </DialogHeader>

          {selectedConsumption && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Work Order</Label>
                  <p className="font-medium">{selectedConsumption.work_order_number}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Material</Label>
                  <p className="font-medium">{selectedConsumption.material_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedConsumption.material_sku}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Consumed Quantity</Label>
                  <p className="font-medium">{formatNumber(selectedConsumption.consumed_quantity)} {selectedConsumption.unit_of_measure}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Wastage Quantity</Label>
                  <p className="font-medium">{formatNumber(selectedConsumption.wastage_quantity)} {selectedConsumption.unit_of_measure}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Consumption Date</Label>
                  <p className="font-medium">{formatDate(selectedConsumption.consumption_date)}</p>
                </div>
              </div>

              {selectedConsumption.wastage_reason && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Wastage Reason</Label>
                  <p className="font-medium">{selectedConsumption.wastage_reason}</p>
                </div>
              )}

              {selectedConsumption.production_line_name && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Production Line</Label>
                  <p className="font-medium">{selectedConsumption.production_line_name}</p>
                </div>
              )}

              {selectedConsumption.batch_number && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Batch Number</Label>
                  <p className="font-medium">{selectedConsumption.batch_number}</p>
                </div>
              )}

              {selectedConsumption.notes && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Notes</Label>
                  <p className="font-medium">{selectedConsumption.notes}</p>
                </div>
              )}

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Recorded by: {selectedConsumption.consumed_by_name || `User ${selectedConsumption.consumed_by}`}</span>
                  <span>Created: {formatDate(selectedConsumption.created_at)}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
