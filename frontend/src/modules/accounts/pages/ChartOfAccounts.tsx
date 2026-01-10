"use client";

import { useEffect, useMemo, useState } from "react"
import {
  Plus,
  Search,
  FileSpreadsheet,
  Wallet,
  CircleDollarSign,
  Building2,
  ChevronRight,
  Tag,
  Users,
  ArrowUpRight,
  EllipsisVertical,
  Loader2,
  FileText,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/components/ui/sonner"
import { 
  ChartOfAccountsApiService, 
  AccountGroupsApiService,
  VouchersApiService,
  CostCentersApiService,
  type ChartOfAccount, 
  type AccountGroup,
  type AccountCategory, 
  type AccountNodeType,
  type CreateChartOfAccountRequest,
  type Voucher,
  type VoucherLine,
  type CostCenter
} from "@/services/accounts-api"
import { useFormatting } from "@/hooks/useFormatting"

// Extended type for voucher lines with voucher context
type ExtendedVoucherLine = VoucherLine & {
  voucherNo: string
  voucherType: string
  voucherDate: string
  voucherStatus: string
  voucherAmount: number
}

const accountTypes: AccountNodeType[] = ["Control", "Posting"]
const accountCategories: AccountCategory[] = [
  "Assets",
  "Liabilities",
  "Equity",
  "Revenue",
  "Expenses",
]

interface TreeNodeProps {
  node: ChartOfAccount
  depth: number
  onSelect: (node: ChartOfAccount) => void
  selectedId?: string
  onEdit?: (node: ChartOfAccount) => void
  onToggleStatus?: (node: ChartOfAccount) => void
}

const TreeNode = ({ node, depth, onSelect, selectedId, onEdit, onToggleStatus }: TreeNodeProps) => {
  const isSelected = selectedId === node.id.toString()
  const paddingLeft = depth * 16

  return (
    <div className="mb-1">
      <div
        className={`flex items-center justify-between rounded-lg border px-3 py-2 transition hover:bg-muted ${isSelected ? "border-primary bg-primary/10" : "border-border/60"}`}
        style={{ marginLeft: paddingLeft }}
      >
        <div 
          role="button"
          tabIndex={0}
          onClick={() => onSelect(node)}
          onKeyDown={(event) => event.key === "Enter" && onSelect(node)}
          className="flex cursor-pointer items-center gap-3 flex-1"
        >
          <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
              <span>{node.code}</span>
              <span className="text-muted-foreground/60">|</span>
              <span>{node.name}</span>
              <Badge variant="secondary" className="capitalize">
                {node.type.toLowerCase()}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Wallet className="h-3.5 w-3.5" />
              <span>{node.groupName || node.category}</span>
              <span className="text-muted-foreground/40">|</span>
              <span>
                Balance: {node.balance.toLocaleString(undefined, { style: "currency", currency: node.currency })}
              </span>
              <span className="text-muted-foreground/40">|</span>
              <span className="capitalize">{node.status.toLowerCase()}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <EllipsisVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(node)}>Edit</DropdownMenuItem>
              <DropdownMenuItem 
                className="text-destructive" 
                onClick={() => onToggleStatus?.(node)}
              >
                {node.status === 'Active' ? 'Deactivate' : 'Activate'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      {node.children && node.children.length > 0 ? (
        <div className="mt-1 border-l border-border/50 pl-2">
          {node.children.map((child) => (
            <TreeNode 
              key={child.id} 
              node={child} 
              depth={depth + 1} 
              onSelect={onSelect} 
              selectedId={selectedId}
              onEdit={onEdit}
              onToggleStatus={onToggleStatus}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

const flattenAccounts = (nodes: ChartOfAccount[]): ChartOfAccount[] => {
  return nodes.flatMap((node) => [node, ...(node.children ? flattenAccounts(node.children) : [])])
}

const flattenGroupNodes = (nodes: AccountGroup[], depth = 0): (AccountGroup & { depth: number })[] => {
  return nodes.flatMap((node) => [
    { ...node, depth },
    ...(node.children ? flattenGroupNodes(node.children, depth + 1) : [])
  ])
}

const filterAccountTree = (
  nodes: ChartOfAccount[],
  predicate: (node: ChartOfAccount) => boolean
): ChartOfAccount[] => {
  return nodes
    .map((node) => {
      const filteredChildren = node.children ? filterAccountTree(node.children, predicate) : []
      const includeNode = predicate(node) || filteredChildren.length > 0

      if (!includeNode) {
        return null
      }

      return {
        ...node,
        children: filteredChildren,
      }
    })
    .filter((node) => node !== null)
}



export default function ChartOfAccounts() {
  const [accountTree, setAccountTree] = useState<ChartOfAccount[]>([])
  const [accountGroups, setAccountGroups] = useState<AccountGroup[]>([])
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const flattened = useMemo(() => flattenAccounts(accountTree), [accountTree])
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const selectedAccount = useMemo(
    () => (selectedAccountId ? flattened.find((node) => node.id.toString() === selectedAccountId) ?? null : null),
    [flattened, selectedAccountId]
  )
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedType, setSelectedType] = useState<AccountNodeType | "All">("All")
  const [selectedCategory, setSelectedCategory] = useState<AccountCategory | "All">("All")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [formData, setFormData] = useState<CreateChartOfAccountRequest>({
    name: "",
    code: "",
    type: "Posting",
    category: "Assets",
    notes: "",
  })
  const [editingAccount, setEditingAccount] = useState<ChartOfAccount | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const { formatDate } = useFormatting()
  // Load data on component mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [accountsData, groupsData, vouchersResult, costCentersResult] = await Promise.all([
        ChartOfAccountsApiService.getChartOfAccountsTree(),
        AccountGroupsApiService.getAccountGroupsTree(),
        VouchersApiService.getVouchers({ limit: 1000 }),
        CostCentersApiService.getCostCenters({ limit: 1000 })
      ])
      setAccountTree(accountsData)
      setAccountGroups(groupsData)
      setVouchers(vouchersResult.data)
      setCostCenters(costCentersResult.data)
      
      // Set initial selected account
      const flattenedAccounts = flattenAccounts(accountsData)
      const initialSelected = flattenedAccounts.find((node) => node.type === "Posting")?.id ?? 
                             flattenedAccounts[0]?.id ?? null
      setSelectedAccountId(initialSelected?.toString() || null)
    } catch (error) {
      console.error('Failed to load data:', error)
      toast.error("Failed to load chart of accounts", {
        description: "Please try refreshing the page.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (flattened.length === 0) {
      setSelectedAccountId(null)
      return
    }

    if (selectedAccountId) {
      const exists = flattened.some((account) => account.id.toString() === selectedAccountId)
      if (!exists) {
        const fallback = flattened.find((account) => account.type === "Posting") ?? flattened[0]
        setSelectedAccountId(fallback?.id.toString() ?? null)
      }
    } else {
      const fallback = flattened.find((account) => account.type === "Posting") ?? flattened[0]
      setSelectedAccountId(fallback?.id.toString() ?? null)
    }
  }, [flattened, selectedAccountId])

  const availableParentOptions = useMemo(
    () =>
      flattened.filter(
        (account) => account.type === "Control" && account.category === formData.category
      ),
    [flattened, formData.category]
  )

  const availableGroupOptions = useMemo(
    () => flattenGroupNodes(accountGroups),
    [accountGroups]
  )

  const handleCreateDialogChange = (open: boolean) => {
    setIsCreateDialogOpen(open)
    if (open) {
      const fallbackCategory = selectedAccount?.category ?? "Assets"
      const fallbackParent =
        selectedAccount?.type === "Control"
          ? selectedAccount.id
          : flattened.find(
              (account) => account.category === fallbackCategory && account.type === "Control"
            )?.id ?? ""

      setFormData({
        name: "",
        code: "",
        type: "Posting",
        category: fallbackCategory,
        parentId: typeof fallbackParent === 'string' ? parseInt(fallbackParent) : fallbackParent,
        currency: selectedAccount?.currency ?? "USD",
        notes: "",
      })
    } else {
      setFormData({
        name: "",
        code: "",
        type: "Posting",
        category: "Assets",
        notes: "",
      })
    }
  }

  const handleCreateAccount = async () => {
    try {
      setIsCreating(true)
      await ChartOfAccountsApiService.createChartOfAccount(formData)
      toast.success("Account created successfully")
      setIsCreateDialogOpen(false)
      loadData() // Refresh data
    } catch (error: any) {
      console.error('Failed to create account:', error)
      toast.error("Failed to create account", {
        description: error.message || "Please try again.",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleEditAccount = () => {
    if (!selectedAccount) return
    setEditingAccount(selectedAccount)
    setFormData({
      name: selectedAccount.name,
      code: selectedAccount.code,
      type: selectedAccount.type,
      category: selectedAccount.category,
      parentId: selectedAccount.parentId,
      groupId: selectedAccount.groupId,
      currency: selectedAccount.currency,
      notes: selectedAccount.notes || "",
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateAccount = async () => {
    if (!editingAccount) return
    try {
      setIsCreating(true)
      await ChartOfAccountsApiService.updateChartOfAccount(editingAccount.id, formData)
      toast.success("Account updated successfully")
      setIsEditDialogOpen(false)
      setEditingAccount(null)
      loadData() // Refresh data
    } catch (error: any) {
      console.error('Failed to update account:', error)
      toast.error("Failed to update account", {
        description: error.message || "Please try again.",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleToggleAccountStatus = async (account?: ChartOfAccount) => {
    const accountToToggle = account || selectedAccount
    if (!accountToToggle) return
    try {
      if (accountToToggle.status === 'Active') {
        await ChartOfAccountsApiService.deactivateChartOfAccount(accountToToggle.id)
        toast.success("Account deactivated successfully")
      } else {
        await ChartOfAccountsApiService.activateChartOfAccount(accountToToggle.id)
        toast.success("Account activated successfully")
      }
      loadData() // Refresh data
    } catch (error: any) {
      console.error('Failed to toggle account status:', error)
      toast.error("Failed to update account status", {
        description: error.message || "Please try again.",
      })
    }
  }

  const handleEditAccountFromTree = (account: ChartOfAccount) => {
    setEditingAccount(account)
    setFormData({
      name: account.name,
      code: account.code,
      type: account.type,
      category: account.category,
      parentId: account.parentId,
      groupId: account.groupId,
      currency: account.currency,
      notes: account.notes || "",
    })
    setIsEditDialogOpen(true)
  }

  const handleAccountTypeChange = (value: AccountNodeType) => {
    setFormData((previous) => ({
      ...previous,
      type: value,
    }))
  }

  const handleAccountCategoryChange = (value: AccountCategory) => {
    setFormData((previous) => {
      const parentStillValid =
        previous.parentId &&
        flattened.some(
          (account) =>
            account.id === previous.parentId &&
            account.type === "Control" &&
            account.category === value
        )

      return {
        ...previous,
        category: value,
        parentId: parentStillValid ? previous.parentId : undefined,
        groupId: undefined, // Reset group when category changes
      }
    })
  }

  const handleAccountGroupChange = (value: string) => {
    const groupId = value === "none" ? undefined : parseInt(value)
    const selectedGroup = availableGroupOptions.find(g => g.id === groupId)
    
    if (selectedGroup && selectedGroup.category !== formData.category) {
      setFormData((previous) => {
        const parentStillValid =
          previous.parentId &&
          flattened.some(
            (account) =>
              account.id === previous.parentId &&
              account.type === "Control" &&
              account.category === selectedGroup.category
          )

        return {
          ...previous,
          category: selectedGroup.category,
          parentId: parentStillValid ? previous.parentId : undefined,
          groupId: groupId,
        }
      })
    } else {
      setFormData(prev => ({ ...prev, groupId }))
    }
  }


  const handleCreateAccountSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedName = formData.name.trim()
    const trimmedCode = formData.code.trim()

    if (!trimmedName || !trimmedCode) {
      toast.error("Account name and code are required")
      return
    }

    // Code uniqueness will be validated by the backend

    handleCreateAccount()
  }
  const metrics = useMemo(() => {
    const total = flattened.length
    const posting = flattened.filter((node) => node.type === "Posting").length
    const active = flattened.filter((node) => node.status === "Active").length
    return {
      total,
      posting,
      active,
    }
  }, [flattened])

  const filteredTree = useMemo(() => {
    const predicate = (node: ChartOfAccount) => {
      const matchesType = selectedType === "All" || node.type === selectedType
      const matchesCategory = selectedCategory === "All" || node.category === selectedCategory
      const matchesSearch =
        searchTerm.trim().length === 0 ||
        node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.code.includes(searchTerm)

      return matchesType && matchesCategory && matchesSearch
    }
    return filterAccountTree(accountTree, predicate)
  }, [accountTree, searchTerm, selectedType, selectedCategory])

  const relatedLines = useMemo(() => {
    if (!selectedAccount) return []
    
    // Get all voucher lines that reference this account
    const accountLines: ExtendedVoucherLine[] = []
    
    vouchers.forEach(voucher => {
      voucher.lines.forEach(line => {
        if (line.accountId === selectedAccount.id) {
          accountLines.push({
            ...line,
            // Add voucher context
            voucherNo: voucher.voucherNo,
            voucherType: voucher.type,
            voucherDate: voucher.date,
            voucherStatus: voucher.status,
            voucherAmount: voucher.amount
          })
        }
      })
    })
    
    // Sort by most recent first
    return accountLines.sort((a, b) => 
      new Date(b.voucherDate).getTime() - new Date(a.voucherDate).getTime()
    ).slice(0, 10) // Show last 10 transactions
  }, [selectedAccount, vouchers])

  const costCenterNames = useMemo(() => {
    if (!selectedAccount) return []
    
    // Get all cost centers that use this account as their default account
    const relatedCostCenters = costCenters.filter(center => 
      center.defaultAccountId === selectedAccount.id
    )
    
    // Also get cost centers that have transactions with this account
    const costCenterIds = new Set<number>()
    
    // Add cost centers from default account relationship
    relatedCostCenters.forEach(center => costCenterIds.add(center.id))
    
    // Add cost centers from voucher lines
    vouchers.forEach(voucher => {
      voucher.lines.forEach(line => {
        if (line.accountId === selectedAccount.id && line.costCenterId) {
          costCenterIds.add(line.costCenterId)
        }
      })
      
      // Also check voucher-level cost center
      if (voucher.costCenterId && voucher.lines.some(line => line.accountId === selectedAccount.id)) {
        costCenterIds.add(voucher.costCenterId)
      }
    })
    
    // Get cost center details
    return Array.from(costCenterIds)
      .map(id => costCenters.find(center => center.id === id))
      .filter(center => center !== undefined)
      .map(center => ({
        id: center!.id,
        name: center!.name,
        code: center!.code,
        type: center!.type,
        isDefault: center!.defaultAccountId === selectedAccount.id
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [selectedAccount, costCenters, vouchers])

  const allGroupOptions = useMemo(() => flattenGroupNodes(accountGroups), [accountGroups])
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Chart of Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Maintain the hierarchical structure of every financial account and control how transactions are captured.
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={handleCreateDialogChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add new account
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Create new account</DialogTitle>
              <DialogDescription>
                Define how this account should appear in the chart and configure its posting behaviour.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-6" onSubmit={handleCreateAccountSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-account-name">Account name</Label>
                  <Input
                    id="new-account-name"
                    value={formData.name}
                    onChange={(event) => setFormData((previous) => ({ ...previous, name: event.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-account-code">Account code</Label>
                  <Input
                    id="new-account-code"
                    value={formData.code}
                    onChange={(event) => setFormData((previous) => ({ ...previous, code: event.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-account-type">Account type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => handleAccountTypeChange(value as AccountNodeType)}
                  >
                    <SelectTrigger id="new-account-type">
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      {accountTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-account-category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => handleAccountCategoryChange(value as AccountCategory)}
                  >
                    <SelectTrigger id="new-account-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {accountCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-account-parent">Parent account</Label>
                  <Select
                    value={formData.parentId?.toString() || "none"}
                    onValueChange={(value) => setFormData((previous) => ({ ...previous, parentId: value === "none" ? undefined : parseInt(value) }))}
                  >
                    <SelectTrigger id="new-account-parent">
                      <SelectValue placeholder="Top-level (no parent)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Top-level (no parent)</SelectItem>
                      {availableParentOptions.map((account) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.code} - {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {availableParentOptions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No control accounts are available in this category yet. The new account will be created at the top level.
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-account-currency">Currency</Label>
                  <Input
                    id="new-account-currency"
                    value={formData.currency || "USD"}
                    onChange={(event) => setFormData((previous) => ({ ...previous, currency: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-account-group">Account Group</Label>
                  <Select
                    value={formData.groupId?.toString() || "none"}
                    onValueChange={handleAccountGroupChange}
                  >
                    <SelectTrigger id="new-account-group">
                      <SelectValue placeholder="Select account group (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No group</SelectItem>
                      {availableGroupOptions.map((group) => (
                        <SelectItem key={group.id} value={group.id.toString()}>
                          <span style={{ marginLeft: `${(group as any).depth * 12}px` }}>
                            <span className="text-muted-foreground/50 mr-2">{group.category.substring(0, 1)}</span>
                            {group.name} ({group.code})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-account-notes">Notes</Label>
                <Textarea
                  id="new-account-notes"
                  rows={3}
                  value={formData.notes || ""}
                  onChange={(event) => setFormData((previous) => ({ ...previous, notes: event.target.value }))}
                  placeholder="Optional guidance for this account"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleCreateDialogChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create account"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Account Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Edit account</DialogTitle>
              <DialogDescription>
                Update the account details and configuration.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleUpdateAccount(); }}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-account-name">Account name</Label>
                  <Input
                    id="edit-account-name"
                    value={formData.name}
                    onChange={(event) => setFormData((previous) => ({ ...previous, name: event.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-account-code">Account code</Label>
                  <Input
                    id="edit-account-code"
                    value={formData.code}
                    onChange={(event) => setFormData((previous) => ({ ...previous, code: event.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-account-type">Account type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => handleAccountTypeChange(value as AccountNodeType)}
                  >
                    <SelectTrigger id="edit-account-type">
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      {accountTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-account-category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => handleAccountCategoryChange(value as AccountCategory)}
                  >
                    <SelectTrigger id="edit-account-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {accountCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-account-parent">Parent account</Label>
                  <Select
                    value={formData.parentId?.toString() || "none"}
                    onValueChange={(value) => setFormData((previous) => ({ ...previous, parentId: value === "none" ? undefined : parseInt(value) }))}
                  >
                    <SelectTrigger id="edit-account-parent">
                      <SelectValue placeholder="Top-level (no parent)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Top-level (no parent)</SelectItem>
                      {availableParentOptions.filter(account => account.id !== editingAccount?.id).map((account) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.code} - {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {availableParentOptions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No control accounts are available in this category yet. The account will be at the top level.
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-account-currency">Currency</Label>
                  <Input
                    id="edit-account-currency"
                    value={formData.currency || "USD"}
                    onChange={(event) => setFormData((previous) => ({ ...previous, currency: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-account-group">Account Group</Label>
                  <Select
                    value={formData.groupId?.toString() || "none"}
                    onValueChange={handleAccountGroupChange}
                  >
                    <SelectTrigger id="edit-account-group">
                      <SelectValue placeholder="Select account group (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No group</SelectItem>
                      {availableGroupOptions.map((group) => (
                        <SelectItem key={group.id} value={group.id.toString()}>
                          <span style={{ marginLeft: `${(group as any).depth * 12}px` }}>
                            <span className="text-muted-foreground/50 mr-2">{group.category.substring(0, 1)}</span>
                            {group.name} ({group.code})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-account-notes">Notes</Label>
                <Textarea
                  id="edit-account-notes"
                  rows={3}
                  value={formData.notes || ""}
                  onChange={(event) => setFormData((previous) => ({ ...previous, notes: event.target.value }))}
                  placeholder="Optional guidance for this account"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update account"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total nodes</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{metrics.total}</p>
            <p className="text-xs text-muted-foreground">Control and posting accounts combined</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Posting ready</CardTitle>
            <Wallet className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{metrics.posting}</p>
            <p className="text-xs text-muted-foreground">Accounts that can accept journal entries</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active accounts</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{metrics.active}</p>
            <p className="text-xs text-muted-foreground">Available for daily transaction capture</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cost center links</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">0</p>
            <p className="text-xs text-muted-foreground">Cost centers (coming soon)</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card className="h-full">
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-2">
              <CardTitle>Account hierarchy</CardTitle>
              <p className="text-sm text-muted-foreground">
                Navigate the COA tree and drill into balances or relationships.
              </p>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by account name or code"
                  className="pl-10"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
              <Select value={selectedType} onValueChange={(value) => setSelectedType(value as AccountNodeType | "All")}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All types</SelectItem>
                  {accountTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type} accounts
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as AccountCategory | "All")}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All categories</SelectItem>
                  {accountCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select defaultValue="code">
                <SelectTrigger>
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="code">Sort by code</SelectItem>
                  <SelectItem value="name">Sort by name</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[620px] pr-4">
              {isLoading ? (
                <div className="flex h-32 flex-col items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mb-2" />
                  Loading chart of accounts...
                </div>
              ) : filteredTree.length > 0 ? (
                filteredTree.map((node) => (
                  <TreeNode
                    key={node.id}
                    node={node}
                    depth={0}
                    onSelect={(node) => setSelectedAccountId(node.id.toString())}
                    selectedId={selectedAccountId}
                    onEdit={handleEditAccountFromTree}
                    onToggleStatus={handleToggleAccountStatus}
                  />
                ))
              ) : (
                <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
                  <FileSpreadsheet className="h-8 w-8" />
                  <p className="font-medium">Nothing matches your filters</p>
                  <p className="text-sm">Try another search term or reset filters to see all accounts.</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader className="flex flex-row items-start justify-between">
            <div className="space-y-1">
              <CardTitle>Account details</CardTitle>
              <p className="text-sm text-muted-foreground">
                Review balances, cost center tags, and recent postings for the selected account.
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <EllipsisVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEditAccount}>Edit account</DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info("Cost centers feature coming soon")}>Manage cost centers</DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive" 
                  onClick={() => handleToggleAccountStatus()}
                >
                  {selectedAccount?.status === 'Active' ? 'Deactivate' : 'Activate'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent className="space-y-6">
            {selectedAccount ? (
              <>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="secondary" className="text-sm">
                      {selectedAccount.code}
                    </Badge>
                    <h2 className="text-lg font-semibold">{selectedAccount.name}</h2>
                    <Badge variant="outline" className="capitalize">
                      {selectedAccount.type.toLowerCase()} account
                    </Badge>
                    <Badge variant="outline">{selectedAccount.groupName || selectedAccount.category}</Badge>
                    <Badge className="bg-emerald-500 hover:bg-emerald-500">
                      {selectedAccount.status}
                    </Badge>
                  </div>
                  {selectedAccount.notes ? (
                    <p className="mt-3 text-sm text-muted-foreground">{selectedAccount.notes}</p>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Card className="border-border/60 bg-background">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Current balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-semibold">
                        {selectedAccount.balance.toLocaleString(undefined, {
                          style: "currency",
                          currency: selectedAccount.currency,
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">Balance as of today</p>
                    </CardContent>
                  </Card>
                  <Card className="border-border/60 bg-background">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Cost centers tagged</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-semibold">{costCenterNames.length}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {costCenterNames.length > 0 ? (
                          costCenterNames.map((center) => (
                            <Badge 
                              key={center.id} 
                              variant={center.isDefault ? "default" : "secondary"}
                              className={center.isDefault ? "bg-blue-500 hover:bg-blue-600" : ""}
                            >
                              {center.code} - {center.name}
                              {center.isDefault && " (Default)"}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground">No cost centers assigned</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h3 className="text-sm font-medium">Group lineage</h3>
                  <p className="text-xs text-muted-foreground">
                    The account inherits reporting structure and permissions from these parent groups.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {allGroupOptions
                      .filter((group) => selectedAccount.code.startsWith(group.code))
                      .map((group) => (
                        <Badge key={group.id} variant="outline" className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {group.code}
                          <span className="font-medium">{group.name}</span>
                        </Badge>
                      ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium">Recent vouchers</h3>
                      <p className="text-xs text-muted-foreground">
                        Showing the most recent postings involving this account.
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      View ledger
                      <ArrowUpRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>

                  <div className="rounded-lg border bg-muted/20">
                    <div className="grid grid-cols-6 border-b bg-muted/40 px-4 py-2 text-xs font-medium uppercase text-muted-foreground">
                      <span>Date</span>
                      <span>Voucher</span>
                      <span>Type</span>
                      <span>Debit</span>
                      <span>Credit</span>
                      <span>Cost center</span>
                    </div>
                    {relatedLines.length > 0 ? (
                      relatedLines.slice(0, 5).map((line, index) => {
                        const costCenter = line.costCenterId ? 
                          costCenters.find(c => c.id === line.costCenterId) : null
                        
                        return (
                          <div
                            key={`${line.voucherNo}-${index}`}
                            className="grid grid-cols-6 items-center px-4 py-2 text-sm"
                          >
                            <span>{formatDate(line.voucherDate)}</span>
                            <span className="font-medium">{line.voucherNo}</span>
                            <span>{line.voucherType}</span>
                            <span className={line.debit > 0 ? "text-emerald-600" : "text-muted-foreground"}>
                              {line.debit > 0
                                ? line.debit.toLocaleString(undefined, {
                                    style: "currency",
                                    currency: selectedAccount.currency,
                                  })
                                : "-"}
                            </span>
                            <span className={line.credit > 0 ? "text-rose-600" : "text-muted-foreground"}>
                              {line.credit > 0
                                ? line.credit.toLocaleString(undefined, {
                                    style: "currency",
                                    currency: selectedAccount.currency,
                                  })
                                : "-"}
                            </span>
                            <span className="text-xs">
                              {costCenter ? `${costCenter.code}` : "-"}
                            </span>
                          </div>
                        )
                      })
                    ) : (
                      <div className="flex h-32 flex-col items-center justify-center text-sm text-muted-foreground">
                        <FileText className="h-8 w-8 mb-2" />
                        <p>No transactions found</p>
                        <p className="text-xs">This account has no voucher entries yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-72 flex-col items-center justify-center gap-2 text-muted-foreground">
                <FileSpreadsheet className="h-8 w-8" />
                <p className="font-medium">Select an account from the hierarchy</p>
                <p className="text-sm">Account details, cost center mappings, and recent activity will appear here.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}








