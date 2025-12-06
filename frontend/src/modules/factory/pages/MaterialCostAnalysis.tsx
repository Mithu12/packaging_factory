"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  Package,
  Factory,
  Search,
  Filter,
  Download,
  RefreshCw,
  Calculator,
  Percent,
  ArrowUp,
  ArrowDown,
  Minus,
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
import { Progress } from "@/components/ui/progress";
import type { MaterialCostAnalysis, MaterialCostBreakdown } from "../types/bom";
import CostAnalysisApi, {
  CostAnalysisQueryParams,
  CostVarianceQueryParams,
  CostTrendQueryParams,
  CostCenterQueryParams,
} from "../services/cost-analysis-api";

interface CostVariance {
  workOrderId: string;
  workOrderNumber: string;
  productName: string;
  plannedCost: number;
  actualCost: number;
  variance: number;
  variancePercentage: number;
  status: "favorable" | "unfavorable" | "on_target";
}

interface CostTrend {
  period: string;
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  totalCost: number;
  costPerUnit: number;
}

interface CostCenter {
  id: string;
  name: string;
  totalCost: number;
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  efficiency: number;
  variance: number;
}

export default function MaterialCostAnalysis() {
  const router = useRouter();
  const { formatCurrency, formatDate, formatNumber } = useFormatting();
  const [costAnalyses, setCostAnalyses] = useState<MaterialCostAnalysis[]>([]);
  const [costVariances, setCostVariances] = useState<CostVariance[]>([]);
  const [costTrends, setCostTrends] = useState<CostTrend[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [periodFilter, setPeriodFilter] = useState<string>("month");
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] =
    useState<MaterialCostAnalysis | null>(null);

  // Load data from APIs
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load cost analyses
      const analysesResponse = await CostAnalysisApi.getMaterialCostAnalyses({
        search: searchTerm || undefined,
        sort_by: 'total_cost',
        sort_order: 'desc'
      });
      setCostAnalyses(analysesResponse.analyses);

      // Load cost variances
      const variancesResponse = await CostAnalysisApi.getCostVariances({
        search: searchTerm || undefined,
        sort_by: 'variance',
        sort_order: 'desc'
      });
      setCostVariances(variancesResponse.variances);

      // Load cost trends
      const trendsResponse = await CostAnalysisApi.getCostTrends({
        period_type: periodFilter as 'month' | 'quarter' | 'year',
      });
      setCostTrends(trendsResponse);

      // Load cost centers
      const costCentersResponse = await CostAnalysisApi.getCostCenters({
        search: searchTerm || undefined,
        sort_by: 'total_cost',
        sort_order: 'desc'
      });
      setCostCenters(costCentersResponse.cost_centers);

    } catch (err) {
      console.error('Error loading cost analysis data:', err);
      setError('Failed to load cost analysis data');
    } finally {
      setLoading(false);
    }
  };

  // Handle search and filtering
  const handleSearch = () => {
    loadAllData();
  };

  const handlePeriodFilterChange = (value: string) => {
    setPeriodFilter(value);
    // Reload trends when period filter changes
    CostAnalysisApi.getCostTrends({
      period_type: value as 'month' | 'quarter' | 'year',
    }).then(setCostTrends).catch(console.error);
  };

  const handleViewWorkOrder = (workOrderId: string) => {
    router.push(`/factory/work-orders`);
  };

  const handleViewBOM = (bomId: string) => {
    router.push(`/factory/bom/${bomId}/edit`);
  };

  const handleExportReport = () => {
    // In a real app, this would export the cost analysis report
    console.log("Exporting cost analysis report");
  };

  const filteredCostAnalyses = costAnalyses.filter((analysis) => {
    const matchesSearch =
      analysis.workOrderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      analysis.workOrderNumber
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      analysis.productName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return "text-red-600";
    if (variance < 0) return "text-green-600";
    return "text-gray-600";
  };

  const getVarianceIcon = (variance: number) => {
    if (variance > 0) return <ArrowUp className="h-4 w-4" />;
    if (variance < 0) return <ArrowDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const handleViewDetails = (analysis: MaterialCostAnalysis) => {
    setSelectedAnalysis(analysis);
    setShowDetailsDialog(true);
  };

  const getTotalMaterialCost = () => {
    return costAnalyses.reduce(
      (sum, analysis) => sum + analysis.materialCost,
      0
    );
  };

  const getTotalLaborCost = () => {
    return costAnalyses.reduce((sum, analysis) => sum + analysis.laborCost, 0);
  };

  const getTotalOverheadCost = () => {
    return costAnalyses.reduce(
      (sum, analysis) => sum + analysis.overheadCost,
      0
    );
  };

  const getTotalCost = () => {
    return costAnalyses.reduce((sum, analysis) => sum + analysis.totalCost, 0);
  };

  const getAverageCostPerUnit = () => {
    const totalQuantity = costAnalyses.reduce(
      (sum, analysis) => sum + analysis.quantity,
      0
    );
    return totalQuantity > 0 ? getTotalCost() / totalQuantity : 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Material Cost Analysis</h1>
          <p className="text-muted-foreground">
            Analyze material costs, variances, and trends across production
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => console.log("Refresh data")}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button>
            <Calculator className="h-4 w-4 mr-2" />
            Calculate Costs
          </Button>
        </div>
      </div>

      {/* Cost Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Material Cost
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(getTotalMaterialCost())}
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round((getTotalMaterialCost() / getTotalCost()) * 100)}% of
              total cost
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Labor Cost
            </CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(getTotalLaborCost())}
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round((getTotalLaborCost() / getTotalCost()) * 100)}% of
              total cost
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Overhead
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(getTotalOverheadCost())}
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round((getTotalOverheadCost() / getTotalCost()) * 100)}% of
              total cost
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Cost/Unit
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(getAverageCostPerUnit())}
            </div>
            <p className="text-xs text-muted-foreground">across all products</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="cost-analysis" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cost-analysis">Cost Analysis</TabsTrigger>
          <TabsTrigger value="variances">Cost Variances</TabsTrigger>
          <TabsTrigger value="trends">Cost Trends</TabsTrigger>
          <TabsTrigger value="cost-centers">Cost Centers</TabsTrigger>
        </TabsList>

        <TabsContent value="cost-analysis" className="space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search cost analyses..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Tabs value={periodFilter} onValueChange={handlePeriodFilterChange}>
                  <TabsList>
                    <TabsTrigger value="month">Month</TabsTrigger>
                    <TabsTrigger value="quarter">Quarter</TabsTrigger>
                    <TabsTrigger value="year">Year</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button onClick={handleSearch} disabled={loading}>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Cost Analysis Table */}
          <Card>
            <CardHeader>
              <CardTitle>Material Cost Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                    <p className="text-muted-foreground">Loading cost analyses...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center text-red-600">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                    <p>{error}</p>
                    <Button
                      variant="outline"
                      className="mt-2"
                      onClick={loadAllData}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Work Order</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Material Cost</TableHead>
                      <TableHead>Labor Cost</TableHead>
                      <TableHead>Total Cost</TableHead>
                      <TableHead>Cost/Unit</TableHead>
                      <TableHead>Variance</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {costAnalyses.map((analysis) => (
                      <TableRow key={analysis.workOrderId}>
                        <TableCell className="font-medium">
                          {analysis.workOrderId}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {analysis.productName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {analysis.workOrderNumber}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {analysis.quantity.toLocaleString()}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(analysis.materialCost)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(analysis.laborCost)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(analysis.totalCost)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(analysis.costPerUnit)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getVarianceIcon(analysis.costVariance)}
                            <span
                              className={getVarianceColor(analysis.costVariance)}
                            >
                              {formatCurrency(analysis.costVariance)}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              ({analysis.costVariancePercentage.toFixed(1)}%)
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(analysis)}
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {costAnalyses.length === 0 && !loading && !error && (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No cost analyses found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variances" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost Variances</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Work Order</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Planned Cost</TableHead>
                    <TableHead>Actual Cost</TableHead>
                    <TableHead>Variance</TableHead>
                    <TableHead>Variance %</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costVariances.map((variance) => (
                    <TableRow key={variance.workOrderId}>
                      <TableCell className="font-medium">
                        {variance.workOrderId}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {variance.productName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {variance.workOrderNumber}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(variance.plannedCost)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(variance.actualCost)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getVarianceIcon(variance.variance)}
                          <span className={getVarianceColor(variance.variance)}>
                            {formatCurrency(variance.variance)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={getVarianceColor(variance.variance)}>
                          {variance.variancePercentage.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            variance.status === "favorable"
                              ? "bg-green-100 text-green-800"
                              : variance.status === "unfavorable"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }
                        >
                          {variance.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Material Cost</TableHead>
                    <TableHead>Labor Cost</TableHead>
                    <TableHead>Overhead Cost</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Cost/Unit</TableHead>
                    <TableHead>Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costTrends.map((trend, index) => (
                    <TableRow key={trend.period}>
                      <TableCell className="font-medium">
                        {trend.period}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(trend.materialCost)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(trend.laborCost)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(trend.overheadCost)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(trend.totalCost)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(trend.costPerUnit)}
                      </TableCell>
                      <TableCell>
                        {index > 0 && (
                          <div className="flex items-center gap-2">
                            {trend.costPerUnit >
                            costTrends[index - 1].costPerUnit ? (
                              <>
                                <TrendingUp className="h-4 w-4 text-red-600" />
                                <span className="text-red-600">Increasing</span>
                              </>
                            ) : (
                              <>
                                <TrendingDown className="h-4 w-4 text-green-600" />
                                <span className="text-green-600">
                                  Decreasing
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cost-centers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost Center Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {costCenters.map((center) => (
                  <Card key={center.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-medium">{center.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Cost Center ID: {center.id}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Badge
                            className={
                              center.efficiency >= 90
                                ? "bg-green-100 text-green-800"
                                : center.efficiency >= 80
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }
                          >
                            {center.efficiency}% Efficiency
                          </Badge>
                          <Badge
                            className={
                              center.variance < 0
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }
                          >
                            {formatCurrency(center.variance)} Variance
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <div className="text-sm font-medium">Total Cost</div>
                          <div className="text-2xl font-bold">
                            {formatCurrency(center.totalCost)}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">
                            Material Cost
                          </div>
                          <div className="text-2xl font-bold">
                            {formatCurrency(center.materialCost)}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Labor Cost</div>
                          <div className="text-2xl font-bold">
                            {formatCurrency(center.laborCost)}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">
                            Overhead Cost
                          </div>
                          <div className="text-2xl font-bold">
                            {formatCurrency(center.overheadCost)}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Efficiency</span>
                          <span>{center.efficiency}%</span>
                        </div>
                        <Progress value={center.efficiency} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Cost Analysis Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Cost Analysis Details - {selectedAnalysis?.workOrderId}
            </DialogTitle>
            <DialogDescription>
              Detailed breakdown of material costs and variances
            </DialogDescription>
          </DialogHeader>

          {selectedAnalysis && (
            <div className="space-y-6">
              {/* Cost Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Cost Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm font-medium">Product</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedAnalysis.productName}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Quantity</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedAnalysis.quantity.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Total Cost</div>
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(selectedAnalysis.totalCost)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Cost per Unit</div>
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(selectedAnalysis.costPerUnit)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cost Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Cost Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Material Cost</span>
                      <span className="font-medium">
                        {formatCurrency(selectedAnalysis.materialCost)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Labor Cost</span>
                      <span className="font-medium">
                        {formatCurrency(selectedAnalysis.laborCost)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Overhead Cost</span>
                      <span className="font-medium">
                        {formatCurrency(selectedAnalysis.overheadCost)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-t pt-2">
                      <span className="font-medium">Total Cost</span>
                      <span className="font-medium text-lg">
                        {formatCurrency(selectedAnalysis.totalCost)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Material Breakdown */}
              {selectedAnalysis.materialBreakdown.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Material Cost Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Material</TableHead>
                          <TableHead>Quantity Used</TableHead>
                          <TableHead>Unit Cost</TableHead>
                          <TableHead>Total Cost</TableHead>
                          <TableHead>Cost %</TableHead>
                          <TableHead>Wastage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedAnalysis.materialBreakdown.map((material) => (
                          <TableRow key={material.materialId}>
                            <TableCell className="font-medium">
                              {material.materialName}
                            </TableCell>
                            <TableCell>{material.quantityUsed}</TableCell>
                            <TableCell>
                              {formatCurrency(material.unitCost)}
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(material.totalCost)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span>
                                  {material.costPercentage.toFixed(1)}%
                                </span>
                                <Progress
                                  value={material.costPercentage}
                                  className="h-2 w-16"
                                />
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{material.wastageQuantity} units</div>
                                <div className="text-muted-foreground">
                                  {formatCurrency(material.wastageCost)}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Cost Variance */}
              <Card>
                <CardHeader>
                  <CardTitle>Cost Variance Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Cost Variance</span>
                      <div className="flex items-center gap-2">
                        {getVarianceIcon(selectedAnalysis.costVariance)}
                        <span
                          className={getVarianceColor(
                            selectedAnalysis.costVariance
                          )}
                        >
                          {formatCurrency(selectedAnalysis.costVariance)}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Variance Percentage</span>
                      <span
                        className={getVarianceColor(
                          selectedAnalysis.costVariance
                        )}
                      >
                        {selectedAnalysis.costVariancePercentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          selectedAnalysis.costVariance < 0
                            ? "bg-green-600"
                            : "bg-red-600"
                        }`}
                        style={{
                          width: `${Math.min(
                            Math.abs(selectedAnalysis.costVariancePercentage),
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
