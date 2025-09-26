import { useMemo, useState } from "react"
import {
  Plus,
  Search,
  Building,
  Filter,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  EllipsisVertical,
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
import { costCenters } from "@/modules/accounts/data/mockData"
import type { CostCenter, CostCenterType } from "@/modules/accounts/types"

const costCenterTypes: CostCenterType[] = ["Department", "Project", "Location"]

const formatCurrency = (value: number) =>
  value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  })

export default function CostCenters() {
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<CostCenterType | "All">("All")
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Inactive">("All")
  const [departmentFilter, setDepartmentFilter] = useState<string | "All">("All")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [autoAllocate, setAutoAllocate] = useState(true)

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
  }, [searchTerm, typeFilter, statusFilter, departmentFilter])

  const handleCreateCostCenter = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    toast.success("Cost center draft created", {
      description: "Submit for approval to activate budgeting controls.",
    })
    setIsDialogOpen(false)
  }

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
            <form className="space-y-4" onSubmit={handleCreateCostCenter}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="center-name">Name</Label>
                  <Input id="center-name" placeholder="Factory C" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="center-code">Code</Label>
                  <Input id="center-code" placeholder="CC-FC" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="center-type">Type</Label>
                  <Select defaultValue="Location">
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
                  <Input id="center-department" placeholder="Manufacturing" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="center-owner">Owner</Label>
                  <Input id="center-owner" placeholder="Name and title" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget">Annual budget</Label>
                  <Input id="budget" type="number" min="0" placeholder="500000" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="center-description">Description</Label>
                <Textarea id="center-description" placeholder="Explain how this cost center will be used" rows={3} />
              </div>
              <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                <div>
                  <Label className="text-sm font-medium">Auto allocate expenses</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically suggest this cost center on related vouchers.
                  </p>
                </div>
                <Switch checked={autoAllocate} onCheckedChange={setAutoAllocate} />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save draft</Button>
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
                  <TableHead>Budget vs actual</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCenters.length > 0 ? (
                  filteredCenters.map((center) => {
                    const utilization = Math.min(100, Math.round((center.actualSpend / center.budget) * 100))
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
                            {center.endDate ? (
                              <p className="text-xs text-muted-foreground">Ended {new Date(center.endDate).toLocaleDateString()}</p>
                            ) : (
                              <p className="text-xs text-muted-foreground">Started {new Date(center.startDate).toLocaleDateString()}</p>
                            )}
                          </div>
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
                              <DropdownMenuItem>View ledger</DropdownMenuItem>
                              <DropdownMenuItem>Edit details</DropdownMenuItem>
                              <DropdownMenuItem>Assign approvers</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">Deactivate</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-sm text-muted-foreground">
                      No cost centers match your filters. Adjust the search criteria or create a new center.
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





