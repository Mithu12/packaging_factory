"use client";

import React, { useState, useEffect } from "react";
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
  Filter,
  Eye,
  Download,
  Calendar,
  User,
  MessageSquare,
} from "lucide-react";
import {
  mockAttendanceRegularizationRequests,
  getPendingRegularizationRequests,
  getRegularizationRequestsByEmployee,
  getRegularizationRequestsByManager,
  getRegularizationReasonOptions,
} from "@/modules/hrm/data/attendance-regularization-data";
import { mockAttendanceRecords } from "@/modules/hrm/data/attendance-data";
import { mockEmployees } from "@/modules/hrm/data/salary-update-data";
import {
  AttendanceRegularizationRequest,
  Employee,
  CreateAttendanceRegularizationForm,
  AttendanceRecord,
} from "@/modules/hrm/types";

const AttendanceRegularizationPage: React.FC = () => {
  const [regularizationRequests, setRegularizationRequests] = useState<
    AttendanceRegularizationRequest[]
  >(mockAttendanceRegularizationRequests as any);
  const [employees] = useState<Employee[]>(mockEmployees as any);
  const [attendanceRecords] = useState<AttendanceRecord[]>(
    mockAttendanceRecords as any
  );
  const [loading, setLoading] = useState(false);
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
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (editingRequest) {
        setRegularizationRequests((prev) =>
          prev.map((request) =>
            request.id === editingRequest.id
              ? {
                  ...request,
                  ...regularizationForm,
                  updated_at: new Date().toISOString(),
                }
              : request
          )
        );
        alert("Regularization request updated successfully!");
      } else {
        const newRequest: AttendanceRegularizationRequest = {
          id: Math.max(...regularizationRequests.map((r) => r.id)) + 1,
          ...regularizationForm,
          request_date: new Date().toISOString().split("T")[0],
          status: "pending",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setRegularizationRequests((prev) => [...prev, newRequest]);
        alert("Regularization request submitted successfully!");
      }

      setIsRegularizationDialogOpen(false);
      resetRegularizationForm();
    } catch (error) {
      alert("Error saving regularization request");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (requestId: number) => {
    try {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 500));

      setRegularizationRequests((prev) =>
        prev.map((request) =>
          request.id === requestId
            ? {
                ...request,
                status: "approved",
                reviewed_by: 1,
                reviewed_at: new Date().toISOString(),
                review_comments: "Approved by manager",
                updated_at: new Date().toISOString(),
              }
            : request
        )
      );

      alert("Regularization request approved successfully!");
    } catch (error) {
      alert("Error approving request");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async (requestId: number, reason: string) => {
    try {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 500));

      setRegularizationRequests((prev) =>
        prev.map((request) =>
          request.id === requestId
            ? {
                ...request,
                status: "rejected",
                reviewed_by: 1,
                reviewed_at: new Date().toISOString(),
                rejection_reason: reason,
                updated_at: new Date().toISOString(),
              }
            : request
        )
      );

      alert("Regularization request rejected successfully!");
    } catch (error) {
      alert("Error rejecting request");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async (requestId: number) => {
    if (
      confirm("Are you sure you want to cancel this regularization request?")
    ) {
      try {
        setLoading(true);
        await new Promise((resolve) => setTimeout(resolve, 500));

        setRegularizationRequests((prev) =>
          prev.map((request) =>
            request.id === requestId
              ? {
                  ...request,
                  status: "cancelled",
                  updated_at: new Date().toISOString(),
                }
              : request
          )
        );

        alert("Regularization request cancelled successfully!");
      } catch (error) {
        alert("Error cancelling request");
      } finally {
        setLoading(false);
      }
    }
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

  const pendingRequests = getPendingRegularizationRequests();

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
                      {getRegularizationReasonOptions().map((option) => (
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
          <TabsTrigger value="my">My Requests</TabsTrigger>
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
                    {filteredRequests.map((request) => {
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
                              {request.reason.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(request.status)}>
                              {request.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{request.request_date}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline">
                                <Eye className="h-4 w-4" />
                              </Button>
                              {request.status === "pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleApproveRequest(request.id)
                                    }
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const reason = prompt(
                                        "Enter rejection reason:"
                                      );
                                      if (reason)
                                        handleRejectRequest(request.id, reason);
                                    }}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              {request.status === "pending" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleCancelRequest(request.id)
                                  }
                                >
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
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
                              {request.reason.replace("_", " ")}
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
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const reason = prompt(
                                  "Enter rejection reason:"
                                );
                                if (reason)
                                  handleRejectRequest(request.id, reason);
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>My Regularization Requests</CardTitle>
              <CardDescription>
                Your submitted regularization requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {regularizationRequests
                  .filter((request) => request.employee_id === 1)
                  .map((request) => {
                    const employee = employees.find(
                      (emp) => emp.id === request.employee_id
                    );

                    return (
                      <Card key={request.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-base">
                                {request.original_date}
                              </CardTitle>
                              <CardDescription>
                                Requested on {request.request_date}
                              </CardDescription>
                            </div>
                            <Badge className={getStatusColor(request.status)}>
                              {request.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div>
                              <p className="text-sm font-medium">Reason:</p>
                              <p className="text-sm text-muted-foreground">
                                {request.reason.replace("_", " ")}
                              </p>
                            </div>

                            {request.review_comments && (
                              <div>
                                <p className="text-sm font-medium">
                                  Manager Comments:
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {request.review_comments}
                                </p>
                              </div>
                            )}

                            {request.rejection_reason && (
                              <div>
                                <p className="text-sm font-medium">
                                  Rejection Reason:
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {request.rejection_reason}
                                </p>
                              </div>
                            )}

                            {request.status === "pending" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCancelRequest(request.id)}
                              >
                                Cancel Request
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AttendanceRegularizationPage;


