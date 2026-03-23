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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Edit,
  Trash2,
  Settings,
  Save,
  X,
  ArrowRight,
  Users,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { ApprovalWorkflowConfigProps } from "../types";
import {
  getWorkflowTypeOptions,
  getApproverTypeOptions,
} from "../data/leave-application-data";

const ApprovalWorkflowConfig: React.FC<ApprovalWorkflowConfigProps> = ({
  workflows,
  departments,
  designations,
  onCreateWorkflow,
  onUpdateWorkflow,
  onDeleteWorkflow,
  loading = false,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    workflow_type: "sequential" as "sequential" | "parallel" | "hybrid",
    max_approval_days: 7,
    auto_escalate: true,
    escalation_days: 3,
    approval_levels: [] as any[],
    created_by: 0,
    is_active: true,
  });

  const workflowTypeOptions = getWorkflowTypeOptions();
  const approverTypeOptions = getApproverTypeOptions();

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      workflow_type: "sequential",
      max_approval_days: 7,
      auto_escalate: true,
      escalation_days: 3,
      approval_levels: [],
      created_by: 0,
      is_active: true,
    });
    setShowCreateForm(false);
    setEditingWorkflow(null);
  };

  const handleCreateWorkflow = async () => {
    try {
      await onCreateWorkflow(formData);
      resetForm();
    } catch (error) {
      console.error("Failed to create workflow:", error);
    }
  };

  const handleEditWorkflow = (workflow: any) => {
    setFormData({
      name: workflow.name,
      description: workflow.description || "",
      workflow_type: workflow.workflow_type,
      max_approval_days: workflow.max_approval_days,
      auto_escalate: workflow.auto_escalate,
      escalation_days: workflow.escalation_days,
      approval_levels: workflow.approval_levels || [],
      created_by: workflow.created_by || 0,
      is_active: workflow.is_active ?? true,
    });
    setEditingWorkflow(workflow);
    setShowCreateForm(true);
  };

  const handleUpdateWorkflow = async () => {
    if (editingWorkflow) {
      try {
        await onUpdateWorkflow(editingWorkflow.id, formData);
        resetForm();
      } catch (error) {
        console.error("Failed to update workflow:", error);
      }
    }
  };

  const handleDeleteWorkflow = async (id: number) => {
    try {
      await onDeleteWorkflow(id);
    } catch (error) {
      console.error("Failed to delete workflow:", error);
    }
  };

  const addApprovalLevel = () => {
    const newLevel = {
      level_number: formData.approval_levels.length + 1,
      level_name: `Level ${formData.approval_levels.length + 1}`,
      approver_type: "manager",
      requires_all_approvals: false,
      min_approvals_required: 1,
    };

    setFormData((prev) => ({
      ...prev,
      approval_levels: [...prev.approval_levels, newLevel],
    }));
  };

  const updateApprovalLevel = (index: number, field: string, value: any) => {
    const updatedLevels = [...formData.approval_levels];
    updatedLevels[index] = { ...updatedLevels[index], [field]: value };

    setFormData((prev) => ({
      ...prev,
      approval_levels: updatedLevels,
    }));
  };

  const removeApprovalLevel = (index: number) => {
    const updatedLevels = formData.approval_levels.filter(
      (_, i) => i !== index
    );
    // Renumber levels
    const renumberedLevels = updatedLevels.map((level, i) => ({
      ...level,
      level_number: i + 1,
      level_name: `Level ${i + 1}`,
    }));

    setFormData((prev) => ({
      ...prev,
      approval_levels: renumberedLevels,
    }));
  };

  const getApproverTypeLabel = (type: string) => {
    const option = approverTypeOptions.find((opt) => opt.value === type);
    return option?.label || type;
  };

  return (
    <div className="space-y-6">
      {/* Workflow List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workflows.map((workflow) => (
          <Card key={workflow.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{workflow.name}</CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditWorkflow(workflow)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteWorkflow(workflow.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardDescription className="text-sm">
                {workflow.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Type:</span>
                <Badge variant="outline">
                  {
                    workflowTypeOptions.find(
                      (opt) => opt.value === workflow.workflow_type
                    )?.label
                  }
                </Badge>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Max Days:</span>
                <span className="font-medium">
                  {workflow.max_approval_days} days
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Auto Escalate:</span>
                <Badge
                  variant={workflow.auto_escalate ? "default" : "secondary"}
                >
                  {workflow.auto_escalate ? "Enabled" : "Disabled"}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Levels:</span>
                <span className="font-medium">
                  {workflow.approval_levels.length}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={workflow.is_active ? "default" : "secondary"}>
                  {workflow.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Add New Workflow Card */}
        <Card className="border-dashed border-2 border-muted-foreground/25 hover:border-muted-foreground/50 cursor-pointer">
          <CardContent
            className="flex items-center justify-center h-full min-h-48"
            onClick={() => setShowCreateForm(true)}
          >
            <div className="text-center">
              <Plus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Add New Workflow</p>
              <p className="text-xs text-muted-foreground">
                Create approval workflow
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Workflow Form */}
      {showCreateForm && (
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {editingWorkflow
                ? "Edit Approval Workflow"
                : "Create Approval Workflow"}
            </CardTitle>
            <CardDescription>
              Configure approval workflow settings and approval levels
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="workflow_name">Workflow Name *</Label>
                <Input
                  id="workflow_name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Standard Employee Leave"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="workflow_type">Workflow Type</Label>
                <Select
                  value={formData.workflow_type}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      workflow_type: value as any,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select workflow type" />
                  </SelectTrigger>
                  <SelectContent>
                    {workflowTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="workflow_description">Description</Label>
                <Textarea
                  id="workflow_description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Brief description of this approval workflow..."
                  rows={2}
                />
              </div>
            </div>

            <Separator />

            {/* Workflow Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_approval_days">Maximum Approval Days</Label>
                <Input
                  id="max_approval_days"
                  type="number"
                  value={formData.max_approval_days}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      max_approval_days: parseInt(e.target.value) || 0,
                    }))
                  }
                  min={1}
                  max={30}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto_escalate">Auto Escalate</Label>
                  <Switch
                    id="auto_escalate"
                    checked={formData.auto_escalate}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        auto_escalate: checked,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="escalation_days">Escalation Days</Label>
                <Input
                  id="escalation_days"
                  type="number"
                  value={formData.escalation_days}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      escalation_days: parseInt(e.target.value) || 0,
                    }))
                  }
                  min={1}
                  max={10}
                />
              </div>
            </div>

            <Separator />

            {/* Approval Levels */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Approval Levels</Label>
                <Button type="button" variant="quickAdd" size="sm" onClick={addApprovalLevel}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Level
                </Button>
              </div>

              {formData.approval_levels.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No approval levels configured</p>
                  <p className="text-sm">
                    Add approval levels to define the approval process
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.approval_levels.map((level, index) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              Level {level.level_number}
                            </Badge>
                            <span className="font-medium">
                              {level.level_name}
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeApprovalLevel(index)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Approver Type</Label>
                            <Select
                              value={level.approver_type}
                              onValueChange={(value) =>
                                updateApprovalLevel(
                                  index,
                                  "approver_type",
                                  value
                                )
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select approver type" />
                              </SelectTrigger>
                              <SelectContent>
                                {approverTypeOptions.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Level Name</Label>
                            <Input
                              value={level.level_name}
                              onChange={(e) =>
                                updateApprovalLevel(
                                  index,
                                  "level_name",
                                  e.target.value
                                )
                              }
                              placeholder="e.g., Manager Approval"
                            />
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label htmlFor={`require_all_${index}`}>
                                Require All Approvals
                              </Label>
                              <Switch
                                id={`require_all_${index}`}
                                checked={level.requires_all_approvals}
                                onCheckedChange={(checked) =>
                                  updateApprovalLevel(
                                    index,
                                    "requires_all_approvals",
                                    checked
                                  )
                                }
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Minimum Approvals Required</Label>
                            <Input
                              type="number"
                              value={level.min_approvals_required}
                              onChange={(e) =>
                                updateApprovalLevel(
                                  index,
                                  "min_approvals_required",
                                  parseInt(e.target.value) || 1
                                )
                              }
                              min={1}
                              max={10}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Workflow Preview */}
            {formData.approval_levels.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Workflow Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Application</span>
                    {formData.approval_levels.map((level, index) => (
                      <React.Fragment key={index}>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="outline" className="text-xs">
                          {level.level_name}
                        </Badge>
                      </React.Fragment>
                    ))}
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <Badge
                      variant="default"
                      className="bg-green-100 text-green-800 text-xs"
                    >
                      Approved
                    </Badge>
                  </div>

                  <div className="mt-2 text-sm text-muted-foreground">
                    {formData.workflow_type === "sequential" &&
                      "Sequential: One level after another"}
                    {formData.workflow_type === "parallel" &&
                      "Parallel: All levels simultaneously"}
                    {formData.workflow_type === "hybrid" &&
                      "Hybrid: Combination of sequential and parallel"}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={resetForm} disabled={loading}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={
                  editingWorkflow ? handleUpdateWorkflow : handleCreateWorkflow
                }
                disabled={loading || !formData.name.trim()}
              >
                <Save className="h-4 w-4 mr-2" />
                {loading
                  ? "Saving..."
                  : editingWorkflow
                  ? "Update Workflow"
                  : "Create Workflow"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ApprovalWorkflowConfig;
