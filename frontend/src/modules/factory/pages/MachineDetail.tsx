"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  AlertTriangle,
  ArrowLeft,
  Cog,
  History,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Wrench,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import {
  MachinesApiService,
  machinesQueryKeys,
  type CreateMachineMaintenanceLogRequest,
  type MaintenanceType,
} from "@/services/machines-api";
import {
  MachinePartsApiService,
  machinePartsQueryKeys,
  type CreateMachinePartReplacementRequest,
  type CreateMachinePartRequest,
  type MachinePart,
  type MachinePartStatus,
  type ReplacementReason,
  type SpareStockAlertStatus,
  type UpdateMachinePartRequest,
} from "@/services/machine-parts-api";
import { ProductApi } from "@/modules/inventory/services/product-api";
import { DistributionApi } from "@/modules/inventory/services/distribution-api";
import { useFormatting } from "@/hooks/useFormatting";

const TYPE_LABEL: Record<MaintenanceType, string> = {
  preventive: "Preventive",
  corrective: "Corrective",
};

const TYPE_BADGE: Record<MaintenanceType, string> = {
  preventive: "bg-blue-100 text-blue-700 border-blue-200",
  corrective: "bg-orange-100 text-orange-700 border-orange-200",
};

const PART_STATUS_LABEL: Record<MachinePartStatus, string> = {
  active: "Active",
  replaced: "Replaced",
  retired: "Retired",
};

const PART_STATUS_BADGE: Record<MachinePartStatus, string> = {
  active: "bg-green-100 text-green-700 border-green-200",
  replaced: "bg-amber-100 text-amber-700 border-amber-200",
  retired: "bg-gray-100 text-gray-700 border-gray-200",
};

const REPLACEMENT_REASON_LABEL: Record<ReplacementReason, string> = {
  preventive: "Preventive",
  failure: "Failure",
  upgrade: "Upgrade",
  other: "Other",
};

const SPARE_ALERT_LABEL: Record<SpareStockAlertStatus, string> = {
  low: "Low",
  critical: "Critical",
  out_of_stock: "Out of stock",
};

const SPARE_ALERT_BADGE: Record<SpareStockAlertStatus, string> = {
  low: "bg-amber-100 text-amber-700 border-amber-200",
  critical: "bg-orange-100 text-orange-700 border-orange-200",
  out_of_stock: "bg-red-100 text-red-700 border-red-200",
};

function isOverdue(dateStr?: string): boolean {
  if (!dateStr) return false;
  const due = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDuration(startIso: string, endIso?: string): string {
  if (!endIso) return "—";
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

type LogForm = Required<Pick<CreateMachineMaintenanceLogRequest, "maintenance_type">> &
  Omit<CreateMachineMaintenanceLogRequest, "maintenance_type">;

function nowLocal(): string {
  // Returns current local datetime in the format <input type="datetime-local"> expects (YYYY-MM-DDTHH:MM)
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

const emptyLogForm: LogForm = {
  maintenance_type: "preventive",
  start_at: nowLocal(),
  end_at: "",
  technician: "",
  cost: 0,
  next_service_date: "",
  notes: "",
};

type PartForm = {
  name: string;
  part_code: string;
  position: string;
  quantity: number;
  manufacturer: string;
  model_number: string;
  installed_at: string;
  expected_lifespan_days: string;
  next_replacement_date: string;
  status: MachinePartStatus;
  notes: string;
  product_id: string;
};

const emptyPartForm: PartForm = {
  name: "",
  part_code: "",
  position: "",
  quantity: 1,
  manufacturer: "",
  model_number: "",
  installed_at: "",
  expected_lifespan_days: "",
  next_replacement_date: "",
  status: "active",
  notes: "",
  product_id: "",
};

type ReplacementForm = {
  reason: ReplacementReason;
  replaced_at: string;
  technician: string;
  cost: number;
  next_replacement_date: string;
  notes: string;
  maintenance_log_id: string;
  quantity: string;
  distribution_center_id: string;
};

const emptyReplacementForm: ReplacementForm = {
  reason: "preventive",
  replaced_at: nowLocal(),
  technician: "",
  cost: 0,
  next_replacement_date: "",
  notes: "",
  maintenance_log_id: "",
  quantity: "",
  distribution_center_id: "",
};

export default function MachineDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : params.id?.[0];
  const queryClient = useQueryClient();
  const { formatCurrency } = useFormatting();

  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [logForm, setLogForm] = useState<LogForm>(emptyLogForm);

  const [partDialogOpen, setPartDialogOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<MachinePart | null>(null);
  const [partForm, setPartForm] = useState<PartForm>(emptyPartForm);

  const [replacementDialogOpen, setReplacementDialogOpen] = useState(false);
  const [replacementForm, setReplacementForm] = useState<ReplacementForm>(
    emptyReplacementForm
  );
  const [replacementPart, setReplacementPart] = useState<MachinePart | null>(null);

  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyPart, setHistoryPart] = useState<MachinePart | null>(null);

  const { data: machine, isLoading: machineLoading } = useQuery({
    queryKey: id ? machinesQueryKeys.detail(id) : [],
    queryFn: () => MachinesApiService.getMachineById(id!),
    enabled: !!id,
  });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: id ? machinesQueryKeys.logs(id) : [],
    queryFn: () => MachinesApiService.getMaintenanceLogs(id!),
    enabled: !!id,
  });

  const createLogMutation = useMutation({
    mutationFn: (data: CreateMachineMaintenanceLogRequest) =>
      MachinesApiService.createMaintenanceLog(id!, data),
    onSuccess: () => {
      toast.success("Maintenance log recorded");
      setLogDialogOpen(false);
      setLogForm(emptyLogForm);
      queryClient.invalidateQueries({ queryKey: machinesQueryKeys.all });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to record log"),
  });

  const deleteLogMutation = useMutation({
    mutationFn: (logId: string) => MachinesApiService.deleteMaintenanceLog(id!, logId),
    onSuccess: () => {
      toast.success("Log deleted");
      queryClient.invalidateQueries({ queryKey: machinesQueryKeys.all });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to delete log"),
  });

  const { data: partsData, isLoading: partsLoading } = useQuery({
    queryKey: id ? machinePartsQueryKeys.lists(id) : [],
    queryFn: () => MachinePartsApiService.listParts(id!),
    enabled: !!id,
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: id && historyPart ? machinePartsQueryKeys.replacements(id, historyPart.id) : [],
    queryFn: () => MachinePartsApiService.listReplacements(id!, historyPart!.id),
    enabled: !!id && !!historyPart && historyDialogOpen,
  });

  // Inventory products available to link as spare parts.
  const { data: productsData } = useQuery({
    queryKey: ["machine-parts", "product-options"],
    queryFn: () => ProductApi.getProducts({ limit: 1000, status: "active" } as any),
    staleTime: 5 * 60 * 1000,
  });

  const { data: centersData } = useQuery({
    queryKey: ["machine-parts", "distribution-centers"],
    queryFn: () => DistributionApi.getDistributionCenters({ limit: 200 } as any),
    staleTime: 5 * 60 * 1000,
  });

  const { data: stockAlerts } = useQuery({
    queryKey: id ? machinePartsQueryKeys.stockAlerts(id) : [],
    queryFn: () => MachinePartsApiService.getStockAlerts(id!),
    enabled: !!id,
  });

  const { data: consumptionReport } = useQuery({
    queryKey: id ? machinePartsQueryKeys.consumptionReport(id) : [],
    queryFn: () => MachinePartsApiService.getConsumptionReport({ machine_id: id! }),
    enabled: !!id,
  });

  const products = productsData?.products ?? [];
  const centers = centersData?.centers ?? [];
  const primaryCenter = centers.find((c) => c.is_primary);

  const productOptions = products.map((p) => ({
    value: String(p.id),
    label: p.name,
    hint: p.sku,
    keywords: `${p.sku ?? ""} ${(p as any).product_code ?? ""}`,
    description: `Stock: ${p.current_stock}`,
  }));

  const centerOptions = centers.map((c) => ({
    value: String(c.id),
    label: c.name,
    hint: c.is_primary ? "Primary" : c.code,
  }));

  const invalidatePartsAndMachine = () => {
    queryClient.invalidateQueries({ queryKey: machinePartsQueryKeys.all });
    if (id) {
      queryClient.invalidateQueries({ queryKey: machinesQueryKeys.detail(id) });
    }
  };

  const createPartMutation = useMutation({
    mutationFn: (data: CreateMachinePartRequest) =>
      MachinePartsApiService.createPart(id!, data),
    onSuccess: () => {
      toast.success("Part added");
      setPartDialogOpen(false);
      setPartForm(emptyPartForm);
      setEditingPart(null);
      invalidatePartsAndMachine();
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to add part"),
  });

  const updatePartMutation = useMutation({
    mutationFn: ({ partId, data }: { partId: string; data: UpdateMachinePartRequest }) =>
      MachinePartsApiService.updatePart(id!, partId, data),
    onSuccess: () => {
      toast.success("Part updated");
      setPartDialogOpen(false);
      setPartForm(emptyPartForm);
      setEditingPart(null);
      invalidatePartsAndMachine();
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to update part"),
  });

  const deletePartMutation = useMutation({
    mutationFn: (partId: string) => MachinePartsApiService.deletePart(id!, partId),
    onSuccess: () => {
      toast.success("Part deleted");
      invalidatePartsAndMachine();
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to delete part"),
  });

  const createReplacementMutation = useMutation({
    mutationFn: ({
      partId,
      data,
    }: {
      partId: string;
      data: CreateMachinePartReplacementRequest;
    }) => MachinePartsApiService.createReplacement(id!, partId, data),
    onSuccess: () => {
      toast.success("Replacement recorded");
      setReplacementDialogOpen(false);
      setReplacementForm(emptyReplacementForm);
      setReplacementPart(null);
      invalidatePartsAndMachine();
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to record replacement"),
  });

  const deleteReplacementMutation = useMutation({
    mutationFn: ({ partId, replacementId }: { partId: string; replacementId: string }) =>
      MachinePartsApiService.deleteReplacement(id!, partId, replacementId),
    onSuccess: () => {
      toast.success("Replacement deleted");
      invalidatePartsAndMachine();
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to delete replacement"),
  });

  if (machineLoading) {
    return (
      <div className="py-12 text-center text-muted-foreground">Loading machine...</div>
    );
  }

  if (!machine) {
    return (
      <div className="py-12 text-center">
        <p className="text-destructive mb-4">Machine not found</p>
        <Button onClick={() => router.push("/factory/machines")}>Back to machines</Button>
      </div>
    );
  }

  const logs = logsData?.logs || [];
  const parts = partsData?.parts || [];
  const historyReplacements = historyData?.replacements || [];

  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // datetime-local inputs produce "YYYY-MM-DDTHH:MM" with no timezone; let Date interpret as local
    const toIso = (local?: string) =>
      local ? new Date(local).toISOString() : undefined;

    if (logForm.start_at && logForm.end_at) {
      const start = new Date(logForm.start_at).getTime();
      const end = new Date(logForm.end_at).getTime();
      if (end < start) {
        toast.error("End time must be on or after start time");
        return;
      }
    }

    const payload: CreateMachineMaintenanceLogRequest = {
      maintenance_type: logForm.maintenance_type,
      start_at: toIso(logForm.start_at),
      end_at: toIso(logForm.end_at),
      technician: logForm.technician || undefined,
      cost: Number(logForm.cost) || 0,
      next_service_date: logForm.next_service_date || undefined,
      notes: logForm.notes || undefined,
    };
    createLogMutation.mutate(payload);
  };

  const handleDeleteLog = (logId: string) => {
    if (!confirm("Delete this maintenance log?")) return;
    deleteLogMutation.mutate(logId);
  };

  const openCreatePartDialog = () => {
    setEditingPart(null);
    setPartForm(emptyPartForm);
    setPartDialogOpen(true);
  };

  const openEditPartDialog = (part: MachinePart) => {
    setEditingPart(part);
    setPartForm({
      name: part.name,
      part_code: part.part_code ?? "",
      position: part.position ?? "",
      quantity: part.quantity ?? 1,
      manufacturer: part.manufacturer ?? "",
      model_number: part.model_number ?? "",
      installed_at: part.installed_at ?? "",
      expected_lifespan_days:
        part.expected_lifespan_days !== undefined && part.expected_lifespan_days !== null
          ? String(part.expected_lifespan_days)
          : "",
      next_replacement_date: part.next_replacement_date ?? "",
      status: part.status,
      notes: part.notes ?? "",
      product_id: part.product_id ?? "",
    });
    setPartDialogOpen(true);
  };

  const handlePartSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lifespan = partForm.expected_lifespan_days.trim();
    const payload: CreateMachinePartRequest = {
      name: partForm.name.trim(),
      part_code: partForm.part_code.trim() || undefined,
      position: partForm.position.trim() || undefined,
      quantity: Number(partForm.quantity) || 1,
      manufacturer: partForm.manufacturer.trim() || undefined,
      model_number: partForm.model_number.trim() || undefined,
      installed_at: partForm.installed_at || undefined,
      expected_lifespan_days: lifespan ? parseInt(lifespan, 10) : undefined,
      next_replacement_date: partForm.next_replacement_date || undefined,
      status: partForm.status,
      notes: partForm.notes.trim() || undefined,
      product_id: partForm.product_id ? Number(partForm.product_id) : null,
    };
    if (editingPart) {
      updatePartMutation.mutate({ partId: editingPart.id, data: payload });
    } else {
      createPartMutation.mutate(payload);
    }
  };

  const handleDeletePart = (part: MachinePart) => {
    if (
      !confirm(
        `Delete part "${part.name}"? This also removes its replacement history.`
      )
    )
      return;
    deletePartMutation.mutate(part.id);
  };

  const openReplacementDialog = (part: MachinePart) => {
    setReplacementPart(part);
    // When the part is product-linked, default the consumed quantity to the
    // part's quantity and source from the primary distribution center.
    setReplacementForm({
      ...emptyReplacementForm,
      quantity: part.product_id ? String(part.quantity ?? 1) : "",
      distribution_center_id:
        part.product_id && primaryCenter ? String(primaryCenter.id) : "",
    });
    setReplacementDialogOpen(true);
  };

  const handleReplacementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replacementPart) return;
    const toIso = (local?: string) =>
      local ? new Date(local).toISOString() : undefined;
    const consumesStock = !!replacementPart.product_id;
    const qty = consumesStock ? Number(replacementForm.quantity) : 0;
    if (consumesStock && (!qty || qty <= 0)) {
      toast.error("Enter a quantity to consume from stock");
      return;
    }
    const payload: CreateMachinePartReplacementRequest = {
      reason: replacementForm.reason,
      replaced_at: toIso(replacementForm.replaced_at),
      technician: replacementForm.technician.trim() || undefined,
      cost: Number(replacementForm.cost) || 0,
      next_replacement_date: replacementForm.next_replacement_date || undefined,
      notes: replacementForm.notes.trim() || undefined,
      maintenance_log_id: replacementForm.maintenance_log_id
        ? parseInt(replacementForm.maintenance_log_id, 10)
        : undefined,
      ...(consumesStock
        ? {
            quantity: qty,
            distribution_center_id: replacementForm.distribution_center_id
              ? Number(replacementForm.distribution_center_id)
              : undefined,
          }
        : {}),
    };
    createReplacementMutation.mutate({ partId: replacementPart.id, data: payload });
  };

  const openHistoryDialog = (part: MachinePart) => {
    setHistoryPart(part);
    setHistoryDialogOpen(true);
  };

  const handleDeleteReplacement = (partId: string, replacementId: string) => {
    if (!confirm("Delete this replacement record?")) return;
    deleteReplacementMutation.mutate({ partId, replacementId });
  };

  return (
    <div className="space-y-6" data-testid="machine-detail-page">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/factory/machines">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{machine.name}</h1>
          <p className="text-muted-foreground">
            {machine.code}
            {machine.model && ` • ${machine.model}`}
            {machine.manufacturer && ` • ${machine.manufacturer}`}
          </p>
        </div>
        <Button onClick={() => setLogDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Maintenance Log
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Machine Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <InfoRow label="Status">
                <Badge variant="outline">{machine.status.replace("_", " ")}</Badge>
              </InfoRow>
              <InfoRow label="Code">
                <span className="font-mono">{machine.code}</span>
              </InfoRow>
              <InfoRow label="Production Line">
                {machine.production_line_name || "—"}
              </InfoRow>
              <InfoRow label="Model">{machine.model || "—"}</InfoRow>
              <InfoRow label="Serial Number">{machine.serial_number || "—"}</InfoRow>
              <InfoRow label="Manufacturer">{machine.manufacturer || "—"}</InfoRow>
              <InfoRow label="Location">{machine.location || "—"}</InfoRow>
              <InfoRow label="Purchase Date">{machine.purchase_date || "—"}</InfoRow>
              <InfoRow label="Next Service">
                {machine.next_service_date ? (
                  <span
                    className={
                      isOverdue(machine.next_service_date)
                        ? "text-red-600 font-medium"
                        : ""
                    }
                  >
                    {machine.next_service_date}
                    {isOverdue(machine.next_service_date) && " (overdue)"}
                  </span>
                ) : (
                  "—"
                )}
              </InfoRow>
            </div>
            {machine.notes && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Notes</p>
                <p className="text-sm whitespace-pre-wrap">{machine.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Maintenance History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No maintenance records for this machine yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Technician</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead>Next Service</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(log.start_at)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {log.end_at ? formatDateTime(log.end_at) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDuration(log.start_at, log.end_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={TYPE_BADGE[log.maintenance_type]}>
                        {TYPE_LABEL[log.maintenance_type]}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.technician || "—"}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(log.cost)}
                    </TableCell>
                    <TableCell>{log.next_service_date || "—"}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {log.notes || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteLog(log.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {stockAlerts && stockAlerts.length > 0 && (
        <Card className="border-amber-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-5 h-5" />
              Spares at Risk ({stockAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">In Stock</TableHead>
                  <TableHead className="text-right">Min Level</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockAlerts.map((alert) => (
                  <TableRow key={alert.part_id}>
                    <TableCell className="font-medium">{alert.part_name}</TableCell>
                    <TableCell className="text-xs">
                      {alert.product_name}
                      <span className="text-muted-foreground"> · {alert.product_sku}</span>
                    </TableCell>
                    <TableCell className="text-right font-mono">{alert.current_stock}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {alert.min_stock_level}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={SPARE_ALERT_BADGE[alert.alert_status]}>
                        {SPARE_ALERT_LABEL[alert.alert_status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Cog className="w-5 h-5" />
            Parts &amp; Components
          </CardTitle>
          <Button size="sm" onClick={openCreatePartDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Add Part
          </Button>
        </CardHeader>
        <CardContent>
          {partsLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading parts...</div>
          ) : parts.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No parts tracked for this machine yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Spare Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Replaced</TableHead>
                  <TableHead>Next Replacement</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parts.map((part) => (
                  <TableRow key={part.id}>
                    <TableCell className="font-medium">{part.name}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {part.part_code || "—"}
                    </TableCell>
                    <TableCell>{part.position || "—"}</TableCell>
                    <TableCell className="text-right">{part.quantity}</TableCell>
                    <TableCell>
                      {part.product_id ? (
                        <span className="text-xs">
                          <span className="font-medium">{part.product_name}</span>
                          {part.product_sku && (
                            <span className="text-muted-foreground"> · {part.product_sku}</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={PART_STATUS_BADGE[part.status]}>
                        {PART_STATUS_LABEL[part.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>{part.last_replaced_at || "—"}</TableCell>
                    <TableCell>
                      {part.next_replacement_date ? (
                        <span
                          className={
                            isOverdue(part.next_replacement_date)
                              ? "text-red-600 font-medium"
                              : ""
                          }
                        >
                          {part.next_replacement_date}
                          {isOverdue(part.next_replacement_date) && " (overdue)"}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Log replacement"
                          onClick={() => openReplacementDialog(part)}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="View history"
                          onClick={() => openHistoryDialog(part)}
                        >
                          <History className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Edit"
                          onClick={() => openEditPartDialog(part)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                          title="Delete"
                          onClick={() => handleDeletePart(part)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {consumptionReport && consumptionReport.rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Spare Consumption
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Part</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Stock Ref</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consumptionReport.rows.map((row) => (
                  <TableRow key={row.replacement_id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(row.replaced_at)}
                    </TableCell>
                    <TableCell className="font-medium">{row.part_name}</TableCell>
                    <TableCell className="text-xs">
                      {row.product_name ?? "—"}
                      {row.product_sku && (
                        <span className="text-muted-foreground"> · {row.product_sku}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">{row.quantity ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(row.cost)}
                    </TableCell>
                    <TableCell>{REPLACEMENT_REASON_LABEL[row.reason]}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {row.stock_adjustment_id ? `#${row.stock_adjustment_id}` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-end gap-6 pt-3 text-sm">
              <span className="text-muted-foreground">
                Total qty:{" "}
                <span className="font-mono font-medium text-foreground">
                  {consumptionReport.total_quantity}
                </span>
              </span>
              <span className="text-muted-foreground">
                Total cost:{" "}
                <span className="font-mono font-medium text-foreground">
                  {formatCurrency(consumptionReport.total_cost)}
                </span>
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Maintenance Log</DialogTitle>
            <DialogDescription>Record a maintenance event for {machine.name}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLogSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maintenance_type">Type *</Label>
                <Select
                  value={logForm.maintenance_type}
                  onValueChange={(v) =>
                    setLogForm({ ...logForm, maintenance_type: v as MaintenanceType })
                  }
                >
                  <SelectTrigger id="maintenance_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preventive">Preventive</SelectItem>
                    <SelectItem value="corrective">Corrective</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_at">Start *</Label>
                <Input
                  id="start_at"
                  type="datetime-local"
                  value={logForm.start_at ?? ""}
                  onChange={(e) => setLogForm({ ...logForm, start_at: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_at">End</Label>
                <Input
                  id="end_at"
                  type="datetime-local"
                  value={logForm.end_at ?? ""}
                  onChange={(e) => setLogForm({ ...logForm, end_at: e.target.value })}
                  min={logForm.start_at ?? undefined}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank if work is still ongoing.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="technician">Technician</Label>
                <Input
                  id="technician"
                  value={logForm.technician ?? ""}
                  onChange={(e) => setLogForm({ ...logForm, technician: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost">Cost</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={logForm.cost ?? 0}
                  onChange={(e) =>
                    setLogForm({ ...logForm, cost: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="next_service_date">Next Service Date</Label>
                <Input
                  id="next_service_date"
                  type="date"
                  value={logForm.next_service_date ?? ""}
                  onChange={(e) =>
                    setLogForm({ ...logForm, next_service_date: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  If set, this updates the machine's Next Service Date.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={3}
                value={logForm.notes ?? ""}
                onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setLogDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createLogMutation.isPending}>
                Save Log
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={partDialogOpen} onOpenChange={setPartDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPart ? "Edit Part" : "Add Part"}</DialogTitle>
            <DialogDescription>
              {editingPart
                ? `Update part details for ${machine.name}.`
                : `Add a tracked part or component to ${machine.name}.`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePartSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="part_name">Name *</Label>
                <Input
                  id="part_name"
                  value={partForm.name}
                  onChange={(e) => setPartForm({ ...partForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="part_code">Part Code</Label>
                <Input
                  id="part_code"
                  value={partForm.part_code}
                  onChange={(e) =>
                    setPartForm({ ...partForm, part_code: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="part_position">Position</Label>
                <Input
                  id="part_position"
                  value={partForm.position}
                  onChange={(e) =>
                    setPartForm({ ...partForm, position: e.target.value })
                  }
                  placeholder="e.g. Belt slot A"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="part_quantity">Quantity</Label>
                <Input
                  id="part_quantity"
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={partForm.quantity}
                  onChange={(e) =>
                    setPartForm({
                      ...partForm,
                      quantity: parseFloat(e.target.value) || 1,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="part_status">Status</Label>
                <Select
                  value={partForm.status}
                  onValueChange={(v) =>
                    setPartForm({ ...partForm, status: v as MachinePartStatus })
                  }
                >
                  <SelectTrigger id="part_status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="replaced">Replaced</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="part_manufacturer">Manufacturer</Label>
                <Input
                  id="part_manufacturer"
                  value={partForm.manufacturer}
                  onChange={(e) =>
                    setPartForm({ ...partForm, manufacturer: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="part_model_number">Model Number</Label>
                <Input
                  id="part_model_number"
                  value={partForm.model_number}
                  onChange={(e) =>
                    setPartForm({ ...partForm, model_number: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="part_installed_at">Installed On</Label>
                <Input
                  id="part_installed_at"
                  type="date"
                  value={partForm.installed_at}
                  onChange={(e) =>
                    setPartForm({ ...partForm, installed_at: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="part_lifespan">Expected Lifespan (days)</Label>
                <Input
                  id="part_lifespan"
                  type="number"
                  min="1"
                  step="1"
                  value={partForm.expected_lifespan_days}
                  onChange={(e) =>
                    setPartForm({
                      ...partForm,
                      expected_lifespan_days: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="part_next_replacement">Next Replacement Date</Label>
                <Input
                  id="part_next_replacement"
                  type="date"
                  value={partForm.next_replacement_date}
                  onChange={(e) =>
                    setPartForm({
                      ...partForm,
                      next_replacement_date: e.target.value,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to auto-derive from install date + lifespan.
                </p>
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="part_product">Inventory Product (spare source)</Label>
                <SearchableSelect
                  id="part_product"
                  options={[{ value: "", label: "(not linked)" }, ...productOptions]}
                  value={partForm.product_id}
                  onValueChange={(v) =>
                    setPartForm({ ...partForm, product_id: v })
                  }
                  placeholder="Link an inventory product…"
                  searchPlaceholder="Search products by name or SKU…"
                />
                <p className="text-xs text-muted-foreground">
                  Optional. When linked, logging a replacement will issue a stock
                  movement against this product.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="part_notes">Notes</Label>
              <Textarea
                id="part_notes"
                rows={3}
                value={partForm.notes}
                onChange={(e) => setPartForm({ ...partForm, notes: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPartDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createPartMutation.isPending || updatePartMutation.isPending}
              >
                {editingPart ? "Save Changes" : "Add Part"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={replacementDialogOpen} onOpenChange={setReplacementDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Log Replacement</DialogTitle>
            <DialogDescription>
              {replacementPart
                ? `Record a replacement of "${replacementPart.name}".`
                : "Record a replacement."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReplacementSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rep_reason">Reason *</Label>
                <Select
                  value={replacementForm.reason}
                  onValueChange={(v) =>
                    setReplacementForm({
                      ...replacementForm,
                      reason: v as ReplacementReason,
                    })
                  }
                >
                  <SelectTrigger id="rep_reason">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preventive">Preventive</SelectItem>
                    <SelectItem value="failure">Failure</SelectItem>
                    <SelectItem value="upgrade">Upgrade</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rep_replaced_at">Replaced At *</Label>
                <Input
                  id="rep_replaced_at"
                  type="datetime-local"
                  value={replacementForm.replaced_at}
                  onChange={(e) =>
                    setReplacementForm({
                      ...replacementForm,
                      replaced_at: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rep_technician">Technician</Label>
                <Input
                  id="rep_technician"
                  value={replacementForm.technician}
                  onChange={(e) =>
                    setReplacementForm({
                      ...replacementForm,
                      technician: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rep_cost">Cost</Label>
                <Input
                  id="rep_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={replacementForm.cost}
                  onChange={(e) =>
                    setReplacementForm({
                      ...replacementForm,
                      cost: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="rep_next_replacement">Next Replacement Date</Label>
                <Input
                  id="rep_next_replacement"
                  type="date"
                  value={replacementForm.next_replacement_date}
                  onChange={(e) =>
                    setReplacementForm({
                      ...replacementForm,
                      next_replacement_date: e.target.value,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Overrides the auto-computed next date for this part.
                </p>
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="rep_log">Linked Maintenance Log</Label>
                <Select
                  value={replacementForm.maintenance_log_id || "none"}
                  onValueChange={(v) =>
                    setReplacementForm({
                      ...replacementForm,
                      maintenance_log_id: v === "none" ? "" : v,
                    })
                  }
                >
                  <SelectTrigger id="rep_log">
                    <SelectValue placeholder="(none)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">(none)</SelectItem>
                    {logs.map((log) => (
                      <SelectItem key={log.id} value={log.id}>
                        {formatDateTime(log.start_at)} — {TYPE_LABEL[log.maintenance_type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {replacementPart?.product_id && (
                <>
                  <div className="space-y-2 col-span-2 rounded-md border border-dashed p-3 bg-muted/30">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Package className="w-4 h-4" />
                      Stock consumption
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This part is linked to{" "}
                      <span className="font-medium">{replacementPart.product_name}</span>
                      {replacementPart.product_sku && ` (${replacementPart.product_sku})`}.
                      Submitting will issue a stock decrease.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rep_quantity">Quantity Consumed *</Label>
                    <Input
                      id="rep_quantity"
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={replacementForm.quantity}
                      onChange={(e) =>
                        setReplacementForm({
                          ...replacementForm,
                          quantity: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rep_dc">Source Warehouse</Label>
                    <SearchableSelect
                      id="rep_dc"
                      options={centerOptions}
                      value={replacementForm.distribution_center_id}
                      onValueChange={(v) =>
                        setReplacementForm({
                          ...replacementForm,
                          distribution_center_id: v,
                        })
                      }
                      placeholder="Primary warehouse"
                      searchPlaceholder="Search warehouses…"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="rep_notes">Notes</Label>
              <Textarea
                id="rep_notes"
                rows={3}
                value={replacementForm.notes}
                onChange={(e) =>
                  setReplacementForm({ ...replacementForm, notes: e.target.value })
                }
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setReplacementDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createReplacementMutation.isPending}>
                Save Replacement
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Replacement History{historyPart ? ` — ${historyPart.name}` : ""}
            </DialogTitle>
            <DialogDescription>
              Past replacements recorded for this part.
            </DialogDescription>
          </DialogHeader>
          {historyLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading history...
            </div>
          ) : historyReplacements.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No replacements recorded yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Replaced At</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Technician</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Stock Ref</TableHead>
                  <TableHead>Next Replacement</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyReplacements.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(r.replaced_at)}
                    </TableCell>
                    <TableCell>{REPLACEMENT_REASON_LABEL[r.reason]}</TableCell>
                    <TableCell>{r.technician || "—"}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(r.cost)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {r.quantity ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {r.stock_adjustment_id ? `#${r.stock_adjustment_id}` : "—"}
                    </TableCell>
                    <TableCell>{r.next_replacement_date || "—"}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {r.notes || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        onClick={() =>
                          historyPart && handleDeleteReplacement(historyPart.id, r.id)
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
      <div className="text-sm font-medium">{children}</div>
    </div>
  );
}
