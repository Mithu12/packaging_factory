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
  Calculator,
  Package,
  DollarSign,
  BarChart3,
  Layers,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFormatting } from "@/hooks/useFormatting";
import { pdf } from "@react-pdf/renderer";
import { CostingReportPDF } from "@/modules/factory/components/reports/CostingReportPDF";
import { SettingsApi } from "@/services/settings-api";
import { CompanySettings } from "@/services/settings-types";
import {
  CostingReportApi,
  CostingSummary,
  BomDetail,
  MaterialCost,
} from "@/modules/factory/services/costing-report-api";

export default function CostingReportPage() {
  const [activeTab, setActiveTab] = useState("summary");
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [summary, setSummary] = useState<CostingSummary | null>(null);
  const [bomDetails, setBomDetails] = useState<BomDetail[]>([]);
  const [materialCosts, setMaterialCosts] = useState<MaterialCost[]>([]);

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
      const [summaryRes, bomRes, materialRes] = await Promise.all([
        CostingReportApi.getSummary(),
        CostingReportApi.getBomDetails(),
        CostingReportApi.getMaterialCosts(),
      ]);
      setSummary(summaryRes);
      setBomDetails(bomRes);
      setMaterialCosts(materialRes);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load costing report data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const buildPdf = () =>
    pdf(
      <CostingReportPDF
        companySettings={companySettings}
        logoBase64={logoBase64}
        summary={summary}
        bomDetails={bomDetails}
        materialCosts={materialCosts}
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
      link.setAttribute("download", `costing-report-${new Date().toISOString().split("T")[0]}.pdf`);
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
          <h2 className="text-3xl font-bold tracking-tight">Costing Report</h2>
          <p className="text-muted-foreground">BOM cost analysis, material costs, and product margins.</p>
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
                <CardTitle className="text-sm font-medium text-blue-50">Total BOMs</CardTitle>
                <Layers className="h-4 w-4 text-blue-100" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-white">{summary.total_boms}</div>
                <p className="text-xs text-blue-100 mt-1">{summary.products_with_bom} products</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden group border-none shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 opacity-90 transition-transform group-hover:scale-105 duration-500" />
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-emerald-50">Avg BOM Cost</CardTitle>
                <Calculator className="h-4 w-4 text-emerald-100" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-white">{formatCurrency(summary.avg_bom_cost)}</div>
                <p className="text-xs text-emerald-100 mt-1">Per product average</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden group border-none shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-violet-600 opacity-90 transition-transform group-hover:scale-105 duration-500" />
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-50">Materials</CardTitle>
                <Package className="h-4 w-4 text-purple-100" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-white">{summary.unique_materials}</div>
                <p className="text-xs text-purple-100 mt-1">Unique components</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden group border-none shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 opacity-90 transition-transform group-hover:scale-105 duration-500" />
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-amber-50">Total Material Cost</CardTitle>
                <DollarSign className="h-4 w-4 text-amber-100" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-white">{formatCurrency(summary.total_material_cost)}</div>
                <p className="text-xs text-amber-100 mt-1">Across all BOMs</p>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-white/50 backdrop-blur-sm dark:bg-slate-950/50 p-1">
              <TabsTrigger value="summary" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Summary
              </TabsTrigger>
              <TabsTrigger value="bom" className="gap-2">
                <Layers className="w-4 h-4" />
                BOM Details
              </TabsTrigger>
              <TabsTrigger value="materials" className="gap-2">
                <Package className="w-4 h-4" />
                Material Costs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary">
              <Card>
                <CardHeader><CardTitle>Top Cost Products</CardTitle></CardHeader>
                <CardContent>
                  {summary.top_cost_products.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-semibold">Product</TableHead>
                          <TableHead className="font-semibold">SKU</TableHead>
                          <TableHead className="font-semibold text-right">BOM Cost</TableHead>
                          <TableHead className="font-semibold">Version</TableHead>
                          <TableHead className="font-semibold text-right">Components</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {summary.top_cost_products.map((p, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{p.product_name}</TableCell>
                            <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(p.total_cost)}</TableCell>
                            <TableCell><Badge variant="outline">{p.version}</Badge></TableCell>
                            <TableCell className="text-right">{p.component_count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-12">
                      <Calculator className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No BOM data found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bom">
              <Card>
                <CardHeader>
                  <CardTitle>BOM Details</CardTitle>
                  <CardDescription>Bill of Materials with cost and margin analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  {bomDetails.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="font-semibold">Product</TableHead>
                            <TableHead className="font-semibold">SKU</TableHead>
                            <TableHead className="font-semibold">Version</TableHead>
                            <TableHead className="font-semibold text-right">BOM Cost</TableHead>
                            <TableHead className="font-semibold text-right">Selling Price</TableHead>
                            <TableHead className="font-semibold text-right">Margin</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bomDetails.map((b) => (
                            <TableRow key={b.bom_id}>
                              <TableCell className="font-medium">{b.product_name}</TableCell>
                              <TableCell className="font-mono text-xs">{b.sku}</TableCell>
                              <TableCell><Badge variant="outline">{b.version}</Badge></TableCell>
                              <TableCell className="text-right font-semibold">{formatCurrency(b.total_cost)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(b.selling_price)}</TableCell>
                              <TableCell className="text-right font-semibold text-green-600">{b.margin.toFixed(1)}%</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No BOM data found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="materials">
              <Card>
                <CardHeader>
                  <CardTitle>Material Costs</CardTitle>
                  <CardDescription>Component materials used across all BOMs</CardDescription>
                </CardHeader>
                <CardContent>
                  {materialCosts.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="font-semibold">Material</TableHead>
                            <TableHead className="font-semibold">SKU</TableHead>
                            <TableHead className="font-semibold text-right">Unit Cost</TableHead>
                            <TableHead className="font-semibold text-right">Used In BOMs</TableHead>
                            <TableHead className="font-semibold text-right">Total Cost</TableHead>
                            <TableHead className="font-semibold">Supplier</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {materialCosts.map((m) => (
                            <TableRow key={m.material_id}>
                              <TableCell className="font-medium">{m.material_name}</TableCell>
                              <TableCell className="font-mono text-xs">{m.sku}</TableCell>
                              <TableCell className="text-right">{formatCurrency(m.cost_price)}</TableCell>
                              <TableCell className="text-right">{m.used_in_boms}</TableCell>
                              <TableCell className="text-right font-semibold">{formatCurrency(m.total_cost_in_boms)}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{m.supplier_name || "—"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No material cost data found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <Card className="flex h-[400px] flex-col items-center justify-center border-none shadow-md bg-white/50 backdrop-blur-sm dark:bg-slate-950/50">
          <Calculator className="h-10 w-10 text-muted-foreground opacity-20 mb-4" />
          <p className="text-muted-foreground">No costing data available.</p>
        </Card>
      )}
    </div>
  );
}
