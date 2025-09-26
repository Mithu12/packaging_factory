import { useMemo, useState } from "react"
import {
  Plus,
  Search,
  Calendar,
  FileText,
  Landmark,
  EllipsisVertical,
  ArrowUpRight,
  Paperclip,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/sonner"
import { vouchers, costCenters, chartOfAccounts } from "@/modules/accounts/data/mockData"
import type {
  Voucher,
  VoucherLine,
  VoucherStatus,
  VoucherType,
  AccountNode,
} from "@/modules/accounts/types"

const statusFilters: Array<"All" | VoucherStatus> = ["All", "Draft", "Pending Approval", "Posted", "Void"]
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
  })

const flattenAccounts = (nodes: AccountNode[]): AccountNode[] => {
  return nodes.flatMap((node) => [node, ...(node.children ? flattenAccounts(node.children) : [])])
}

interface DraftLine extends Pick<VoucherLine, "accountCode" | "debit" | "credit" | "costCenterId"> {
  id: string
}

interface VoucherPageProps {
  type: VoucherType
  title: string
  description: string
  primaryActionLabel: string
  counterpartyLabel?: string
  counterpartyPlaceholder?: string
  showCounterparty?: boolean
  narrationLabel?: string
}

export function VoucherPage({
  type,
  title,
  description,
  primaryActionLabel,
  counterpartyLabel = "Counterparty",
  counterpartyPlaceholder = "Enter name",
  showCounterparty = true,
  narrationLabel = "Narration",
}: VoucherPageProps) {
  const allPostingAccounts = useMemo(() => flattenAccounts(chartOfAccounts).filter((node) => node.type === "Posting"), [])
  const data = useMemo(() => vouchers.filter((voucher) => voucher.type === type), [type])

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"All" | VoucherStatus>("All")
  const [costCenterFilter, setCostCenterFilter] = useState<string | "All">("All")
  const [dateFilter, setDateFilter] = useState("30")
  const [sortBy, setSortBy] = useState("date-desc")
  const [includeAttachments, setIncludeAttachments] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const [formState, setFormState] = useState({
    date: new Date().toISOString().slice(0, 10),
    reference: "",
    counterparty: "",
    amount: "",
    costCenterId: "",
    narration: "",
  })

  const [lines, setLines] = useState<DraftLine[]>([
    { id: "line-1", accountCode: "", debit: 0, credit: 0, costCenterId: "" },
    { id: "line-2", accountCode: "", debit: 0, credit: 0, costCenterId: "" },
  ])

  const metrics = useMemo(() => {
    const totalAmount = data.reduce((sum, voucher) => sum + voucher.amount, 0)
    const posted = data.filter((voucher) => voucher.status === "Posted").length
    const pending = data.filter((voucher) => voucher.status === "Pending Approval").length
    const attachments = data.reduce((sum, voucher) => sum + (voucher.attachments ?? 0), 0)

    return {
      count: data.length,
      totalAmount,
      posted,
      pending,
      attachments,
    }
  }, [data])

  const filteredVouchers = useMemo(() => {
    return data
      .filter((voucher) => {
        const matchesStatus = statusFilter === "All" || voucher.status === statusFilter
        const matchesCostCenter = costCenterFilter === "All" || voucher.costCenterId === costCenterFilter
        const matchesSearch =
          searchTerm.trim().length === 0 ||
          voucher.voucherNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (voucher.payee && voucher.payee.toLowerCase().includes(searchTerm.toLowerCase())) ||
          voucher.narration.toLowerCase().includes(searchTerm.toLowerCase())

        return matchesStatus && matchesCostCenter && matchesSearch
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "date-desc":
            return new Date(b.date).getTime() - new Date(a.date).getTime()
          case "date-asc":
            return new Date(a.date).getTime() - new Date(b.date).getTime()
          case "amount-desc":
            return b.amount - a.amount
          case "amount-asc":
            return a.amount - b.amount
          default:
            return 0
        }
      })
  }, [data, statusFilter, costCenterFilter, searchTerm, sortBy])

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      { id: `line-${prev.length + 1}`, accountCode: "", debit: 0, credit: 0, costCenterId: "" },
    ])
  }

  const handleLineChange = (id: string, key: keyof DraftLine, value: string) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line
        if (key === "debit" || key === "credit") {
          const numericValue = Number(value)
          return { ...line, [key]: Number.isNaN(numericValue) ? 0 : numericValue }
        }
        return { ...line, [key]: value }
      })
    )
  }

  const handleRemoveLine = (id: string) => {
    setLines((prev) => prev.filter((line) => line.id !== id))
  }

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const debitTotal = lines.reduce((sum, line) => sum + (line.debit || 0), 0)
    const creditTotal = lines.reduce((sum, line) => sum + (line.credit || 0), 0)

    if (debitTotal !== creditTotal) {
      toast.error("Voucher not balanced", {
        description: "Debit and credit totals must match before posting.",
      })
      return
    }

    toast.success(`${primaryActionLabel} captured`, {
      description: "The voucher is saved as a draft and awaits approval.",
    })
    setIsDialogOpen(false)
    setFormState({
      date: new Date().toISOString().slice(0, 10),
      reference: "",
      counterparty: "",
      amount: "",
      costCenterId: "",
      narration: "",
    })
    setLines([
      { id: "line-1", accountCode: "", debit: 0, credit: 0, costCenterId: "" },
      { id: "line-2", accountCode: "", debit: 0, credit: 0, costCenterId: "" },
    ])
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {primaryActionLabel}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{primaryActionLabel}</DialogTitle>
              <DialogDescription>
                Record a new voucher. Amounts must balance between debit and credit lines before submission.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleFormSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="voucher-date">Voucher date</Label>
                  <Input
                    id="voucher-date"
                    type="date"
                    value={formState.date}
                    onChange={(event) => setFormState((prev) => ({ ...prev, date: event.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="voucher-reference">Reference</Label>
                  <Input
                    id="voucher-reference"
                    placeholder="Reference number or memo"
                    value={formState.reference}
                    onChange={(event) => setFormState((prev) => ({ ...prev, reference: event.target.value }))}
                  />
                </div>
                {showCounterparty ? (
                  <div className="space-y-2">
                    <Label htmlFor="voucher-counterparty">{counterpartyLabel}</Label>
                    <Input
                      id="voucher-counterparty"
                      placeholder={counterpartyPlaceholder}
                      value={formState.counterparty}
                      onChange={(event) => setFormState((prev) => ({ ...prev, counterparty: event.target.value }))}
                    />
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="voucher-amount">Amount</Label>
                  <Input
                    id="voucher-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={formState.amount}
                    onChange={(event) => setFormState((prev) => ({ ...prev, amount: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="voucher-cost-center">Cost center</Label>
                  <Select
                    value={formState.costCenterId}
                    onValueChange={(value) => setFormState((prev) => ({ ...prev, costCenterId: value }))}
                  >
                    <SelectTrigger id="voucher-cost-center">
                      <SelectValue placeholder="Optional cost center" />
                    </SelectTrigger>
                    <SelectContent>
                      {costCenters.map((center) => (
                        <SelectItem key={center.id} value={center.id}>
                          {center.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="voucher-narration">{narrationLabel}</Label>
                  <Textarea
                    id="voucher-narration"
                    placeholder="Explain the purpose of the voucher"
                    value={formState.narration}
                    onChange={(event) => setFormState((prev) => ({ ...prev, narration: event.target.value }))}
                    rows={3}
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-dashed p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium">Voucher lines</h3>
                    <p className="text-xs text-muted-foreground">
                      Debit total must equal credit total before posting.
                    </p>
                  </div>
                  <Button type="button" variant="outline" onClick={handleAddLine}>
                    Add line
                  </Button>
                </div>
                <ScrollArea className="h-[220px] pr-4">
                  <div className="space-y-3">
                    {lines.map((line) => (
                      <div key={line.id} className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_40px]">
                        <Select
                          value={line.accountCode}
                          onValueChange={(value) => handleLineChange(line.id, "accountCode", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                          <SelectContent>
                            {allPostingAccounts.map((account) => (
                              <SelectItem key={account.id} value={account.code}>
                                {account.code} {account.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Debit"
                          value={line.debit}
                          onChange={(event) => handleLineChange(line.id, "debit", event.target.value)}
                        />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Credit"
                          value={line.credit}
                          onChange={(event) => handleLineChange(line.id, "credit", event.target.value)}
                        />
                        <Select
                          value={line.costCenterId ?? ""}
                          onValueChange={(value) => handleLineChange(line.id, "costCenterId", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Cost center" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">None</SelectItem>
                            {costCenters.map((center) => (
                              <SelectItem key={center.id} value={center.id}>
                                {center.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveLine(line.id)}>
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Attach supporting documents</p>
                  <p className="text-xs text-muted-foreground">
                    Upload invoices, approvals, or statements for reviewer context.
                  </p>
                </div>
                <Switch checked={includeAttachments} onCheckedChange={setIncludeAttachments} />
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save voucher</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total vouchers</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{metrics.count}</p>
            <p className="text-xs text-muted-foreground">Captured for this voucher type</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total amount</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(metrics.totalAmount)}</p>
            <p className="text-xs text-muted-foreground">Across posted and draft vouchers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending approval</CardTitle>
            <Calendar className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{metrics.pending}</p>
            <p className="text-xs text-muted-foreground">Awaiting finance sign off</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Attachments logged</CardTitle>
            <Paperclip className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{metrics.attachments}</p>
            <p className="text-xs text-muted-foreground">Receipts, invoices, or approvals</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <CardTitle>Voucher register</CardTitle>
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
              <div className="relative md:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search voucher number, payee, or narration"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "All" | VoucherStatus)}>
                <SelectTrigger className="md:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusFilters.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={costCenterFilter} onValueChange={(value) => setCostCenterFilter(value)}>
                <SelectTrigger className="md:w-48">
                  <SelectValue placeholder="Cost center" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All cost centers</SelectItem>
                  {costCenters.map((center) => (
                    <SelectItem key={center.id} value={center.id}>
                      {center.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="md:w-44">
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
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="md:w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Newest first</SelectItem>
                  <SelectItem value="date-asc">Oldest first</SelectItem>
                  <SelectItem value="amount-desc">Amount high to low</SelectItem>
                  <SelectItem value="amount-asc">Amount low to high</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {filteredVouchers.length} vouchers match your filters.
          </p>
        </CardHeader>
        <CardContent className="overflow-hidden">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Voucher</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Counterparty</TableHead>
                  <TableHead>Accounts</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                  <TableHead className="w-[70px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVouchers.length > 0 ? (
                  filteredVouchers.map((voucher) => {
                    const costCenterName = voucher.costCenterId
                      ? costCenters.find((center) => center.id === voucher.costCenterId)?.name ?? ""
                      : ""
                    return (
                      <TableRow key={voucher.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{voucher.voucherNo}</span>
                            <span className="text-xs text-muted-foreground">{voucher.reference ?? "No reference"}</span>
                          </div>
                        </TableCell>
                        <TableCell>{new Date(voucher.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span>{voucher.payee ?? "-"}</span>
                            {costCenterName ? (
                              <Badge variant="outline" className="w-fit text-xs">
                                {costCenterName}
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {voucher.lines.slice(0, 2).map((line) => (
                              <div key={line.id} className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>
                                  {line.accountCode} {line.accountName}
                                </span>
                                <span className="flex gap-2">
                                  {line.debit > 0 ? <span className="text-emerald-600">D {formatCurrency(line.debit)}</span> : null}
                                  {line.credit > 0 ? <span className="text-rose-600">C {formatCurrency(line.credit)}</span> : null}
                                </span>
                              </div>
                            ))}
                            {voucher.lines.length > 2 ? (
                              <span className="text-xs text-muted-foreground">+{voucher.lines.length - 2} more lines</span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(voucher.amount, voucher.currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={voucher.status === "Posted" ? "default" : voucher.status === "Pending Approval" ? "secondary" : "outline"}
                            className={voucher.status === "Posted" ? "bg-emerald-500 hover:bg-emerald-500" : undefined}
                          >
                            {voucher.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <EllipsisVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                View voucher
                                <ArrowUpRight className="ml-auto h-3.5 w-3.5" />
                              </DropdownMenuItem>
                              <DropdownMenuItem>Edit draft</DropdownMenuItem>
                              <DropdownMenuItem>Clone voucher</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">Void</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">
                      No vouchers found for the selected filters. Capture a new voucher to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


