"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Copy,
  History,
  Package,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  BarChart3,
  Download,
  Upload,
  MoreHorizontal,
} from "lucide-react";
import { useFormatting } from "@/hooks/useFormatting";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { BOMApiService, bomQueryKeys, BOMQueryParams, BillOfMaterials, BOMCategory, CreateBOMRequest } from "@/services/bom-api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CATEGORY_META } from "@/modules/factory/utils/bomCategory";
import { downloadCsv } from "@/utils/export-print";

type BOMListProps = {
  defaultCategory?: BOMCategory;
};

export default function BOMList({ defaultCategory }: BOMListProps = {}) {
  const router = useRouter();
  const { formatCurrency, formatDate, formatNumber } = useFormatting();
  const isCategoryLocked = Boolean(defaultCategory);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | BOMCategory>(
    defaultCategory ?? "all"
  );
  const [showBOMDialog, setShowBOMDialog] = useState(false);
  const [selectedBOM, setSelectedBOM] = useState<BillOfMaterials | null>(null);
  const [activeTab, setActiveTab] = useState("all-boms");
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // API query parameters
  const queryParams: BOMQueryParams = {
    search: searchTerm || undefined,
    is_active: statusFilter === "all" ? undefined : statusFilter === "active",
    category: categoryFilter === "all" ? undefined : categoryFilter,
    page: 1,
    limit: 50,
  };

  // Fetch BOMs data
  const { data: bomsData, isLoading: bomsLoading } = useQuery({
    queryKey: bomQueryKeys.list(queryParams),
    queryFn: () => BOMApiService.getBOMs(queryParams),
  });

  // Fetch BOM statistics
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: bomQueryKeys.stats(),
    queryFn: () => BOMApiService.getBOMStats(),
  });

  const boms = bomsData?.boms || [];
  const stats = statsData || {
    total_boms: 0,
    active_boms: 0,
    average_components: 0,
    average_cost: 0,
    most_expensive_bom: "",
    least_expensive_bom: "",
    components_without_supplier: 0,
    outdated_boms: 0,
  };

  const handleCreateBOM = () => {
    const url = defaultCategory
      ? `/factory/bom/new?category=${defaultCategory}`
      : "/factory/bom/new";
    router.push(url);
  };

  const handleEditBOM = (bomId: string) => {
    router.push(`/factory/bom/${bomId}/edit`);
  };

  const handleViewBOM = async (bom: BillOfMaterials) => {
    try {
      const detailedBOM = await BOMApiService.getBOMById(bom.id);
      setSelectedBOM(detailedBOM);
      setShowBOMDialog(true);
    } catch (error) {
      console.error("Failed to fetch BOM details:", error);
    }
  };

  // CSV columns shared by export and import (round-trippable).
  const CSV_HEADERS = [
    "Parent Product ID",
    "Parent Product",
    "SKU",
    "Version",
    "Effective Date",
    "Category",
    "Active",
    "Cutting Size",
    "Reel Size",
    "Component Product ID",
    "Component",
    "Component SKU",
    "Quantity Required",
    "Unit",
    "Optional",
    "Scrap Factor",
    "Unit Cost",
    "Total Cost",
  ];

  const handleExportBOM = async () => {
    try {
      const targets = filteredBOMs;
      if (targets.length === 0) {
        toast.info("No BOMs to export");
        return;
      }
      // List endpoint omits components, so fetch each BOM's full detail.
      const detailed = await Promise.all(targets.map((b) => BOMApiService.getBOMById(b.id)));
      const rows: (string | number)[][] = [];
      for (const bom of detailed) {
        const base = [
          bom.parent_product_id ?? "",
          bom.parent_product_name ?? "",
          bom.parent_product_sku ?? "",
          bom.version ?? "",
          bom.effective_date ? bom.effective_date.slice(0, 10) : "",
          bom.category ?? "",
          bom.is_active ? "yes" : "no",
          bom.cutting_size ?? "",
          bom.reel_size ?? "",
        ];
        if (bom.components && bom.components.length > 0) {
          for (const c of bom.components) {
            rows.push([
              ...base,
              c.component_product_id ?? "",
              c.component_product_name ?? "",
              c.component_product_sku ?? "",
              c.quantity_required ?? "",
              c.unit_of_measure ?? "",
              c.is_optional ? "yes" : "no",
              c.scrap_factor ?? 0,
              c.unit_cost ?? "",
              c.total_cost ?? "",
            ]);
          }
        } else {
          rows.push([...base, "", "", "", "", "", "", "", "", ""]);
        }
      }
      const label = defaultCategory ? CATEGORY_META[defaultCategory].slug : "all";
      downloadCsv(`boms-${label}.csv`, CSV_HEADERS, rows);
      toast.success(`Exported ${detailed.length} BOM(s)`);
    } catch (error) {
      console.error("Failed to export BOMs:", error);
      toast.error("Failed to export BOMs");
    }
  };

  // Minimal RFC-4180-ish CSV parser (handles quoted fields, commas, newlines).
  const parseCsv = (text: string): string[][] => {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
        } else { field += ch; }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(field); field = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(field); field = "";
        if (row.some((c) => c.trim() !== "")) rows.push(row);
        row = [];
      } else { field += ch; }
    }
    if (field !== "" || row.length > 0) { row.push(field); if (row.some((c) => c.trim() !== "")) rows.push(row); }
    return rows;
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = ""; // allow re-importing the same file
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (parsed.length < 2) {
        toast.error("CSV is empty or missing a header row");
        return;
      }
      const idx = (name: string) => CSV_HEADERS.indexOf(name);
      // Group rows into BOMs keyed by parent product + version + category.
      const groups = new Map<string, CreateBOMRequest>();
      for (const cols of parsed.slice(1)) {
        const parentId = (cols[idx("Parent Product ID")] || "").trim();
        if (!parentId) continue;
        const version = (cols[idx("Version")] || "1.0").trim() || "1.0";
        const category = (cols[idx("Category")] || "").trim() as BOMCategory;
        const key = `${parentId}|${version}|${category}`;
        if (!groups.has(key)) {
          groups.set(key, {
            parent_product_id: parentId,
            version,
            effective_date:
              (cols[idx("Effective Date")] || "").trim() || new Date().toISOString().slice(0, 10),
            category: category || defaultCategory || "corrugation",
            cutting_size: (cols[idx("Cutting Size")] || "").trim() || undefined,
            reel_size: (cols[idx("Reel Size")] || "").trim() || undefined,
            components: [],
          });
        }
        const componentId = (cols[idx("Component Product ID")] || "").trim();
        if (componentId) {
          groups.get(key)!.components.push({
            component_product_id: componentId,
            quantity_required: parseFloat(cols[idx("Quantity Required")] || "0") || 0,
            unit_of_measure: (cols[idx("Unit")] || "").trim() || "pcs",
            is_optional: /^(yes|true|1)$/i.test((cols[idx("Optional")] || "").trim()),
            scrap_factor: parseFloat(cols[idx("Scrap Factor")] || "0") || 0,
          });
        }
      }
      const requests = [...groups.values()].filter((b) => b.components.length > 0);
      if (requests.length === 0) {
        toast.error("No valid BOM rows found in the CSV");
        return;
      }
      let created = 0;
      const failures: string[] = [];
      for (const req of requests) {
        try {
          await BOMApiService.createBOM(req);
          created++;
        } catch (err: any) {
          failures.push(err?.message || req.parent_product_id);
        }
      }
      await queryClient.invalidateQueries({ queryKey: bomQueryKeys.all });
      if (created > 0) toast.success(`Imported ${created} BOM(s)`);
      if (failures.length > 0) toast.error(`${failures.length} BOM(s) failed to import`);
    } catch (error) {
      console.error("Failed to import BOMs:", error);
      toast.error("Failed to read or parse the CSV file");
    } finally {
      setImporting(false);
    }
  };

  // Local filtering for search (API handles status filtering)
  const filteredBOMs = boms.filter((bom) => {
    if (!searchTerm) return true;

    return (
      bom.parent_product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bom.parent_product_sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bom.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bom.version?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? "bg-green-100 text-green-800"
      : "bg-gray-100 text-gray-800";
  };

  const componentsWithSuppliersPct =
    stats.total_boms * stats.average_components > 0
      ? ((stats.total_boms * stats.average_components - stats.components_without_supplier) /
          (stats.total_boms * stats.average_components)) *
        100
      : 0;

  const handleCopyBOM = (bom: BillOfMaterials) => {
    // Copy BOM functionality
    console.log("Copy BOM:", bom.id);
  };

  const handleViewHistory = (bom: BillOfMaterials) => {
    // View BOM version history
    console.log("View history for BOM:", bom.id);
  };

  // Handle loading states
  if (bomsLoading || statsLoading) {
    return (
      <div className="space-y-6" data-testid="bom-loading-state">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" data-testid="bom-loading-title">Bill of Materials</h1>
            <p className="text-muted-foreground" data-testid="bom-loading-subtitle">
              Manage product component structures and material requirements
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="bom-list-container">
      {/* Header */}
      <div className="flex items-center justify-between" data-testid="bom-list-header">
        <div>
          {(() => {
            const meta = defaultCategory ? CATEGORY_META[defaultCategory] : null;
            const Icon = meta?.icon;
            return (
              <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="bom-list-title">
                {Icon && <Icon className="h-7 w-7" />}
                {meta ? `${meta.titleLabel ?? meta.label} BOMs` : "Bill of Materials"}
              </h1>
            );
          })()}
          <p className="text-muted-foreground" data-testid="bom-list-subtitle">
            {defaultCategory
              ? `Manage ${CATEGORY_META[defaultCategory].label.toLowerCase()} bills of materials`
              : "Manage product component structures and material requirements"}
          </p>
        </div>
        <div className="flex gap-2" data-testid="bom-list-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleImportFile}
            data-testid="import-bom-input"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            data-testid="import-bom-button"
          >
            <Upload className="h-4 w-4 mr-2" />
            {importing ? "Importing…" : "Import BOM"}
          </Button>
          <Button variant="outline" onClick={handleExportBOM} data-testid="export-bom-button">
            <Download className="h-4 w-4 mr-2" />
            Export BOM
          </Button>
          <Button type="button" variant="add" onClick={handleCreateBOM} data-testid="create-bom-button">
            <Plus className="h-4 w-4 mr-2" />
            {defaultCategory ? `Create ${CATEGORY_META[defaultCategory].label} BOM` : "Create BOM"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="bom-stats-grid">
        <Card data-testid="total-boms-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium" data-testid="total-boms-title">Total BOMs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" data-testid="total-boms-icon" />
          </CardHeader>
          <CardContent data-testid="total-boms-content">
            <div className="text-2xl font-bold" data-testid="total-boms-count">{stats.total_boms}</div>
            <p className="text-xs text-muted-foreground" data-testid="active-boms-count">
              {stats.active_boms} active
            </p>
          </CardContent>
        </Card>

        <Card data-testid="avg-components-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium" data-testid="avg-components-title">
              Avg Components
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" data-testid="avg-components-icon" />
          </CardHeader>
          <CardContent data-testid="avg-components-content">
            <div className="text-2xl font-bold" data-testid="avg-components-value">{Number(stats.average_components).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground" data-testid="avg-components-label">per BOM</p>
          </CardContent>
        </Card>

        <Card data-testid="avg-cost-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium" data-testid="avg-cost-title">Avg Cost</CardTitle>
            <span className="text-base font-semibold leading-none text-muted-foreground" data-testid="avg-cost-icon" aria-hidden>৳</span>
          </CardHeader>
          <CardContent data-testid="avg-cost-content">
            <div className="text-2xl font-bold" data-testid="avg-cost-value">
              {formatCurrency(stats.average_cost)}
            </div>
            <p className="text-xs text-muted-foreground">per BOM</p>
          </CardContent>
        </Card>

        <Card
          data-testid="bom-issues-card"
          role="button"
          tabIndex={0}
          onClick={() => setActiveTab("issues")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setActiveTab("issues");
            }
          }}
          className="cursor-pointer transition-colors hover:bg-muted/50"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium" data-testid="issues-title">Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" data-testid="issues-icon" />
          </CardHeader>
          <CardContent data-testid="issues-content">
            <div className="text-2xl font-bold text-orange-600" data-testid="issues-count">
              {stats.components_without_supplier + stats.outdated_boms}
            </div>
            <p className="text-xs text-muted-foreground" data-testid="issues-label">need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4" data-testid="bom-main-tabs">
        <TabsList data-testid="bom-tabs-list">
          <TabsTrigger value="all-boms" data-testid="all-boms-tab">All BOMs</TabsTrigger>
          <TabsTrigger value="active-boms" data-testid="active-boms-tab">Active BOMs</TabsTrigger>
          <TabsTrigger value="issues" data-testid="issues-tab">Issues</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="analytics-tab">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="all-boms" className="space-y-4" data-testid="all-boms-tab-content">
          {/* Search and Filters */}
          <Card data-testid="bom-search-filters-card">
            <CardContent className="pt-6" data-testid="bom-search-filters-content">
              <div className="flex gap-4" data-testid="search-filters-row">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" data-testid="search-icon" />
                    <Input
                      placeholder="Search BOMs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      data-testid="bom-search-input"
                    />
                  </div>
                </div>
                <Tabs value={statusFilter} onValueChange={setStatusFilter} data-testid="status-filter-tabs">
                  <TabsList data-testid="status-filter-tabs-list">
                    <TabsTrigger value="all" data-testid="filter-all-tab">All</TabsTrigger>
                    <TabsTrigger value="active" data-testid="filter-active-tab">Active</TabsTrigger>
                    <TabsTrigger value="inactive" data-testid="filter-inactive-tab">Inactive</TabsTrigger>
                  </TabsList>
                </Tabs>
                {!isCategoryLocked && (
                  <Tabs
                    value={categoryFilter}
                    onValueChange={(v) => setCategoryFilter(v as "all" | BOMCategory)}
                    data-testid="category-filter-tabs"
                  >
                    <TabsList data-testid="category-filter-tabs-list">
                      <TabsTrigger value="all" data-testid="filter-category-all-tab">All</TabsTrigger>
                      <TabsTrigger value="corrugation" data-testid="filter-category-corrugation-tab">Corrugation</TabsTrigger>
                      <TabsTrigger value="printing" data-testid="filter-category-printing-tab">Printing</TabsTrigger>
                      <TabsTrigger value="ready_goods" data-testid="filter-category-ready_goods-tab">Ready Goods</TabsTrigger>
                    </TabsList>
                  </Tabs>
                )}
              </div>
            </CardContent>
          </Card>

          {/* BOMs Table */}
          <Card data-testid="boms-table-card">
            <CardHeader>
              <CardTitle data-testid="boms-table-title">Bill of Materials</CardTitle>
            </CardHeader>
            <CardContent data-testid="boms-table-content">
              <Table data-testid="boms-table">
                <TableHeader data-testid="boms-table-header">
                  <TableRow data-testid="boms-table-header-row">
                    <TableHead data-testid="bom-id-header">BOM ID</TableHead>
                    <TableHead data-testid="product-header">Product</TableHead>
                    <TableHead data-testid="version-header">Version</TableHead>
                    {!isCategoryLocked && (
                      <TableHead data-testid="category-header">Category</TableHead>
                    )}
                    <TableHead data-testid="components-header">Components</TableHead>
                    <TableHead data-testid="total-cost-header">Total Cost</TableHead>
                    <TableHead data-testid="status-header">Status</TableHead>
                    <TableHead data-testid="created-header">Created</TableHead>
                    <TableHead data-testid="actions-header">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody data-testid="boms-table-body">
                  {filteredBOMs.map((bom) => (
                    <TableRow key={bom.id} data-testid={`bom-row-${bom.id}`}>
                      <TableCell className="font-medium">{bom.id}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {bom.parent_product_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {bom.parent_product_sku}
                          </div>
                          {(bom.cutting_size || bom.reel_size) && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {[
                                bom.cutting_size && `Cutting: ${bom.cutting_size}`,
                                bom.reel_size && `Reel: ${bom.reel_size}`,
                              ]
                                .filter(Boolean)
                                .join(" • ")}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{bom.version}</Badge>
                      </TableCell>
                      {!isCategoryLocked && (
                        <TableCell data-testid={`bom-category-${bom.id}`}>
                          {(() => {
                            const meta = CATEGORY_META[bom.category];
                            if (!meta) return <Badge variant="secondary">{bom.category}</Badge>;
                            const Icon = meta.icon;
                            return (
                              <Badge className={`gap-1 ${meta.badgeClass}`}>
                                <Icon className="h-3 w-3" />
                                {meta.label}
                              </Badge>
                            );
                          })()}
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {bom.components?.length || 0}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            components
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(bom.total_cost)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(bom.is_active)}>
                          {bom.is_active ? "ACTIVE" : "INACTIVE"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm">
                            {formatDate(bom.created_at)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            by User {bom.created_by}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleViewBOM(bom)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleEditBOM(bom.id)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit BOM
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleCopyBOM(bom)}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy BOM
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleViewHistory(bom)}
                            >
                              <History className="h-4 w-4 mr-2" />
                              View History
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active-boms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active BOMs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {boms
                  .filter((bom) => bom.is_active)
                  .map((bom) => (
                    <Card key={bom.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-medium">
                              {bom.parent_product_name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {bom.id} • Version {bom.version}
                            </p>
                          </div>
                          <Badge className={getStatusColor(bom.is_active)}>
                            ACTIVE
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <div className="text-sm font-medium">
                              Components
                            </div>
                            <div className="text-2xl font-bold">
                              {bom.components?.length || 0}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium">
                              Total Cost
                            </div>
                            <div className="text-2xl font-bold">
                              {formatCurrency(bom.total_cost)}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium">Created</div>
                            <div className="text-sm text-muted-foreground">
                              {formatDate(bom.created_at)}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium">
                              Created By
                            </div>
                            <div className="text-sm text-muted-foreground">
                              User {bom.created_by}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewBOM(bom)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditBOM(bom.id)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>BOM Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 border border-orange-200 rounded-lg bg-orange-50">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-orange-900">
                      Components Without Supplier
                    </p>
                    <p className="text-sm text-orange-700">
                      {stats.components_without_supplier} components need supplier
                      assignment
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 border border-yellow-200 rounded-lg bg-yellow-50">
                  <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-900">Outdated BOMs</p>
                    <p className="text-sm text-yellow-700">
                      {stats.outdated_boms} BOMs need version updates
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Cost Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(() => {
                    const sortedByCost = [...boms].sort((a, b) => (b.total_cost ?? 0) - (a.total_cost ?? 0));
                    const mostExpensive = sortedByCost[0];
                    const leastExpensive = sortedByCost[sortedByCost.length - 1];
                    return (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Most Expensive</span>
                          <div className="text-right">
                            <div className="font-medium">
                              {(mostExpensive?.parent_product_name ?? stats.most_expensive_bom) || "—"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {mostExpensive ? formatCurrency(mostExpensive.total_cost) : "—"}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Least Expensive</span>
                          <div className="text-right">
                            <div className="font-medium">
                              {(leastExpensive?.parent_product_name ?? stats.least_expensive_bom) || "—"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {leastExpensive ? formatCurrency(leastExpensive.total_cost) : "—"}
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>BOM Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Active BOMs</span>
                      <span>
                        {stats.total_boms > 0
                          ? Math.round((stats.active_boms / stats.total_boms) * 100)
                          : 0}
                        %
                      </span>
                    </div>
                    <Progress
                      value={stats.total_boms > 0 ? (stats.active_boms / stats.total_boms) * 100 : 0}
                      className="h-2"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Components with Suppliers</span>
                      <span>
                        {Math.round(componentsWithSuppliersPct)}
                        %
                      </span>
                    </div>
                    <Progress
                      value={componentsWithSuppliersPct}
                      className="h-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* BOM Details Dialog */}
      <Dialog open={showBOMDialog} onOpenChange={setShowBOMDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>BOM Details - {selectedBOM?.id}</DialogTitle>
            <DialogDescription>
              View detailed information about the bill of materials
            </DialogDescription>
          </DialogHeader>

          {selectedBOM && (
            <div className="space-y-6">
              {/* BOM Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>BOM Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm font-medium">Product</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedBOM.parent_product_name}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Version</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedBOM.version}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Components</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedBOM.components?.length || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Total Cost</div>
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(selectedBOM.total_cost)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Components Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Components</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Component</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Cost</TableHead>
                        <TableHead>Total Cost</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Lead Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedBOM.components?.map((component) => (
                        <TableRow key={component.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {component.component_product_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {component.component_product_sku}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{component.quantity_required}</span>
                              <span className="text-sm text-muted-foreground">
                                {component.unit_of_measure}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatCurrency(component.unit_cost)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(component.total_cost)}
                          </TableCell>
                          <TableCell>
                            {component.supplier_name || "Not assigned"}
                          </TableCell>
                          <TableCell>{component.lead_time_days} days</TableCell>
                        </TableRow>
                      )) || []}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
