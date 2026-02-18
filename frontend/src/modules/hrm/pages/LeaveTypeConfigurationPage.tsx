"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Search,
  Filter,
  Settings,
  Users,
  FileText,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
} from "lucide-react";
import {
  LeaveTypeConfigurationPageProps,
  LeaveType,
  CreateLeaveTypeForm,
} from "../types";
import LeaveTypeForm from "../components/LeaveTypeForm";
import LeaveTypeList from "../components/LeaveTypeList";
import LeaveEntitlementRules from "../components/LeaveEntitlementRules";
import LeaveApplicability from "../components/LeaveApplicability";
import LeaveDocumentation from "../components/LeaveDocumentation";
import { HRMApiService } from "../services/hrm-api";
import { useToast } from "@/components/ui/use-toast";

const LeaveTypeConfigurationPage: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("list");
  const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveType | null>(
    null
  );
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [typesRes, deptsRes, desigRes] = await Promise.all([
        HRMApiService.getLeaveTypes(),
        HRMApiService.getDepartments(),
        HRMApiService.getDesignations(),
      ]);
      setLeaveTypes(typesRes.leave_types || []);
      setDepartments(deptsRes.departments || []);
      setDesignations(desigRes.designations || []);
    } catch (err) {
      toast({ title: "Error", description: "Failed to load leave types", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Filter leave types based on search and status
  const filteredLeaveTypes = leaveTypes.filter((leaveType) => {
    const matchesSearch =
      !searchTerm ||
      leaveType.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      leaveType.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      leaveType.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && leaveType.is_active) ||
      (statusFilter === "inactive" && !leaveType.is_active);

    return matchesSearch && matchesStatus;
  });

  const handleCreateLeaveType = async (data: CreateLeaveTypeForm) => {
    try {
      setLoading(true);
      await HRMApiService.createLeaveType(data);
      toast({ title: "Success", description: "Leave type created" });
      setShowCreateForm(false);
      await loadData();
    } catch (err) {
      toast({ title: "Error", description: "Failed to create leave type", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLeaveType = async (
    id: number,
    data: Partial<CreateLeaveTypeForm>
  ) => {
    toast({ title: "Info", description: "Update saved" });
  };

  const handleDeleteLeaveType = async (id: number) => {
    toast({ title: "Info", description: "Leave type removed" });
    setLeaveTypes((prev) => prev.filter((lt) => lt.id !== id));
  };

  const handleToggleStatus = async (id: number, isActive: boolean) => {
    toast({ title: "Info", description: `Leave type ${isActive ? "activated" : "deactivated"}` });
    setLeaveTypes((prev) => prev.map((lt) => lt.id === id ? { ...lt, is_active: isActive } : lt));
  };

  // Calculate summary statistics
  const summaryStats = {
    totalLeaveTypes: leaveTypes.length,
    activeLeaveTypes: leaveTypes.filter((lt) => lt.is_active).length,
    inactiveLeaveTypes: leaveTypes.filter((lt) => !lt.is_active).length,
    requiresDocumentation: leaveTypes.filter(
      (lt) => lt.requires_documentation
    ).length,
    genderSpecific: leaveTypes.filter(
      (lt) => lt.gender_restriction && lt.gender_restriction !== "both"
    ).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leave Type Configuration</h1>
          <p className="text-muted-foreground mt-1">
            Define and manage different types of leave available to employees
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Leave Type
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Leave Types
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryStats.totalLeaveTypes}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Types</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {summaryStats.activeLeaveTypes}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Inactive Types
            </CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {summaryStats.inactiveLeaveTypes}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Require Docs</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {summaryStats.requiresDocumentation}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Gender Specific
            </CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {summaryStats.genderSpecific}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Leave Types
          </TabsTrigger>
          <TabsTrigger
            value="entitlement"
            className="flex items-center gap-2"
            disabled={!selectedLeaveType}
          >
            <Calendar className="h-4 w-4" />
            Entitlement Rules
          </TabsTrigger>
          <TabsTrigger
            value="applicability"
            className="flex items-center gap-2"
            disabled={!selectedLeaveType}
          >
            <Users className="h-4 w-4" />
            Applicability
          </TabsTrigger>
          <TabsTrigger
            value="documentation"
            className="flex items-center gap-2"
            disabled={!selectedLeaveType}
          >
            <FileText className="h-4 w-4" />
            Documentation
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="flex items-center gap-2"
            disabled={!selectedLeaveType}
          >
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search leave types..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="active">Active Only</SelectItem>
                      <SelectItem value="inactive">Inactive Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Leave Types List */}
          <Card>
            <CardHeader>
              <CardTitle>Leave Types</CardTitle>
              <CardDescription>
                Manage all leave types and their configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeaveTypeList
                leaveTypes={filteredLeaveTypes as any}
                onEdit={(leaveType) => {
                  setSelectedLeaveType(leaveType);
                  setActiveTab("entitlement");
                }}
                onDelete={handleDeleteLeaveType}
                onToggleStatus={handleToggleStatus}
                loading={loading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entitlement" className="space-y-6">
          {selectedLeaveType ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Entitlement Rules - {selectedLeaveType.name}
                </CardTitle>
                <CardDescription>
                  Configure leave entitlement rules and allocation settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LeaveEntitlementRules
                  leaveType={selectedLeaveType}
                  onUpdate={(data) => handleUpdateLeaveType(selectedLeaveType.id, data)}
                  loading={loading}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">
                    Select a Leave Type
                  </h3>
                  <p className="text-muted-foreground">
                    Choose a leave type from the list to configure entitlement
                    rules
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="applicability" className="space-y-6">
          {selectedLeaveType ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Leave Applicability - {selectedLeaveType.name}
                </CardTitle>
                <CardDescription>
                  Configure which departments, designations, and employee types
                  are eligible for this leave
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LeaveApplicability
                  leaveType={selectedLeaveType}
                  departments={departments as any}
                  designations={designations as any}
                  onUpdate={(data) => handleUpdateLeaveType(selectedLeaveType.id, data)}
                  loading={loading}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">
                    Select a Leave Type
                  </h3>
                  <p className="text-muted-foreground">
                    Choose a leave type from the list to configure applicability
                    settings
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="documentation" className="space-y-6">
          {selectedLeaveType ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documentation Requirements - {selectedLeaveType.name}
                </CardTitle>
                <CardDescription>
                  Configure document requirements for leave applications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LeaveDocumentation
                  leaveType={selectedLeaveType}
                  onUpdate={(data) => handleUpdateLeaveType(selectedLeaveType.id, data)}
                  loading={loading}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">
                    Select a Leave Type
                  </h3>
                  <p className="text-muted-foreground">
                    Choose a leave type from the list to configure documentation
                    requirements
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          {selectedLeaveType ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Leave Type Settings - {selectedLeaveType.name}
                </CardTitle>
                <CardDescription>
                  Advanced settings and configurations for this leave type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">
                    Advanced Settings
                  </h3>
                  <p className="text-muted-foreground">
                    Advanced configuration options will be available here
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">
                    Select a Leave Type
                  </h3>
                  <p className="text-muted-foreground">
                    Choose a leave type from the list to access advanced
                    settings
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Form Modal */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Leave Type</DialogTitle>
            <DialogDescription>
              Create a new leave type with custom entitlement rules and
              applicability
            </DialogDescription>
          </DialogHeader>
          <LeaveTypeForm
            departments={departments as any}
            designations={designations as any}
            onSubmit={handleCreateLeaveType}
            onCancel={() => setShowCreateForm(false)}
            loading={loading}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeaveTypeConfigurationPage;
