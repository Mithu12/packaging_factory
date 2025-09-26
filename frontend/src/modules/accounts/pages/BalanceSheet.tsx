import { useMemo, useState } from "react"
import {
  Download,
  Columns,
  Filter,
  Layers,
  Building2,
  Banknote,
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
import { balanceSheet } from "@/modules/accounts/data/mockData"
import type { BalanceSheetSection } from "@/modules/accounts/types"

const periods = [
  { value: "2024-06-30", label: "30 Jun 2024" },
  { value: "2024-03-31", label: "31 Mar 2024" },
  { value: "2023-12-31", label: "31 Dec 2023" },
]

const formats = [
  { value: "consolidated", label: "Consolidated" },
  { value: "entity", label: "Entity only" },
]

const currencies = [
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
]

const formatCurrency = (value: number, currency = "USD") =>
  value.toLocaleString(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  })

const renderSection = (section: BalanceSheetSection, depth = 0, currency = "USD") => {
  const paddingLeft = depth * 16
  return (
    <div key={`${section.label}-${depth}`} className="space-y-2">
      <div
        className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2"
        style={{ marginLeft: paddingLeft }}
      >
        <span className="text-sm font-medium">{section.label}</span>
        <span className="text-sm font-semibold">{formatCurrency(section.amount, currency)}</span>
      </div>
      {section.children && section.children.length > 0 ? (
        <div className="space-y-2">
          {section.children.map((child) => renderSection(child, depth + 1, currency))}
        </div>
      ) : null}
    </div>
  )
}

export default function BalanceSheet() {
  const [period, setPeriod] = useState(periods[0]?.value ?? "2024-06-30")
  const [format, setFormat] = useState(formats[0]?.value ?? "consolidated")
  const [currency, setCurrency] = useState(currencies[0]?.value ?? "USD")

  const { assets, liabilities, equity } = useMemo(() => {
    const assetsSections = balanceSheet.filter((section) => section.category === "Assets")
    const liabilitiesSections = balanceSheet.filter((section) => section.category === "Liabilities")
    const equitySections = balanceSheet.filter((section) => section.category === "Equity")
    return {
      assets: assetsSections,
      liabilities: liabilitiesSections,
      equity: equitySections,
    }
  }, [])

  const totals = useMemo(() => {
    const totalAssets = assets.reduce((sum, section) => sum + section.amount, 0)
    const totalLiabilities = liabilities.reduce((sum, section) => sum + section.amount, 0)
    const totalEquity = equity.reduce((sum, section) => sum + section.amount, 0)

    return {
      totalAssets,
      totalLiabilities,
      totalEquity,
    }
  }, [assets, liabilities, equity])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Balance Sheet</h1>
          <p className="text-sm text-muted-foreground">
            Confirm that assets equal liabilities plus equity, with drill downs into each reporting segment.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Columns className="mr-2 h-4 w-4" />
            Add comparison column
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
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger>
                <SelectValue placeholder="Presentation" />
              </SelectTrigger>
              <SelectContent>
                {formats.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
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
            Consolidated balances without eliminations adjustments.
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/60 bg-muted/20">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Total assets</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold text-emerald-600">{formatCurrency(totals.totalAssets, currency)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-muted/20">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Total liabilities</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold text-rose-600">{formatCurrency(totals.totalLiabilities, currency)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-muted/20">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Total equity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{formatCurrency(totals.totalEquity, currency)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4 text-muted-foreground" />
              Assets
            </CardTitle>
            <p className="text-xs text-muted-foreground">Short-term and long-term resources owned by the business.</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {assets.map((section) => renderSection(section, 0, currency))}
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Liabilities
              </CardTitle>
              <p className="text-xs text-muted-foreground">Obligations owed to suppliers, lenders, and other parties.</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {liabilities.map((section) => renderSection(section, 0, currency))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Banknote className="h-4 w-4 text-muted-foreground" />
                Equity
              </CardTitle>
              <p className="text-xs text-muted-foreground">Owner capital and accumulated profits reinvested into the business.</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {equity.map((section) => renderSection(section, 0, currency))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

