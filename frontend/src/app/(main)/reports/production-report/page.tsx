"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RefreshCw,
  Printer,
  Download,
  Loader2,
  Factory,
  Package,
  TrendingUp,
  Clock,
  AlertTriangle,
  BarChart3,
  Wrench,
} from "lucide-react";
import { DateRange } from "react-day-picker";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { QuickDateFilter, DatePreset } from "@/components/ui/quick-date-filter";
import {
  ProductionReportApi,
  ProductionSummary,
  WorkOrderRow,
  ProductionRunRow,
  LineUtilizationRow,
  WastageReport,
} from "@/modules/factory/services/production-report-api";
import { useFormatting } from "@/hooks/useFormatting";
import { pdf } from "@react-pdf/renderer";
import { ProductionReportPDF } from "@/modules/factory/components/reports/ProductionReportPDF";
import { SettingsApi } from "@/services/settings-api";
import { CompanySettings } from "@/services/settings-types";

export default function ProductionReportPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [activeTab, setActiveTab] = useState("summary");
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [summary, setSummary] = useState<ProductionSummary | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrderRow[]>([]);
  const [runs, setRuns] = useState<ProductionRunRow[]>([]);
  const [lines, setLines] = useState<LineUtilizationRow[]>([]);
  const [wastage, setWastage] = useState<WastageReport | null>(null);

  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  const { formatCurrency } = useFormatting();
  const { toast } = useToast();

  const loadLogoAsBase64 = (logoUrl: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/png"));
          } else resolve(null);
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = logoUrl.startsWith("http")
        ? logoUrl
        : `${process.env.NEXT_PUBLIC_API_URL?.replace("/api", "")}${logoUrl}`;
    });
  };

  const formatCurrencyForPDF = (val: number) => formatCurrency(val).replace(/৳/g, "TK");

  const fetchReports = useCallback(async () => {
    if (!dateRange?.from) return;
    setLoading(true);
    try {
      const params = {
        start_date: format(dateRange.from, "yyyy-MM-dd"),
        end_date: dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : format(dateRange.from, "yyyy-MM-dd"),
      };

      const [summaryRes, workOrdersRes, runsRes, linesRes, wastageRes] = await Promise.all([
        ProductionReportApi.getSummary(params),
        ProductionReportApi.getWorkOrders(params),
        ProductionReportApi.getProductionRuns(params),
        ProductionReportApi.getLineUtilization(params),
        ProductionReportApi.getWastageSummary(params),
      ]);

      setSummary(summaryRes);
      setWorkOrders(workOrdersRes);
      setRuns(runsRes);
      setLines(linesRes);
      setWastage(wastageRes);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load production report data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [dateRange, toast]);

  const handleDateChange = (range: DateRange | undefined, _preset: DatePreset) => {
    setDateRange(range);
  };

  const buildPdf = () =>
    pdf(
      <ProductionReportPDF
        dateRange={{
          from: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
          to: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
        }}
        companySettings={companySettings}
        logoBase64={logoBase64}
        summary={summary}
        workOrders={workOrders}
        runs={runs}
        lines={lines}
        wastage={wastage}
        activeTab={activeTab}
        formatCurrency={formatCurrencyForPDF}
      />
    ).toBlob();

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const blob = await buildPdf();
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url);
      if (printWindow) {
        printWindow.onload = () => printWindow.print();
      }
    } catch {
      toast({ title: "Error", description: "Failed to generate print document.", variant: "destructive" });
    } finally {
      setPrinting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await buildPdf();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `production-report-${format(new Date(), "yyyyMMdd")}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      toast({ title: "Error", description: "Failed to export report.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await SettingsApi.getCompanySettings();
        setCompanySettings(settings);
        if (settings.invoice_logo) {
          const base64 = await loadLogoAsBase64(settings.invoice_logo);
          setLogoBase64(base64);
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const statusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "in_progress": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "on_hold": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "cancelled": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case "urgent": return "destructive" as const;
      case "high": return "default" as const;
      default: return "secondary" as const;
    }
  };

  return (
    <div className="flex-1 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-2 md:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Production Report</h2>
          <p className="text-muted-foreground">Work orders, production runs, and line utilization analytics.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={fetchReports} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handlePrint} disabled={printing || loading}>
            {printing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
            Print
          </Button>
          <Button onClick={handleExport} disabled={exporting || loading}>
            {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Export PDF
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm dark:bg-slate-950/50">
        <CardContent className="p-4">
          <QuickDateFilter onDateChange={handleDateChange} defaultPreset="this_month" className="w-full" />
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : summary ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="relative overflow-hidden group border-none shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-700 opacity-90 transition-transform group-hover:scale-105 duration-500" />
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-50">Work Orders</CardTitle>
                <Factory className="h-4 w-4 text-blue-100" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-white">{summary.total_work_orders}</div>
                <p className="text-xs text-blue-100 mt-1">{summary.completion_rate.toFixed(1)}% completion rate</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden group border-none shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 opacity-90 transition-transform group-hover:scale-105 duration-500" />
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-emerald-50">Total Produced</CardTitle>
                <Package className="h-4 w-4 text-emerald-100" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-white">{summary.total_produced.toLocaleString()}</div>
                <p className="text-xs text-emerald-100 mt-1">{summary.total_good.toLocaleString()} good units</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden group border-none shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-violet-600 opacity-90 transition-transform group-hover:scale-105 duration-500" />
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-50">Avg Efficiency</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-100" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-white">{summary.avg_efficiency.toFixed(1)}%</div>
                <p className="text-xs text-purple-100 mt-1">{summary.completed_runs} runs completed</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden group border-none shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 opacity-90 transition-transform group-hover:scale-105 duration-500" />
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-amber-50">Rejection Rate</CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-100" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-white">{summary.rejection_rate.toFixed(1)}%</div>
                <p className="text-xs text-amber-100 mt-1">{summary.total_rejected.toLocaleString()} rejected</p>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-white/50 backdrop-blur-sm dark:bg-slate-950/50 p-1">
              <TabsTrigger value="summary" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Summary
              </TabsTrigger>
              <TabsTrigger value="workOrders" className="gap-2">
                <Factory className="w-4 h-4" />
                Work Orders
              </TabsTrigger>
              <TabsTrigger value="runs" className="gap-2">
                <Package className="w-4 h-4" />
                Runs
              </TabsTrigger>
              <TabsTrigger value="lines" className="gap-2">
                <Wrench className="w-4 h-4" />
                Lines
              </TabsTrigger>
              <TabsTrigger value="wastage" className="gap-2">
                <AlertTriangle className="w-4 h-4" />
                Wastage
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Order Status Breakdown</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Completed</span>
                      <Badge className="bg-green-100 text-green-800">{summary.completed_orders}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">In Progress</span>
                      <Badge className="bg-blue-100 text-blue-800">{summary.in_progress_orders}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Pending</span>
                      <Badge className="bg-yellow-100 text-yellow-800">{summary.pending_orders}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">On Hold</span>
                      <Badge className="bg-orange-100 text-orange-800">{summary.on_hold_orders}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Cancelled</span>
                      <Badge className="bg-red-100 text-red-800">{summary.cancelled_orders}</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-sm">Quantity Overview</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Target Quantity</span>
                      <span className="font-semibold">{summary.total_target_qty.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Produced</span>
                      <span className="font-semibold text-blue-600">{summary.total_produced.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Good Quantity</span>
                      <span className="font-semibold text-green-600">{summary.total_good.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Rejected Quantity</span>
                      <span className="font-semibold text-red-600">{summary.total_rejected.toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-sm">Time & Efficiency</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Estimated Hours</span>
                      <span className="font-semibold">{summary.total_estimated_hours.toFixed(1)}h</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Actual Hours</span>
                      <span className="font-semibold">{summary.total_actual_hours.toFixed(1)}h</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Avg Efficiency</span>
                      <span className="font-semibold">{summary.avg_efficiency.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Avg Quality</span>
                      <span className="font-semibold">{summary.avg_quality.toFixed(1)}%</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="workOrders">
              <Card>
                <CardHeader>
                  <CardTitle>Work Orders</CardTitle>
                  <CardDescription>All work orders in the selected period</CardDescription>
                </CardHeader>
                <CardContent>
                  {workOrders.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="font-semibold">Work Order</TableHead>
                            <TableHead className="font-semibold">Product</TableHead>
                            <TableHead className="font-semibold text-right">Target</TableHead>
                            <TableHead className="font-semibold text-right">Produced</TableHead>
                            <TableHead className="font-semibold text-right">Good</TableHead>
                            <TableHead className="font-semibold text-right">Rejected</TableHead>
                            <TableHead className="font-semibold text-center">Priority</TableHead>
                            <TableHead className="font-semibold text-center">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {workOrders.map((wo) => (
                            <TableRow key={wo.id}>
                              <TableCell>
                                <div className="font-medium font-mono text-xs">{wo.work_order_number}</div>
                                <div className="text-xs text-muted-foreground">{wo.product_sku}</div>
                              </TableCell>
                              <TableCell>{wo.product_name}</TableCell>
                              <TableCell className="text-right">{wo.target_quantity}</TableCell>
                              <TableCell className="text-right">{wo.produced_quantity}</TableCell>
                              <TableCell className="text-right text-green-600">{wo.good_quantity}</TableCell>
                              <TableCell className="text-right text-red-600">{wo.rejected_quantity}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant={priorityColor(wo.priority)}>{wo.priority}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge className={statusColor(wo.status)}>{wo.status}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Factory className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No work orders found for the selected period</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="runs">
              <Card>
                <CardHeader>
                  <CardTitle>Production Runs</CardTitle>
                  <CardDescription>Detailed run-level production data</CardDescription>
                </CardHeader>
                <CardContent>
                  {runs.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="font-semibold">Run #</TableHead>
                            <TableHead className="font-semibold">Work Order</TableHead>
                            <TableHead className="font-semibold">Product</TableHead>
                            <TableHead className="font-semibold">Line</TableHead>
                            <TableHead className="font-semibold text-right">Target</TableHead>
                            <TableHead className="font-semibold text-right">Produced</TableHead>
                            <TableHead className="font-semibold text-right">Efficiency</TableHead>
                            <TableHead className="font-semibold text-right">Quality</TableHead>
                            <TableHead className="font-semibold text-center">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {runs.map((r) => (
                            <TableRow key={r.id}>
                              <TableCell className="font-mono text-xs font-semibold">{r.run_number}</TableCell>
                              <TableCell className="font-mono text-xs">{r.work_order_number}</TableCell>
                              <TableCell>{r.product_name}</TableCell>
                              <TableCell className="text-muted-foreground">{r.line_name || "—"}</TableCell>
                              <TableCell className="text-right">{r.target_quantity}</TableCell>
                              <TableCell className="text-right">{r.produced_quantity}</TableCell>
                              <TableCell className="text-right">{r.efficiency_percentage.toFixed(1)}%</TableCell>
                              <TableCell className="text-right">{r.quality_percentage.toFixed(1)}%</TableCell>
                              <TableCell className="text-center">
                                <Badge className={statusColor(r.status)}>{r.status}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No production runs found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="lines">
              <Card>
                <CardHeader>
                  <CardTitle>Production Line Utilization</CardTitle>
                  <CardDescription>Line performance and utilization metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  {lines.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="font-semibold">Line</TableHead>
                            <TableHead className="font-semibold">Code</TableHead>
                            <TableHead className="font-semibold text-right">Capacity</TableHead>
                            <TableHead className="font-semibold text-right">Runs</TableHead>
                            <TableHead className="font-semibold text-right">Produced</TableHead>
                            <TableHead className="font-semibold text-right">Avg Efficiency</TableHead>
                            <TableHead className="font-semibold text-right">Utilization</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lines.map((l) => (
                            <TableRow key={l.id}>
                              <TableCell className="font-medium">{l.name}</TableCell>
                              <TableCell className="font-mono text-xs">{l.code}</TableCell>
                              <TableCell className="text-right">{l.capacity}</TableCell>
                              <TableCell className="text-right">{l.total_runs}</TableCell>
                              <TableCell className="text-right">{l.total_produced}</TableCell>
                              <TableCell className="text-right">{l.avg_efficiency.toFixed(1)}%</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-16 bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                                    <div
                                      className="bg-blue-600 h-2 rounded-full"
                                      style={{ width: `${Math.min(l.utilization_rate, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs">{l.utilization_rate.toFixed(0)}%</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Wrench className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No production line data found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="wastage">
              <Card>
                <CardHeader>
                  <CardTitle>Wastage Summary</CardTitle>
                  <CardDescription>Material wastage by reason and status</CardDescription>
                </CardHeader>
                <CardContent>
                  {wastage && wastage.wastage.length > 0 ? (
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="p-4 rounded-lg border bg-red-50 dark:bg-red-900/20 text-center">
                          <div className="text-2xl font-bold text-red-600">{formatCurrency(wastage.totals.total_cost)}</div>
                          <div className="text-sm text-muted-foreground mt-1">Total Wastage Cost</div>
                        </div>
                        <div className="p-4 rounded-lg border text-center">
                          <div className="text-2xl font-bold">{wastage.totals.total_records}</div>
                          <div className="text-sm text-muted-foreground mt-1">Total Records</div>
                        </div>
                        <div className="p-4 rounded-lg border bg-yellow-50 dark:bg-yellow-900/20 text-center">
                          <div className="text-2xl font-bold text-yellow-600">{wastage.totals.pending_count}</div>
                          <div className="text-sm text-muted-foreground mt-1">Pending Approval</div>
                        </div>
                      </div>

                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="font-semibold">Material</TableHead>
                            <TableHead className="font-semibold">Reason</TableHead>
                            <TableHead className="font-semibold text-right">Records</TableHead>
                            <TableHead className="font-semibold text-right">Quantity</TableHead>
                            <TableHead className="font-semibold text-right">Cost</TableHead>
                            <TableHead className="font-semibold text-center">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {wastage.wastage.map((w, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{w.material_name}</TableCell>
                              <TableCell>{w.wastage_reason}</TableCell>
                              <TableCell className="text-right">{w.record_count}</TableCell>
                              <TableCell className="text-right">{w.total_quantity}</TableCell>
                              <TableCell className="text-right font-semibold text-red-600">{formatCurrency(w.total_cost)}</TableCell>
                              <TableCell className="text-center">
                                <Badge className={statusColor(w.status)}>{w.status}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No wastage data found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <Card className="flex h-[400px] flex-col items-center justify-center border-none shadow-md bg-white/50 backdrop-blur-sm dark:bg-slate-950/50">
          <Factory className="h-10 w-10 text-muted-foreground opacity-20 mb-4" />
          <p className="text-muted-foreground">Select a date range to load production report data.</p>
        </Card>
      )}
    </div>
  );
}
