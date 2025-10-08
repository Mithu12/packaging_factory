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

  const isCreateDialogLoading =
    requirementsLoading || productionLinesLoading || operatorsLoading;

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

  const workOrderOptions = useMemo(() => {
    const unique = new Map<string, string>();
    requirements.forEach((req) => {
      if (!unique.has(req.work_order_id)) {
        unique.set(req.work_order_id, req.work_order_id);
      }
    });
    return Array.from(unique.values());
  }, [requirements]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Material Consumption</h1>
          <p className="text-muted-foreground">
            Record material usage and capture wastage for production.
          </p>
        </div>
        <Button
          onClick={handleOpenCreateDialog}
          disabled={createConsumptionMutation.isPending}
        >
          {createConsumptionMutation.isPending ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Logging...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Log Consumption
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Records
            </CardTitle>
            <ClipboardList className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : stats.total_consumptions}
            </div>
            <p className="text-xs text-muted-foreground">Logged entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Materials Consumed
            </CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : stats.total_materials_consumed}
            </div>
            <p className="text-xs text-muted-foreground">Unique items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Wastage
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : formatNumber(stats.total_wastage)}
            </div>
            <p className="text-xs text-muted-foreground">Units</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. Wastage %
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading
                ? "..."
                : `${stats.average_wastage_percentage.toFixed(2)}%`}
            </div>
            <p className="text-xs text-muted-foreground">Against consumption</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Consumption Value
            </CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading
                ? "..."
                : formatNumber(stats.total_consumption_value)}
            </div>
            <p className="text-xs text-muted-foreground">Cost basis</p>
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
                    <SelectItem key={wo} value={wo}>
                      Work Order {wo}
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
              />
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
    </div>
  );
}
