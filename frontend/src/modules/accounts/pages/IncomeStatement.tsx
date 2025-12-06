"use client";

import { useMemo, useState, useEffect } from "react"
import {
  Download,
  BarChart3,
  ArrowUpRight,
  Filter,
  Presentation,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/sonner"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { DateRange } from "react-day-picker"
import { format } from "date-fns"
import { 
  ReportsApiService,
  CostCentersApiService,
  type IncomeStatementSection,
  type FinancialMetric,
  type IncomeStatementResponse,
  type CostCenter
} from "@/services/accounts-api"
import { useFormatting } from "@/hooks/useFormatting"

const currencies = [
  { value: "BDT", label: "BDT" },
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
]

const renderSection = (section: IncomeStatementSection, depth = 0, formatCurrency: (value: number) => string) => {
  const paddingLeft = depth * 16
  const isNegative = section.amount < 0
  return (
    <div key={`${section.label}-${depth}`} className="space-y-2">
      <div
        className={`flex items-center justify-between rounded-lg border px-4 py-2 ${
          isNegative ? "bg-rose-50/60" : "bg-muted/30"
        }`}
        style={{ marginLeft: paddingLeft }}
      >
        <span className="text-sm font-medium">{section.label}</span>
        <span className={`text-sm font-semibold ${isNegative ? "text-rose-600" : "text-emerald-600"}`}>
          {formatCurrency(Math.abs(section.amount))}
        </span>
      </div>
      {section.children && section.children.length > 0 ? (
        <div className="space-y-2">
          {section.children.map((child) => renderSection(child, depth + 1, formatCurrency))}
        </div>
      ) : null}
    </div>
  )
}

export default function IncomeStatement() {
  const { formatCurrency } = useFormatting()
  
  // State for data
  const [incomeStatementData, setIncomeStatementData] = useState<IncomeStatementResponse | null>(null)
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Filter states
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), 0, 1), // Start of current year
    to: new Date() // Today
  })
  const [currency, setCurrency] = useState(currencies[0]?.value ?? "BDT")
  const [scenario, setScenario] = useState<'actual' | 'budget' | 'forecast'>("actual")
  const [costCenterFilter, setCostCenterFilter] = useState<string>("all")

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        const [costCentersResult] = await Promise.all([
          CostCentersApiService.getCostCenters({ limit: 1000 })
        ])
        
        setCostCenters(costCentersResult.data)
      } catch (error) {
        console.error('Error loading data:', error)
        toast.error('Failed to load cost centers')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // Load income statement when filters change
  useEffect(() => {
    const loadIncomeStatement = async () => {
      if (!dateRange?.from || !dateRange?.to) return
      
      try {
        setIsLoading(true)

        const params: any = {
          dateFrom: format(dateRange.from, 'yyyy-MM-dd'),
          dateTo: format(dateRange.to, 'yyyy-MM-dd'),
          scenario
        }

        if (costCenterFilter !== "all") {
          params.costCenterId = parseInt(costCenterFilter)
        }

        const result = await ReportsApiService.getIncomeStatement(params)
        setIncomeStatementData(result)
      } catch (error) {
        console.error('Error loading income statement:', error)
        toast.error('Failed to load income statement')
      } finally {
        setIsLoading(false)
      }
    }

    loadIncomeStatement()
  }, [dateRange, scenario, costCenterFilter])

  const totals = useMemo(() => {
    if (!incomeStatementData) {
      return {
        revenue: 0,
        expenses: 0,
        grossProfit: 0,
        netIncome: 0,
      }
    }
    return incomeStatementData.totals
  }, [incomeStatementData])

  const highlights = useMemo(() => {
    return incomeStatementData?.highlights || []
  }, [incomeStatementData])

  const sections = useMemo(() => {
    return incomeStatementData?.sections || []
  }, [incomeStatementData])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Income Statement</h1>
          <p className="text-sm text-muted-foreground">
            Automatically build profit and loss summaries from posted vouchers and the chart of accounts hierarchy.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Presentation className="mr-2 h-4 w-4" />
            Present mode
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <DateRangePicker
              date={dateRange}
              onDateChange={setDateRange}
              placeholder="Select period"
              className="md:col-span-1"
            />
            <Select value={scenario} onValueChange={(value) => setScenario(value as 'actual' | 'budget' | 'forecast')}>
              <SelectTrigger>
                <SelectValue placeholder="Scenario" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="actual">Actual</SelectItem>
                <SelectItem value="budget">Budget</SelectItem>
                <SelectItem value="forecast">Forecast</SelectItem>
              </SelectContent>
            </Select>
            <Select value={costCenterFilter} onValueChange={setCostCenterFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Cost Center" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cost Centers</SelectItem>
                {costCenters.map((center) => (
                  <SelectItem key={center.id} value={center.id.toString()}>
                    {center.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            Statement reflects approved vouchers only.
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-24 bg-muted animate-pulse rounded mb-2" />
                <div className="h-3 w-32 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))
        ) : (
          highlights.map((metric) => {
            const valueDisplay =
              metric.label.includes("Margin") || metric.label.includes("Turnover")
                ? `${(metric.amount * 100).toFixed(1)}%`
                : formatCurrency(metric.amount)

            const changeClass =
              metric.trend === "up"
                ? "text-emerald-600"
                : metric.trend === "down"
                ? "text-rose-600"
                : "text-muted-foreground"

            return (
              <Card key={metric.label}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{valueDisplay}</p>
                  {metric.change !== undefined ? (
                    <p className={`text-xs ${changeClass}`}>
                      {(metric.change * 100).toFixed(1)}% vs prior period
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Compared to prior period</p>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Statement overview</CardTitle>
            <p className="text-xs text-muted-foreground">
              Drill into top line revenue, cost of goods sold, and expense categories.
            </p>
          </div>
          <Badge variant="outline">
            {dateRange?.from && dateRange?.to 
              ? `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd, yyyy')}`
              : 'Select period'
            }
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Card key={index} className="border-border/60 bg-muted/20">
                    <CardHeader className="pb-1">
                      <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                    </CardHeader>
                    <CardContent>
                      <div className="h-6 w-24 bg-muted animate-pulse rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="flex items-center justify-between rounded-lg border px-4 py-2 bg-muted/30">
                    <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-border/60 bg-muted/20">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Total revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-semibold text-emerald-600">{formatCurrency(totals.revenue)}</p>
                  </CardContent>
                </Card>
                <Card className="border-border/60 bg-muted/20">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Total expenses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-semibold text-rose-600">{formatCurrency(Math.abs(totals.expenses))}</p>
                  </CardContent>
                </Card>
                <Card className="border-border/60 bg-muted/20">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Gross profit</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-semibold">{formatCurrency(totals.grossProfit)}</p>
                  </CardContent>
                </Card>
                <Card className="border-border/60 bg-muted/20">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Net income</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-semibold">{formatCurrency(totals.netIncome)}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2">
                {sections.length > 0 ? (
                  sections.map((section) => renderSection(section, 0, formatCurrency))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No financial data available for the selected period.</p>
                    <p className="text-sm mt-1">Create and approve vouchers to see income statement data.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Share insights</CardTitle>
            <p className="text-xs text-muted-foreground">
              Generate a management pack or send this statement to stakeholders with commentary.
            </p>
          </div>
          <Button variant="outline" size="sm">
            Collaborate
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
        </CardHeader>
      </Card>
    </div>
  )
}



