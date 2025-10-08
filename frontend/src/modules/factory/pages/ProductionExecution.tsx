import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Play,
  Pause,
  Square,
  Clock,
  Package,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Activity,
  Target,
  Timer,
  Search,
  Filter,
  Plus,
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ProductionExecutionApiService,
  productionExecutionQueryKeys,
  type ProductionRun,
  type ProductionRunQueryParams,
  type CompleteProductionRunRequest,
  type RecordDowntimeRequest,
  type CreateProductionRunRequest,
} from "@/services/production-execution-api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  WorkOrdersApiService,
  type WorkOrder,
  type ProductionLine,
  type Operator,
} from "@/services/work-orders-api";

type CreateRunFormState = {
  work_order_id: string;
  production_line_id: string;
  operator_id: string;
  scheduled_start_time: string;
  target_quantity: string;
  planned_cycle_time_seconds: string;
  notes: string;
};

export default function ProductionExecution() {
  const { formatDate } = useFormatting();
  const queryClient = useQueryClient();

  const [selectedRun, setSelectedRun] = useState<ProductionRun | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showRunDetails, setShowRunDetails] = useState(false);
  const [showDowntimeDialog, setShowDowntimeDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showCreateRunDialog, setShowCreateRunDialog] = useState(false);
  const [downtimeData, setDowntimeData] = useState({
    downtime_reason: "",
    downtime_category: "machine_breakdown",
    start_time: new Date().toISOString(),
    end_time: "",
    is_planned: false,
    notes: "",
  });
  const [completeData, setCompleteData] = useState({
    produced_quantity: 0,
    good_quantity: 0,
    rejected_quantity: 0,
    notes: "",
  });
  const emptyCreateRunState: CreateRunFormState = {
    work_order_id: "",
    production_line_id: "",
    operator_id: "",
    scheduled_start_time: "",
    target_quantity: "",
    planned_cycle_time_seconds: "",
    notes: "",
  };
  const [createRunData, setCreateRunData] =
    useState<CreateRunFormState>(emptyCreateRunState);

  // API query parameters
  const queryParams: ProductionRunQueryParams = {
    search: searchTerm || "",
    status: statusFilter !== "all" ? statusFilter : "",
    sort_by: "actual_start_time",
    sort_order: "desc",
    page: 1,
    limit: 100,
  };

  // Fetch production runs
  const { data: runsData, isLoading: runsLoading } = useQuery({
    queryKey: productionExecutionQueryKeys.list(queryParams),
    queryFn: () => ProductionExecutionApiService.getProductionRuns(queryParams),
  });

  // Fetch production run statistics
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: productionExecutionQueryKeys.stats(),
    queryFn: () => ProductionExecutionApiService.getProductionRunStats(),
  });

  const { data: workOrdersData, isLoading: workOrdersLoading } = useQuery({
    queryKey: ["production-execution", "work-orders"],
    queryFn: () =>
      WorkOrdersApiService.getWorkOrders({ limit: 500, sort_by: "deadline" }),
  });

  const { data: productionLinesData, isLoading: productionLinesLoading } =
    useQuery({
      queryKey: ["production-execution", "production-lines"],
      queryFn: () => WorkOrdersApiService.getProductionLines(),
    });

  const { data: operatorsData, isLoading: operatorsLoading } = useQuery({
    queryKey: ["production-execution", "operators"],
    queryFn: () => WorkOrdersApiService.getOperators(),
  });

  const createRunMutation = useMutation({
    mutationFn: (data: CreateProductionRunRequest) =>
      ProductionExecutionApiService.createProductionRun(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: productionExecutionQueryKeys.all,
      });
      toast.success("Production run created successfully");
      setShowCreateRunDialog(false);
      setCreateRunData(emptyCreateRunState);
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to create production run");
    },
  });

  // Start production run mutation
  const startMutation = useMutation({
    mutationFn: (id: string) =>
      ProductionExecutionApiService.startProductionRun(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: productionExecutionQueryKeys.all,
      });
      toast.success("Production run started successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to start production run");
    },
  });

  // Pause production run mutation
  const pauseMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      ProductionExecutionApiService.pauseProductionRun(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: productionExecutionQueryKeys.all,
      });
      toast.success("Production run paused successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to pause production run");
    },
  });

  // Complete production run mutation
  const completeMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: CompleteProductionRunRequest;
    }) => ProductionExecutionApiService.completeProductionRun(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: productionExecutionQueryKeys.all,
      });
      toast.success("Production run completed successfully");
      setShowCompleteDialog(false);
      setCompleteData({
        produced_quantity: 0,
        good_quantity: 0,
        rejected_quantity: 0,
        notes: "",
      });
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to complete production run");
    },
  });

  // Record downtime mutation
  const downtimeMutation = useMutation({
    mutationFn: (data: RecordDowntimeRequest) =>
      ProductionExecutionApiService.recordDowntime(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: productionExecutionQueryKeys.all,
      });
      toast.success("Downtime recorded successfully");
      setShowDowntimeDialog(false);
      setDowntimeData({
        downtime_reason: "",
        downtime_category: "machine_breakdown",
        start_time: new Date().toISOString(),
        end_time: "",
        is_planned: false,
        notes: "",
      });
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to record downtime");
    },
  });

  const productionRuns = runsData?.production_runs || [];
  const stats = statsData || {
    total_runs: 0,
    active_runs: 0,
    completed_runs: 0,
    total_produced: 0,
    average_efficiency: 0,
    average_quality: 0,
    total_downtime_hours: 0,
  };
  const workOrders = workOrdersData?.work_orders || [];
  const productionLines = productionLinesData || [];
  const operators = operatorsData || [];
  const createDialogLoading =
    workOrdersLoading || productionLinesLoading || operatorsLoading;
  const parsedTargetQuantity = Number(createRunData.target_quantity);
  const canSubmitCreateRun =
    createRunData.work_order_id !== "" &&
    !Number.isNaN(parsedTargetQuantity) &&
    parsedTargetQuantity > 0;

  const handleOpenCreateRun = () => {
    setCreateRunData(emptyCreateRunState);
    setShowCreateRunDialog(true);
  };

  const handleCreateRunFieldChange = (
    field: keyof CreateRunFormState,
    value: string
  ) => {
    setCreateRunData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmitCreateRun = () => {
    if (!canSubmitCreateRun) {
      toast.error("Select a work order and enter a target quantity.");
      return;
    }

    const targetQuantity = Number(createRunData.target_quantity);
    const plannedCycle =
      createRunData.planned_cycle_time_seconds !== ""
        ? Number(createRunData.planned_cycle_time_seconds)
        : undefined;

    if (Number.isNaN(targetQuantity) || targetQuantity <= 0) {
      toast.error("Target quantity must be greater than zero.");
      return;
    }

    if (
      plannedCycle !== undefined &&
      (Number.isNaN(plannedCycle) || plannedCycle < 0)
    ) {
      toast.error("Planned cycle time must be a positive number.");
      return;
    }

    const payload: CreateProductionRunRequest = {
      work_order_id: createRunData.work_order_id,
      target_quantity: targetQuantity,
      production_line_id:
        createRunData.production_line_id !== ""
          ? createRunData.production_line_id
          : undefined,
      operator_id:
        createRunData.operator_id !== ""
          ? createRunData.operator_id
          : undefined,
      scheduled_start_time: createRunData.scheduled_start_time
        ? new Date(createRunData.scheduled_start_time).toISOString()
        : undefined,
      planned_cycle_time_seconds: plannedCycle,
      notes: createRunData.notes || undefined,
    };

    createRunMutation.mutate(payload);
  };

  const handleStartRun = (run: ProductionRun) => {
    startMutation.mutate(run.id.toString());
  };

  const handlePauseRun = (run: ProductionRun) => {
    pauseMutation.mutate({ id: run.id.toString() });
  };

  const handleCompleteRun = (run: ProductionRun) => {
    setSelectedRun(run);
    setCompleteData({
      produced_quantity: run.produced_quantity || 0,
      good_quantity: run.good_quantity || 0,
      rejected_quantity: run.rejected_quantity || 0,
      notes: "",
    });
    setShowCompleteDialog(true);
  };

  const handleRecordDowntime = (run: ProductionRun) => {
    setSelectedRun(run);
    setDowntimeData({
      ...downtimeData,
      production_run_id: run.id.toString(),
    });
    setShowDowntimeDialog(true);
  };

  const handleViewDetails = (run: ProductionRun) => {
    setSelectedRun(run);
    setShowRunDetails(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in_progress":
        return "bg-green-100 text-green-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "in_progress":
        return Play;
      case "paused":
        return Pause;
      case "completed":
        return CheckCircle;
      case "cancelled":
        return Square;
      default:
        return Clock;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Production Execution</h1>
          <p className="text-gray-500">Monitor and control production runs</p>
        </div>
        <Button
          onClick={handleOpenCreateRun}
          disabled={createRunMutation.isPending}
        >
          {createRunMutation.isPending ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Create Run
            </>
          )}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Runs
            </CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : stats.total_runs}
            </div>
            <p className="text-xs text-gray-500">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Active Runs
            </CardTitle>
            <Play className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : stats.active_runs}
            </div>
            <p className="text-xs text-gray-500">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Completed
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : stats.completed_runs}
            </div>
            <p className="text-xs text-gray-500">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Produced
            </CardTitle>
            <Package className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : stats.total_produced.toFixed(0)}
            </div>
            <p className="text-xs text-gray-500">Units</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Avg Efficiency
            </CardTitle>
            <Target className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : `${stats.average_efficiency.toFixed(1)}%`}
            </div>
            <p className="text-xs text-gray-500">Performance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Avg Quality
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : `${stats.average_quality.toFixed(1)}%`}
            </div>
            <p className="text-xs text-gray-500">Good rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Downtime
            </CardTitle>
            <Timer className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading
                ? "..."
                : `${stats.total_downtime_hours.toFixed(1)}h`}
            </div>
            <p className="text-xs text-gray-500">Accumulated</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search production runs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <SelectValue placeholder="Filter by status" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Run Number</TableHead>
                  <TableHead>Work Order</TableHead>
                  <TableHead>Line / Operator</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Efficiency</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runsLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      Loading production runs...
                    </TableCell>
                  </TableRow>
                ) : productionRuns.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center py-8 text-gray-500"
                    >
                      No production runs found
                    </TableCell>
                  </TableRow>
                ) : (
                  productionRuns.map((run) => {
                    const StatusIcon = getStatusIcon(run.status);
                    const targetQuantity = Number(run.target_quantity ?? 0);
                    const producedQuantity = Number(run.produced_quantity ?? 0);
                    const efficiency = Number(run.efficiency_percentage ?? 0);
                    const quality = Number(run.quality_percentage ?? 0);
                    const progress =
                      targetQuantity > 0
                        ? (producedQuantity / targetQuantity) * 100
                        : 0;
                    const normalizedProgress = Math.min(
                      Math.max(progress, 0),
                      100
                    );

                    return (
                      <TableRow key={run.id}>
                        <TableCell className="font-medium">
                          {run.run_number}
                        </TableCell>
                        <TableCell>{run.work_order_number}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {run.production_line_name || "N/A"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {run.operator_name || "Unassigned"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(run.status)}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {run.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">
                              {producedQuantity} / {targetQuantity}
                            </div>
                            <Progress value={normalizedProgress} className="h-2" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">
                            {efficiency.toFixed(1)}%
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">
                            {quality.toFixed(1)}%
                          </div>
                        </TableCell>
                        <TableCell>
                          {run.actual_start_time
                            ? formatDate(run.actual_start_time)
                            : "Not started"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {run.status === "scheduled" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStartRun(run)}
                                disabled={startMutation.isPending}
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                            {run.status === "in_progress" && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePauseRun(run)}
                                  disabled={pauseMutation.isPending}
                                >
                                  <Pause className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRecordDowntime(run)}
                                >
                                  <AlertTriangle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleCompleteRun(run)}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {run.status === "paused" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStartRun(run)}
                                disabled={startMutation.isPending}
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(run)}
                            >
                              Details
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Run Dialog */}
      <Dialog
        open={showCreateRunDialog}
        onOpenChange={(open) => {
          setShowCreateRunDialog(open);
          if (!open) {
            setCreateRunData(emptyCreateRunState);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Production Run</DialogTitle>
            <DialogDescription>
              Link a work order to a production line and target output.
            </DialogDescription>
          </DialogHeader>

          {createDialogLoading && (
            <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              Loading work orders, production lines, and operators...
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Work Order *</Label>
              <Select
                value={createRunData.work_order_id || undefined}
                onValueChange={(value) =>
                  handleCreateRunFieldChange("work_order_id", value)
                }
                disabled={workOrdersLoading || workOrders.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select work order" />
                </SelectTrigger>
                <SelectContent>
                  {workOrders.map((wo: WorkOrder) => (
                    <SelectItem key={wo.id} value={wo.id.toString()}>
                      {wo.work_order_number} • {wo.product_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {workOrders.length === 0 && !workOrdersLoading && (
                <p className="text-xs text-orange-600">
                  No work orders available. Create or release a work order
                  first.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Production Line</Label>
                <Select
                  value={createRunData.production_line_id || undefined}
                  onValueChange={(value) =>
                    handleCreateRunFieldChange("production_line_id", value)
                  }
                  disabled={
                    productionLinesLoading || productionLines.length === 0
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Assign production line (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {productionLines.map((line: ProductionLine) => (
                      <SelectItem key={line.id} value={line.id.toString()}>
                        {line.name} ({line.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Operator</Label>
                <Select
                  value={createRunData.operator_id || undefined}
                  onValueChange={(value) =>
                    handleCreateRunFieldChange("operator_id", value)
                  }
                  disabled={operatorsLoading || operators.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Assign operator (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {operators.map((operator: Operator) => (
                      <SelectItem
                        key={operator.id}
                        value={operator.id.toString()}
                      >
                        {operator.user_name || operator.employee_id} (
                        {operator.availability_status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="target_quantity">Target Quantity *</Label>
                <Input
                  id="target_quantity"
                  type="number"
                  min={1}
                  value={createRunData.target_quantity}
                  onChange={(e) =>
                    handleCreateRunFieldChange(
                      "target_quantity",
                      e.target.value
                    )
                  }
                  placeholder="Enter target output"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="planned_cycle_time">
                  Planned Cycle Time (seconds)
                </Label>
                <Input
                  id="planned_cycle_time"
                  type="number"
                  min={0}
                  value={createRunData.planned_cycle_time_seconds}
                  onChange={(e) =>
                    handleCreateRunFieldChange(
                      "planned_cycle_time_seconds",
                      e.target.value
                    )
                  }
                  placeholder="e.g. 45"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduled_start_time">
                  Scheduled Start Time
                </Label>
                <Input
                  id="scheduled_start_time"
                  type="datetime-local"
                  value={createRunData.scheduled_start_time}
                  onChange={(e) =>
                    handleCreateRunFieldChange(
                      "scheduled_start_time",
                      e.target.value
                    )
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-notes">Notes</Label>
              <Textarea
                id="create-notes"
                value={createRunData.notes}
                onChange={(e) =>
                  handleCreateRunFieldChange("notes", e.target.value)
                }
                placeholder="Additional instructions or context..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateRunDialog(false)}
              disabled={createRunMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitCreateRun}
              disabled={!canSubmitCreateRun || createRunMutation.isPending}
            >
              {createRunMutation.isPending ? "Creating..." : "Create Run"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Production Run</DialogTitle>
            <DialogDescription>
              Enter final production quantities
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="produced">Produced Quantity</Label>
              <Input
                id="produced"
                type="number"
                value={completeData.produced_quantity}
                onChange={(e) =>
                  setCompleteData({
                    ...completeData,
                    produced_quantity: Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="good">Good Quantity</Label>
              <Input
                id="good"
                type="number"
                value={completeData.good_quantity}
                onChange={(e) =>
                  setCompleteData({
                    ...completeData,
                    good_quantity: Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="rejected">Rejected Quantity</Label>
              <Input
                id="rejected"
                type="number"
                value={completeData.rejected_quantity}
                onChange={(e) =>
                  setCompleteData({
                    ...completeData,
                    rejected_quantity: Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="complete-notes">Notes</Label>
              <Textarea
                id="complete-notes"
                value={completeData.notes}
                onChange={(e) =>
                  setCompleteData({ ...completeData, notes: e.target.value })
                }
                placeholder="Add completion notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCompleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedRun) {
                  completeMutation.mutate({
                    id: selectedRun.id.toString(),
                    data: completeData,
                  });
                }
              }}
              disabled={completeMutation.isPending}
            >
              Complete Run
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Downtime Dialog */}
      <Dialog open={showDowntimeDialog} onOpenChange={setShowDowntimeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Downtime</DialogTitle>
            <DialogDescription>
              Track production downtime period
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Downtime Reason</Label>
              <Input
                id="reason"
                value={downtimeData.downtime_reason}
                onChange={(e) =>
                  setDowntimeData({
                    ...downtimeData,
                    downtime_reason: e.target.value,
                  })
                }
                placeholder="Enter reason for downtime"
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={downtimeData.downtime_category}
                onValueChange={(value) =>
                  setDowntimeData({ ...downtimeData, downtime_category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="machine_breakdown">
                    Machine Breakdown
                  </SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="material_shortage">
                    Material Shortage
                  </SelectItem>
                  <SelectItem value="quality_issue">Quality Issue</SelectItem>
                  <SelectItem value="setup_changeover">
                    Setup/Changeover
                  </SelectItem>
                  <SelectItem value="operator_absence">
                    Operator Absence
                  </SelectItem>
                  <SelectItem value="power_outage">Power Outage</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="downtime-notes">Notes</Label>
              <Textarea
                id="downtime-notes"
                value={downtimeData.notes}
                onChange={(e) =>
                  setDowntimeData({ ...downtimeData, notes: e.target.value })
                }
                placeholder="Additional details..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDowntimeDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedRun) {
                  downtimeMutation.mutate({
                    ...downtimeData,
                    production_run_id: selectedRun.id.toString(),
                  } as RecordDowntimeRequest);
                }
              }}
              disabled={downtimeMutation.isPending}
            >
              Record Downtime
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
