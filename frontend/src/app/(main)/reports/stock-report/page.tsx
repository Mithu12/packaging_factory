"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Package,
  AlertTriangle,
  Search,
  BarChart3,
  ShoppingCart,
  TrendingDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFormatting } from "@/hooks/useFormatting";
import { pdf } from "@react-pdf/renderer";
import { StockReportPDF } from "@/modules/inventory/components/reports/StockReportPDF";
import { SettingsApi } from "@/services/settings-api";
import { CompanySettings } from "@/services/settings-types";
import {
  StockReportsApi,
  StockSummary,
  StockOverviewRow,
  StockByCategoryRow,
  LowStockRow,
} from "@/modules/inventory/services/stock-reports-api";

export default function StockReportPage() {
  const [activeTab, setActiveTab] = useState("summary");
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState("");

  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [overview, setOverview] = useState<StockOverviewRow[]>([]);
  const [byCategory, setByCategory] = useState<StockByCategoryRow[]>([]);
  const [lowStock, setLowStock] = useState<LowStockRow[]>([]);

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
          if (ctx) { ctx.drawImage(img, 0, 0); resolve(canvas.toDataURL("image/png")); }
          else resolve(null);
        } catch { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = logoUrl.startsWith("http") ? logoUrl : `${process.env.NEXT_PUBLIC_API_URL?.replace("/api", "")}${logoUrl}`;
    });
  };

  const formatCurrencyForPDF = (val: number) => formatCurrency(val).replace(/৳/g, "TK");

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, overviewRes, categoryRes, lowStockRes] = await Promise.all([
        StockReportsApi.getSummary(),
        StockReportsApi.getOverview({ search: search || undefined }),
        StockReportsApi.getByCategory(),
        StockReportsApi.getLowStock(),
      ]);
      setSummary(summaryRes);
      setOverview(overviewRes);
      setByCategory(categoryRes);
      setLowStock(lowStockRes);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load stock report data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [search, toast]);

  const buildPdf = () =>
    pdf(
      <StockReportPDF
        companySettings={companySettings}
        logoBase64={logoBase64}
        summary={summary}
        overview={overview}
        byCategory={byCategory}
        lowStock={lowStock}
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
      if (printWindow) printWindow.onload = () => printWindow.print();
    } catch {
      toast({ title: "Error", description: "Failed to generate print document.", variant: "destructive" });
    } finally { setPrinting(false); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await buildPdf();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `stock-report.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      toast({ title: "Error", description: "Failed to export report.", variant: "destructive" });
    } finally { setExporting(false); }
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
      } catch (error) { console.error("Error loading settings:", error); }
    };
    loadSettings();
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  return (
    <div className="flex-1 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-2 md:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Stock Report</h2>
          <p className="text-muted-foreground">Current inventory levels, stock values, and low stock alerts.</p>
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
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
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
                <CardTitle className="text-sm font-medium text-blue-50">Total Products</CardTitle>
                <Package className="h-4 w-4 text-blue-100" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-white">{summary.total_products}</div>
                <p className="text-xs text-blue-100 mt-1">{summary.total_stock_qty.toLocaleString()} units in stock</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden group border-none shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 opacity-90 transition-transform group-hover:scale-105 duration-500" />
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-emerald-50">Stock Value</CardTitle>
                <BarChart3 className="h-4 w-4 text-emerald-100" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-white">{formatCurrency(summary.total_stock_value)}</div>
                <p className="text-xs text-emerald-100 mt-1">Across {summary.dc_count} locations</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden group border-none shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 opacity-90 transition-transform group-hover:scale-105 duration-500" />
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-amber-50">Low Stock</CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-100" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-white">{summary.low_stock}</div>
                <p className="text-xs text-amber-100 mt-1">Products below reorder point</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden group border-none shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-rose-600 opacity-90 transition-transform group-hover:scale-105 duration-500" />
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-red-50">Out of Stock</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-100" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-white">{summary.out_of_stock}</div>
                <p className="text-xs text-red-100 mt-1">Products with zero stock</p>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-white/50 backdrop-blur-sm dark:bg-slate-950/50 p-1">
              <TabsTrigger value="summary" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Summary
              </TabsTrigger>
              <TabsTrigger value="overview" className="gap-2">
                <Package className="w-4 h-4" />
                Stock Overview
              </TabsTrigger>
              <TabsTrigger value="category" className="gap-2">
                <ShoppingCart className="w-4 h-4" />
                By Category
              </TabsTrigger>
              <TabsTrigger value="lowStock" className="gap-2">
                <AlertTriangle className="w-4 h-4" />
                Low Stock ({lowStock.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Stock by Category</CardTitle></CardHeader>
                  <CardContent>
                    {summary.categories.length > 0 ? (
                      <div className="space-y-3">
                        {summary.categories.map((c, i) => (
                          <div key={i} className="flex justify-between items-center">
                            <div>
                              <span className="text-sm font-medium">{c.category_name}</span>
                              <span className="text-xs text-muted-foreground ml-2">({c.product_count})</span>
                            </div>
                            <span className="text-sm font-semibold">{formatCurrency(c.total_value)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No category data</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-sm">Stock Health</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                        <span className="text-sm">Healthy Stock</span>
                        <span className="font-bold text-green-600">{summary.total_products - summary.low_stock - summary.out_of_stock}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                        <span className="text-sm">Low Stock</span>
                        <span className="font-bold text-yellow-600">{summary.low_stock}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                        <span className="text-sm">Out of Stock</span>
                        <span className="font-bold text-red-600">{summary.out_of_stock}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>Stock Overview</CardTitle>
                  <CardDescription>Current stock levels for all active products</CardDescription>
                </CardHeader>
                <CardContent>
                  {overview.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="font-semibold">Code</TableHead>
                            <TableHead className="font-semibold">Product</TableHead>
                            <TableHead className="font-semibold">Category</TableHead>
                            <TableHead className="font-semibold text-right">Stock</TableHead>
                            <TableHead className="font-semibold text-right">Reserved</TableHead>
                            <TableHead className="font-semibold text-right">Available</TableHead>
                            <TableHead className="font-semibold text-right">Value</TableHead>
                            <TableHead className="font-semibold text-center">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {overview.map((p) => (
                            <TableRow key={p.id}>
                              <TableCell className="font-mono text-xs font-semibold">{p.product_code}</TableCell>
                              <TableCell>{p.name}</TableCell>
                              <TableCell className="text-muted-foreground text-xs">{p.category_name}</TableCell>
                              <TableCell className="text-right">{p.stock_qty}</TableCell>
                              <TableCell className="text-right text-muted-foreground">{p.reserved_qty}</TableCell>
                              <TableCell className="text-right font-medium">{p.available_qty}</TableCell>
                              <TableCell className="text-right font-semibold">{formatCurrency(p.stock_value)}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant={p.is_out_of_stock ? "destructive" : p.is_low_stock ? "default" : "secondary"}>
                                  {p.is_out_of_stock ? "OOS" : p.is_low_stock ? "LOW" : "OK"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No stock data found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="category">
              <Card>
                <CardHeader>
                  <CardTitle>Stock by Category</CardTitle>
                  <CardDescription>Inventory breakdown by product category</CardDescription>
                </CardHeader>
                <CardContent>
                  {byCategory.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="font-semibold">Category</TableHead>
                            <TableHead className="font-semibold text-right">Products</TableHead>
                            <TableHead className="font-semibold text-right">Total Stock</TableHead>
                            <TableHead className="font-semibold text-right">Stock Value</TableHead>
                            <TableHead className="font-semibold text-right">Potential Revenue</TableHead>
                            <TableHead className="font-semibold text-right">Out of Stock</TableHead>
                            <TableHead className="font-semibold text-right">Low Stock</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {byCategory.map((c, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{c.category_name}</TableCell>
                              <TableCell className="text-right">{c.product_count}</TableCell>
                              <TableCell className="text-right">{c.total_stock.toLocaleString()}</TableCell>
                              <TableCell className="text-right font-semibold">{formatCurrency(c.total_value)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(c.potential_revenue)}</TableCell>
                              <TableCell className="text-right">
                                {c.out_of_stock_count > 0 ? (
                                  <Badge variant="destructive">{c.out_of_stock_count}</Badge>
                                ) : <span className="text-muted-foreground">0</span>}
                              </TableCell>
                              <TableCell className="text-right">
                                {c.low_stock_count > 0 ? (
                                  <Badge variant="default">{c.low_stock_count}</Badge>
                                ) : <span className="text-muted-foreground">0</span>}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No category data found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="lowStock">
              <Card>
                <CardHeader>
                  <CardTitle>Low Stock Products</CardTitle>
                  <CardDescription>Products at or below reorder point</CardDescription>
                </CardHeader>
                <CardContent>
                  {lowStock.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="font-semibold">Code</TableHead>
                            <TableHead className="font-semibold">Product</TableHead>
                            <TableHead className="font-semibold">Category</TableHead>
                            <TableHead className="font-semibold text-right">Stock</TableHead>
                            <TableHead className="font-semibold text-right">Reorder Point</TableHead>
                            <TableHead className="font-semibold text-right">Shortage</TableHead>
                            <TableHead className="font-semibold text-right">Stock %</TableHead>
                            <TableHead className="font-semibold">Supplier</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lowStock.map((p) => (
                            <TableRow key={p.id}>
                              <TableCell className="font-mono text-xs font-semibold">{p.product_code}</TableCell>
                              <TableCell>{p.name}</TableCell>
                              <TableCell className="text-muted-foreground text-xs">{p.category_name}</TableCell>
                              <TableCell className="text-right font-bold text-red-600">{p.total_stock}</TableCell>
                              <TableCell className="text-right">{p.reorder_point}</TableCell>
                              <TableCell className="text-right font-semibold text-red-600">{p.shortage}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-16 bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                                    <div
                                      className={`h-2 rounded-full ${p.stock_percentage === 0 ? "bg-red-500" : p.stock_percentage < 50 ? "bg-yellow-500" : "bg-green-500"}`}
                                      style={{ width: `${Math.min(p.stock_percentage, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs">{p.stock_percentage}%</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs">
                                {p.supplier_name || "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No low stock products. All items are well stocked!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <Card className="flex h-[400px] flex-col items-center justify-center border-none shadow-md bg-white/50 backdrop-blur-sm dark:bg-slate-950/50">
          <Package className="h-10 w-10 text-muted-foreground opacity-20 mb-4" />
          <p className="text-muted-foreground">No stock data available.</p>
        </Card>
      )}
    </div>
  );
}
