import { useState, useEffect } from "react";
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
  Plus,
  Search,
  Filter,
  TrendingUp,
  DollarSign,
  BarChart3,
  Eye,
  Edit,
  Trash2,
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

interface WastageRecord {
  id: string;
  workOrderId: string;
  product: string;
  quantity: number;
  wastageReason: string;
  cost: number;
  status: "pending" | "approved" | "rejected";
  recordedBy: string;
  recordedDate: string;
  approvedBy?: string;
  approvedDate?: string;
  notes?: string;
  category: "material" | "production" | "quality" | "handling";
}

interface WastageReason {
  id: string;
  name: string;
  category: string;
  description: string;
}

interface WastageStats {
  totalWastage: number;
  pendingApprovals: number;
  totalCost: number;
  averageWastage: number;
  topReason: string;
  monthlyTrend: number;
}

export default function WastageTracking() {
  const { formatCurrency, formatDate } = useFormatting();
  const [wastageRecords, setWastageRecords] = useState<WastageRecord[]>([]);
  const [wastageReasons, setWastageReasons] = useState<WastageReason[]>([]);
  const [stats, setStats] = useState<WastageStats>({
    totalWastage: 0,
    pendingApprovals: 0,
    totalCost: 0,
    averageWastage: 0,
    topReason: "",
    monthlyTrend: 0,
  });
  const [selectedRecord, setSelectedRecord] = useState<WastageRecord | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showWastageDialog, setShowWastageDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [newWastage, setNewWastage] = useState({
    workOrderId: "",
    product: "",
    quantity: 0,
    wastageReason: "",
    cost: 0,
    notes: "",
    category: "material",
  });

  useEffect(() => {
    // Mock data - in real app, fetch from API
    setWastageRecords([
      {
        id: "WASTE-001",
        workOrderId: "WO-001",
        product: "Premium Widget A",
        quantity: 25,
        wastageReason: "Material Defect",
        cost: 750,
        status: "pending",
        recordedBy: "John Doe",
        recordedDate: "2024-03-10T14:30:00Z",
        notes: "Material quality issue during production",
        category: "material",
      },
      {
        id: "WASTE-002",
        workOrderId: "WO-002",
        product: "Standard Widget B",
        quantity: 50,
        wastageReason: "Machine Malfunction",
        cost: 1000,
        status: "approved",
        recordedBy: "Jane Smith",
        recordedDate: "2024-03-09T10:15:00Z",
        approvedBy: "Mike Johnson",
        approvedDate: "2024-03-09T16:45:00Z",
        notes: "Machine breakdown caused material waste",
        category: "production",
      },
      {
        id: "WASTE-003",
        workOrderId: "WO-003",
        product: "Custom Widget C",
        quantity: 15,
        wastageReason: "Quality Rejection",
        cost: 450,
        status: "rejected",
        recordedBy: "Mike Johnson",
        recordedDate: "2024-03-08T09:20:00Z",
        notes: "Product did not meet quality standards",
        category: "quality",
      },
    ]);

    setWastageReasons([
      {
        id: "1",
        name: "Material Defect",
        category: "material",
        description: "Raw material quality issues",
      },
      {
        id: "2",
        name: "Machine Malfunction",
        category: "production",
        description: "Equipment breakdown during production",
      },
      {
        id: "3",
        name: "Quality Rejection",
        category: "quality",
        description: "Product failed quality inspection",
      },
      {
        id: "4",
        name: "Handling Damage",
        category: "handling",
        description: "Damage during material handling",
      },
      {
        id: "5",
        name: "Setup Waste",
        category: "production",
        description: "Waste during machine setup",
      },
    ]);

    setStats({
      totalWastage: 90,
      pendingApprovals: 1,
      totalCost: 2200,
      averageWastage: 30,
      topReason: "Material Defect",
      monthlyTrend: -5,
    });
  }, []);

  const filteredRecords = wastageRecords.filter((record) => {
    const matchesSearch =
      record.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.wastageReason.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "material":
        return "bg-blue-100 text-blue-800";
      case "production":
        return "bg-orange-100 text-orange-800";
      case "quality":
        return "bg-purple-100 text-purple-800";
      case "handling":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleViewRecord = (record: WastageRecord) => {
    setSelectedRecord(record);
    setShowDetailsDialog(true);
  };

  const handleApproveRecord = (recordId: string) => {
    setWastageRecords((prev) =>
      prev.map((record) =>
        record.id === recordId
          ? {
              ...record,
              status: "approved" as const,
              approvedBy: "Current User",
              approvedDate: new Date().toISOString(),
            }
          : record
      )
    );
  };

  const handleRejectRecord = (recordId: string) => {
    setWastageRecords((prev) =>
      prev.map((record) =>
        record.id === recordId
          ? {
              ...record,
              status: "rejected" as const,
              approvedBy: "Current User",
              approvedDate: new Date().toISOString(),
            }
          : record
      )
    );
  };

  const handleCreateWastage = () => {
    const newRecord: WastageRecord = {
      id: `WASTE-${Date.now()}`,
      workOrderId: newWastage.workOrderId,
      product: newWastage.product,
      quantity: newWastage.quantity,
      wastageReason: newWastage.wastageReason,
      cost: newWastage.cost,
      status: "pending",
      recordedBy: "Current User",
      recordedDate: new Date().toISOString(),
      notes: newWastage.notes,
      category: newWastage.category as any,
    };

    setWastageRecords((prev) => [newRecord, ...prev]);
    setShowWastageDialog(false);
    setNewWastage({
      workOrderId: "",
      product: "",
      quantity: 0,
      wastageReason: "",
      cost: 0,
      notes: "",
      category: "material",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Wastage Tracking</h1>
          <p className="text-muted-foreground">
            Record and manage production wastage
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button onClick={() => setShowWastageDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Record Wastage
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Wastage</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWastage}</div>
            <p className="text-xs text-muted-foreground">Units this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Approvals
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalCost)}
            </div>
            <p className="text-xs text-muted-foreground">
              Wastage cost this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Reason</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.topReason}</div>
            <p className="text-xs text-muted-foreground">Most common reason</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="all-records" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all-records">All Records</TabsTrigger>
          <TabsTrigger value="pending-approvals">Pending Approvals</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="all-records" className="space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search wastage records..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="approved">Approved</TabsTrigger>
                    <TabsTrigger value="rejected">Rejected</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardContent>
          </Card>

          {/* Wastage Records Table */}
          <Card>
            <CardHeader>
              <CardTitle>Wastage Records</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Record ID</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Recorded By</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.id}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{record.product}</div>
                          <div className="text-sm text-muted-foreground">
                            {record.workOrderId}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{record.quantity}</TableCell>
                      <TableCell>{record.wastageReason}</TableCell>
                      <TableCell>{formatCurrency(record.cost)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(record.status)}>
                          {record.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getCategoryColor(record.category)}>
                          {record.category.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{record.recordedBy}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(record.recordedDate)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewRecord(record)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {record.status === "pending" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApproveRecord(record.id)}
                                className="text-green-600 hover:text-green-700"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRejectRecord(record.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending-approvals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {wastageRecords
                  .filter((record) => record.status === "pending")
                  .map((record) => (
                    <Card key={record.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-medium">{record.product}</h3>
                            <p className="text-sm text-muted-foreground">
                              {record.id} • {record.workOrderId} •{" "}
                              {record.wastageReason}
                            </p>
                          </div>
                          <Badge className={getCategoryColor(record.category)}>
                            {record.category.toUpperCase()}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <Label className="text-sm font-medium">
                              Quantity
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              {record.quantity} units
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Cost</Label>
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(record.cost)}
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">
                              Recorded By
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              {record.recordedBy}
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Date</Label>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(record.recordedDate)}
                            </p>
                          </div>
                        </div>

                        {record.notes && (
                          <div className="mb-4">
                            <Label className="text-sm font-medium">Notes</Label>
                            <p className="text-sm text-muted-foreground">
                              {record.notes}
                            </p>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewRecord(record)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApproveRecord(record.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRejectRecord(record.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Wastage by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Material</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: "40%" }}
                        />
                      </div>
                      <span className="text-sm font-medium">40%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Production</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-orange-600 h-2 rounded-full"
                          style={{ width: "30%" }}
                        />
                      </div>
                      <span className="text-sm font-medium">30%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Quality</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: "20%" }}
                        />
                      </div>
                      <span className="text-sm font-medium">20%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Handling</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gray-600 h-2 rounded-full"
                          style={{ width: "10%" }}
                        />
                      </div>
                      <span className="text-sm font-medium">10%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">-5%</div>
                  <p className="text-sm text-muted-foreground">vs last month</p>
                  <div className="mt-4">
                    <Progress value={75} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-2">
                      Wastage reduction target: 25%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Record Wastage Dialog */}
      <Dialog open={showWastageDialog} onOpenChange={setShowWastageDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record Wastage</DialogTitle>
            <DialogDescription>
              Record production wastage for tracking and approval
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="work-order">Work Order ID</Label>
                <Input
                  id="work-order"
                  placeholder="WO-001"
                  value={newWastage.workOrderId}
                  onChange={(e) =>
                    setNewWastage((prev) => ({
                      ...prev,
                      workOrderId: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product">Product</Label>
                <Input
                  id="product"
                  placeholder="Product name"
                  value={newWastage.product}
                  onChange={(e) =>
                    setNewWastage((prev) => ({
                      ...prev,
                      product: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="0"
                  value={newWastage.quantity}
                  onChange={(e) =>
                    setNewWastage((prev) => ({
                      ...prev,
                      quantity: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost">Cost</Label>
                <Input
                  id="cost"
                  type="number"
                  placeholder="0.00"
                  value={newWastage.cost}
                  onChange={(e) =>
                    setNewWastage((prev) => ({
                      ...prev,
                      cost: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Wastage Reason</Label>
              <Select
                value={newWastage.wastageReason}
                onValueChange={(value) =>
                  setNewWastage((prev) => ({ ...prev, wastageReason: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {wastageReasons.map((reason) => (
                    <SelectItem key={reason.id} value={reason.name}>
                      {reason.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={newWastage.category}
                onValueChange={(value) =>
                  setNewWastage((prev) => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="material">Material</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="quality">Quality</SelectItem>
                  <SelectItem value="handling">Handling</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes about the wastage..."
                value={newWastage.notes}
                onChange={(e) =>
                  setNewWastage((prev) => ({ ...prev, notes: e.target.value }))
                }
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowWastageDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateWastage}>Record Wastage</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Wastage Record Details - {selectedRecord?.id}
            </DialogTitle>
            <DialogDescription>
              View detailed information about the wastage record
            </DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Product</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedRecord.product}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Work Order</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedRecord.workOrderId}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Quantity</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedRecord.quantity} units
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Cost</Label>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(selectedRecord.cost)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Reason</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedRecord.wastageReason}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Category</Label>
                  <Badge className={getCategoryColor(selectedRecord.category)}>
                    {selectedRecord.category.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge className={getStatusColor(selectedRecord.status)}>
                    {selectedRecord.status.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Recorded By</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedRecord.recordedBy}
                  </p>
                </div>
              </div>

              {selectedRecord.notes && (
                <div>
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedRecord.notes}
                  </p>
                </div>
              )}

              {selectedRecord.approvedBy && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Approved By</Label>
                    <p className="text-sm text-muted-foreground">
                      {selectedRecord.approvedBy}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Approved Date</Label>
                    <p className="text-sm text-muted-foreground">
                      {selectedRecord.approvedDate
                        ? formatDate(selectedRecord.approvedDate)
                        : "N/A"}
                    </p>
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
