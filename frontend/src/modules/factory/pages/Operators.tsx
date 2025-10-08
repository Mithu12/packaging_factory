import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  UserCheck,
  UserX,
  DollarSign,
  Award,
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
import {
  OperatorsApiService,
  operatorsQueryKeys,
  type Operator,
  type OperatorQueryParams,
  type CreateOperatorRequest,
  type UpdateOperatorRequest,
} from "@/services/operators-api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UsersApiService } from "@/services/users-api";

export default function OperatorsPage() {
  const navigate = useNavigate();
  const { formatCurrency, formatDate, formatNumber } = useFormatting();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [skillLevelFilter, setSkillLevelFilter] = useState<string>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all");
  const [showOperatorDialog, setShowOperatorDialog] = useState(false);
  const [selectedOperator, setSelectedOperator] =
    useState<Operator | null>(null);
  const [newOperator, setNewOperator] = useState<Partial<CreateOperatorRequest>>({
    user_id: 0,
    skill_level: "beginner",
    department: "",
    hourly_rate: 0,
  });
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // API query parameters
  const queryParams: OperatorQueryParams = {
    search: searchTerm || undefined,
    skill_level: skillLevelFilter !== "all" ? skillLevelFilter : undefined,
    availability_status: availabilityFilter !== "all" ? availabilityFilter : undefined,
    is_active: true,
    sort_by: "employee_id",
    sort_order: "asc",
    page: 1,
    limit: 100,
  };

  // Fetch operators
  const { data: operatorsData, isLoading: operatorsLoading } = useQuery({
    queryKey: operatorsQueryKeys.list(queryParams),
    queryFn: () => OperatorsApiService.getOperators(queryParams),
  });

  // Fetch operator statistics
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: operatorsQueryKeys.stats(),
    queryFn: () => OperatorsApiService.getOperatorStats(),
  });

  // Fetch users for dropdown
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => UsersApiService.getUsers(),
  });

  // Mutation for creating operators
  const createOperatorMutation = useMutation({
    mutationFn: (data: CreateOperatorRequest) =>
      OperatorsApiService.createOperator(data),
    onSuccess: () => {
      setShowOperatorDialog(false);
      setNewOperator({
        user_id: 0,
        skill_level: "beginner",
        department: "",
        hourly_rate: 0,
      });
      // Refresh data
      queryClient.invalidateQueries({
        queryKey: operatorsQueryKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: operatorsQueryKeys.stats(),
      });
    },
    onError: (error) => {
      console.error("Failed to create operator:", error);
      setError(error instanceof Error ? error.message : "Failed to create operator");
    },
  });

  // Mutation for updating operators
  const updateOperatorMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOperatorRequest }) =>
      OperatorsApiService.updateOperator(id, data),
    onSuccess: () => {
      setShowOperatorDialog(false);
      setSelectedOperator(null);
      setNewOperator({
        user_id: 0,
        skill_level: "beginner",
        department: "",
        hourly_rate: 0,
      });
      // Refresh data
      queryClient.invalidateQueries({
        queryKey: operatorsQueryKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: operatorsQueryKeys.stats(),
      });
    },
    onError: (error) => {
      console.error("Failed to update operator:", error);
      setError(error instanceof Error ? error.message : "Failed to update operator");
    },
  });

  // Mutation for deleting operators
  const deleteOperatorMutation = useMutation({
    mutationFn: (id: string) => OperatorsApiService.deleteOperator(id),
    onSuccess: () => {
      // Refresh data
      queryClient.invalidateQueries({
        queryKey: operatorsQueryKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: operatorsQueryKeys.stats(),
      });
    },
    onError: (error) => {
      console.error("Failed to delete operator:", error);
      setError(error instanceof Error ? error.message : "Failed to delete operator");
    },
  });

  // Mutation for updating operator availability
  const updateAvailabilityMutation = useMutation({
    mutationFn: ({ id, availability_status }: { id: string; availability_status: string }) =>
      OperatorsApiService.updateOperatorAvailability(id, availability_status),
    onSuccess: () => {
      // Refresh data
      queryClient.invalidateQueries({
        queryKey: operatorsQueryKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: operatorsQueryKeys.stats(),
      });
    },
    onError: (error) => {
      console.error("Failed to update operator availability:", error);
      setError(error instanceof Error ? error.message : "Failed to update operator availability");
    },
  });

  const operators = operatorsData?.operators || [];
  const stats = statsData || {
    total_operators: 0,
    active_operators: 0,
    available_operators: 0,
    busy_operators: 0,
    off_duty_operators: 0,
    on_leave_operators: 0,
    beginner_operators: 0,
    intermediate_operators: 0,
    expert_operators: 0,
    master_operators: 0,
    average_hourly_rate: 0,
  };

  // Handle loading state
  if (operatorsLoading || statsLoading || usersLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Operators</h1>
            <p className="text-muted-foreground">
              Manage factory operators and their assignments
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const handleViewOperator = (operator: Operator) => {
    setSelectedOperator(operator);
    setShowDetailsDialog(true);
  };

  const handleCreateOperator = () => {
    setNewOperator({
      user_id: 0,
      skill_level: "beginner",
      department: "",
      hourly_rate: 0,
    });
    setShowOperatorDialog(true);
  };

  const handleEditOperator = (operator: Operator) => {
    setSelectedOperator(operator);
    setNewOperator({
      user_id: operator.user_id,
      skill_level: operator.skill_level,
      department: operator.department || "",
      hourly_rate: operator.hourly_rate || 0,
    });
    setShowOperatorDialog(true);
  };

  const handleSubmitOperator = () => {
    if (selectedOperator) {
      // When editing, only validate skill_level since user_id is fixed
      if (!newOperator.skill_level) {
        setError("Please select a skill level");
        return;
      }
    } else {
      // When creating, validate both user_id and skill_level
      if (!newOperator.user_id || !newOperator.skill_level) {
        setError("Please fill in all required fields");
        return;
      }
    }

    if (selectedOperator) {
      // Update existing operator
      updateOperatorMutation.mutate({
        id: selectedOperator.id,
        data: newOperator as UpdateOperatorRequest,
      });
    } else {
      // Create new operator
      createOperatorMutation.mutate(newOperator as CreateOperatorRequest);
    }
  };

  const handleDeleteOperator = (operatorId: string) => {
    if (confirm("Are you sure you want to delete this operator?")) {
      deleteOperatorMutation.mutate(operatorId);
    }
  };

  const handleUpdateAvailability = (operatorId: string, status: string) => {
    updateAvailabilityMutation.mutate({
      id: operatorId,
      availability_status: status,
    });
  };

  const getSkillLevelColor = (skillLevel: string) => {
    switch (skillLevel) {
      case "beginner":
        return "bg-gray-100 text-gray-800";
      case "intermediate":
        return "bg-blue-100 text-blue-800";
      case "expert":
        return "bg-green-100 text-green-800";
      case "master":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800";
      case "busy":
        return "bg-blue-100 text-blue-800";
      case "off_duty":
        return "bg-gray-100 text-gray-800";
      case "on_leave":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredOperators = operators.filter((op) => {
    const matchesSearch =
      op.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.department?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSkillLevel =
      skillLevelFilter === "all" || op.skill_level === skillLevelFilter;
    const matchesAvailability =
      availabilityFilter === "all" || op.availability_status === availabilityFilter;
    return matchesSearch && matchesSkillLevel && matchesAvailability;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Operators</h1>
          <p className="text-muted-foreground">
            Manage factory operators and their assignments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {
            queryClient.invalidateQueries({ queryKey: operatorsQueryKeys.lists() });
            queryClient.invalidateQueries({ queryKey: operatorsQueryKeys.stats() });
          }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleCreateOperator} disabled={createOperatorMutation.isPending}>
            {createOperatorMutation.isPending ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add Operator
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setError(null)}
                className="ml-auto"
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Operators
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_operators}</div>
            <p className="text-xs text-muted-foreground">All registered operators</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Available
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.available_operators}</div>
            <p className="text-xs text-muted-foreground">Ready for assignment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rate</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.average_hourly_rate)}
            </div>
            <p className="text-xs text-muted-foreground">Per hour</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Expert Level
            </CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.expert_operators + stats.master_operators}
            </div>
            <p className="text-xs text-muted-foreground">Expert & Master operators</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Operators</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search operators..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={skillLevelFilter} onValueChange={setSkillLevelFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Skill Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="expert">Expert</SelectItem>
                <SelectItem value="master">Master</SelectItem>
              </SelectContent>
            </Select>
            <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Availability" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="busy">Busy</SelectItem>
                <SelectItem value="off_duty">Off Duty</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Operators Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Skill Level</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead>Hourly Rate</TableHead>
                <TableHead>Current Assignment</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOperators.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No operators found
                  </TableCell>
                </TableRow>
              ) : (
                filteredOperators.map((op) => (
                  <TableRow key={op.id}>
                    <TableCell>
                      <span className="font-mono text-sm">{op.employee_id}</span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{op.user_name || 'N/A'}</div>
                        <div className="text-sm text-muted-foreground">
                          {op.user_email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getSkillLevelColor(op.skill_level)}>
                        {op.skill_level.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{op.department || 'N/A'}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={getAvailabilityColor(op.availability_status)}>
                        {op.availability_status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {formatCurrency(op.hourly_rate || 0)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {op.current_work_order_id ? `WO-${op.current_work_order_id}` : 'None'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewOperator(op)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditOperator(op)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteOperator(op.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Operator Dialog */}
      <Dialog open={showOperatorDialog} onOpenChange={setShowOperatorDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedOperator ? 'Edit Operator' : 'Add Operator'}
            </DialogTitle>
            <DialogDescription>
              {selectedOperator
                ? 'Update the operator information (user cannot be changed)'
                : 'Select a user and assign them as an operator'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user">User *</Label>
              {selectedOperator ? (
                // Show selected user info when editing
                <div className="p-3 border rounded-md bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="font-medium">
                        {users?.find(u => u.id.toString() === selectedOperator.user_id.toString())?.full_name || 'User not found'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {users?.find(u => u.id.toString() === selectedOperator.user_id.toString())?.email || ''}
                        {' | '}
                        {users?.find(u => u.id.toString() === selectedOperator.user_id.toString())?.role_name || ''}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Employee ID: {selectedOperator.employee_id}
                    </div>
                  </div>
                </div>
              ) : (
                // Show user selection when creating
                <Select
                  value={newOperator.user_id?.toString() || ""}
                  onValueChange={(value) =>
                    setNewOperator((prev) => ({
                      ...prev,
                      user_id: parseInt(value),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.filter(user => user.is_active).map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        <div className="flex flex-col">
                          <span className="font-medium">{user.full_name}</span>
                          <span className="text-sm text-muted-foreground">
                            {user.email} | {user.role_name}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="skill_level">Skill Level *</Label>
                <Select
                  value={newOperator.skill_level}
                  onValueChange={(value) =>
                    setNewOperator((prev) => ({
                      ...prev,
                      skill_level: value as any,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select skill level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                    <SelectItem value="master">Master</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hourly_rate">Hourly Rate</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  step="0.01"
                  value={newOperator.hourly_rate || ""}
                  onChange={(e) =>
                    setNewOperator((prev) => ({
                      ...prev,
                      hourly_rate: parseFloat(e.target.value) || 0,
                    }))
                  }
                  placeholder="Enter hourly rate"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={newOperator.department}
                onChange={(e) =>
                  setNewOperator((prev) => ({
                    ...prev,
                    department: e.target.value,
                  }))
                }
                placeholder="Enter department"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowOperatorDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitOperator}
                disabled={
                  createOperatorMutation.isPending ||
                  updateOperatorMutation.isPending
                }
              >
                {(createOperatorMutation.isPending || updateOperatorMutation.isPending) ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    {selectedOperator ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {selectedOperator ? 'Update' : 'Create'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Operator Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Operator Details</DialogTitle>
          </DialogHeader>

          {selectedOperator && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Employee ID</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedOperator.employee_id}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Name</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedOperator.user_name || 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedOperator.user_email || 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Skill Level</Label>
                  <Badge className={getSkillLevelColor(selectedOperator.skill_level)}>
                    {selectedOperator.skill_level.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Department</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedOperator.department || 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Availability</Label>
                  <Badge className={getAvailabilityColor(selectedOperator.availability_status)}>
                    {selectedOperator.availability_status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Hourly Rate</Label>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(selectedOperator.hourly_rate || 0)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Current Assignment</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedOperator.current_work_order_id ? `WO-${selectedOperator.current_work_order_id}` : 'None'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
