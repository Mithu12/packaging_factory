"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  Eye,
} from "lucide-react";
import {
  AttendanceRegularizationRequest,
  Employee,
  CreateAttendanceRegularizationForm,
} from "../types";
import HRMApiService from "../services/hrm-api";
import { useToast } from "@/components/ui/use-toast";

const REASON_OPTIONS = [
  { value: "forgot_punch", label: "Forgot to Punch" },
  { value: "system_issue", label: "System Issue" },
  { value: "on_duty", label: "On Duty / Field Work" },
  { value: "early_departure_approval", label: "Early Departure (Approved)" },
  { value: "late_arrival_approval", label: "Late Arrival (Approved)" },
  { value: "other", label: "Other" },
];

const AttendanceRegularizationPage: React.FC = () => {
  const { toast } = useToast();

  const [regularizationRequests, setRegularizationRequests] = useState<
    AttendanceRegularizationRequest[]
  >([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [isRegularizationDialogOpen, setIsRegularizationDialogOpen] =
    useState(false);
  const [editingRequest, setEditingRequest] =
    useState<AttendanceRegularizationRequest | null>(null);
  const [regularizationForm, setRegularizationForm] =
    useState<CreateAttendanceRegularizationForm>({
      employee_id: 0,
      original_date: new Date().toISOString().split("T")[0],
      reason: "",
      supporting_document_urls: [],
    });

  const loadData = useCallback(async () => {
    try {
      setDataLoading(true);
      const [requestsRes, employeesRes] = await Promise.all([
        HRMApiService.getRegularizationRequests(),
        HRMApiService.getEmployees({ limit: 200 }),
      ]);
      setRegularizationRequests(requestsRes.regularization_requests || []);
      setEmployees(employeesRes.employees || []);
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
    } finally {
      setDataLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredRequests = regularizationRequests.filter((request) => {
    const employee = employees.find((emp) => emp.id === request.employee_id);
    const matchesSearch =
      employee?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee?.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.reason.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || request.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const pendingRequests = regularizationRequests.filter(
    (r) => r.status === "pending"
  );

  const resetRegularizationForm = () => {
    setRegularizationForm({
      employee_id: 0,
      original_date: new Date().toISOString().split("T")[0],
      reason: "",
      supporting_document_urls: [],
    });
    setEditingRequest(null);
  };

  const handleRegularizationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (editingRequest) {
        const { data } = await HRMApiService.updateRegularizationRequest(
          editingRequest.id,
          regularizationForm
        ) as any;
        const updated = data?.regularization_request;
        setRegularizationRequests((prev) =>
          prev.map((r) => (r.id === editingRequest.id ? (updated || r) : r))
        );
        // Reload to get fresh data
        const res = await HRMApiService.getRegularizationRequests();
        setRegularizationRequests(res.regularization_requests || []);
        toast({ title: "Success", description: "Regularization request updated successfully" });
      } else {
        const res = await HRMApiService.createRegularizationRequest(regularizationForm);
        setRegularizationRequests((prev) => [res.regularization_request, ...prev]);
        toast({ title: "Success", description: "Regularization request submitted successfully" });
      }
      setIsRegularizationDialogOpen(false);
      resetRegularizationForm();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Error saving regularization request", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (requestId: number) => {
    try {
      setLoading(true);
      const res = await HRMApiService.reviewRegularizationRequest(requestId, {
        status: "approved",
        review_comments: "Approved by manager",
      });
      setRegularizationRequests((prev) =>
        prev.map((r) => (r.id === requestId ? res.regularization_request : r))
      );
      toast({ title: "Success", description: "Regularization request approved" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Error approving request", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async (requestId: number, reason: string) => {
    try {
      setLoading(true);
      const res = await HRMApiService.reviewRegularizationRequest(requestId, {
        status: "rejected",
        rejection_reason: reason,
      });
      setRegularizationRequests((prev) =>
        prev.map((r) => (r.id === requestId ? res.regularization_request : r))
      );
      toast({ title: "Success", description: "Regularization request rejected" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Error rejecting request", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async (requestId: number) => {
    if (confirm("Are you sure you want to cancel this regularization request?")) {
      try {
        setLoading(true);
        const res = await HRMApiService.cancelRegularizationRequest(requestId);
        setRegularizationRequests((prev) =>
          prev.map((r) => (r.id === requestId ? res.regularization_request : r))
        );
        toast({ title: "Success", description: "Regularization request cancelled" });
      } catch (error: any) {
        toast({ title: "Error", description: error.message || "Error cancelling request", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEditRequest = (request: AttendanceRegularizationRequest) => {
    setEditingRequest(request);
    setRegularizationForm({
      employee_id: request.employee_id,
      original_date: request.original_date,
      original_check_in_time: request.original_check_in_time || "",
      original_check_out_time: request.original_check_out_time || "",
      requested_check_in_time: request.requested_check_in_time || "",
      requested_check_out_time: request.requested_check_out_time || "",
      reason: request.reason,
      supporting_document_urls: request.supporting_document_urls || [],
    });
    setIsRegularizationDialogOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Attendance Regularization
          </h1>
          <p className="text-muted-foreground">
            Request and approve attendance corrections
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog
            open={isRegularizationDialogOpen}
            onOpenChange={setIsRegularizationDialogOpen}
          >
            <DialogTrigger asChild>
              <Button onClick={resetRegularizationForm}>
                <Plus className="h-4 w-4 mr-2" />
                Request Regularization
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingRequest
                    ? "Edit Regularization Request"
                    : "Request Attendance Regularization"}
                </DialogTitle>
                <DialogDescription>
                  {editingRequest
                    ? "Update regularization request details"
                    : "Submit a request to correct attendance records"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleRegularizationSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="employee">Employee</Label>
                  <Select
                    value={regularizationForm.employee_id?.toString() || ""}
                    onValueChange={(value) =>
                      setRegularizationForm((prev) => ({
                        ...prev,
                        employee_id: parseInt(value),
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem
                          key={employee.id}
                          value={employee.id.toString()}
                        >
                          {employee.first_name} {employee.last_name} (
                          {employee.employee_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="original_date">Date to Regularize</Label>
                  <Input
                    id="original_date"
                    type="date"
                    value={regularizationForm.original_date}
                    onChange={(e) =>
                      setRegularizationForm((prev) => ({
                        ...prev,
                        original_date: e.target.value,
                      }))
                    }
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="original_check_in_time">
                      Original Check In
                    </Label>
                    <Input
                      id="original_check_in_time"
                      type="time"
                      value={regularizationForm.original_check_in_time || ""}
                      onChange={(e) =>
                        setRegularizationForm((prev) => ({
                          ...prev,
                          original_check_in_time: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="original_check_out_time">
                      Original Check Out
                    </Label>
                    <Input
                      id="original_check_out_time"
                      type="time"
                      value={regularizationForm.original_check_out_time || ""}
                      onChange={(e) =>
                        setRegularizationForm((prev) => ({
                          ...prev,
                          original_check_out_time: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="requested_check_in_time">
                      Requested Check In
                    </Label>
                    <Input
                      id="requested_check_in_time"
                      type="time"
                      value={regularizationForm.requested_check_in_time || ""}
                      onChange={(e) =>
                        setRegularizationForm((prev) => ({
                          ...prev,
                          requested_check_in_time: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="requested_check_out_time">
                      Requested Check Out
                    </Label>
                    <Input
                      id="requested_check_out_time"
                      type="time"
                      value={regularizationForm.requested_check_out_time || ""}
                      onChange={(e) =>
                        setRegularizationForm((prev) => ({
                          ...prev,
                          requested_check_out_time: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Select
                    value={regularizationForm.reason}
                    onValueChange={(value) =>
                      setRegularizationForm((prev) => ({
                        ...prev,
                        reason: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {REASON_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supporting_documents">
                    Supporting Documents
                  </Label>
                  <Textarea
                    id="supporting_documents"
                    value={
                      regularizationForm.supporting_document_urls?.join(", ") ||
                      ""
                    }
                    onChange={(e) =>
                      setRegularizationForm((prev) => ({
                        ...prev,
                        supporting_document_urls: e.target.value
                          .split(",")
                          .map((url) => url.trim())
                          .filter(Boolean),
                      }))
                    }
                    placeholder="Enter document URLs separated by commas"
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsRegularizationDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    Submit Request
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Requests
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {regularizationRequests.length}
            </div>
            <p className="text-xs text-muted-foreground">
              All regularization requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {pendingRequests.length}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {
                regularizationRequests.filter((r) => r.status === "approved")
                  .length
              }
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {
                regularizationRequests.filter((r) => r.status === "rejected")
                  .length
              }
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Requests</TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({pendingRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Regularization Requests</CardTitle>
              <CardDescription>
                Manage all attendance regularization requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dataLoading ? (
                <p className="text-center text-muted-foreground py-8">Loading requests...</p>
              ) : (
                <>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search requests..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Requested</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRequests.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                              No regularization requests found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredRequests.map((request) => {
                            const employee = employees.find(
                              (emp) => emp.id === request.employee_id
                            );

                            return (
                              <TableRow key={request.id}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">
                                      {employee?.first_name} {employee?.last_name}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {employee?.employee_id}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell>{request.original_date}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {request.reason.replace(/_/g, " ")}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    {getStatusIcon(request.status)}
                                    <Badge className={getStatusColor(request.status)}>
                                      {request.status}
                                    </Badge>
                                  </div>
                                </TableCell>
                                <TableCell>{request.request_date}</TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleEditRequest(request)}
                                      disabled={request.status !== "pending"}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    {request.status === "pending" && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleApproveRequest(request.id)}
                                          disabled={loading}
                                        >
                                          <CheckCircle className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            const reason = prompt("Enter rejection reason:");
                                            if (reason) handleRejectRequest(request.id, reason);
                                          }}
                                          disabled={loading}
                                        >
                                          <XCircle className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleCancelRequest(request.id)}
                                          disabled={loading}
                                        >
                                          Cancel
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Regularization Requests</CardTitle>
              <CardDescription>
                Requests awaiting manager approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dataLoading ? (
                <p className="text-center text-muted-foreground py-8">Loading...</p>
              ) : pendingRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No pending requests</p>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.map((request) => {
                    const employee = employees.find(
                      (emp) => emp.id === request.employee_id
                    );

                    return (
                      <Card key={request.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-base">
                                {employee?.first_name} {employee?.last_name}
                              </CardTitle>
                              <CardDescription>
                                {employee?.employee_id} • {request.original_date}
                              </CardDescription>
                            </div>
                            <Badge className={getStatusColor(request.status)}>
                              {request.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm font-medium">Reason:</p>
                              <p className="text-sm text-muted-foreground">
                                {request.reason.replace(/_/g, " ")}
                              </p>
                            </div>

                            {request.original_check_in_time &&
                              request.requested_check_in_time && (
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm font-medium">
                                      Original Check In:
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {request.original_check_in_time}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">
                                      Requested Check In:
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {request.requested_check_in_time}
                                    </p>
                                  </div>
                                </div>
                              )}

                            {request.original_check_out_time &&
                              request.requested_check_out_time && (
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm font-medium">
                                      Original Check Out:
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {request.original_check_out_time}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">
                                      Requested Check Out:
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {request.requested_check_out_time}
                                    </p>
                                  </div>
                                </div>
                              )}

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApproveRequest(request.id)}
                                disabled={loading}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const reason = prompt("Enter rejection reason:");
                                  if (reason) handleRejectRequest(request.id, reason);
                                }}
                                disabled={loading}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCancelRequest(request.id)}
                                disabled={loading}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AttendanceRegularizationPage;
