import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Clock,
  Package,
  Users,
  Factory,
  Search,
  Filter,
  Plus,
  Edit,
  Eye,
  Play,
  Pause,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Target,
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
import { Checkbox } from "@/components/ui/checkbox";

interface WorkOrder {
  id: string;
  orderNumber: string;
  product: string;
  quantity: number;
  deadline: string;
  status:
    | "draft"
    | "planned"
    | "released"
    | "in_progress"
    | "completed"
    | "on_hold";
  priority: "low" | "medium" | "high" | "urgent";
  progress: number;
  estimatedHours: number;
  actualHours: number;
  productionLine: string;
  assignedOperators: string[];
  createdDate: string;
  startDate?: string;
  completionDate?: string;
  notes?: string;
}

interface ProductionLine {
  id: string;
  name: string;
  capacity: number;
  currentLoad: number;
  status: "available" | "busy" | "maintenance";
  operators: string[];
}

interface Operator {
  id: string;
  name: string;
  skill: "beginner" | "intermediate" | "expert";
  currentWorkOrder?: string;
  availability: "available" | "busy" | "off_duty";
}

export default function WorkOrderPlanning() {
  const { formatCurrency, formatDate } = useFormatting();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showPlanningDialog, setShowPlanningDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  useEffect(() => {
    // Mock data - in real app, fetch from API
    setWorkOrders([
      {
        id: "WO-001",
        orderNumber: "ORD-2024-001",
        product: "Premium Widget A",
        quantity: 500,
        deadline: "2024-03-20",
        status: "planned",
        priority: "high",
        progress: 0,
        estimatedHours: 40,
        actualHours: 0,
        productionLine: "Line 1",
        assignedOperators: ["John Doe", "Jane Smith"],
        createdDate: "2024-03-10",
        notes: "High priority order for key customer",
      },
      {
        id: "WO-002",
        orderNumber: "ORD-2024-002",
        product: "Standard Widget B",
        quantity: 1000,
        deadline: "2024-03-25",
        status: "draft",
        priority: "medium",
        progress: 0,
        estimatedHours: 60,
        actualHours: 0,
        productionLine: "",
        assignedOperators: [],
        createdDate: "2024-03-09",
      },
      {
        id: "WO-003",
        orderNumber: "ORD-2024-003",
        product: "Custom Widget C",
        quantity: 250,
        deadline: "2024-03-18",
        status: "in_progress",
        priority: "urgent",
        progress: 35,
        estimatedHours: 25,
        actualHours: 8.5,
        productionLine: "Line 2",
        assignedOperators: ["Mike Johnson", "Sarah Wilson"],
        createdDate: "2024-03-08",
        startDate: "2024-03-10",
      },
    ]);

    setProductionLines([
      {
        id: "1",
        name: "Line 1",
        capacity: 100,
        currentLoad: 75,
        status: "busy",
        operators: ["John Doe", "Jane Smith"],
      },
      {
        id: "2",
        name: "Line 2",
        capacity: 80,
        currentLoad: 60,
        status: "busy",
        operators: ["Mike Johnson", "Sarah Wilson"],
      },
      {
        id: "3",
        name: "Line 3",
        capacity: 120,
        currentLoad: 0,
        status: "available",
        operators: [],
      },
    ]);

    setOperators([
      {
        id: "1",
        name: "John Doe",
        skill: "expert",
        currentWorkOrder: "WO-001",
        availability: "busy",
      },
      {
        id: "2",
        name: "Jane Smith",
        skill: "intermediate",
        currentWorkOrder: "WO-001",
        availability: "busy",
      },
      {
        id: "3",
        name: "Mike Johnson",
        skill: "expert",
        currentWorkOrder: "WO-003",
        availability: "busy",
      },
      {
        id: "4",
        name: "Sarah Wilson",
        skill: "beginner",
        currentWorkOrder: "WO-003",
        availability: "busy",
      },
      {
        id: "5",
        name: "Tom Brown",
        skill: "intermediate",
        availability: "available",
      },
      {
        id: "6",
        name: "Lisa Davis",
        skill: "expert",
        availability: "available",
      },
    ]);
  }, []);

  const filteredWorkOrders = workOrders.filter((wo) => {
    const matchesSearch =
      wo.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.product.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || wo.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "released":
        return "bg-purple-100 text-purple-800";
      case "planned":
        return "bg-yellow-100 text-yellow-800";
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "on_hold":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getLineStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800";
      case "busy":
        return "bg-blue-100 text-blue-800";
      case "maintenance":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleViewWorkOrder = (workOrder: WorkOrder) => {
    setSelectedWorkOrder(workOrder);
    setShowDetailsDialog(true);
  };

  const handlePlanWorkOrder = (workOrder: WorkOrder) => {
    setSelectedWorkOrder(workOrder);
    setShowPlanningDialog(true);
  };

  const handleReleaseWorkOrder = (workOrderId: string) => {
    setWorkOrders((prev) =>
      prev.map((wo) =>
        wo.id === workOrderId ? { ...wo, status: "released" as const } : wo
      )
    );
  };

  const handleStartWorkOrder = (workOrderId: string) => {
    setWorkOrders((prev) =>
      prev.map((wo) =>
        wo.id === workOrderId
          ? {
              ...wo,
              status: "in_progress" as const,
              startDate: new Date().toISOString().split("T")[0],
            }
          : wo
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Work Order Planning</h1>
          <p className="text-muted-foreground">
            Plan and manage production work orders
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Work Order
          </Button>
        </div>
      </div>

      {/* Production Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Work Orders
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workOrders.filter((wo) => wo.status === "in_progress").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently in production
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Planned Work Orders
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workOrders.filter((wo) => wo.status === "planned").length}
            </div>
            <p className="text-xs text-muted-foreground">Ready for release</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Available Lines
            </CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                productionLines.filter((line) => line.status === "available")
                  .length
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Production lines available
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="work-orders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="work-orders">Work Orders</TabsTrigger>
          <TabsTrigger value="production-lines">Production Lines</TabsTrigger>
          <TabsTrigger value="operators">Operators</TabsTrigger>
        </TabsList>

        <TabsContent value="work-orders" className="space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search work orders..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="draft">Draft</TabsTrigger>
                    <TabsTrigger value="planned">Planned</TabsTrigger>
                    <TabsTrigger value="in_progress">In Progress</TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardContent>
          </Card>

          {/* Work Orders Table */}
          <Card>
            <CardHeader>
              <CardTitle>Work Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Work Order</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Production Line</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWorkOrders.map((wo) => (
                    <TableRow key={wo.id}>
                      <TableCell className="font-medium">{wo.id}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{wo.product}</div>
                          <div className="text-sm text-muted-foreground">
                            {wo.orderNumber}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{wo.quantity.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(wo.deadline)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(wo.status)}>
                          {wo.status.replace("_", " ").toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(wo.priority)}>
                          {wo.priority.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${wo.progress}%` }}
                            />
                          </div>
                          <span className="text-sm">{wo.progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {wo.productionLine || "Not assigned"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewWorkOrder(wo)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {wo.status === "draft" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePlanWorkOrder(wo)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {wo.status === "planned" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReleaseWorkOrder(wo.id)}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          {wo.status === "released" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStartWorkOrder(wo.id)}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
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

        <TabsContent value="production-lines" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Production Lines</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {productionLines.map((line) => (
                  <Card key={line.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{line.name}</span>
                        <Badge className={getLineStatusColor(line.status)}>
                          {line.status.toUpperCase()}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Capacity</span>
                          <span>{line.capacity}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${line.currentLoad}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Current Load</span>
                          <span>{line.currentLoad}%</span>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Operators:</span>
                          <div className="mt-1">
                            {line.operators.length > 0 ? (
                              line.operators.map((operator, index) => (
                                <Badge
                                  key={index}
                                  variant="outline"
                                  className="mr-1"
                                >
                                  {operator}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground">
                                No operators assigned
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operators" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Operators</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Skill Level</TableHead>
                    <TableHead>Availability</TableHead>
                    <TableHead>Current Work Order</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operators.map((operator) => (
                    <TableRow key={operator.id}>
                      <TableCell className="font-medium">
                        {operator.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {operator.skill.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            operator.availability === "available"
                              ? "bg-green-100 text-green-800"
                              : operator.availability === "busy"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }
                        >
                          {operator.availability
                            .replace("_", " ")
                            .toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {operator.currentWorkOrder || "None"}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Work Order Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Work Order Details - {selectedWorkOrder?.id}
            </DialogTitle>
            <DialogDescription>
              View detailed information about the work order
            </DialogDescription>
          </DialogHeader>

          {selectedWorkOrder && (
            <div className="space-y-6">
              {/* Work Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Work Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Product</Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedWorkOrder.product}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Quantity</Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedWorkOrder.quantity.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Deadline</Label>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(selectedWorkOrder.deadline)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Status</Label>
                      <Badge
                        className={getStatusColor(selectedWorkOrder.status)}
                      >
                        {selectedWorkOrder.status
                          .replace("_", " ")
                          .toUpperCase()}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">
                        Estimated Hours
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedWorkOrder.estimatedHours}h
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">
                        Actual Hours
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedWorkOrder.actualHours}h
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">
                        Production Line
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedWorkOrder.productionLine || "Not assigned"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Progress</Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedWorkOrder.progress}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Assigned Operators */}
              <Card>
                <CardHeader>
                  <CardTitle>Assigned Operators</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedWorkOrder.assignedOperators.length > 0 ? (
                    <div className="flex gap-2">
                      {selectedWorkOrder.assignedOperators.map(
                        (operator, index) => (
                          <Badge key={index} variant="outline">
                            {operator}
                          </Badge>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      No operators assigned
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Notes */}
              {selectedWorkOrder.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {selectedWorkOrder.notes}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Planning Dialog */}
      <Dialog open={showPlanningDialog} onOpenChange={setShowPlanningDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Plan Work Order - {selectedWorkOrder?.id}</DialogTitle>
            <DialogDescription>
              Assign production line and operators for this work order
            </DialogDescription>
          </DialogHeader>

          {selectedWorkOrder && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="production-line">Production Line</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select production line" />
                  </SelectTrigger>
                  <SelectContent>
                    {productionLines.map((line) => (
                      <SelectItem key={line.id} value={line.id}>
                        {line.name} - {line.status} ({line.currentLoad}% load)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Assign Operators</Label>
                <div className="space-y-2">
                  {operators
                    .filter((op) => op.availability === "available")
                    .map((operator) => (
                      <div
                        key={operator.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox id={operator.id} />
                        <Label htmlFor={operator.id} className="flex-1">
                          {operator.name} ({operator.skill})
                        </Label>
                      </div>
                    ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="planning-notes">Planning Notes</Label>
                <Textarea
                  id="planning-notes"
                  placeholder="Add any planning notes..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowPlanningDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={() => setShowPlanningDialog(false)}>
                  Save Plan
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
