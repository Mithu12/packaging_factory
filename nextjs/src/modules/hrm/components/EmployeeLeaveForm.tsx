"use client";

import React, { useState, useEffect } from "react";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  Calendar,
  Calculator,
  Save,
  X,
  FileText,
  Phone,
  MapPin,
} from "lucide-react";
import { EmployeeLeaveFormProps } from "../types";
import { getLeaveTypeOptions } from "../data/leave-configuration-data";
import { calculateLeaveDays } from "../data/leave-application-data";

const EmployeeLeaveForm: React.FC<EmployeeLeaveFormProps> = ({
  employee,
  leaveTypes,
  leaveBalances,
  onSubmit,
  onCancel,
  loading = false,
  initialData,
  isEdit = false,
}) => {
  const [formData, setFormData] = useState({
    leave_type_id: initialData?.leave_type_id?.toString() || "",
    start_date: initialData?.start_date || "",
    end_date: initialData?.end_date || "",
    half_day: initialData?.half_day || false,
    half_day_date: initialData?.half_day_date || "",
    reason: initialData?.reason || "",
    contact_details: initialData?.contact_details || employee.phone || "",
    handover_notes: initialData?.handover_notes || "",
    emergency_contact: initialData?.emergency_contact || "",
    work_coverage_notes: initialData?.work_coverage_notes || "",
    uploaded_documents: initialData?.uploaded_documents || ([] as string[]),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [calculatedDays, setCalculatedDays] = useState(0);

  const leaveTypeOptions = getLeaveTypeOptions().filter((option) =>
    leaveTypes.find((lt) => lt.id.toString() === option.value && lt.is_active)
  );

  // Calculate leave days when dates change
  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      const days = calculateLeaveDays(formData.start_date, formData.end_date);
      setCalculatedDays(days);
    } else {
      setCalculatedDays(0);
    }
  }, [formData.start_date, formData.end_date]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.leave_type_id) {
      newErrors.leave_type_id = "Leave type is required";
    }

    if (!formData.start_date) {
      newErrors.start_date = "Start date is required";
    }

    if (!formData.end_date) {
      newErrors.end_date = "End date is required";
    }

    if (
      formData.start_date &&
      formData.end_date &&
      new Date(formData.start_date) > new Date(formData.end_date)
    ) {
      newErrors.end_date = "End date cannot be before start date";
    }

    if (calculatedDays <= 0) {
      newErrors.end_date = "Invalid date range";
    }

    if (!formData.reason.trim()) {
      newErrors.reason = "Reason for leave is required";
    }

    if (!formData.contact_details.trim()) {
      newErrors.contact_details = "Contact details during leave are required";
    }

    // Check leave balance
    const selectedLeaveType = leaveTypes.find(
      (lt) => lt.id.toString() === formData.leave_type_id
    );
    const leaveBalance = leaveBalances.find(
      (lb) => lb.leave_type_id.toString() === formData.leave_type_id
    );

    if (
      selectedLeaveType &&
      leaveBalance &&
      calculatedDays > leaveBalance.available_days
    ) {
      newErrors.leave_type_id = `Insufficient leave balance. Available: ${leaveBalance.available_days} days`;
    }

    // Half-day validation
    if (formData.half_day && !formData.half_day_date) {
      newErrors.half_day_date = "Please select the date for half-day leave";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit({
        ...formData,
        total_days: calculatedDays,
      });
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    // In a real app, this would upload files and return URLs
    const fileUrls = files.map((file) => `uploaded_${file.name}_${Date.now()}`);
    setFormData((prev) => ({
      ...prev,
      uploaded_documents: [...prev.uploaded_documents, ...fileUrls],
    }));
  };

  const removeDocument = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      uploaded_documents: prev.uploaded_documents.filter((_, i) => i !== index),
    }));
  };

  const selectedLeaveType = leaveTypes.find(
    (lt) => lt.id.toString() === formData.leave_type_id
  );
  const leaveBalance = leaveBalances.find(
    (lb) => lb.leave_type_id.toString() === formData.leave_type_id
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Employee Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {isEdit ? "Edit Leave Application" : "Apply for Leave"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Employee Name</Label>
              <Input value={employee.full_name} readOnly className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label>Employee ID</Label>
              <Input
                value={employee.employee_id}
                readOnly
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label>Department</Label>
              <Input
                value={employee.department?.name || ""}
                readOnly
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label>Designation</Label>
              <Input
                value={employee.designation?.title || ""}
                readOnly
                className="bg-muted"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leave Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Leave Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="leave_type_id">Leave Type *</Label>
              <Select
                value={formData.leave_type_id}
                onValueChange={(value) =>
                  handleInputChange("leave_type_id", value)
                }
              >
                <SelectTrigger
                  className={errors.leave_type_id ? "border-destructive" : ""}
                >
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.leave_type_id && (
                <p className="text-sm text-destructive">
                  {errors.leave_type_id}
                </p>
              )}

              {selectedLeaveType && (
                <div className="mt-2 p-2 bg-muted rounded">
                  <div className="flex items-center gap-2 text-sm">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: selectedLeaveType.color_code }}
                    />
                    <span>{selectedLeaveType.description}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Leave Balance</Label>
              {leaveBalance ? (
                <div className="space-y-1">
                  <div className="text-sm">
                    <span className="font-medium">Available:</span>{" "}
                    {leaveBalance.available_days} days
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span>Used:</span> {leaveBalance.used_days} days |{" "}
                    <span>Pending:</span> {leaveBalance.pending_days} days
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No balance information available
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) =>
                  handleInputChange("start_date", e.target.value)
                }
                className={errors.start_date ? "border-destructive" : ""}
                min={new Date().toISOString().split("T")[0]}
              />
              {errors.start_date && (
                <p className="text-sm text-destructive">{errors.start_date}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">End Date *</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => handleInputChange("end_date", e.target.value)}
                className={errors.end_date ? "border-destructive" : ""}
                min={
                  formData.start_date || new Date().toISOString().split("T")[0]
                }
              />
              {errors.end_date && (
                <p className="text-sm text-destructive">{errors.end_date}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Calculated Days</Label>
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {calculatedDays} days
                </Badge>
              </div>
            </div>
          </div>

          {/* Half-day option */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="half_day"
                checked={formData.half_day}
                onCheckedChange={(checked) =>
                  handleInputChange("half_day", checked)
                }
              />
              <Label htmlFor="half_day">Half-day leave</Label>
            </div>

            {formData.half_day && (
              <div className="space-y-2">
                <Label htmlFor="half_day_date">
                  Select date for half-day leave *
                </Label>
                <Input
                  id="half_day_date"
                  type="date"
                  value={formData.half_day_date}
                  onChange={(e) =>
                    handleInputChange("half_day_date", e.target.value)
                  }
                  className={errors.half_day_date ? "border-destructive" : ""}
                  min={formData.start_date}
                  max={formData.end_date}
                />
                {errors.half_day_date && (
                  <p className="text-sm text-destructive">
                    {errors.half_day_date}
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reason and Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Reason & Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Leave *</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => handleInputChange("reason", e.target.value)}
              placeholder="Please provide detailed reason for your leave request..."
              className={errors.reason ? "border-destructive" : ""}
              rows={4}
            />
            {errors.reason && (
              <p className="text-sm text-destructive">{errors.reason}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_details">
                Contact Details During Leave *
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="contact_details"
                  value={formData.contact_details}
                  onChange={(e) =>
                    handleInputChange("contact_details", e.target.value)
                  }
                  placeholder="+92 300 1234567"
                  className={`pl-10 ${
                    errors.contact_details ? "border-destructive" : ""
                  }`}
                />
              </div>
              {errors.contact_details && (
                <p className="text-sm text-destructive">
                  {errors.contact_details}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergency_contact">Emergency Contact</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="emergency_contact"
                  value={formData.emergency_contact}
                  onChange={(e) =>
                    handleInputChange("emergency_contact", e.target.value)
                  }
                  placeholder="+92 300 9876543"
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Handover and Coverage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Handover & Work Coverage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="handover_notes">Handover Notes</Label>
            <Textarea
              id="handover_notes"
              value={formData.handover_notes}
              onChange={(e) =>
                handleInputChange("handover_notes", e.target.value)
              }
              placeholder="Document any handover tasks, pending work, or important information for your team..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="work_coverage_notes">Work Coverage Notes</Label>
            <Textarea
              id="work_coverage_notes"
              value={formData.work_coverage_notes}
              onChange={(e) =>
                handleInputChange("work_coverage_notes", e.target.value)
              }
              placeholder="Specify how your work will be covered during your absence..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Document Upload */}
      {selectedLeaveType?.requires_documentation && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Supporting Documents
            </CardTitle>
            <CardDescription>
              Upload required documents for your leave application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="document_upload">Upload Documents</Label>
              <Input
                id="document_upload"
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleFileUpload}
                className="cursor-pointer"
              />
              <p className="text-sm text-muted-foreground">
                Accepted formats: PDF, JPG, PNG, DOC, DOCX (Max 5MB per file)
              </p>
            </div>

            {formData.uploaded_documents.length > 0 && (
              <div className="space-y-2">
                <Label>Uploaded Documents:</Label>
                <div className="space-y-2">
                  {formData.uploaded_documents.map((doc, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted rounded"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">{doc}</span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeDocument(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Leave Balance Warning */}
      {leaveBalance && calculatedDays > leaveBalance.available_days && (
        <Alert>
          <AlertDescription>
            Warning: This leave request ({calculatedDays} days) exceeds your
            available balance ({leaveBalance.available_days} days). Your
            application may be subject to additional approval or may be
            partially approved.
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading
            ? "Submitting..."
            : isEdit
            ? "Update Application"
            : "Submit Application"}
        </Button>
      </div>
    </form>
  );
};

export default EmployeeLeaveForm;
