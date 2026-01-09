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
  BarChart3,
  Download,
  DollarSign,
  ShoppingCart,
  Printer,
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Receipt,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { DateRange } from "react-day-picker";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { QuickDateFilter, DatePreset } from "@/components/ui/quick-date-filter";
import { ExpenseReportsApi, ExpenseReportParams } from "@/modules/accounts/services/expense-reports-api";
import { Expense, ExpenseStats } from "@/services/types";
import { useFormatting } from "@/hooks/useFormatting";
import { cn } from "@/lib/utils";
import { pdf } from "@react-pdf/renderer";
import { ExpenseReportPDF } from "@/modules/accounts/components/reports/ExpenseReportPDF";
import { SettingsApi } from "@/services/settings-api";
import { CompanySettings } from "@/services/settings-types";

export default function ExpenseReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [activePreset, setActivePreset] = useState<DatePreset>("today");
  const [activeTab, setActiveTab] = useState("summary");
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  
  // Report data states
  const [expenseStats, setExpenseStats] = useState<ExpenseStats | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expensesTotal, setExpensesTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;
  
  // PDF export states
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  
  const { formatCurrency } = useFormatting();
  const { toast } = useToast();

  const fetchReports = useCallback(async () => {
    if (!dateRange?.from) return;
    
    setLoading(true);
    try {
      const params: ExpenseReportParams = {
        dateRange,
      };

      const [statsRes, detailedRes] = await Promise.all([
        ExpenseReportsApi.getExpenseSummary(params),
        ExpenseReportsApi.getDetailedExpenses({ ...params, page: currentPage, limit: pageSize }),
      ]);

      setExpenseStats(statsRes);
      setExpenses(detailedRes.expenses || []);
      setExpensesTotal(detailedRes.total || 0);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load expense reports data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [dateRange, currentPage, toast]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Load company settings for PDF
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

  const handleDateChange = (range: DateRange | undefined, preset: DatePreset) => {
    setDateRange(range);
    setActivePreset(preset);
    setCurrentPage(1);
  };

  const formatCurrencyForPDF = (val: number) => {
    return formatCurrency(val).replace(/৳/g, 'TK');
  };

  const loadLogoAsBase64 = (logoUrl: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const base64 = canvas.toDataURL('image/png');
            resolve(base64);
          } else resolve(null);
        } catch (e) { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = logoUrl.startsWith('http') ? logoUrl : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${logoUrl}`;
    });
  };

  const handlePrint = async () => {
    let reportType: 'expense-summary' | 'expense-details' | 'category-analysis' = 'expense-summary';
    if (activeTab === 'details') reportType = 'expense-details';
    else if (activeTab === 'categories') reportType = 'category-analysis';

    if (!expenseStats) {
      toast({ title: "No Data", description: "Please select a date range to load data before printing.", variant: "destructive" });
      return;
    }

    setPrinting(true);
    try {
      const blob = await pdf(
        <ExpenseReportPDF
          reportType={reportType}
          dateRange={{
            from: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
            to: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
          }}
          companySettings={companySettings}
          logoBase64={logoBase64}
          expenseStats={expenseStats}
          expenses={expenses}
          expensesTotal={expensesTotal}
          formatCurrency={formatCurrencyForPDF}
        />
      ).toBlob();

      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url);
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } catch (error) {
      console.error('Print error:', error);
      toast({ title: "Error", description: "Failed to generate print document.", variant: "destructive" });
    } finally {
      setPrinting(false);
    }
  };

  const handleExport = async (type: 'expense-summary' | 'expense-details' | 'category-analysis') => {
    if (!expenseStats) return;

    setExportLoading(type);
    try {
      const blob = await pdf(
        <ExpenseReportPDF
          reportType={type}
          dateRange={{
            from: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
            to: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
          }}
          companySettings={companySettings}
          logoBase64={logoBase64}
          expenseStats={expenseStats}
          expenses={expenses}
          expensesTotal={expensesTotal}
          formatCurrency={formatCurrencyForPDF}
        />
      ).toBlob();

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `expense-${type}-${format(new Date(), 'yyyyMMdd')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast({ title: "Error", description: "Failed to export report.", variant: "destructive" });
    } finally {
      setExportLoading(null);
    }
  };

  return (
    <div className="flex-1 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-2 md:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Expense Reports</h2>
          <p className="text-muted-foreground">
            Analyze company expenditures and spending patterns.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            onClick={handlePrint}
            disabled={printing || loading || !expenseStats}
          >
            {printing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
            Print
          </Button>
          <Button 
            onClick={() => handleExport(activeTab as any || 'expense-summary')}
            disabled={!!exportLoading || loading || !expenseStats}
          >
            {exportLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export PDF
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm dark:bg-slate-950/50">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block text-muted-foreground">Date Range</label>
              <QuickDateFilter
                onDateChange={handleDateChange}
                defaultPreset={activePreset}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : expenseStats ? (
        <div className="space-y-4">
          {/* Dashboard Summary Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="relative overflow-hidden group border-none shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-700 opacity-90 transition-transform group-hover:scale-105 duration-500" />
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-50">Total Expenses</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-100" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-white">{formatCurrency(expenseStats.total_amount)}</div>
                <p className="text-xs text-blue-100 mt-1">{expenseStats.total_expenses} total requests</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden group border-none shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 opacity-90 transition-transform group-hover:scale-105 duration-500" />
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-emerald-50">Paid Amount</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-emerald-100" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-white">{formatCurrency(expenseStats.paid_amount)}</div>
                <p className="text-xs text-emerald-100 mt-1">{expenseStats.paid_expenses} paid items</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden group border-none shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 opacity-90 transition-transform group-hover:scale-105 duration-500" />
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-amber-50">Pending Approval</CardTitle>
                <Clock className="h-4 w-4 text-amber-100" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-white">{formatCurrency(expenseStats.pending_amount)}</div>
                <p className="text-xs text-amber-100 mt-1">{expenseStats.pending_expenses} pending requests</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden group border-none shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500 to-pink-600 opacity-90 transition-transform group-hover:scale-105 duration-500" />
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-rose-50">Approved Unpaid</CardTitle>
                <FileText className="h-4 w-4 text-rose-100" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-white">{formatCurrency(expenseStats.approved_amount)}</div>
                <p className="text-xs text-rose-100 mt-1">{expenseStats.approved_expenses} approved items</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="summary" className="space-y-4" onValueChange={setActiveTab}>
            <TabsList className="bg-white/50 backdrop-blur-sm dark:bg-slate-950/50 p-1">
              <TabsTrigger value="summary">Summary View</TabsTrigger>
              <TabsTrigger value="categories">By Categories</TabsTrigger>
              <TabsTrigger value="details">Transaction Details</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 border-none shadow-md">
                  <CardHeader>
                    <CardTitle>Spending Trends</CardTitle>
                    <CardDescription>Monthly expenditure for the selected period</CardDescription>
                  </CardHeader>
                  <CardContent className="pl-2">
                    {/* Trend visualization Placeholder */}
                    <div className="h-[300px] flex items-center justify-center border-2 border-dashed rounded-lg bg-slate-50/50 dark:bg-slate-900/50">
                      <div className="text-center space-y-2">
                         <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground opacity-50" />
                         <p className="text-sm text-muted-foreground">Visualization of monthly trends</p>
                         <div className="flex gap-2">
                           {expenseStats.monthly_trends?.slice(-6).map(m => (
                             <div key={m.month} className="flex flex-col items-center">
                               <div 
                                 className="w-8 bg-primary/40 rounded-t" 
                                 style={{ height: `${Math.min(100, (m.total_amount / (expenseStats.total_amount || 1)) * 300)}px` }}
                               />
                               <span className="text-[10px] mt-1 rotate-45">{m.month}</span>
                             </div>
                           ))}
                         </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="col-span-3 border-none shadow-md">
                  <CardHeader>
                    <CardTitle>Category Distribution</CardTitle>
                    <CardDescription>Top spending categories</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {expenseStats.top_categories?.slice(0, 5).map((cat) => (
                        <div key={cat.category_id} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{cat.category_name}</span>
                            <span className="text-muted-foreground">{formatCurrency(cat.total_amount)}</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary" 
                              style={{ width: `${(cat.total_amount / (expenseStats.total_amount || 1)) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="categories" className="space-y-4">
              <Card className="border-none shadow-md">
                <CardHeader>
                  <CardTitle>Expense Categories Breakdown</CardTitle>
                  <CardDescription>Detailed analysis of spending across all categories</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category Name</TableHead>
                        <TableHead className="text-center">Count</TableHead>
                        <TableHead className="text-right">Total Spent</TableHead>
                        <TableHead className="text-right">% of Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenseStats.top_categories?.map((cat) => (
                        <TableRow key={cat.category_id}>
                          <TableCell className="font-medium">{cat.category_name}</TableCell>
                          <TableCell className="text-center">{cat.count}</TableCell>
                          <TableCell className="text-right">{formatCurrency(cat.total_amount)}</TableCell>
                          <TableCell className="text-right">
                            {((cat.total_amount / (expenseStats.total_amount || 1)) * 100).toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              <Card className="border-none shadow-md">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Recent Expense Transactions</CardTitle>
                    <CardDescription>Detailed list of individual expense items</CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {expensesTotal} Total Items
                  </Badge>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Expense #</TableHead>
                        <TableHead>Title/Vendor</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.length > 0 ? (
                        expenses.map((expense) => (
                          <TableRow key={expense.id}>
                            <TableCell>{format(new Date(expense.expense_date), "dd MMM yyyy")}</TableCell>
                            <TableCell className="font-mono text-xs font-semibold">{expense.expense_number}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{expense.title}</span>
                                <span className="text-xs text-muted-foreground">{expense.vendor_name || "N/A"}</span>
                              </div>
                            </TableCell>
                            <TableCell>{expense.category_name}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  expense.status === "paid" ? "default" :
                                  expense.status === "approved" ? "secondary" :
                                  expense.status === "pending" ? "outline" : "destructive"
                                }
                                className="capitalize text-[10px]"
                              >
                                {expense.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-bold underline decoration-primary/30 decoration-2">
                              {formatCurrency(expense.amount)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            No transactions found for this period.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {expensesTotal > pageSize && (
                    <div className="flex items-center justify-end space-x-2 py-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                      </Button>
                      <div className="text-sm font-medium">
                        Page {currentPage} of {Math.ceil(expensesTotal / pageSize)}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        disabled={currentPage >= Math.ceil(expensesTotal / pageSize)}
                      >
                        Next <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <Card className="flex h-[400px] flex-col items-center justify-center border-none shadow-md bg-white/50 backdrop-blur-sm">
          <AlertCircle className="h-10 w-10 text-muted-foreground opacity-20 mb-4" />
          <p className="text-muted-foreground">Select a date range to generate the report.</p>
        </Card>
      )}
    </div>
  );
}
