import { useMemo, useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Plus,
  Search,
  Building,
  Filter,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  EllipsisVertical,
  Loader2,
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
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/sonner"
import { 
  CostCentersApiService,
  ChartOfAccountsApiService,
  type CostCenter, 
  type CostCenterType,
  type CostCenterStatus,
  type CreateCostCenterRequest,
  type ChartOfAccount
} from "@/services/accounts-api"
import { RBACApi } from "@/services/rbac-api"
import { AuthApi } from "@/services/auth-api"

const costCenterTypes: CostCenterType[] = ["Department", "Project", "Location"]

const formatCurrency = (value: number) =>
  value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  })

const flattenAccounts = (nodes: ChartOfAccount[]): ChartOfAccount[] =>
  nodes.flatMap((node) => [node, ...(node.children ? flattenAccounts(node.children) : [])])

export default function CostCenters() {
  const navigate = useNavigate()
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [chartOfAccounts, setChartOfAccounts] = useState<ChartOfAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<CostCenterType | "All">("All")
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Inactive">("All")
  const [departmentFilter, setDepartmentFilter] = useState<string | "All">("All")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingCostCenter, setEditingCostCenter] = useState<CostCenter | null>(null)
  const [isApproversDialogOpen, setIsApproversDialogOpen] = useState(false)
  const [selectedCostCenterForApprovers, setSelectedCostCenterForApprovers] = useState<CostCenter | null>(null)
  const [availableApprovers, setAvailableApprovers] = useState<any[]>([])
  const [isLoadingApprovers, setIsLoadingApprovers] = useState(false)
  const [formData, setFormData] = useState<CreateCostCenterRequest>({
    name: "",
    code: "",
    type: "Department",
    department: "",
    owner: "",
    budget: 0,
    defaultAccountId: undefined,
    description: "",
  })

  const allPostingAccounts = useMemo(() => 
    flattenAccounts(chartOfAccounts).filter((node) => node.type === "Posting"), 
    [chartOfAccounts]
  )

  // Load data on component mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [costCentersResult, accountsResult] = await Promise.all([
        CostCentersApiService.getCostCenters({ limit: 1000 }),
        ChartOfAccountsApiService.getChartOfAccountsTree()
      ])
      setCostCenters(costCentersResult.data)
      setChartOfAccounts(accountsResult)
    } catch (error) {
      console.error('Failed to load data:', error)
      toast.error("Failed to load data", {
        description: "Please try refreshing the page.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadCostCenters = async () => {
    try {
      setIsLoading(true)
      const response = await CostCentersApiService.getCostCenters({ limit: 1000 }) // Get all for now
      setCostCenters(response.data)
    } catch (error) {
      console.error('Failed to load cost centers:', error)
      toast.error("Failed to load cost centers", {
        description: "Please try refreshing the page.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateCostCenter = async () => {
    try {
      setIsCreating(true)
      await CostCentersApiService.createCostCenter(formData)
      toast.success("Cost center created successfully")
      setIsDialogOpen(false)
      setFormData({
        name: "",
        code: "",
        type: "Department",
        department: "",
        owner: "",
        budget: 0,
        description: "",
      })
      loadCostCenters() // Refresh data
    } catch (error: any) {
      console.error('Failed to create cost center:', error)
      toast.error("Failed to create cost center", {
        description: error.message || "Please try again.",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleToggleStatus = async (costCenter: CostCenter) => {
    try {
      if (costCenter.status === 'Active') {
        await CostCentersApiService.deactivateCostCenter(costCenter.id)
        toast.success("Cost center deactivated successfully")
      } else {
        await CostCentersApiService.activateCostCenter(costCenter.id)
        toast.success("Cost center activated successfully")
      }
      loadCostCenters() // Refresh data
    } catch (error: any) {
      console.error('Failed to toggle cost center status:', error)
      toast.error("Failed to update cost center status", {
        description: error.message || "Please try again.",
      })
    }
  }

  const handleUpdateCostCenter = async () => {
    if (!editingCostCenter) return
    
    try {
      setIsCreating(true)
      await CostCentersApiService.updateCostCenter(editingCostCenter.id, formData)
      toast.success("Cost center updated successfully")
      setIsEditDialogOpen(false)
      setEditingCostCenter(null)
      setFormData({
        name: "",
        code: "",
        type: "Department",
        department: "",
        owner: "",
        budget: 0,
        description: "",
      })
      loadCostCenters()
    } catch (error: any) {
      console.error('Failed to update cost center:', error)
      toast.error("Failed to update cost center", {
        description: error.message || "Please try again.",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleViewLedger = (costCenter: CostCenter) => {
    // Navigate to Cost Center Ledger page with the selected cost center
    navigate(`/finance/cost-center-ledger?costCenterId=${costCenter.id}`)
  }

  const handleEditCostCenter = (costCenter: CostCenter) => {
    setEditingCostCenter(costCenter)
    setFormData({
      name: costCenter.name,
      code: costCenter.code,
      type: costCenter.type,
      department: costCenter.department,
      owner: costCenter.owner,
      budget: costCenter.budget,
      defaultAccountId: costCenter.defaultAccountId,
      description: costCenter.description || "",
    })
    setIsEditDialogOpen(true)
  }

  const handleAssignApprovers = async (costCenter: CostCenter) => {
    setSelectedCostCenterForApprovers(costCenter)
    setIsApproversDialogOpen(true)
    
    // Load users who can approve expenses/vouchers
    try {
      setIsLoadingApprovers(true)
      const [usersWithPermission, allUsers] = await Promise.all([
        RBACApi.getUsersWithPermission({
          module: 'vouchers',
          action: 'approve',
          resource: 'all'
        }),
        AuthApi.getAllUsers()
      ])
      
      // Combine users with approval permission and all active users
      const approverUsers = [
        ...usersWithPermission.users,
        ...allUsers.filter(user => 
          user.is_active && 
          !usersWithPermission.users.some(existing => existing.id === user.id)
        )
      ]
      
      setAvailableApprovers(approverUsers)
    } catch (error) {
      console.error('Failed to load approvers:', error)
      toast.error("Failed to load available approvers")
      setAvailableApprovers([])
    } finally {
      setIsLoadingApprovers(false)
    }
  }

  const metrics = useMemo(() => {
    const totalBudget = costCenters.reduce((sum, center) => sum + center.budget, 0)
    const totalActual = costCenters.reduce((sum, center) => sum + center.actualSpend, 0)
    const variance = totalBudget - totalActual
    const active = costCenters.filter((center) => center.status === "Active").length
    const overBudget = costCenters.filter((center) => center.variance < 0).length

    return {
      totalBudget,
      totalActual,
      variance,
      active,
      overBudget,
    }
  }, [])

  const departmentOptions = useMemo(() => {
    const defaults = new Set<string>()
    costCenters.forEach((center) => defaults.add(center.department))
    return Array.from(defaults)
  }, [])

  const filteredCenters = useMemo(() => {
    return costCenters.filter((center) => {
      const matchesSearch =
        searchTerm.trim().length === 0 ||
        center.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        center.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        center.owner.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesType = typeFilter === "All" || center.type === typeFilter
      const matchesStatus = statusFilter === "All" || center.status === statusFilter
      const matchesDepartment = departmentFilter === "All" || center.department === departmentFilter

      return matchesSearch && matchesType && matchesStatus && matchesDepartment
    })
  }, [costCenters, searchTerm, typeFilter, statusFilter, departmentFilter])

    console.log(filteredCenters)
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cost Center Management</h1>
          <p className="text-sm text-muted-foreground">
            Tag spending to departments, factories, or projects and monitor budget utilization in real time.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New cost center
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create cost center</DialogTitle>
              <DialogDescription>
                Define a new reporting dimension to track spending and profitability across your organization.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleCreateCostCenter(); }}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="center-name">Name</Label>
                  <Input 
                    id="center-name" 
                    placeholder="Factory C" 
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="center-code">Code</Label>
                  <Input 
                    id="center-code" 
                    placeholder="CC-FC" 
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="center-type">Type</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as CostCenterType }))}
                  >
                    <SelectTrigger id="center-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {costCenterTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="center-department">Department</Label>
                  <Input 
                    id="center-department" 
                    placeholder="Manufacturing" 
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="center-owner">Owner</Label>
                  <Input 
                    id="center-owner" 
                    placeholder="Name and title" 
                    value={formData.owner}
                    onChange={(e) => setFormData(prev => ({ ...prev, owner: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget">Annual budget</Label>
                  <Input 
                    id="budget" 
                    type="number" 
                    min="0" 
                    placeholder="500000" 
                    value={formData.budget || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, budget: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default-account">Default expense account</Label>
                  <Select 
                    value={formData.defaultAccountId ? formData.defaultAccountId.toString() : "none"} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, defaultAccountId: value === "none" ? undefined : parseInt(value) }))}
                  >
                    <SelectTrigger id="default-account">
                      <SelectValue placeholder="Select default account (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No default account</SelectItem>
                      {allPostingAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.code} - {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="center-description">Description</Label>
                <Textarea 
                  id="center-description" 
                  placeholder="Explain how this cost center will be used" 
                  rows={3}
                  value={formData.description || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create cost center"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Cost Center Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit cost center</DialogTitle>
              <DialogDescription>
                Update the details for this cost center.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleUpdateCostCenter(); }}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-center-name">Name</Label>
                  <Input 
                    id="edit-center-name" 
                    placeholder="Factory C" 
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-center-code">Code</Label>
                  <Input 
                    id="edit-center-code" 
                    placeholder="CC-FC" 
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-center-type">Type</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as CostCenterType }))}
                  >
                    <SelectTrigger id="edit-center-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {costCenterTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-center-department">Department</Label>
                  <Input 
                    id="edit-center-department" 
                    placeholder="Manufacturing" 
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-center-owner">Owner</Label>
                  <Input 
                    id="edit-center-owner" 
                    placeholder="Name and title" 
                    value={formData.owner}
                    onChange={(e) => setFormData(prev => ({ ...prev, owner: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-budget">Annual budget</Label>
                  <Input 
                    id="edit-budget" 
                    type="number" 
                    min="0" 
                    placeholder="500000" 
                    value={formData.budget || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, budget: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-default-account">Default expense account</Label>
                  <Select 
                    value={formData.defaultAccountId ? formData.defaultAccountId.toString() : "none"} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, defaultAccountId: value === "none" ? undefined : parseInt(value) }))}
                  >
                    <SelectTrigger id="edit-default-account">
                      <SelectValue placeholder="Select default account (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No default account</SelectItem>
                      {allPostingAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.code} - {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-center-description">Description</Label>
                <Textarea 
                  id="edit-center-description" 
                  placeholder="Explain how this cost center will be used" 
                  rows={3}
                  value={formData.description || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update cost center"
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
            <CardTitle className="text-sm font-medium">Total budget</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(metrics.totalBudget)}</p>
            <p className="text-xs text-muted-foreground">Approved across all cost centers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Actual spend</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(metrics.totalActual)}</p>
            <p className="text-xs text-muted-foreground">Year to date expenditure</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Variance remaining</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {formatCurrency(Math.abs(metrics.variance))}
            </p>
            <p className="text-xs text-muted-foreground">
              {metrics.variance >= 0 ? "Budget headroom" : "Over budget"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Health snapshot</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div>
                <p className="text-lg font-semibold">{metrics.active}</p>
                <p className="text-xs text-muted-foreground">Active cost centers</p>
              </div>
              <div className="h-10 border-l" />
              <div>
                <p className="text-lg font-semibold">{metrics.overBudget}</p>
                <p className="text-xs text-muted-foreground">Over budget</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <CardTitle>Cost center directory</CardTitle>
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
              <div className="relative md:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, code, or owner"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as CostCenterType | "All")}>
                <SelectTrigger className="md:w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All types</SelectItem>
                  {costCenterTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={departmentFilter} onValueChange={(value) => setDepartmentFilter(value as string | "All")}>
                <SelectTrigger className="md:w-44">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All departments</SelectItem>
                  {departmentOptions.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "All" | "Active" | "Inactive")}>
                <SelectTrigger className="md:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All statuses</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            Showing {filteredCenters.length} of {costCenters.length} cost centers
          </div>
        </CardHeader>
        <CardContent className="overflow-hidden">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[260px]">Cost center</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Default account</TableHead>
                  <TableHead>Budget vs actual</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32">
                      <div className="flex flex-col items-center justify-center text-sm text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin mb-2" />
                        Loading cost centers...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredCenters.length > 0 ? (
                  filteredCenters.map((center) => {
                    const utilization = center.budget > 0 ? Math.min(100, Math.round((center.actualSpend / center.budget) * 100)) : 0
                    const isOverBudget = center.variance < 0
                    return (
                      <TableRow key={center.id} className={isOverBudget ? "bg-rose-50/40" : undefined}>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{center.name}</span>
                              <Badge variant="secondary" className="text-xs uppercase">
                                {center.code}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline" className="capitalize">
                                {center.type.toLowerCase()}
                              </Badge>
                              <span>|</span>
                              <span>{center.department}</span>
                              {center.description ? (
                                <span className="hidden text-muted-foreground/70 md:inline">
                                  | {center.description}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{center.owner}</p>
                            <p className="text-xs text-muted-foreground">
                              Created {new Date(center.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {center.defaultAccountCode ? (
                            <div className="space-y-1">
                              <p className="text-sm font-medium">{center.defaultAccountCode}</p>
                              <p className="text-xs text-muted-foreground">{center.defaultAccountName}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No default account</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>{formatCurrency(center.actualSpend)}</span>
                              <span className="text-muted-foreground">of {formatCurrency(center.budget)}</span>
                            </div>
                            <Progress value={utilization} className="h-2" />
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>{utilization}% utilised</span>
                              <span>{center.variance >= 0 ? "Under" : "Over"} budget</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell
                          className={`text-right text-sm font-medium ${
                            isOverBudget ? "text-rose-600" : "text-emerald-600"
                          }`}
                        >
                          {isOverBudget ? "-" : ""}
                          {formatCurrency(Math.abs(center.variance))}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={center.status === "Active" ? "default" : "secondary"} className={center.status === "Active" ? "bg-emerald-500 hover:bg-emerald-500" : undefined}>
                            {center.status}
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
                              <DropdownMenuItem onClick={() => handleViewLedger(center)}>View ledger</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditCostCenter(center)}>Edit details</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAssignApprovers(center)}>Assign approvers</DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive" 
                                onClick={() => handleToggleStatus(center)}
                              >
                                {center.status === 'Active' ? 'Deactivate' : 'Activate'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32">
                      <div className="flex flex-col items-center justify-center text-sm text-muted-foreground">
                        <Building className="h-8 w-8 mb-2" />
                        <p className="font-medium">No cost centers found</p>
                        <p>
                          {costCenters.length === 0 
                            ? "Create your first cost center to start tracking expenses."
                            : "No cost centers match your filters. Adjust the search criteria."
                          }
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Assign Approvers Dialog */}
      <Dialog open={isApproversDialogOpen} onOpenChange={setIsApproversDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Approvers - {selectedCostCenterForApprovers?.name}</DialogTitle>
            <DialogDescription>
              Select users who can approve expenses and vouchers for this cost center.
              Users with existing approval permissions are highlighted.
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingApprovers ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading available approvers...
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p><strong>Cost Center:</strong> {selectedCostCenterForApprovers?.code} - {selectedCostCenterForApprovers?.name}</p>
                <p><strong>Department:</strong> {selectedCostCenterForApprovers?.department}</p>
                <p><strong>Type:</strong> {selectedCostCenterForApprovers?.type}</p>
              </div>
              
              <div className="border rounded-lg">
                <div className="p-3 bg-muted/50 border-b">
                  <h4 className="font-medium">Available Approvers ({availableApprovers.length})</h4>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {availableApprovers.length > 0 ? (
                    availableApprovers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 border-b last:border-b-0">
                        <div className="flex items-center space-x-3">
                          <div className="flex-1">
                            <p className="font-medium">{user.full_name || user.username}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                            {user.role_display_name && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {user.role_display_name}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {user.permission_source === 'role' && (
                            <Badge variant="default" className="text-xs">
                              Has Permission
                            </Badge>
                          )}
                          <Switch 
                            checked={false} // This would be connected to actual assignment logic
                            onCheckedChange={(checked) => {
                              // TODO: Implement assignment logic
                              toast.info(`${checked ? 'Assigned' : 'Removed'} ${user.full_name || user.username} as approver`)
                            }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      <p>No users available for assignment</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <div className="text-blue-600 mt-0.5">ℹ️</div>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">About Approver Assignment</p>
                    <p>This feature allows you to designate specific users who can approve expenses and vouchers for this cost center. Users with existing system-wide approval permissions are automatically included.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproversDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast.success("Approver assignments saved successfully")
              setIsApproversDialogOpen(false)
            }}>
              Save Assignments
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}





