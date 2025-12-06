"use client";

import { useMemo, useState, useEffect } from "react"
import {
  Download,
  Search,
  CalendarRange,
  Filter,
  NotebookPen,
  ArrowUpRight,
  PlusSquare,
  Loader2,
} from "lucide-react"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { DateRange } from "react-day-picker"
import { format } from "date-fns"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "@/components/ui/sonner"
import { 
  LedgerApiService,
  ChartOfAccountsApiService,
  CostCentersApiService,
  VoucherType,
  type LedgerEntry,
  type ChartOfAccount,
  type CostCenter,
  type LedgerStats
} from "@/services/accounts-api"
import { useFormatting } from "@/hooks/useFormatting"

const flattenAccounts = (nodes: ChartOfAccount[]): ChartOfAccount[] => {
  return nodes.flatMap((node) => [node, ...(node.children ? flattenAccounts(node.children) : [])])
}


const formatCurrency = (value: number, currency = "USD") =>
  value.toLocaleString(undefined, {
    style: "currency",
    currency,
  })

export default function GeneralLedger() {
  // State for data
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([])
  const [chartOfAccounts, setChartOfAccounts] = useState<ChartOfAccount[]>([])
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [ledgerStats, setLedgerStats] = useState<LedgerStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Filter states
  const [accountCode, setAccountCode] = useState("")
  const [voucherFilter, setVoucherFilter] = useState<"All" | VoucherType | "Opening Balance">("All")
  const [costCenterFilter, setCostCenterFilter] = useState<string | "All">("All")
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), // Start of last month
    to: new Date() // Today
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("date-desc")

  const postingAccounts = useMemo(() => flattenAccounts(chartOfAccounts).filter((node) => node.type === "Posting"), [chartOfAccounts])
  const accountMeta = useMemo(() => postingAccounts.find((account) => account.code === accountCode), [postingAccounts, accountCode])

  const { formatCurrency } = useFormatting()
  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        const [accountsResult, costCentersResult] = await Promise.all([
          ChartOfAccountsApiService.getChartOfAccountsTree(),
          CostCentersApiService.getCostCenters({ limit: 1000 })
        ])
        
        setChartOfAccounts(accountsResult)
        setCostCenters(costCentersResult.data)
        
        // Set default account if available
        const flatAccounts = flattenAccounts(accountsResult).filter((node) => node.type === "Posting")
        const defaultAccount = flatAccounts.find((account) => account.code === "1110") ?? flatAccounts[0]
        if (defaultAccount && !accountCode) {
          setAccountCode(defaultAccount.code)
        }
      } catch (error) {
        console.error('Error loading data:', error)
        toast.error('Failed to load accounts and cost centers')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // Load ledger entries when filters change
  useEffect(() => {
    const loadLedgerEntries = async () => {
      if (!accountCode) return

      try {
        const params: any = {
          accountCode,
          sortBy: sortBy.includes('date') ? 'date' : sortBy.includes('amount') ? 'amount' : 'date',
          sortOrder: sortBy.includes('desc') ? 'desc' : 'asc',
          limit: 1000
        }
        
        if (dateRange?.from) {
          params.dateFrom = format(dateRange.from, 'yyyy-MM-dd')
        }
        
        if (dateRange?.to) {
          params.dateTo = format(dateRange.to, 'yyyy-MM-dd')
        }
        
        if (voucherFilter !== "All" && voucherFilter !== "Opening Balance") {
          params.voucherType = voucherFilter
        }
        
        if (searchTerm && searchTerm.trim()) {
          params.search = searchTerm.trim()
        }

        const [entriesResult, statsResult] = await Promise.all([
          LedgerApiService.getLedgerEntries(params),
          LedgerApiService.getLedgerStats(params)
        ])


        setLedgerEntries(entriesResult.data)
        setLedgerStats(statsResult)
      } catch (error) {
        console.error('Error loading ledger entries:', error)
        toast.error('Failed to load ledger entries')
      }
    }

    loadLedgerEntries()
  }, [accountCode, voucherFilter, searchTerm, sortBy, dateRange])

  const filteredEntries = useMemo(() => {
    return ledgerEntries.filter((entry) => {
      const matchesCostCenter = costCenterFilter === "All" || entry.cost_center_name === costCenterFilter
      return matchesCostCenter
    })
  }, [ledgerEntries, costCenterFilter])

  const ledgerSummary = useMemo(() => {
    if (ledgerStats) {
      return {
        opening: ledgerStats.openingBalance,
        debitTotal: ledgerStats.totalDebit,
        creditTotal: ledgerStats.totalCredit,
        closing: ledgerStats.closingBalance,
      }
    }
    
    // Fallback calculation if stats not available
    const debitTotal = filteredEntries.reduce((sum, entry) => sum + Number(entry.debit), 0)
    const creditTotal = filteredEntries.reduce((sum, entry) => sum + Number(entry.credit), 0)
    const closing = filteredEntries.length > 0 ? filteredEntries[filteredEntries.length - 1].balance : 0

    return {
      opening: 0,
      debitTotal,
      creditTotal,
      closing,
    }
  }, [ledgerStats, filteredEntries])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">General Ledger</h1>
          <p className="text-sm text-muted-foreground">
            Review the detailed movement of balances for each account, grouped by voucher and cost center.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <PlusSquare className="mr-2 h-4 w-4" />
            Post manual journal
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-4">
            <Select value={accountCode} onValueChange={setAccountCode}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {postingAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.code}>
                    {account.code} {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={voucherFilter} onValueChange={(value) => setVoucherFilter(value as "All" | VoucherType | "Opening Balance")}>
              <SelectTrigger>
                <SelectValue placeholder="Voucher type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All voucher types</SelectItem>
                <SelectItem value="Opening Balance">Opening balance</SelectItem>
                <SelectItem value={VoucherType.PAYMENT}>Payment</SelectItem>
                <SelectItem value={VoucherType.RECEIPT}>Receipt</SelectItem>
                <SelectItem value={VoucherType.JOURNAL}>Journal</SelectItem>
                <SelectItem value={VoucherType.BALANCE_TRANSFER}>Balance Transfer</SelectItem>
              </SelectContent>
            </Select>
            <Select value={costCenterFilter} onValueChange={(value) => setCostCenterFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Cost center" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All cost centers</SelectItem>
                {costCenters.map((center) => (
                  <SelectItem key={center.id} value={center.name}>
                    {center.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DateRangePicker
              date={dateRange}
              onDateChange={setDateRange}
              placeholder="Select date range"
              className="md:w-80"
            />
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
              <div className="relative md:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search description, voucher, or preparer"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="md:w-40">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Newest first</SelectItem>
                  <SelectItem value="date-asc">Oldest first</SelectItem>
                  <SelectItem value="amount-desc">Highest amount</SelectItem>
                  <SelectItem value="amount-asc">Lowest amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              {filteredEntries.length} entries displayed
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Opening balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(Number(ledgerSummary.opening))}</p>
            <p className="text-xs text-muted-foreground">Balance prior to the selected period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Debits</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-emerald-600">{formatCurrency(Number(ledgerSummary.debitTotal))}</p>
            <p className="text-xs text-muted-foreground">Total positive movement</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Credits</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-rose-600">{formatCurrency(Number(ledgerSummary.creditTotal))}</p>
            <p className="text-xs text-muted-foreground">Total negative movement</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Closing balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(Number(ledgerSummary.closing))}</p>
            <p className="text-xs text-muted-foreground">After applied debits and credits</p>
          </CardContent>
        </Card>
      </div>

      {accountMeta ? (
        <Card className="border-dashed">
          <CardHeader>
            <div className="flex flex-col gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <NotebookPen className="h-4 w-4 text-muted-foreground" />
                {accountMeta.code} {accountMeta.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Account type: {accountMeta.type} • Category: {accountMeta.category}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[520px] pr-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[110px]">Date</TableHead>
                    <TableHead className="w-[160px]">Voucher</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Running balance</TableHead>
                    <TableHead className="w-[140px] text-right">Prepared by</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">Loading ledger entries...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredEntries.length > 0 ? (
                    filteredEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{entry.voucher_no}</span>
                            <Badge variant="outline" className="mt-1 w-fit text-xs">
                              {entry.voucher_type}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-sm">
                            <span>{entry.description}</span>
                            {entry.cost_center_name ? (
                              <span className="text-xs text-muted-foreground">Cost center: {entry.cost_center_name}</span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-emerald-600">
                          {entry.debit > 0 ? formatCurrency(Number(entry.debit)) : "-"}
                        </TableCell>
                        <TableCell className="text-right text-rose-600">
                          {entry.credit > 0 ? formatCurrency(Number(entry.credit)) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(Number(entry.balance))}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {entry.created_by}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">
                        No ledger entries match your filters. Adjust the filters or post a new journal entry.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Need to see supporting voucher lines?</CardTitle>
            <p className="text-xs text-muted-foreground">
              Open any voucher directly from the register to review attachments, approvals, and cost distributions.
            </p>
          </div>
          <Button variant="outline" size="sm">
            Go to voucher register
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
        </CardHeader>
      </Card>
    </div>
  )
}

