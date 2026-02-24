"use client";

import { useMemo, useState, useEffect } from "react"
import {
  Building2,
  RefreshCw,
  TrendingUp,
  Wallet,
  ArrowUpRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/sonner"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ChartOfAccountsApiService,
  ReportsApiService,
  type CcAccountSummary
} from "@/services/accounts-api"
import { useFormatting } from "@/hooks/useFormatting"

export default function DcWiseAccounts() {
  const { formatCurrency } = useFormatting()
  
  const [summaryData, setSummaryData] = useState<CcAccountSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [expandedCc, setExpandedCc] = useState<number | null>(null)

  const loadData = async () => {
    try {
      setIsLoading(true)
      const data = await ReportsApiService.getCcSummary()
      setSummaryData(data)
    } catch (error) {
      console.error('Error loading CC summary:', error)
      toast.error('Failed to load DC-wise accounts summary')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleGenerateAccounts = async () => {
    try {
      setIsGenerating(true)
      const result = await ChartOfAccountsApiService.generateCcAccounts()
      toast.success(result.message, {
        description: `Created ${result.createdCount} new accounts and converted ${result.convertedToControl} to control accounts.`,
      })
      loadData()
    } catch (error: any) {
      console.error('Error generating accounts:', error)
      toast.error('Failed to generate DC-specific accounts', {
        description: error.message || 'Please check your connection and try again.'
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const toggleExpand = (ccId: number) => {
    setExpandedCc(expandedCc === ccId ? null : ccId)
  }

  const totalAcrossDcs = useMemo(() => {
    return summaryData.reduce((acc, cc) => ({
      assets: acc.assets + cc.totals.assets,
      liabilities: acc.liabilities + cc.totals.liabilities,
      equity: acc.equity + cc.totals.equity,
      revenue: acc.revenue + cc.totals.revenue,
      expenses: acc.expenses + cc.totals.expenses,
    }), { assets: 0, liabilities: 0, equity: 0, revenue: 0, expenses: 0 })
  }, [summaryData])

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">DC-wise Accounts</h1>
          <p className="text-muted-foreground mt-1">
            Visualise financial performance and balances across your distribution network.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={loadData} 
            disabled={isLoading}
            className="glass"
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
          <Button 
            onClick={handleGenerateAccounts} 
            disabled={isGenerating}
            className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
          >
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            Build DC Hierarchy
          </Button>
        </div>
      </div>

      {/* Global Summary Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        {[
          { label: "Total Assets", val: totalAcrossDcs.assets, icon: Wallet, color: "text-emerald-500" },
          { label: "Total Liabilities", val: totalAcrossDcs.liabilities, icon: AlertCircle, color: "text-rose-500" },
          { label: "Network Equity", val: totalAcrossDcs.equity, icon: Building2, color: "text-primary" },
          { label: "Network Revenue", val: totalAcrossDcs.revenue, icon: TrendingUp, color: "text-emerald-600" },
          { label: "Network Expenses", val: Math.abs(totalAcrossDcs.expenses), icon: ArrowUpRight, color: "text-rose-600" },
        ].map((stat) => (
          <Card key={stat.label} className="glass border-border/40 hover:border-primary/40 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stat.val)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold px-1">Distribution Centers</h2>
        {summaryData.length === 0 && !isLoading ? (
          <Card className="glass py-12 text-center border-dashed">
            <CardContent className="space-y-3">
              <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                <Building2 className="text-primary h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-medium">No DC-specific accounts found</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Use the "Build DC Hierarchy" button above to automatically create accounts for each distribution center.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {summaryData.map((cc) => (
              <Card key={cc.costCenterId} className="glass border-border/60 overflow-hidden group">
                <div 
                  className="p-6 cursor-pointer hover:bg-muted/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                  onClick={() => toggleExpand(cc.costCenterId)}
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-2xl group-hover:bg-primary/20 transition-colors">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold">{cc.costCenterName}</h3>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-tighter">
                          {cc.costCenterCode}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {cc.accounts.length} linked posting accounts
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-6">
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Net Cash</p>
                      <p className="text-sm font-bold">{formatCurrency(cc.totals.assets - cc.totals.liabilities)}</p>
                    </div>
                    <Separator orientation="vertical" className="h-8 hidden md:block" />
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold text-emerald-600/70 tracking-widest">Revenue</p>
                      <p className="text-sm font-bold text-emerald-600">{formatCurrency(cc.totals.revenue)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold text-rose-600/70 tracking-widest">Expenses</p>
                      <p className="text-sm font-bold text-rose-600">{formatCurrency(Math.abs(cc.totals.expenses))}</p>
                    </div>
                    {expandedCc === cc.costCenterId ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                  </div>
                </div>

                {expandedCc === cc.costCenterId && (
                  <CardContent className="p-0 border-t bg-muted/5 animate-in slide-in-from-top-2 duration-300">
                    <div className="p-1">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="w-[120px] text-[10px] uppercase font-bold">Code</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold">Account Name</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold">Category</TableHead>
                            <TableHead className="text-right text-[10px] uppercase font-bold">Balance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cc.accounts.map((account) => (
                            <TableRow key={account.id} className="hover:bg-muted/50 border-border/40 transition-colors">
                              <TableCell className="font-mono text-xs">{account.code}</TableCell>
                              <TableCell className="font-medium text-sm">{account.name}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-tighter">
                                  {account.category}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-bold text-sm">
                                {formatCurrency(account.balance)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <style jsx global>{`
        .glass {
          background: rgba(var(--background), 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(var(--border), 0.5);
        }
      `}</style>
    </div>
  )
}
