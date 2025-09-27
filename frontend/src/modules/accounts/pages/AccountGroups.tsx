import { useMemo, useState, useEffect } from "react"
import { Plus, Search, Layers, FolderTree, RefreshCw, EllipsisVertical, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "@/components/ui/sonner"
import { AccountGroupsApiService, type AccountGroup, type AccountCategory, type CreateAccountGroupRequest } from "@/services/accounts-api"
import {atob} from "node:buffer";

const accountCategories: AccountCategory[] = [
  "Assets",
  "Liabilities",
  "Equity",
  "Revenue",
  "Expenses",
]

const flattenGroups = (nodes: AccountGroup[]): AccountGroup[] => {
  return nodes.flatMap((node) => [node, ...(node.children ? flattenGroups(node.children) : [])])
}

const renderGroupTree = (nodes: AccountGroup[], depth = 0) => {
  return nodes.map((node) => (
    <div
      key={node.id}
      className="rounded-lg border border-border/60 bg-card mb-2"
      style={{ marginLeft: depth * 16 }}
    >
      <div className="flex items-start justify-between gap-3 p-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FolderTree className="h-4 w-4" />
            <span>{node.code}</span>
            <span className="text-border">�</span>
            <span>{node.category}</span>
          </div>
          <div className="flex items-center gap-2">
            <p className="font-medium leading-none">{node.name}</p>
            <Badge variant={node.status === "Active" ? "default" : "secondary"} className={node.status === "Active" ? "bg-emerald-500 hover:bg-emerald-500" : "bg-muted text-muted-foreground"}>
              {node.status}
            </Badge>
          </div>
          {node.description ? (
            <p className="text-sm text-muted-foreground">{node.description}</p>
          ) : null}
          <div className="text-xs text-muted-foreground/80">
            Last updated {new Date(node.updatedAt).toLocaleDateString()} • Created {new Date(node.createdAt).toLocaleDateString()}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <EllipsisVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Edit group</DropdownMenuItem>
            <DropdownMenuItem>Add child group</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Inactivate</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {node.children && node.children.length > 0 ? (
        <div className="border-t border-border/60 bg-muted/40 p-2">
          {renderGroupTree(node.children, depth + 1)}
        </div>
      ) : null}
    </div>
  ))
}

export default function AccountGroups() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<AccountCategory | "All">("All")
  const [showInactive, setShowInactive] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [accountGroups, setAccountGroups] = useState<AccountGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState<CreateAccountGroupRequest>({
    name: "",
    code: "",
    category: "Assets",
    description: "",
  })
    console.log(formData)
  // Load account groups on component mount
  useEffect(() => {
    loadAccountGroups()
  }, [])

  const loadAccountGroups = async () => {
    try {
      setIsLoading(true)
      const data = await AccountGroupsApiService.getAccountGroupsTree()
      setAccountGroups(data)
    } catch (error) {
      console.error('Failed to load account groups:', error)
      toast.error("Failed to load account groups", {
        description: "Please try refreshing the page.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const allGroups = useMemo(() => flattenGroups(accountGroups), [accountGroups])

  const metrics = useMemo(() => {
    const total = allGroups.length
    const active = allGroups.filter((group) => group.status === "Active").length
    const inactive = total - active
    return {
      total,
      active,
      inactive,
    }
  }, [allGroups])

  const filteredTree = useMemo(() => {
    const filterNodes = (nodes: AccountGroup[]): AccountGroup[] => {
      return nodes
        .map((node) => {
          const matchesCategory = selectedCategory === "All" || node.category === selectedCategory
          const matchesStatus = showInactive ? true : node.status === "Active"
          const matchesSearch =
            searchTerm.trim().length === 0 ||
            node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            node.code.includes(searchTerm)

          const filteredChildren = node.children ? filterNodes(node.children) : []
          const includeNode = (matchesCategory && matchesStatus && matchesSearch) || filteredChildren.length > 0

          if (!includeNode) {
            return null
          }

          return {
            ...node,
            children: filteredChildren,
          }
        })
        .filter((node): node is AccountGroup => node !== null)
    }

    return filterNodes(accountGroups)
  }, [searchTerm, selectedCategory, showInactive, accountGroups])

  const handleCreateGroup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    
    try {
      setIsCreating(true)
      await AccountGroupsApiService.createAccountGroup(formData)
      toast.success("Account group created", {
        description: "The new account group has been added successfully.",
      })
      setIsDialogOpen(false)
      setFormData({
        name: "",
        code: "",
        category: "Assets",
        description: "",
      })
      // Reload the account groups
      await loadAccountGroups()
    } catch (error) {
      console.error('Failed to create account group:', error)
      toast.error("Failed to create account group", {
        description: "Please check your input and try again.",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleRefresh = () => {
    loadAccountGroups()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Account Head Groups</h1>
            <p className="text-sm text-muted-foreground">
              Define and organize the high-level structure of your chart of accounts.
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New group
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create account group</DialogTitle>
                <DialogDescription>
                  Configure the grouping for your chart of accounts. Child groups inherit reporting behavior from their parent.
                </DialogDescription>
              </DialogHeader>
              <form className="space-y-4" onSubmit={handleCreateGroup}>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="group-name">Group name</Label>
                    <Input 
                      id="group-name" 
                      placeholder="e.g. Prepaid Expenses" 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="group-code">Group code</Label>
                    <Input 
                      id="group-code" 
                      placeholder="e.g. 1150" 
                      value={formData.code}
                      onChange={(e) => setFormData({...formData, code: e.target.value})}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="group-category">Category</Label>
                    <Select 
                      value={formData.category}
                      onValueChange={(value) => setFormData({...formData, category: value as AccountCategory})}
                    >
                      <SelectTrigger id="group-category">
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
                    <Label htmlFor="group-parent">Parent group (optional)</Label>
                    <Select 
                    value={formData.parentId?.toString()}
                      onValueChange={(value) => setFormData({...formData, parentId: value.toString()})}>
                      <SelectTrigger id="group-parent">
                        <SelectValue placeholder="Top-level group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Top-level group</SelectItem>
                        {allGroups.map((group) => (
                          <SelectItem key={group.id} value={group.id.toString()}>
                            {group.code} � {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="group-description">Description</Label>
                    <Textarea
                      id="group-description"
                      placeholder="Provide context about how this group should be used"
                      value={formData.description || ""}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <Label className="text-sm font-medium">Active</Label>
                      <p className="text-xs text-muted-foreground">
                        Toggle to immediately allow chart usage for this group.
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
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
                      "Save group"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total groups</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{metrics.total}</p>
            <p className="text-xs text-muted-foreground">Across all financial statement categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active groups</CardTitle>
            <RefreshCw className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{metrics.active}</p>
            <p className="text-xs text-muted-foreground">Available for posting in COA</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inactive groups</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{metrics.inactive}</p>
            <p className="text-xs text-muted-foreground">Pending cleanup or reactivation</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <CardTitle>Group catalogue</CardTitle>
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <div className="relative md:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or code"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as AccountCategory | "All")}>
                <SelectTrigger className="md:w-48">
                  <SelectValue placeholder="All categories" />
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
              <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                <Switch
                  id="toggle-inactive"
                  checked={showInactive}
                  onCheckedChange={setShowInactive}
                />
                <Label htmlFor="toggle-inactive" className="text-sm font-normal">
                  Show inactive
                </Label>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[520px] pr-4">
            {isLoading ? (
              <div className="flex h-48 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="font-medium">Loading account groups...</p>
              </div>
            ) : filteredTree.length > 0 ? (
              <div className="space-y-2">
                {renderGroupTree(filteredTree)}
              </div>
            ) : (
              <div className="flex h-48 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                <FolderTree className="h-8 w-8" />
                <p className="font-medium">No matching groups</p>
                <p className="text-sm">Try adjusting your filters or create a new grouping.</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
