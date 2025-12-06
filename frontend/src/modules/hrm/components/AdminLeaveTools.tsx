"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Settings,
  Calculator,
  RotateCcw,
  Save,
  AlertTriangle,
  CheckCircle,
  Users,
  Calendar,
  FileText,
  TrendingUp,
} from "lucide-react";
import { AdminLeaveToolsProps } from "../types";

const AdminLeaveTools: React.FC<AdminLeaveToolsProps> = ({
  employees,
  leaveTypes,
  leaveApplications,
  onManualAdjustment,
  onResetQuotas,
  onProcessEncashment,
  loading = false,
}) => {
  const [activeTab, setActiveTab] = useState("adjustments");
  const [adjustmentForm, setAdjustmentForm] = useState({
    employee_id: "",
    leave_type_id: "",
    adjustment_type: "add" as "add" | "subtract",
    adjustment_days: 0,
    reason: "",
    effective_date: new Date().toISOString().split("T")[0],
  });

  const [encashmentForm, setEncashmentForm] = useState({
    employee_id: "",
    leave_type_id: "",
    encashment_days: 0,
    encashment_rate: 0,
    reason: "",
  });

  const [quotaResetForm, setQuotaResetForm] = useState({
    year: new Date().getFullYear(),
    reset_type: "all" as "all" | "specific_employees" | "specific_leave_types",
    employee_ids: [] as number[],
    leave_type_ids: [] as number[],
  });

  const handleManualAdjustment = async () => {
    if (
      !adjustmentForm.employee_id ||
      !adjustmentForm.leave_type_id ||
      adjustmentForm.adjustment_days === 0
    ) {
      return;
    }

    try {
      await onManualAdjustment(0, {
        // Using 0 as placeholder application ID
        ...adjustmentForm,
        adjustment_days:
          adjustmentForm.adjustment_type === "subtract"
            ? -adjustmentForm.adjustment_days
            : adjustmentForm.adjustment_days,
      });

      // Reset form
      setAdjustmentForm({
        employee_id: "",
        leave_type_id: "",
        adjustment_type: "add",
        adjustment_days: 0,
        reason: "",
        effective_date: new Date().toISOString().split("T")[0],
      });
    } catch (error) {
      console.error("Manual adjustment failed:", error);
    }
  };

  const handleProcessEncashment = async () => {
    if (
      !encashmentForm.employee_id ||
      !encashmentForm.leave_type_id ||
      encashmentForm.encashment_days === 0
    ) {
      return;
    }

    try {
      await onProcessEncashment(
        parseInt(encashmentForm.employee_id),
        parseInt(encashmentForm.leave_type_id),
        encashmentForm.encashment_days
      );

      // Reset form
      setEncashmentForm({
        employee_id: "",
        leave_type_id: "",
        encashment_days: 0,
        encashment_rate: 0,
        reason: "",
      });
    } catch (error) {
      console.error("Encashment processing failed:", error);
    }
  };

  const handleResetQuotas = async () => {
    try {
      await onResetQuotas(quotaResetForm.year);
      // Reset form
      setQuotaResetForm({
        year: new Date().getFullYear(),
        reset_type: "all",
        employee_ids: [],
        leave_type_ids: [],
      });
    } catch (error) {
      console.error("Quota reset failed:", error);
    }
  };

  const getEmployeeOptions = () => {
    return employees.map((emp) => ({
      value: emp.id.toString(),
      label: `${emp.employee_id} - ${emp.full_name}`,
    }));
  };

  const getLeaveTypeOptions = () => {
    return leaveTypes.map((lt) => ({
      value: lt.id.toString(),
      label: `${lt.code} - ${lt.name}`,
    }));
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => ({
    value: (currentYear + i).toString(),
    label: (currentYear + i).toString(),
  }));

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="adjustments" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Manual Adjustments
          </TabsTrigger>
          <TabsTrigger value="encashment" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Leave Encashment
          </TabsTrigger>
          <TabsTrigger value="quotas" className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Quota Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="adjustments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Manual Leave Adjustments
              </CardTitle>
              <CardDescription>
                Manually adjust employee leave balances for corrections or
                special cases
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employee_select">Employee *</Label>
                  <Select
                    value={adjustmentForm.employee_id}
                    onValueChange={(value) =>
                      setAdjustmentForm((prev) => ({
                        ...prev,
                        employee_id: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {getEmployeeOptions().map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="leave_type_select">Leave Type *</Label>
                  <Select
                    value={adjustmentForm.leave_type_id}
                    onValueChange={(value) =>
                      setAdjustmentForm((prev) => ({
                        ...prev,
                        leave_type_id: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      {getLeaveTypeOptions().map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adjustment_type">Adjustment Type</Label>
                  <Select
                    value={adjustmentForm.adjustment_type}
                    onValueChange={(value) =>
                      setAdjustmentForm((prev) => ({
                        ...prev,
                        adjustment_type: value as "add" | "subtract",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select adjustment type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="add">Add Days</SelectItem>
                      <SelectItem value="subtract">Subtract Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adjustment_days">Days to Adjust *</Label>
                  <Input
                    id="adjustment_days"
                    type="number"
                    value={adjustmentForm.adjustment_days}
                    onChange={(e) =>
                      setAdjustmentForm((prev) => ({
                        ...prev,
                        adjustment_days: parseInt(e.target.value) || 0,
                      }))
                    }
                    min={1}
                    max={365}
                    step={1}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="effective_date">Effective Date</Label>
                  <Input
                    id="effective_date"
                    type="date"
                    value={adjustmentForm.effective_date}
                    onChange={(e) =>
                      setAdjustmentForm((prev) => ({
                        ...prev,
                        effective_date: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adjustment_reason">
                  Reason for Adjustment *
                </Label>
                <Textarea
                  id="adjustment_reason"
                  value={adjustmentForm.reason}
                  onChange={(e) =>
                    setAdjustmentForm((prev) => ({
                      ...prev,
                      reason: e.target.value,
                    }))
                  }
                  placeholder="Provide detailed reason for this manual adjustment..."
                  rows={3}
                />
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Manual adjustments should be used sparingly and only for
                  legitimate corrections. All adjustments are logged for audit
                  purposes.
                </AlertDescription>
              </Alert>

              <div className="flex justify-end">
                <Button
                  onClick={handleManualAdjustment}
                  disabled={
                    loading ||
                    !adjustmentForm.employee_id ||
                    !adjustmentForm.leave_type_id ||
                    adjustmentForm.adjustment_days === 0
                  }
                >
                  <Save className="h-4 w-4 mr-2" />
                  Apply Adjustment
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="encashment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Leave Encashment Processing
              </CardTitle>
              <CardDescription>
                Process leave encashment for employees who are eligible to
                convert unused leave to payment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="encash_employee">Employee *</Label>
                  <Select
                    value={encashmentForm.employee_id}
                    onValueChange={(value) =>
                      setEncashmentForm((prev) => ({
                        ...prev,
                        employee_id: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {getEmployeeOptions().map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="encash_leave_type">Leave Type *</Label>
                  <Select
                    value={encashmentForm.leave_type_id}
                    onValueChange={(value) =>
                      setEncashmentForm((prev) => ({
                        ...prev,
                        leave_type_id: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      {getLeaveTypeOptions()
                        .filter((option) =>
                          leaveTypes.find(
                            (lt) =>
                              lt.id.toString() === option.value &&
                              lt.encashment_eligible
                          )
                        )
                        .map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="encashment_days">Days to Encash *</Label>
                  <Input
                    id="encashment_days"
                    type="number"
                    value={encashmentForm.encashment_days}
                    onChange={(e) =>
                      setEncashmentForm((prev) => ({
                        ...prev,
                        encashment_days: parseInt(e.target.value) || 0,
                      }))
                    }
                    min={1}
                    max={30}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="encashment_rate">
                    Encashment Rate (per day)
                  </Label>
                  <Input
                    id="encashment_rate"
                    type="number"
                    value={encashmentForm.encashment_rate}
                    onChange={(e) =>
                      setEncashmentForm((prev) => ({
                        ...prev,
                        encashment_rate: parseFloat(e.target.value) || 0,
                      }))
                    }
                    min={0}
                    step={0.01}
                    placeholder="Auto-calculated"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="encashment_reason">
                  Reason for Encashment *
                </Label>
                <Textarea
                  id="encashment_reason"
                  value={encashmentForm.reason}
                  onChange={(e) =>
                    setEncashmentForm((prev) => ({
                      ...prev,
                      reason: e.target.value,
                    }))
                  }
                  placeholder="Provide reason for processing leave encashment..."
                  rows={3}
                />
              </div>

              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Leave encashment will be processed according to company policy
                  and tax regulations. Ensure employee is eligible for
                  encashment before processing.
                </AlertDescription>
              </Alert>

              <div className="flex justify-end">
                <Button
                  onClick={handleProcessEncashment}
                  disabled={
                    loading ||
                    !encashmentForm.employee_id ||
                    !encashmentForm.leave_type_id ||
                    encashmentForm.encashment_days === 0
                  }
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Process Encashment
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotas" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Leave Quota Management
              </CardTitle>
              <CardDescription>
                Reset leave quotas for new year or make bulk adjustments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reset_year">Year to Reset</Label>
                  <Select
                    value={quotaResetForm.year.toString()}
                    onValueChange={(value) =>
                      setQuotaResetForm((prev) => ({
                        ...prev,
                        year: parseInt(value),
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reset_type">Reset Type</Label>
                  <Select
                    value={quotaResetForm.reset_type}
                    onValueChange={(value) =>
                      setQuotaResetForm((prev) => ({
                        ...prev,
                        reset_type: value as any,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select reset type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Reset All Employees</SelectItem>
                      <SelectItem value="specific_employees">
                        Reset Specific Employees
                      </SelectItem>
                      <SelectItem value="specific_leave_types">
                        Reset Specific Leave Types
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> Resetting leave quotas will clear
                  all existing balances and set them to the configured annual
                  allocation. This action cannot be undone. Please ensure proper
                  backup before proceeding.
                </AlertDescription>
              </Alert>

              <div className="flex justify-end">
                <Button
                  onClick={handleResetQuotas}
                  disabled={loading}
                  variant="destructive"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Quotas for {quotaResetForm.year}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent Adjustments Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Administrative Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Recent administrative actions will be displayed here</p>
            <p className="text-sm mt-1">
              All manual adjustments and quota resets are logged for audit
              purposes
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLeaveTools;
