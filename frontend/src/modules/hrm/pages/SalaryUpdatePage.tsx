"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DollarSign,
  TrendingUp,
  Users,
  FileText,
  History,
  PlusCircle,
} from "lucide-react";
import { SalaryUpdatePageProps } from "../types";
import SalaryIncrementForm from "../components/SalaryIncrementForm";
import PromotionForm from "../components/PromotionForm";
import BulkSalaryUpdateForm from "../components/BulkSalaryUpdateForm";
import SalaryHistory from "../components/SalaryHistory";
import { HRMApiService } from "../services/hrm-api";
import { useToast } from "@/components/ui/use-toast";

const SalaryUpdatePage: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("increment");
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [salaryHistory, setSalaryHistory] = useState<any[]>([]);
  const [totalSalaryHistory, setTotalSalaryHistory] = useState<number>(0);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [empsRes, deptsRes, desigRes, historyRes] = await Promise.all([
        HRMApiService.getEmployees({ limit: 500 }),
        HRMApiService.getDepartments(),
        HRMApiService.getDesignations(),
        HRMApiService.getGlobalSalaryHistory({ limit: 100 }),
      ]);
      setEmployees(empsRes.employees || []);
      setDepartments(deptsRes.departments || []);
      setDesignations(desigRes.designations || []);
      setSalaryHistory(historyRes.history || []);
      setTotalSalaryHistory(historyRes.total || 0);
    } catch (err) {
      toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSalaryIncrement = async (data: any) => {
    try {
      setLoading(true);
      await HRMApiService.updateEmployeeSalary(
        data.employee_id,
        data.new_salary,
        data.effective_date,
        data.reason || "Salary increment"
      );
      await loadData();
      toast({ title: "Success", description: "Salary increment applied" });
      setActiveTab("history");
    } catch (err) {
      toast({ title: "Error", description: "Failed to apply increment", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePromotion = async (data: any) => {
    try {
      setLoading(true);
      // Update employee designation + salary
      await Promise.all([
        HRMApiService.updateEmployee(data.employee_id, {
          designation_id: data.new_designation_id,
          department_id: data.new_department_id,
        }),
        data.new_salary && HRMApiService.updateEmployeeSalary(
          data.employee_id,
          data.new_salary,
          data.effective_date,
          `Promotion: ${data.reason || ""}`
        ),
      ]);
      await loadData();
      toast({ title: "Success", description: "Promotion processed" });
      setActiveTab("history");
    } catch (err) {
      toast({ title: "Error", description: "Failed to process promotion", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSalaryUpdate = async (data: any) => {
    try {
      setLoading(true);
      const { employee_ids, new_salary, effective_date, reason } = data;
      await Promise.all(
        (employee_ids || []).map((empId: number) =>
          HRMApiService.updateEmployeeSalary(empId, new_salary, effective_date, reason || "Bulk update")
        )
      );
      await loadData();
      toast({ title: "Success", description: `Salary updated for ${(employee_ids || []).length} employees` });
      setActiveTab("history");
    } catch (err) {
      toast({ title: "Error", description: "Failed to apply bulk update", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const totalEmployees = employees.length;
  const pendingIncrements = 0;
  const pendingPromotions = 0;
  
  // Calculate stats from history
  const totalIncrements = salaryHistory.filter((h: any) => !h.reason?.includes("Promotion")).length;
  const totalPromotions = salaryHistory.filter((h: any) => h.reason?.includes("Promotion")).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Salary Updates & Promotions</h1>
          <p className="text-muted-foreground mt-1">
            Manage employee salary increments and promotions
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {totalEmployees} Employees
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Employees
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployees}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Increments
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {pendingIncrements}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalIncrements} total increments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Promotions
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {pendingPromotions}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalPromotions} total promotions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              History Records
            </CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSalaryHistory}</div>
            <p className="text-xs text-muted-foreground">
              Salary changes tracked
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="increment" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Salary Increment
          </TabsTrigger>
          <TabsTrigger value="promotion" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Promotion
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            Bulk Update
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="increment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Salary Increment
              </CardTitle>
              <CardDescription>
                Process salary increases for individual employees
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SalaryIncrementForm
                employees={employees as any}
                onSubmit={handleSalaryIncrement}
                onCancel={() => setActiveTab("history")}
                loading={loading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="promotion" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Employee Promotion
              </CardTitle>
              <CardDescription>
                Handle employee promotions with designation and salary changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PromotionForm
                employees={employees as any}
                departments={departments as any}
                designations={designations as any}
                onSubmit={handlePromotion}
                onCancel={() => setActiveTab("history")}
                loading={loading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5" />
                Bulk Salary Update
              </CardTitle>
              <CardDescription>
                Apply salary increments to multiple employees at once (e.g.,
                annual increments)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BulkSalaryUpdateForm
                employees={employees as any}
                departments={departments as any}
                designations={designations as any}
                onSubmit={handleBulkSalaryUpdate}
                onCancel={() => setActiveTab("history")}
                loading={loading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Salary History
              </CardTitle>
              <CardDescription>
                View all salary changes and updates across the organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SalaryHistory
                history={salaryHistory}
                employees={employees as any}
                loading={loading}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SalaryUpdatePage;
