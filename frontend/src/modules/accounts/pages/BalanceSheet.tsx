import { useMemo, useState, useEffect } from "react"
import {
  Download,
  Columns,
  Filter,
  Layers,
  Building2,
  Banknote,
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
import { 
  ReportsApiService,
  CostCentersApiService,
  type BalanceSheetSection,
  type BalanceSheetResponse,
  type CostCenter
} from "@/services/accounts-api"
import { useFormatting } from "@/hooks/useFormatting"

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

const renderSection = (section: BalanceSheetSection, depth = 0, formatCurrency: (value: number) => string) => {
  const paddingLeft = depth * 16
  return (
    <div key={`${section.label}-${depth}`} className="space-y-2">
      <div
        className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2"
        style={{ marginLeft: paddingLeft }}
      >
        <span className="text-sm font-medium">{section.label}</span>
        <span className="text-sm font-semibold">{formatCurrency(section.amount)}</span>
      </div>
      {section.children && section.children.length > 0 ? (
        <div className="space-y-2">
          {section.children.map((child) => renderSection(child, depth + 1, formatCurrency))}
        </div>
      ) : null}
    </div>
  )
}

export default function BalanceSheet() {
  const { formatCurrency } = useFormatting()
  
  // State for data
  const [balanceSheetData, setBalanceSheetData] = useState<BalanceSheetResponse | null>(null)
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Filter states
  const [period, setPeriod] = useState(periods[0]?.value ?? "2024-06-30")
  const [format, setFormat] = useState<'consolidated' | 'entity'>("consolidated")
  const [currency, setCurrency] = useState(currencies[0]?.value ?? "USD")
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

  // Load balance sheet when filters change
  useEffect(() => {
    const loadBalanceSheet = async () => {
      try {
        setIsLoading(true)

        const params: any = {
          asOfDate: period,
          format
        }

        if (costCenterFilter !== "all") {
          params.costCenterId = parseInt(costCenterFilter)
        }

        const result = await ReportsApiService.getBalanceSheet(params)
        setBalanceSheetData(result)
      } catch (error) {
        console.error('Error loading balance sheet:', error)
        toast.error('Failed to load balance sheet')
      } finally {
        setIsLoading(false)
      }
    }

    loadBalanceSheet()
  }, [period, format, costCenterFilter])

  const { assets, liabilities, equity } = useMemo(() => {
    if (!balanceSheetData) {
      return {
        assets: [],
        liabilities: [],
        equity: [],
      }
    }
    return {
      assets: balanceSheetData.assets,
      liabilities: balanceSheetData.liabilities,
      equity: balanceSheetData.equity,
    }
  }, [balanceSheetData])

  const totals = useMemo(() => {
    if (!balanceSheetData) {
      return {
        totalAssets: 0,
        totalLiabilities: 0,
        totalEquity: 0,
        balanceCheck: true,
      }
    }
    return balanceSheetData.totals
  }, [balanceSheetData])

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
          <div className="grid gap-3 md:grid-cols-4">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger>
                <SelectValue placeholder="As of Date" />
              </SelectTrigger>
              <SelectContent>
                {periods.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={format} onValueChange={(value) => setFormat(value as 'consolidated' | 'entity')}>
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
            Consolidated balances without eliminations adjustments.
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="border-border/60 bg-muted/20">
              <CardHeader className="pb-1">
                <div className="h-3 w-20 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-6 w-24 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="border-border/60 bg-muted/20">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Total assets</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold text-emerald-600">{formatCurrency(totals.totalAssets)}</p>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-muted/20">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Total liabilities</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold text-rose-600">{formatCurrency(totals.totalLiabilities)}</p>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-muted/20">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Total equity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <p className="text-xl font-semibold">{formatCurrency(totals.totalEquity)}</p>
                  {totals.balanceCheck ? (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-600">
                      Balanced
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-rose-600 border-rose-600">
                      Unbalanced
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
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
            {isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2">
                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                </div>
              ))
            ) : assets.length > 0 ? (
              assets.map((section) => renderSection(section, 0, formatCurrency))
            ) : (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No asset accounts with balances found.
              </div>
            )}
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
              {isLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2">
                    <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                  </div>
                ))
              ) : liabilities.length > 0 ? (
                liabilities.map((section) => renderSection(section, 0, formatCurrency))
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No liability accounts with balances found.
                </div>
              )}
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
              {isLoading ? (
                Array.from({ length: 2 }).map((_, index) => (
                  <div key={index} className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2">
                    <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                  </div>
                ))
              ) : equity.length > 0 ? (
                equity.map((section) => renderSection(section, 0, formatCurrency))
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No equity accounts with balances found.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

