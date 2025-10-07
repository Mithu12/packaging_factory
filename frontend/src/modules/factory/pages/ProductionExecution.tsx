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
} from "@/services/production-execution-api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function ProductionExecution() {
  const { formatDate } = useFormatting();
  const queryClient = useQueryClient();

  const [selectedRun, setSelectedRun] = useState<ProductionRun | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showRunDetails, setShowRunDetails] = useState(false);
  const [showDowntimeDialog, setShowDowntimeDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
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

  // API query parameters
  const queryParams: ProductionRunQueryParams = {
    search: searchTerm || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
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

  // Start production run mutation
  const startMutation = useMutation({
    mutationFn: (id: string) => ProductionExecutionApiService.startProductionRun(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productionExecutionQueryKeys.all });
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
      queryClient.invalidateQueries({ queryKey: productionExecutionQueryKeys.all });
      toast.success("Production run paused successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to pause production run");
    },
  });

  // Complete production run mutation
  const completeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CompleteProductionRunRequest }) =>
      ProductionExecutionApiService.completeProductionRun(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productionExecutionQueryKeys.all });
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
      queryClient.invalidateQueries({ queryKey: productionExecutionQueryKeys.all });
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

  const handleStartRun = (run: ProductionRun) => {
    startMutation.mutate(run.id);
  };

  const handlePauseRun = (run: ProductionRun) => {
    pauseMutation.mutate({ id: run.id });
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
      production_run_id: run.id,
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
              {statsLoading ? "..." : `${stats.total_downtime_hours.toFixed(1)}h`}
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
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      No production runs found
                    </TableCell>
                  </TableRow>
                ) : (
                  productionRuns.map((run) => {
                    const StatusIcon = getStatusIcon(run.status);
                    const progress = run.target_quantity > 0 
                      ? (run.produced_quantity / run.target_quantity) * 100 
                      : 0;
                    
                    return (
                      <TableRow key={run.id}>
                        <TableCell className="font-medium">{run.run_number}</TableCell>
                        <TableCell>{run.work_order_number}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{run.production_line_name || "N/A"}</div>
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
                              {run.produced_quantity} / {run.target_quantity}
                            </div>
                            <Progress value={progress} className="h-2" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">
                            {run.efficiency_percentage.toFixed(1)}%
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">
                            {run.quality_percentage.toFixed(1)}%
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
                    id: selectedRun.id,
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
                  <SelectItem value="machine_breakdown">Machine Breakdown</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="material_shortage">Material Shortage</SelectItem>
                  <SelectItem value="quality_issue">Quality Issue</SelectItem>
                  <SelectItem value="setup_changeover">Setup/Changeover</SelectItem>
                  <SelectItem value="operator_absence">Operator Absence</SelectItem>
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
                    production_run_id: selectedRun.id,
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
