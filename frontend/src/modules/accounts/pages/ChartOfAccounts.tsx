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
  type ChartOfAccount, 
  type AccountGroup,
  type AccountCategory, 
  type AccountNodeType,
  type CreateChartOfAccountRequest 
} from "@/services/accounts-api"

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
}

const TreeNode = ({ node, depth, onSelect, selectedId }: TreeNodeProps) => {
  const isSelected = selectedId === node.id
  const paddingLeft = depth * 16

  return (
    <div className="mb-1">
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(node)}
        onKeyDown={(event) => event.key === "Enter" && onSelect(node)}
        className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 transition hover:bg-muted ${isSelected ? "border-primary bg-primary/10" : "border-border/60"}`}
        style={{ marginLeft: paddingLeft }}
      >
        <div className="flex items-center gap-3">
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
              <span>{node.group}</span>
              <span className="text-muted-foreground/40">|</span>
              <span>
                Balance: {node.balance.toLocaleString(undefined, { style: "currency", currency: node.currency })}
              </span>
              <span className="text-muted-foreground/40">|</span>
              <span className="capitalize">{node.status.toLowerCase()}</span>
            </div>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
      {node.children && node.children.length > 0 ? (
        <div className="mt-1 border-l border-border/50 pl-2">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} onSelect={onSelect} selectedId={selectedId} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

const flattenAccounts = (nodes: AccountNode[]): AccountNode[] => {
  return nodes.flatMap((node) => [node, ...(node.children ? flattenAccounts(node.children) : [])])
}

const flattenGroupNodes = (nodes: AccountGroupNode[]): AccountGroupNode[] => {
  return nodes.flatMap((node) => [node, ...(node.children ? flattenGroupNodes(node.children) : [])])
}

const filterAccountTree = (
  nodes: AccountNode[],
  predicate: (node: AccountNode) => boolean
): AccountNode[] => {
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
    .filter((node): node is AccountNode => node !== null)
}

type NewAccountFormState = {
  name: string
  code: string
  type: AccountNodeType
  category: AccountCategory
  parentId: string
  currency: string
  openingBalance: string
  isActive: boolean
  notes: string
  costCenters: string[]
}

const emptyAccountForm: NewAccountFormState = {
  name: "",
  code: "",
  type: "Posting",
  category: "Assets",
  parentId: "",
  currency: "USD",
  openingBalance: "",
  isActive: true,
  notes: "",
  costCenters: [],
}

const cloneAccountTree = (nodes: AccountNode[]): AccountNode[] => {
  return nodes.map((node) => ({
    ...node,
    costCenters: node.costCenters ? [...node.costCenters] : undefined,
    children: node.children ? cloneAccountTree(node.children) : undefined,
  }))
}

type AddAccountResult = {
  added: boolean
  nodes: AccountNode[]
}

const addAccountToTree = (nodes: AccountNode[], parentId: string | null, account: AccountNode): AddAccountResult => {
  if (!parentId) {
    return { added: true, nodes: [...nodes, account] }
  }

  let added = false
  const updatedNodes = nodes.map((node) => {
    if (node.id === parentId) {
      added = true
      const children = node.children ? [...node.children, account] : [account]
      return { ...node, children }
    }

    if (node.children) {
      const result = addAccountToTree(node.children, parentId, account)
      if (result.added) {
        added = true
        return { ...node, children: result.nodes }
      }
    }

    return node
  })

  return { added, nodes: updatedNodes }
}

const sortAccountTree = (nodes: AccountNode[]): AccountNode[] => {
  return [...nodes]
    .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
    .map((node) => {
      if (node.children) {
        return { ...node, children: sortAccountTree(node.children) }
      }
      return node
    })
}

const initialFlattenedAccounts = flattenAccounts(chartOfAccounts)
const initialSelectedAccountId =
  initialFlattenedAccounts.find((node) => node.type === "Posting")?.id ??
  initialFlattenedAccounts[0]?.id ??
  null

export default function ChartOfAccounts() {
  const [accountTree, setAccountTree] = useState<AccountNode[]>(() => cloneAccountTree(chartOfAccounts))
  const flattened = useMemo(() => flattenAccounts(accountTree), [accountTree])
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(initialSelectedAccountId)
  const selectedAccount = useMemo(
    () => (selectedAccountId ? flattened.find((node) => node.id === selectedAccountId) ?? null : null),
    [flattened, selectedAccountId]
  )
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedType, setSelectedType] = useState<AccountNodeType | "All">("All")
  const [selectedCategory, setSelectedCategory] = useState<AccountCategory | "All">("All")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newAccountForm, setNewAccountForm] = useState<NewAccountFormState>(emptyAccountForm)

  useEffect(() => {
    if (flattened.length === 0) {
      setSelectedAccountId(null)
      return
    }

    if (selectedAccountId) {
      const exists = flattened.some((account) => account.id === selectedAccountId)
      if (!exists) {
        const fallback = flattened.find((account) => account.type === "Posting") ?? flattened[0]
        setSelectedAccountId(fallback?.id ?? null)
      }
    } else {
      const fallback = flattened.find((account) => account.type === "Posting") ?? flattened[0]
      setSelectedAccountId(fallback?.id ?? null)
    }
  }, [flattened, selectedAccountId])

  const availableParentOptions = useMemo(
    () =>
      flattened.filter(
        (account) => account.type === "Control" && account.group === newAccountForm.category
      ),
    [flattened, newAccountForm.category]
  )

  const handleCreateDialogChange = (open: boolean) => {
    setIsCreateDialogOpen(open)
    if (open) {
      const fallbackCategory = selectedAccount?.group ?? "Assets"
      const fallbackParent =
        selectedAccount?.type === "Control"
          ? selectedAccount.id
          : flattened.find(
              (account) => account.group === fallbackCategory && account.type === "Control"
            )?.id ?? ""

      setNewAccountForm({
        name: "",
        code: "",
        type: "Posting",
        category: fallbackCategory,
        parentId: fallbackParent,
        currency: selectedAccount?.currency ?? "USD",
        openingBalance: "",
        isActive: true,
        notes: "",
        costCenters: [],
      })
    } else {
      setNewAccountForm(emptyAccountForm)
    }
  }

  const handleAccountTypeChange = (value: AccountNodeType) => {
    setNewAccountForm((previous) => ({
      ...previous,
      type: value,
      costCenters: value === "Control" ? [] : previous.costCenters,
    }))
  }

  const handleAccountCategoryChange = (value: AccountCategory) => {
    setNewAccountForm((previous) => {
      const parentStillValid =
        previous.parentId !== "" &&
        flattened.some(
          (account) =>
            account.id === previous.parentId &&
            account.type === "Control" &&
            account.group === value
        )

      const fallbackParent =
        parentStillValid
          ? previous.parentId
          : flattened.find(
              (account) => account.type === "Control" && account.group === value
            )?.id ?? ""

      return {
        ...previous,
        category: value,
        parentId: fallbackParent,
      }
    })
  }

  const handleCostCenterToggle = (id: string, checked: boolean) => {
    setNewAccountForm((previous) => {
      const next = new Set(previous.costCenters)
      if (checked) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return { ...previous, costCenters: Array.from(next) }
    })
  }

  const handleCreateAccountSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedName = newAccountForm.name.trim()
    const trimmedCode = newAccountForm.code.trim()

    if (!trimmedName || !trimmedCode) {
      toast.error("Account name and code are required")
      return
    }

    if (flattened.some((account) => account.code === trimmedCode)) {
      toast.error("An account with this code already exists")
      return
    }

    const newAccountId = `acct-${Date.now()}`
    const openingBalance = Number(newAccountForm.openingBalance) || 0

    const newAccount: AccountNode = {
      id: newAccountId,
      name: trimmedName,
      code: trimmedCode,
      type: newAccountForm.type,
      group: newAccountForm.category,
      balance: openingBalance,
      currency: newAccountForm.currency || "USD",
      status: newAccountForm.isActive ? "Active" : "Inactive",
      notes: newAccountForm.notes.trim() ? newAccountForm.notes.trim() : undefined,
    }

    if (newAccountForm.type === "Control") {
      newAccount.children = []
    } else if (newAccountForm.costCenters.length > 0) {
      newAccount.costCenters = newAccountForm.costCenters
    }

    const parentId = newAccountForm.parentId || null

    if (parentId) {
      newAccount.parentId = parentId
    }

    setAccountTree((previous) => {
      const result = addAccountToTree(previous, parentId, newAccount)
      const fallbackAccount = parentId ? { ...newAccount, parentId: undefined } : newAccount
      const nextTree = result.added ? result.nodes : [...result.nodes, fallbackAccount]
      return sortAccountTree(nextTree)
    })

    setSelectedAccountId(newAccountId)
    setIsCreateDialogOpen(false)
    setNewAccountForm(emptyAccountForm)
    toast.success("Account added", {
      description: `${trimmedName} (${trimmedCode}) is now available in the chart.`,
    })
  }
  const metrics = useMemo(() => {
    const total = flattened.length
    const posting = flattened.filter((node) => node.type === "Posting").length
    const active = flattened.filter((node) => node.status === "Active").length
    const costCenterSet = new Set<string>()
    flattened.forEach((node) => node.costCenters?.forEach((id) => costCenterSet.add(id)))
    return {
      total,
      posting,
      active,
      costCenters: costCenterSet.size,
    }
  }, [flattened])

  const filteredTree = useMemo(() => {
    const predicate = (node: AccountNode) => {
      const matchesType = selectedType === "All" || node.type === selectedType
      const matchesCategory = selectedCategory === "All" || node.group === selectedCategory
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
    return vouchers
      .flatMap((voucher) =>
        voucher.lines
          .filter((line) => line.accountCode === selectedAccount.code)
          .map((line) => ({
            voucherNo: voucher.voucherNo,
            type: voucher.type,
            date: voucher.date,
            costCenterId: line.costCenterId,
            narration: line.narration ?? voucher.narration,
            debit: line.debit,
            credit: line.credit,
          }))
      )
  }, [selectedAccount])

  const costCenterNames = useMemo(() => {
    if (!selectedAccount?.costCenters) return []
    return selectedAccount.costCenters
      .map((id) => costCenters.find((center) => center.id === id)?.name ?? id)
      .filter(Boolean)
  }, [selectedAccount])

  const allGroupOptions = useMemo(() => flattenGroupNodes(accountGroups), [])
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
                    value={newAccountForm.name}
                    onChange={(event) => setNewAccountForm((previous) => ({ ...previous, name: event.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-account-code">Account code</Label>
                  <Input
                    id="new-account-code"
                    value={newAccountForm.code}
                    onChange={(event) => setNewAccountForm((previous) => ({ ...previous, code: event.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-account-type">Account type</Label>
                  <Select
                    value={newAccountForm.type}
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
                    value={newAccountForm.category}
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
                    value={newAccountForm.parentId}
                    onValueChange={(value) => setNewAccountForm((previous) => ({ ...previous, parentId: value }))}
                  >
                    <SelectTrigger id="new-account-parent">
                      <SelectValue placeholder="Top-level (no parent)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Top-level (no parent)</SelectItem>
                      {availableParentOptions.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
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
                    value={newAccountForm.currency}
                    onChange={(event) => setNewAccountForm((previous) => ({ ...previous, currency: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-account-opening">Opening balance</Label>
                  <Input
                    id="new-account-opening"
                    type="number"
                    step="0.01"
                    value={newAccountForm.openingBalance}
                    onChange={(event) => setNewAccountForm((previous) => ({ ...previous, openingBalance: event.target.value }))}
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <Label htmlFor="new-account-active">Active</Label>
                    <p className="text-xs text-muted-foreground">
                      Inactive accounts remain in the hierarchy but cannot be posted to.
                    </p>
                  </div>
                  <Switch
                    id="new-account-active"
                    checked={newAccountForm.isActive}
                    onCheckedChange={(checked) =>
                      setNewAccountForm((previous) => ({ ...previous, isActive: Boolean(checked) }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-account-notes">Notes</Label>
                <Textarea
                  id="new-account-notes"
                  rows={3}
                  value={newAccountForm.notes}
                  onChange={(event) => setNewAccountForm((previous) => ({ ...previous, notes: event.target.value }))}
                  placeholder="Optional guidance for this account"
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Cost centers</Label>
                    <p className="text-xs text-muted-foreground">
                      Tag posting accounts to default cost centers. Control accounts cannot be tagged.
                    </p>
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {costCenters.map((center) => (
                    <label key={center.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={newAccountForm.costCenters.includes(center.id)}
                        onCheckedChange={(checked) => handleCostCenterToggle(center.id, checked === true)}
                        disabled={newAccountForm.type === "Control"}
                      />
                      <span>{center.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleCreateDialogChange(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create account</Button>
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
            <p className="text-2xl font-semibold">{metrics.costCenters}</p>
            <p className="text-xs text-muted-foreground">Unique cost centers mapped to accounts</p>
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
              {filteredTree.length > 0 ? (
                filteredTree.map((node) => (
                  <TreeNode
                    key={node.id}
                    node={node}
                    depth={0}
                    onSelect={(node) => setSelectedAccountId(node.id)}
                    selectedId={selectedAccountId}
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
                <DropdownMenuItem>Edit account</DropdownMenuItem>
                <DropdownMenuItem>Move to a different group</DropdownMenuItem>
                <DropdownMenuItem>Manage cost centers</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">Deactivate</DropdownMenuItem>
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
                    <Badge variant="outline">{selectedAccount.group}</Badge>
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
                          costCenterNames.map((name) => (
                            <Badge key={name} variant="secondary">
                              {name}
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
                      relatedLines.slice(0, 5).map((line, index) => (
                        <div
                          key={`${line.voucherNo}-${index}`}
                          className="grid grid-cols-6 items-center px-4 py-2 text-sm"
                        >
                          <span>{new Date(line.date).toLocaleDateString()}</span>
                          <span className="font-medium">{line.voucherNo}</span>
                          <span>{line.type}</span>
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
                          <span>{
                            line.costCenterId
                              ? costCenters.find((cc) => cc.id === line.costCenterId)?.name ?? "-"
                              : "-"
                          }</span>
                        </div>
                      ))
                    ) : (
                      <div className="flex h-32 flex-col items-center justify-center text-sm text-muted-foreground">
                        No vouchers found for this account in the sample data.
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








