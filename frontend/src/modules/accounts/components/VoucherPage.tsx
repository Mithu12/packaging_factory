import { useMemo, useState, useEffect } from "react"
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
import { 
  VouchersApiService,
  CostCentersApiService,
  ChartOfAccountsApiService,
  VoucherStatus,
  VoucherType,
  type Voucher,
  type CreateVoucherRequest,
  type ChartOfAccount,
  type CostCenter
} from "@/services/accounts-api";
import { DateRange } from "react-day-picker"
import { DateRangePicker } from "@/components/ui/date-range-picker"

const statusFilters: Array<"All" | VoucherStatus> = ["All", VoucherStatus.DRAFT, VoucherStatus.PENDING_APPROVAL, VoucherStatus.POSTED, VoucherStatus.VOID]


const formatCurrency = (value: number, currency = "USD") =>
  value.toLocaleString(undefined, {
    style: "currency",
    currency,
  })

const flattenAccounts = (nodes: ChartOfAccount[]): ChartOfAccount[] => {
  return nodes.flatMap((node) => [node, ...(node.children ? flattenAccounts(node.children) : [])])
}

interface DraftLine {
  id: string
  accountId: number
  accountCode: string
  debit: number
  credit: number
  costCenterId?: number
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
  // State for data
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [chartOfAccounts, setChartOfAccounts] = useState<ChartOfAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)

  const allPostingAccounts = useMemo(() => 
    flattenAccounts(chartOfAccounts).filter((node) => node.type !== "Control"), 
    [chartOfAccounts]
  )
  
  const data = useMemo(() => vouchers.filter((voucher) => voucher.type === type), [vouchers, type])

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"All" | VoucherStatus>("All")
  const [costCenterFilter, setCostCenterFilter] = useState<string | "All">("All")
  const [sortBy, setSortBy] = useState("date-desc")
  const [includeAttachments, setIncludeAttachments] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null) 
   const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), // Start of last month
    to: new Date() // Today
  })

  const [formState, setFormState] = useState({
    date: new Date().toISOString().slice(0, 10),
    reference: "",
    counterparty: "",
    amount: "",
    costCenterId: "none",
    narration: "",
  })

  const [lines, setLines] = useState<DraftLine[]>([
    { id: "line-1", accountId: 0, accountCode: "", debit: 0, credit: 0, costCenterId: undefined },
    { id: "line-2", accountId: 0, accountCode: "", debit: 0, credit: 0, costCenterId: undefined },
  ])

  // Load data function
  const loadData = async () => {
    try {
      setIsLoading(true)
      const [vouchersResponse, costCentersResponse, accountsResponse] = await Promise.all([
        VouchersApiService.getVouchers({ type, limit: 1000, dateFrom: dateRange?.from?.toISOString(), dateTo: dateRange?.to?.toISOString() }),
        CostCentersApiService.getCostCenters({ limit: 1000 }),
        ChartOfAccountsApiService.getChartOfAccountsTree()
      ])
      
      setVouchers(vouchersResponse.data)
      setCostCenters(costCentersResponse.data)
      setChartOfAccounts(accountsResponse)
    } catch (error) {
      console.error('Failed to load data:', error)
      toast.error("Failed to load data", {
        description: "Please refresh the page to try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Load vouchers only (for refresh after actions)
  const loadVouchers = async () => {
    try {
      const vouchersResponse = await VouchersApiService.getVouchers({ type, limit: 1000, dateFrom: dateRange?.from?.toISOString(), dateTo: dateRange?.to?.toISOString() })
      setVouchers(vouchersResponse.data)
    } catch (error) {
      console.error('Failed to load vouchers:', error)
      toast.error("Failed to refresh vouchers")
    }
  }

  // Load data on component mount
  useEffect(() => {
    loadData()
  }, [type])

  const metrics = useMemo(() => {
    const totalAmount = data.reduce((sum, voucher) => sum + Number(voucher.amount), 0)
    const posted = data.filter((voucher) => voucher.status === VoucherStatus.POSTED).length
    const pending = data.filter((voucher) => voucher.status !== VoucherStatus.POSTED && voucher.status !== VoucherStatus.VOID).length
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
        const matchesStatus = statusFilter === "All" || voucher.status == statusFilter
        const matchesCostCenter = costCenterFilter === "All" || voucher.costCenterId?.toString() === costCenterFilter
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
      { id: `line-${prev.length + 1}`, accountId: 0, accountCode: "", debit: 0, credit: 0, costCenterId: undefined },
    ])
  }

  const handleLineChange = (id: string, key: keyof DraftLine, value: string | number) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line
        if (key === "debit" || key === "credit") {
          const numericValue = Number(value)
          return { ...line, [key]: Number.isNaN(numericValue) ? 0 : numericValue }
        }
        if (key === "accountId") {
          const accountId = value === "none" ? 0 : Number(value)
          const account = allPostingAccounts.find(acc => acc.id === accountId)
          return { 
            ...line, 
            accountId,
            accountCode: account ? account.code : ""
          }
        }
        if (key === "costCenterId") {
          const costCenterId = value === "none" ? undefined : Number(value)
          return { ...line, costCenterId }
        }
        return { ...line, [key]: value }
      })
    )
  }

  const handleRemoveLine = (id: string) => {
    setLines((prev) => prev.filter((line) => line.id !== id))
  }

  // Voucher action handlers
  const handleViewVoucher = (voucher: Voucher) => {
    setSelectedVoucher(voucher)
    setIsViewDialogOpen(true)
  }

  const handleEditVoucher = (voucher: Voucher) => {
    if (voucher.status !== VoucherStatus.DRAFT) {
      toast.error("Only draft vouchers can be edited")
      return
    }
    // TODO: Implement edit functionality
    toast.info(`Edit voucher ${voucher.voucherNo}`, {
      description: "Voucher edit functionality coming soon"
    })
  }

  const handleCloneVoucher = (voucher: Voucher) => {
    // Pre-fill form with voucher data
    setFormState({
      date: new Date().toISOString().slice(0, 10),
      reference: `Copy of ${voucher.reference || voucher.voucherNo}`,
      counterparty: voucher.payee || "",
      amount: voucher.amount.toString(),
      costCenterId: voucher.costCenterId ? voucher.costCenterId.toString() : "none",
      narration: voucher.narration,
    })
    
    // Pre-fill lines
    const clonedLines = voucher.lines.map((line, index) => ({
      id: `line-${index + 1}`,
      accountId: line.accountId,
      accountCode: line.accountCode || "",
      debit: line.debit,
      credit: line.credit,
      costCenterId: line.costCenterId,
    }))
    setLines(clonedLines)
    
    setIsDialogOpen(true)
    toast.success(`Cloned voucher ${voucher.voucherNo}`, {
      description: "Form pre-filled with voucher data"
    })
  }

  const handleSubmitForApproval = async (voucher: Voucher) => {
    if (voucher.status !== VoucherStatus.DRAFT) {
      toast.error("Only draft vouchers can be submitted for approval")
      return
    }

    try {
      await VouchersApiService.updateVoucher(voucher.id, { status: VoucherStatus.PENDING_APPROVAL })
      toast.success(`Voucher ${voucher.voucherNo} submitted for approval`)
      loadVouchers() // Refresh the list
    } catch (error) {
      console.error('Error submitting voucher for approval:', error)
      toast.error('Failed to submit voucher for approval')
    }
  }

  const handleApproveVoucher = async (voucher: Voucher) => {
    if (voucher.status !== VoucherStatus.PENDING_APPROVAL) {
      toast.error(`Only pending vouchers can be approved. Current status: ${voucher.status}`)
      return
    }

    try {
      await VouchersApiService.approveVoucher(voucher.id)
      toast.success(`Voucher ${voucher.voucherNo} approved successfully`)
      loadVouchers() // Refresh the list
    } catch (error) {
      console.error('Error approving voucher:', error)
      toast.error('Failed to approve voucher')
    }
  }

  const handleVoidVoucher = async (voucher: Voucher) => {
    if (voucher.status === VoucherStatus.VOID) {
      toast.error("Voucher is already voided")
      return
    }

    try {
      await VouchersApiService.voidVoucher(voucher.id)
      toast.success(`Voucher ${voucher.voucherNo} voided successfully`)
      loadVouchers() // Refresh the list
    } catch (error) {
      console.error('Error voiding voucher:', error)
      toast.error('Failed to void voucher')
    }
  }

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const debitTotal = lines.reduce((sum, line) => sum + (line.debit || 0), 0)
    const creditTotal = lines.reduce((sum, line) => sum + (line.credit || 0), 0)

    if (debitTotal !== creditTotal) {
      toast.error("Voucher not balanced", {
        description: "Debit and credit totals must match before posting.",
      })
      return
    }

    // Validate that all lines have accounts selected
    const invalidLines = lines.filter(line => !line.accountId || line.accountId === 0)
    if (invalidLines.length > 0) {
      toast.error("Invalid voucher lines", {
        description: "All lines must have an account selected.",
      })
      return
    }

    try {
      setIsCreating(true)
      
      const voucherData: CreateVoucherRequest = {
        type,
        date: formState.date,
        reference: formState.reference || undefined,
        payee: formState.counterparty || undefined,
        narration: formState.narration,
        costCenterId: formState.costCenterId && formState.costCenterId !== "none" ? parseInt(formState.costCenterId) : undefined,
        lines: lines.map(line => ({
          accountId: line.accountId,
          debit: line.debit,
          credit: line.credit,
          costCenterId: line.costCenterId,
        }))
      }

      await VouchersApiService.createVoucher(voucherData)
      
      toast.success(`${primaryActionLabel} created successfully`, {
        description: "The voucher is saved as a draft and awaits approval.",
      })
      
      setIsDialogOpen(false)
      loadVouchers() // Refresh the voucher list
      setFormState({
        date: new Date().toISOString().slice(0, 10),
        reference: "",
        counterparty: "",
        amount: "",
        costCenterId: "none",
        narration: "",
      })
      setLines([
        { id: "line-1", accountId: 0, accountCode: "", debit: 0, credit: 0, costCenterId: undefined },
        { id: "line-2", accountId: 0, accountCode: "", debit: 0, credit: 0, costCenterId: undefined },
      ])

      // Reload vouchers
      const vouchersResponse = await VouchersApiService.getVouchers({ type, limit: 1000, dateFrom: dateRange?.from?.toISOString(), dateTo: dateRange?.to?.toISOString() })
      setVouchers(vouchersResponse.data)
      
    } catch (error: any) {
      console.error('Failed to create voucher:', error)
      toast.error("Failed to create voucher", {
        description: error.message || "Please try again.",
      })
    } finally {
      setIsCreating(false)
    }
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
                      <SelectItem value="none">None</SelectItem>
                      {costCenters.map((center) => (
                        <SelectItem key={center.id} value={center.id.toString()}>
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
                          value={line.accountId ? line.accountId.toString() : "none"}
                          onValueChange={(value) => handleLineChange(line.id, "accountId", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Select account</SelectItem>
                            {allPostingAccounts.map((account) => (
                              <SelectItem key={account.id} value={account.id.toString()}>
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
                          value={line.costCenterId ? line.costCenterId.toString() : "none"}
                          onValueChange={(value) => handleLineChange(line.id, "costCenterId", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Cost center" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {costCenters.map((center) => (
                              <SelectItem key={center.id} value={center.id.toString()}>
                                {center.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveLine(line.id)}>
                          �
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
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? "Creating..." : "Save voucher"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Voucher Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Voucher Details - {selectedVoucher?.voucherNo}</DialogTitle>
              <DialogDescription>
                View complete voucher information and transaction details.
              </DialogDescription>
            </DialogHeader>
            
            {selectedVoucher && (
              <div className="space-y-6">
                {/* Voucher Header */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Voucher Number</Label>
                    <div className="text-sm">{selectedVoucher.voucherNo}</div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Date</Label>
                    <div className="text-sm">{new Date(selectedVoucher.date).toLocaleDateString()}</div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge
                      variant={selectedVoucher.status === "Posted" ? "default" : selectedVoucher.status === "Pending Approval" ? "secondary" : "outline"}
                      className={selectedVoucher.status === "Posted" ? "bg-emerald-500 hover:bg-emerald-500" : undefined}
                    >
                      {selectedVoucher.status}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Reference</Label>
                    <div className="text-sm">{selectedVoucher.reference || "No reference"}</div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Amount</Label>
                    <div className="text-sm font-medium">{formatCurrency(selectedVoucher.amount, selectedVoucher.currency)}</div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Type</Label>
                    <div className="text-sm">{type}</div>
                  </div>
                  {selectedVoucher.payee && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{counterpartyLabel}</Label>
                      <div className="text-sm">{selectedVoucher.payee}</div>
                    </div>
                  )}
                  {selectedVoucher.costCenterId && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Cost Center</Label>
                      <div className="text-sm">
                        {costCenters.find(c => c.id.toString() === selectedVoucher.costCenterId?.toString())?.name || "Unknown"}
                      </div>
                    </div>
                  )}
                </div>

                {/* Narration */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Narration</Label>
                  <div className="text-sm p-3 bg-muted rounded-md">{selectedVoucher.narration}</div>
                </div>

                {/* Voucher Lines */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Transaction Lines</Label>
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Account</TableHead>
                          <TableHead className="text-right">Debit</TableHead>
                          <TableHead className="text-right">Credit</TableHead>
                          <TableHead>Cost Center</TableHead>
                          <TableHead>Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedVoucher.lines.map((line) => (
                          <TableRow key={line.id}>
                            <TableCell>
                              <div className="font-medium">{line.accountCode} {line.accountName}</div>
                            </TableCell>
                            <TableCell className="text-right text-emerald-600">
                              {line.debit > 0 ? formatCurrency(line.debit) : "-"}
                            </TableCell>
                            <TableCell className="text-right text-rose-600">
                              {line.credit > 0 ? formatCurrency(line.credit) : "-"}
                            </TableCell>
                            <TableCell>
                              {line.costCenterId ? 
                                costCenters.find(c => c.id === line.costCenterId)?.name || "Unknown" : 
                                "-"
                              }
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {line.description || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Totals */}
                <div className="flex justify-end space-x-8 pt-4 border-t">
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Total Debits</div>
                    <div className="font-medium text-emerald-600">
                      {formatCurrency(selectedVoucher.lines.reduce((sum, line) => sum + line.debit, 0))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Total Credits</div>
                    <div className="font-medium text-rose-600">
                      {formatCurrency(selectedVoucher.lines.reduce((sum, line) => sum + line.credit, 0))}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between pt-4 border-t">
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleCloneVoucher(selectedVoucher)}>
                      Clone Voucher
                    </Button>
                    {selectedVoucher.status === VoucherStatus.PENDING_APPROVAL && (
                      <Button onClick={() => {
                        handleApproveVoucher(selectedVoucher)
                        setIsViewDialogOpen(false)
                      }}>
                        Approve
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {selectedVoucher.status !== VoucherStatus.VOID && (
                      <Button 
                        variant="destructive" 
                        onClick={() => {
                          handleVoidVoucher(selectedVoucher)
                          setIsViewDialogOpen(false)
                        }}
                      >
                        Void
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            )}
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
                    <SelectItem key={center.id} value={center.id.toString()}>
                      {center.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DateRangePicker
                date={dateRange}
                onDateChange={setDateRange}
                placeholder="Select date range"
                className="md:col-span-1"
              />
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
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">
                      Loading vouchers...
                    </TableCell>
                  </TableRow>
                ) : filteredVouchers.length > 0 ? (
                  filteredVouchers.map((voucher) => {
                    const costCenterName = voucher.costCenterId
                      ? costCenters.find((center) => center.id.toString() === voucher.costCenterId?.toString())?.name ?? ""
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
                              <DropdownMenuItem onClick={() => handleViewVoucher(voucher)}>
                                View voucher
                                <ArrowUpRight className="ml-auto h-3.5 w-3.5" />
                              </DropdownMenuItem>
                              {voucher.status === VoucherStatus.DRAFT && (
                                <>
                                  <DropdownMenuItem onClick={() => handleEditVoucher(voucher)}>
                                    Edit draft
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSubmitForApproval(voucher)}>
                                    Submit for approval
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuItem onClick={() => handleCloneVoucher(voucher)}>
                                Clone voucher
                              </DropdownMenuItem>
                              {voucher.status === VoucherStatus.PENDING_APPROVAL && (
                                <DropdownMenuItem onClick={() => handleApproveVoucher(voucher)}>
                                  Approve
                                </DropdownMenuItem>
                              )}
                              {voucher.status !== VoucherStatus.VOID && (
                                <DropdownMenuItem 
                                  className="text-destructive" 
                                  onClick={() => handleVoidVoucher(voucher)}
                                >
                                  Void
                                </DropdownMenuItem>
                              )}
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


