import { useMemo, useState } from "react"
import {
  Download,
  Search,
  CalendarRange,
  Filter,
  NotebookPen,
  ArrowUpRight,
  PlusSquare,
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { ledgerEntries, chartOfAccounts, voucherTypes, costCenters } from "@/modules/accounts/data/mockData"
import type { AccountNode, LedgerEntry, VoucherType } from "@/modules/accounts/types"

const flattenAccounts = (nodes: AccountNode[]): AccountNode[] => {
  return nodes.flatMap((node) => [node, ...(node.children ? flattenAccounts(node.children) : [])])
}

const dateFilters = [
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "180", label: "Last 6 months" },
  { value: "365", label: "Last 12 months" },
  { value: "all", label: "All time" },
]

const formatCurrency = (value: number, currency = "USD") =>
  value.toLocaleString(undefined, {
    style: "currency",
    currency,
  })

export default function GeneralLedger() {
  const postingAccounts = useMemo(() => flattenAccounts(chartOfAccounts).filter((node) => node.type === "Posting"), [])
  const defaultAccount = postingAccounts.find((account) => account.code === "1110") ?? postingAccounts[0]

  const [accountCode, setAccountCode] = useState(defaultAccount?.code ?? "")
  const [voucherFilter, setVoucherFilter] = useState<"All" | VoucherType | "Opening Balance">("All")
  const [costCenterFilter, setCostCenterFilter] = useState<string | "All">("All")
  const [dateFilter, setDateFilter] = useState("30")
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("date-desc")

  const accountMeta = useMemo(() => postingAccounts.find((account) => account.code === accountCode), [postingAccounts, accountCode])

  const filteredEntries = useMemo(() => {
    const entriesForAccount = ledgerEntries.filter((entry) => !accountCode || entry.accountCode === accountCode)

    return entriesForAccount
      .filter((entry) => {
        const matchesVoucher = voucherFilter === "All" || entry.type === voucherFilter
        const matchesCostCenter = costCenterFilter === "All" || entry.costCenterName === costCenterFilter
        const matchesSearch =
          searchTerm.trim().length === 0 ||
          entry.voucherNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.createdBy.toLowerCase().includes(searchTerm.toLowerCase())

        return matchesVoucher && matchesCostCenter && matchesSearch
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "date-asc":
            return new Date(a.date).getTime() - new Date(b.date).getTime()
          case "amount-desc":
            return b.debit + b.credit - (a.debit + a.credit)
          case "amount-asc":
            return a.debit + a.credit - (b.debit + b.credit)
          case "date-desc":
          default:
            return new Date(b.date).getTime() - new Date(a.date).getTime()
        }
      })
  }, [accountCode, voucherFilter, costCenterFilter, searchTerm, sortBy])

  const ledgerSummary = useMemo(() => {
    const opening = filteredEntries.find((entry) => entry.type === "Opening Balance")
    const debitTotal = filteredEntries.reduce((sum, entry) => sum + entry.debit, 0)
    const creditTotal = filteredEntries.reduce((sum, entry) => sum + entry.credit, 0)
    const closing = filteredEntries.length > 0 ? filteredEntries[filteredEntries.length - 1].balance : 0

    return {
      opening: opening?.balance ?? 0,
      debitTotal,
      creditTotal,
      closing,
    }
  }, [filteredEntries])

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
                {voucherTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
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
            <p className="text-2xl font-semibold">{formatCurrency(ledgerSummary.opening)}</p>
            <p className="text-xs text-muted-foreground">Balance prior to the selected period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Debits</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-emerald-600">{formatCurrency(ledgerSummary.debitTotal)}</p>
            <p className="text-xs text-muted-foreground">Total positive movement</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Credits</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-rose-600">{formatCurrency(ledgerSummary.creditTotal)}</p>
            <p className="text-xs text-muted-foreground">Total negative movement</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Closing balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(ledgerSummary.closing)}</p>
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
                Cost centers tagged: {accountMeta.costCenters?.length ?? 0}
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
                  {filteredEntries.length > 0 ? (
                    filteredEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{entry.voucherNo}</span>
                            <Badge variant="outline" className="mt-1 w-fit text-xs">
                              {entry.type}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-sm">
                            <span>{entry.description}</span>
                            {entry.costCenterName ? (
                              <span className="text-xs text-muted-foreground">Cost center: {entry.costCenterName}</span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-emerald-600">
                          {entry.debit > 0 ? formatCurrency(entry.debit) : "-"}
                        </TableCell>
                        <TableCell className="text-right text-rose-600">
                          {entry.credit > 0 ? formatCurrency(entry.credit) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(entry.balance)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {entry.createdBy}
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

