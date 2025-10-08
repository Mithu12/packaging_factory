import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  Package,
  Clock,
  CheckCircle,
  X,
  Search,
  Filter,
  TrendingUp,
  DollarSign,
  BarChart3,
  Eye,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  WastageApiService,
  wastageQueryKeys,
  type MaterialWastage,
  type MaterialWastageQueryParams,
} from "@/services/wastage-api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function WastageTracking() {
  const { formatCurrency, formatDate } = useFormatting();
  const queryClient = useQueryClient();
  
  const [selectedRecord, setSelectedRecord] = useState<MaterialWastage | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");

  // API query parameters
  const queryParams: MaterialWastageQueryParams = {
    search: searchTerm || undefined,
    status: statusFilter !== "all" ? statusFilter : "",
    sort_by: "recorded_date",
    sort_order: "desc",
    page: 1,
    limit: 100,
  };

  // Fetch wastage records
  const { data: wastageData, isLoading: wastageLoading } = useQuery({
    queryKey: wastageQueryKeys.list(queryParams),
    queryFn: () => WastageApiService.getWastageRecords(queryParams),
  });

  // Fetch wastage statistics
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: wastageQueryKeys.stats(),
    queryFn: () => WastageApiService.getWastageStats(),
  });

  // Approve wastage mutation
  const approveMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      WastageApiService.approveWastage(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wastageQueryKeys.all });
      toast.success("Wastage approved successfully");
      setShowDetailsDialog(false);
      setApprovalNotes("");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to approve wastage");
    },
  });

  // Reject wastage mutation
  const rejectMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      WastageApiService.rejectWastage(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wastageQueryKeys.all });
      toast.success("Wastage rejected successfully");
      setShowDetailsDialog(false);
      setApprovalNotes("");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to reject wastage");
    },
  });

  const wastageRecords = wastageData?.wastage_records || [];
  const stats = statsData || {
    total_wastage: 0,
    pending_approvals: 0,
    total_cost: 0,
    average_wastage: 0,
    top_reason: "N/A",
    monthly_trend: 0,
  };

  const handleApprove = () => {
    if (!selectedRecord) return;
    approveMutation.mutate({
      id: selectedRecord.id,
      notes: approvalNotes || undefined,
    });
  };

  const handleReject = () => {
    if (!selectedRecord) return;
    rejectMutation.mutate({
      id: selectedRecord.id,
      notes: approvalNotes || undefined,
    });
  };

  const handleViewRecord = (record: MaterialWastage) => {
    setSelectedRecord(record);
    setShowDetailsDialog(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return CheckCircle;
      case "rejected":
        return X;
      case "pending":
        return Clock;
      default:
        return AlertTriangle;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Wastage Tracking</h1>
          <p className="text-gray-500">
            Monitor and manage material wastage
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Wastage
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : stats.total_wastage.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500">Units</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Pending Approvals
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : stats.pending_approvals}
            </div>
            <p className="text-xs text-gray-500">Records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Cost
            </CardTitle>
            <DollarSign className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : formatCurrency(stats.total_cost)}
            </div>
            <p className="text-xs text-gray-500">This Month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Average Wastage
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : stats.average_wastage.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500">Per Record</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Top Reason
            </CardTitle>
            <Package className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">
              {statsLoading ? "..." : stats.top_reason}
            </div>
            <p className="text-xs text-gray-500">Most common</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Monthly Trend
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : `${stats.monthly_trend > 0 ? "+" : ""}${stats.monthly_trend}%`}
            </div>
            <p className="text-xs text-gray-500">vs Last Month</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search wastage records..."
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
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Work Order</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Recorded By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wastageLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      Loading wastage records...
                    </TableCell>
                  </TableRow>
                ) : wastageRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      No wastage records found
                    </TableCell>
                  </TableRow>
                ) : (
                  wastageRecords.map((record) => {
                    const StatusIcon = getStatusIcon(record.status);
                    return (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {record.work_order_number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{record.material_name}</div>
                            <div className="text-sm text-gray-500">
                              {record.material_sku}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {record.quantity} {record.unit_of_measure}
                        </TableCell>
                        <TableCell>{record.wastage_reason}</TableCell>
                        <TableCell>{formatCurrency(record.cost)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(record.status)}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{record.recorded_by_name || `User #${record.recorded_by}`}</TableCell>
                        <TableCell>{formatDate(record.recorded_date)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewRecord(record)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
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

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Wastage Record Details</DialogTitle>
            <DialogDescription>
              Review and manage wastage record
            </DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Work Order</Label>
                  <div className="font-medium">{selectedRecord.work_order_number}</div>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge className={getStatusColor(selectedRecord.status)}>
                    {selectedRecord.status}
                  </Badge>
                </div>
                <div>
                  <Label>Material</Label>
                  <div className="font-medium">{selectedRecord.material_name}</div>
                  <div className="text-sm text-gray-500">{selectedRecord.material_sku}</div>
                </div>
                <div>
                  <Label>Quantity</Label>
                  <div className="font-medium">
                    {selectedRecord.quantity} {selectedRecord.unit_of_measure}
                  </div>
                </div>
                <div>
                  <Label>Cost</Label>
                  <div className="font-medium">{formatCurrency(selectedRecord.cost)}</div>
                </div>
                <div>
                  <Label>Recorded By</Label>
                  <div className="font-medium">
                    {selectedRecord.recorded_by_name || `User #${selectedRecord.recorded_by}`}
                  </div>
                </div>
                <div>
                  <Label>Recorded Date</Label>
                  <div className="font-medium">{formatDate(selectedRecord.recorded_date)}</div>
                </div>
                {selectedRecord.batch_number && (
                  <div>
                    <Label>Batch Number</Label>
                    <div className="font-medium">{selectedRecord.batch_number}</div>
                  </div>
                )}
              </div>
              <div>
                <Label>Wastage Reason</Label>
                <div className="font-medium">{selectedRecord.wastage_reason}</div>
              </div>
              {selectedRecord.notes && (
                <div>
                  <Label>Notes</Label>
                  <div className="text-sm">{selectedRecord.notes}</div>
                </div>
              )}
              {selectedRecord.status === "pending" && (
                <div>
                  <Label htmlFor="approval-notes">Approval Notes (Optional)</Label>
                  <Textarea
                    id="approval-notes"
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    placeholder="Add notes for approval/rejection..."
                    rows={3}
                  />
                </div>
              )}
              {selectedRecord.approved_by && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Approved/Rejected By</Label>
                    <div className="font-medium">
                      {selectedRecord.approved_by_name || `User #${selectedRecord.approved_by}`}
                    </div>
                  </div>
                  <div>
                    <Label>Decision Date</Label>
                    <div className="font-medium">
                      {selectedRecord.approved_date && formatDate(selectedRecord.approved_date)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {selectedRecord?.status === "pending" && (
              <>
                <Button
                  variant="outline"
                  onClick={handleReject}
                  disabled={rejectMutation.isPending}
                >
                  <X className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={approveMutation.isPending}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
                </Button>
              </>
            )}
            <Button variant="secondary" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
