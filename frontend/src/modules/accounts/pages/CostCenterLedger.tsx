import { useMemo, useState, useEffect } from "react"
import {
  Building,
  TrendingUp,
  ArrowDownUp,
  AlertTriangle,
  Search,
  Calendar,
  Filter,
  Download,
  ChevronDown,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "@/components/ui/sonner"
import { 
  LedgerApiService,
  CostCentersApiService,
  VoucherType,
  type LedgerEntry,
  type CostCenter
} from "@/services/accounts-api"

const dateFilters = [
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
  { value: "all", label: "All time" },
]

const formatCurrency = (value: number, currency = "USD") =>
  value.toLocaleString(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  })

export default function CostCenterLedger() {
  // State for data
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filter states
  const [selectedCostCenterId, setSelectedCostCenterId] = useState("")
  const [voucherFilter, setVoucherFilter] = useState<"All" | VoucherType>("All")
  const [dateFilter, setDateFilter] = useState("90")
  const [searchTerm, setSearchTerm] = useState("")

  const selectedCostCenter = useMemo(
    () => costCenters.find((center) => center.id.toString() === selectedCostCenterId),
    [costCenters, selectedCostCenterId]
  )

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        const costCentersResult = await CostCentersApiService.getAllCostCenters({ limit: 1000 })
        setCostCenters(costCentersResult.data)
        
        // Set default cost center
        if (costCentersResult.data.length > 0 && !selectedCostCenterId) {
          setSelectedCostCenterId(costCentersResult.data[0].id.toString())
        }
      } catch (error) {
        console.error('Error loading cost centers:', error)
        toast.error('Failed to load cost centers')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // Load ledger entries when filters change
  useEffect(() => {
    const loadLedgerEntries = async () => {
      if (!selectedCostCenterId) return

      try {
        const params = {
          voucherType: voucherFilter !== "All" ? voucherFilter : undefined,
          search: searchTerm || undefined,
          limit: 1000
        }

        const entriesResult = await LedgerApiService.getCostCenterLedgerEntries(
          parseInt(selectedCostCenterId), 
          params
        )
        setLedgerEntries(entriesResult.data)
      } catch (error) {
        console.error('Error loading ledger entries:', error)
        toast.error('Failed to load ledger entries')
      }
    }

    loadLedgerEntries()
  }, [selectedCostCenterId, voucherFilter, searchTerm])

  const filteredLines = useMemo(() => {
    return ledgerEntries.filter((entry) => {
      const matchesVoucher = voucherFilter === "All" || entry.voucherType === voucherFilter
      const matchesSearch =
        searchTerm.trim().length === 0 ||
        entry.voucherNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.description.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesVoucher && matchesSearch
    })
  }, [ledgerEntries, voucherFilter, searchTerm])

  const metrics = useMemo(() => {
    const totalDebit = filteredLines.reduce((sum, entry) => sum + (entry.debit ?? 0), 0)
    const totalCredit = filteredLines.reduce((sum, entry) => sum + (entry.credit ?? 0), 0)
    const net = totalDebit - totalCredit
    return {
      totalDebit,
      totalCredit,
      net,
    }
  }, [filteredLines])

  const utilization = useMemo(() => {
    if (!selectedCostCenter) return 0
    if (selectedCostCenter.budget === 0) return 0
    return Math.min(100, Math.round((selectedCostCenter.actualSpend / selectedCostCenter.budget) * 100))
  }, [selectedCostCenter])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cost Center Ledger</h1>
          <p className="text-sm text-muted-foreground">
            Analyse postings tagged to each department, project, or site to track spending performance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export report
          </Button>
          <Button>
            <ChevronDown className="mr-2 h-4 w-4" />
            Quick actions
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-4">
            <Select value={selectedCostCenterId} onValueChange={setSelectedCostCenterId}>
              <SelectTrigger>
                <SelectValue placeholder="Select cost center" />
              </SelectTrigger>
              <SelectContent>
                {costCenters.map((center) => (
                  <SelectItem key={center.id} value={center.id.toString()}>
                    {center.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={voucherFilter} onValueChange={(value) => setVoucherFilter(value as "All" | VoucherType)}>
              <SelectTrigger>
                <SelectValue placeholder="Voucher type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All voucher types</SelectItem>
                <SelectItem value={VoucherType.PAYMENT}>Payment</SelectItem>
                <SelectItem value={VoucherType.RECEIPT}>Receipt</SelectItem>
                <SelectItem value={VoucherType.JOURNAL}>Journal</SelectItem>
                <SelectItem value={VoucherType.BALANCE_TRANSFER}>Balance Transfer</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                {dateFilters.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search voucher or narration"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            {filteredLines.length} voucher lines displayed
          </div>
        </CardHeader>
      </Card>

      {selectedCostCenter ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Budget</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatCurrency(selectedCostCenter.budget)}</p>
              <p className="text-xs text-muted-foreground">Annual allocation</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Actual spend</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatCurrency(selectedCostCenter.actualSpend)}</p>
              <div className="mt-3 space-y-2">
                <Progress value={utilization} className="h-2" />
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{utilization}% utilised</span>
                  <span>Variance {formatCurrency(selectedCostCenter.variance)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Debits tagged</CardTitle>
              <ArrowDownUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-emerald-600">{formatCurrency(metrics.totalDebit)}</p>
              <p className="text-xs text-muted-foreground">Expenses and allocations</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Credits tagged</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-rose-600">{formatCurrency(metrics.totalCredit)}</p>
              <p className="text-xs text-muted-foreground">Recoveries or reallocations</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Voucher activity</CardTitle>
            <p className="text-xs text-muted-foreground">
              Track how this cost center appears across payment, receipt, journal, and transfer vouchers.
            </p>
          </div>
          <Button variant="outline" size="sm">
            <Calendar className="mr-2 h-4 w-4" />
            Schedule report
          </Button>
        </CardHeader>
        <CardContent className="overflow-hidden">
          <ScrollArea className="h-[480px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead className="w-[160px]">Voucher</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Narration</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Prepared by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Loading cost center entries...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredLines.length > 0 ? (
                  filteredLines.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{entry.voucherNo}</span>
                          <Badge variant="outline" className="mt-1 w-fit text-xs">
                            {entry.voucherType}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{entry.accountCode} {entry.accountName}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {entry.description}
                      </TableCell>
                      <TableCell className="text-right text-emerald-600">
                        {entry.debit > 0 ? formatCurrency(entry.debit) : "-"}
                      </TableCell>
                      <TableCell className="text-right text-rose-600">
                        {entry.credit > 0 ? formatCurrency(entry.credit) : "-"}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {entry.createdBy}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">
                      No voucher lines matched this cost center. Encourage teams to tag expenses for better reporting.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

