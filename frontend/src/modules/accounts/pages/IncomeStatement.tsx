import { useMemo, useState } from "react"
import {
  Download,
  BarChart3,
  ArrowUpRight,
  Filter,
  Presentation,
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
import { incomeStatement, financeHighlights } from "@/modules/accounts/data/mockData"
import type { IncomeStatementSection } from "@/modules/accounts/types"

const periods = [
  { value: "2024-Q2", label: "Q2 2024" },
  { value: "2024-YTD", label: "2024 YTD" },
  { value: "2023-FY", label: "FY 2023" },
]

const currencies = [
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "PKR", label: "PKR" },
]

const formatCurrency = (value: number, currency = "USD") =>
  value.toLocaleString(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  })

const renderSection = (section: IncomeStatementSection, depth = 0, currency = "USD") => {
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
          {formatCurrency(Math.abs(section.amount), currency)}
        </span>
      </div>
      {section.children && section.children.length > 0 ? (
        <div className="space-y-2">
          {section.children.map((child) => renderSection(child, depth + 1, currency))}
        </div>
      ) : null}
    </div>
  )
}

export default function IncomeStatement() {
  const [period, setPeriod] = useState(periods[0]?.value ?? "2024-Q2")
  const [currency, setCurrency] = useState(currencies[0]?.value ?? "USD")
  const [scenario, setScenario] = useState("Actual")

  const totals = useMemo(() => {
    let revenue = 0
    let expenses = 0
    let grossProfit = 0
    let netIncome = 0

    incomeStatement.forEach((section) => {
      if (section.label.toLowerCase().includes("revenue")) {
        revenue += section.amount
      }
      if (section.label.toLowerCase().includes("expense") || section.amount < 0) {
        expenses += section.amount
      }
      if (section.label === "Gross Profit") grossProfit = section.amount
      if (section.label === "Net Income") netIncome = section.amount
    })

    return {
      revenue,
      expenses,
      grossProfit,
      netIncome,
    }
  }, [])

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
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger>
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                {periods.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={scenario} onValueChange={setScenario}>
              <SelectTrigger>
                <SelectValue placeholder="Scenario" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Actual">Actual</SelectItem>
                <SelectItem value="Budget">Budget</SelectItem>
                <SelectItem value="Forecast">Forecast</SelectItem>
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
        {financeHighlights.map((metric) => {
          const valueDisplay =
            metric.label.includes("Margin") || metric.label.includes("Turnover")
              ? `${(metric.amount * 100).toFixed(1)}%`
              : formatCurrency(metric.amount, currency)

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
        })}
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Statement overview</CardTitle>
            <p className="text-xs text-muted-foreground">
              Drill into top line revenue, cost of goods sold, and expense categories.
            </p>
          </div>
          <Badge variant="outline">Period {period}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-border/60 bg-muted/20">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Total revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold text-emerald-600">{formatCurrency(totals.revenue, currency)}</p>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-muted/20">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Total expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold text-rose-600">{formatCurrency(Math.abs(totals.expenses), currency)}</p>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-muted/20">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Gross profit</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold">{formatCurrency(totals.grossProfit, currency)}</p>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-muted/20">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Net income</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold">{formatCurrency(totals.netIncome, currency)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-2">
            {incomeStatement.map((section) => renderSection(section, 0, currency))}
          </div>
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



