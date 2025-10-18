import React, { useState } from "react";
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
import {
  mockEmployees,
  mockDepartments,
  mockDesignations,
  mockSalaryHistory,
  mockSalaryIncrements,
  mockPromotions,
} from "../data/salary-update-data";

const SalaryUpdatePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState("increment");
  const [loading, setLoading] = useState(false);

  // Mock handlers for form submissions
  const handleSalaryIncrement = async (data: any) => {
    setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("Salary increment submitted:", data);
    setLoading(false);
    // In real implementation, this would make an API call
  };

  const handlePromotion = async (data: any) => {
    setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("Promotion submitted:", data);
    setLoading(false);
    // In real implementation, this would make an API call
  };

  const handleBulkSalaryUpdate = async (data: any) => {
    setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("Bulk salary update submitted:", data);
    setLoading(false);
    // In real implementation, this would make an API call
  };

  // Calculate summary statistics
  const totalEmployees = mockEmployees.length;
  const pendingIncrements = mockSalaryIncrements.filter(
    (inc) => inc.status === "pending_approval"
  ).length;
  const pendingPromotions = mockPromotions.filter(
    (pro) => pro.status === "pending_approval"
  ).length;
  const totalIncrements = mockSalaryIncrements.length;
  const totalPromotions = mockPromotions.length;

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
            <div className="text-2xl font-bold">{mockSalaryHistory.length}</div>
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
                employees={mockEmployees}
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
                employees={mockEmployees}
                departments={mockDepartments}
                designations={mockDesignations}
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
                employees={mockEmployees}
                departments={mockDepartments}
                designations={mockDesignations}
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
                history={mockSalaryHistory}
                employees={mockEmployees}
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
