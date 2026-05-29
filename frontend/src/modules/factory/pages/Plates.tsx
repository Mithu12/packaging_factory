"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  AlertTriangle,
  CheckCircle,
  History,
  LayoutGrid,
  Pencil,
  Plus,
  Search,
  Square,
  Trash2,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import {
  PlatesApiService,
  platesQueryKeys,
  type Plate,
  type PlateType,
  type PlateStatus,
  type CreatePlateRequest,
  type UpdatePlateRequest,
} from "@/services/plates-api";

const STATUS_LABEL: Record<PlateStatus, string> = {
  active: "Active",
  broken: "Broken",
  retired: "Retired",
};

const STATUS_BADGE: Record<PlateStatus, string> = {
  active: "bg-green-100 text-green-700 border-green-200",
  broken: "bg-red-100 text-red-700 border-red-200",
  retired: "bg-gray-100 text-gray-700 border-gray-200",
};

type PlateFormState = {
  id?: string;
  plate_type_id: string;
  plate_code: string;
  expected_lifespan_uses: string;
  notes: string;
  status: PlateStatus;
  broken_reason: string;
};

const emptyPlateForm: PlateFormState = {
  plate_type_id: "",
  plate_code: "",
  expected_lifespan_uses: "",
  notes: "",
  status: "active",
  broken_reason: "",
};

type TypeFormState = {
  id?: string;
  name: string;
  code: string;
  description: string;
  expected_lifespan_uses: string;
};

const emptyTypeForm: TypeFormState = {
  name: "",
  code: "",
  description: "",
  expected_lifespan_uses: "",
};

// A plate's expected lifespan, falling back to its type's, for "near end-of-life" hints.
function effectiveLifespan(plate: Plate, types: PlateType[]): number | undefined {
  if (plate.expected_lifespan_uses) return plate.expected_lifespan_uses;
  const type = types.find((t) => t.id === plate.plate_type_id);
  return type?.expected_lifespan_uses;
}

export default function PlatesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PlateStatus | "all">("all");

  const [plateDialogOpen, setPlateDialogOpen] = useState(false);
  const [plateForm, setPlateForm] = useState<PlateFormState>(emptyPlateForm);
  const [editingPlate, setEditingPlate] = useState(false);

  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [typeForm, setTypeForm] = useState<TypeFormState>(emptyTypeForm);
  const [editingType, setEditingType] = useState(false);

  const [historyPlate, setHistoryPlate] = useState<Plate | null>(null);

  const plateQueryParams = {
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    page: 1,
    limit: 100,
  };

  const { data: platesData, isLoading } = useQuery({
    queryKey: platesQueryKeys.list(plateQueryParams),
    queryFn: () => PlatesApiService.getPlates(plateQueryParams),
  });

  const { data: types } = useQuery({
    queryKey: platesQueryKeys.types(),
    queryFn: () => PlatesApiService.getPlateTypes(true),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: platesQueryKeys.all });
  };

  // ---------------- Plate mutations ----------------
  const createPlate = useMutation({
    mutationFn: (data: CreatePlateRequest) => PlatesApiService.createPlate(data),
    onSuccess: () => {
      toast.success("Plate created");
      setPlateDialogOpen(false);
      setPlateForm(emptyPlateForm);
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to create plate"),
  });

  const updatePlate = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePlateRequest }) =>
      PlatesApiService.updatePlate(id, data),
    onSuccess: () => {
      toast.success("Plate updated");
      setPlateDialogOpen(false);
      setEditingPlate(false);
      setPlateForm(emptyPlateForm);
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update plate"),
  });

  const deletePlate = useMutation({
    mutationFn: (id: string) => PlatesApiService.deletePlate(id),
    onSuccess: () => {
      toast.success("Plate deleted");
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to delete plate"),
  });

  // ---------------- Plate type mutations ----------------
  const createType = useMutation({
    mutationFn: (data: { name: string; code?: string; description?: string; expected_lifespan_uses?: number }) =>
      PlatesApiService.createPlateType(data),
    onSuccess: () => {
      toast.success("Plate type created");
      setTypeDialogOpen(false);
      setTypeForm(emptyTypeForm);
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to create plate type"),
  });

  const updateType = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; code?: string | null; description?: string | null; expected_lifespan_uses?: number | null } }) =>
      PlatesApiService.updatePlateType(id, data),
    onSuccess: () => {
      toast.success("Plate type updated");
      setTypeDialogOpen(false);
      setEditingType(false);
      setTypeForm(emptyTypeForm);
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update plate type"),
  });

  const deleteType = useMutation({
    mutationFn: (id: string) => PlatesApiService.deletePlateType(id),
    onSuccess: () => {
      toast.success("Plate type deleted");
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to delete plate type"),
  });

  // ---------------- Plate dialog handlers ----------------
  const openCreatePlate = () => {
    if (!types || types.length === 0) {
      toast.error("Create a plate type first");
      return;
    }
    setEditingPlate(false);
    setPlateForm({ ...emptyPlateForm, plate_type_id: types[0].id });
    setPlateDialogOpen(true);
  };

  const openEditPlate = (plate: Plate) => {
    setEditingPlate(true);
    setPlateForm({
      id: plate.id,
      plate_type_id: plate.plate_type_id,
      plate_code: plate.plate_code ?? "",
      expected_lifespan_uses: plate.expected_lifespan_uses?.toString() ?? "",
      notes: plate.notes ?? "",
      status: plate.status,
      broken_reason: plate.broken_reason ?? "",
    });
    setPlateDialogOpen(true);
  };

  const submitPlate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plateForm.plate_type_id) {
      toast.error("Plate type is required");
      return;
    }
    const lifespan = plateForm.expected_lifespan_uses
      ? parseInt(plateForm.expected_lifespan_uses, 10)
      : undefined;

    if (editingPlate && plateForm.id) {
      const payload: UpdatePlateRequest = {
        plate_type_id: parseInt(plateForm.plate_type_id, 10),
        plate_code: plateForm.plate_code || null,
        expected_lifespan_uses: lifespan ?? null,
        notes: plateForm.notes || null,
        status: plateForm.status,
        broken_reason: plateForm.status === "broken" ? plateForm.broken_reason || null : null,
      };
      updatePlate.mutate({ id: plateForm.id, data: payload });
    } else {
      const payload: CreatePlateRequest = {
        plate_type_id: parseInt(plateForm.plate_type_id, 10),
        plate_code: plateForm.plate_code || undefined,
        expected_lifespan_uses: lifespan,
        notes: plateForm.notes || undefined,
      };
      createPlate.mutate(payload);
    }
  };

  const handleDeletePlate = (plate: Plate) => {
    if (!confirm(`Delete plate "${plate.plate_code || plate.id}"?`)) return;
    deletePlate.mutate(plate.id);
  };

  // ---------------- Type dialog handlers ----------------
  const openCreateType = () => {
    setEditingType(false);
    setTypeForm(emptyTypeForm);
    setTypeDialogOpen(true);
  };

  const openEditType = (type: PlateType) => {
    setEditingType(true);
    setTypeForm({
      id: type.id,
      name: type.name,
      code: type.code ?? "",
      description: type.description ?? "",
      expected_lifespan_uses: type.expected_lifespan_uses?.toString() ?? "",
    });
    setTypeDialogOpen(true);
  };

  const submitType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeForm.name.trim()) {
      toast.error("Name is required");
      return;
    }
    const lifespan = typeForm.expected_lifespan_uses
      ? parseInt(typeForm.expected_lifespan_uses, 10)
      : undefined;
    if (editingType && typeForm.id) {
      updateType.mutate({
        id: typeForm.id,
        data: {
          name: typeForm.name.trim(),
          code: typeForm.code || null,
          description: typeForm.description || null,
          expected_lifespan_uses: lifespan ?? null,
        },
      });
    } else {
      createType.mutate({
        name: typeForm.name.trim(),
        code: typeForm.code || undefined,
        description: typeForm.description || undefined,
        expected_lifespan_uses: lifespan,
      });
    }
  };

  const handleDeleteType = (type: PlateType) => {
    if (!confirm(`Delete plate type "${type.name}"?`)) return;
    deleteType.mutate(type.id);
  };

  const plates = platesData?.plates || [];
  const plateTypes = types || [];

  const totalPlates = platesData?.total ?? 0;
  const activeCount = plates.filter((p) => p.status === "active").length;
  const brokenCount = plates.filter((p) => p.status === "broken").length;

  return (
    <div className="space-y-6" data-testid="plates-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Plates</h1>
          <p className="text-muted-foreground">
            Track physical plates, how many times each has been used, and when they break
          </p>
        </div>
        <Button onClick={openCreatePlate} data-testid="plates-add-button">
          <Plus className="w-4 h-4 mr-2" />
          Add Plate
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Square} label="Total Plates" value={totalPlates} />
        <StatCard icon={CheckCircle} label="Active" value={activeCount} tone="text-green-600" />
        <StatCard icon={AlertTriangle} label="Broken" value={brokenCount} tone="text-red-600" />
        <StatCard icon={LayoutGrid} label="Types" value={plateTypes.length} />
      </div>

      {/* Plate types + lifespan analytics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle>Plate Types & Lifespan</CardTitle>
            <Button size="sm" variant="outline" onClick={openCreateType}>
              <Plus className="w-4 h-4 mr-2" />
              Add Type
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {plateTypes.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No plate types yet. Add one to start registering plates.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Plates</TableHead>
                  <TableHead className="text-right">Broken</TableHead>
                  <TableHead className="text-right">Avg uses at break</TableHead>
                  <TableHead className="text-right">Range</TableHead>
                  <TableHead className="text-right">Expected</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plateTypes.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {t.code || "—"}
                    </TableCell>
                    <TableCell className="text-right">{t.plate_count ?? 0}</TableCell>
                    <TableCell className="text-right">{t.broken_count ?? 0}</TableCell>
                    <TableCell className="text-right">
                      {t.avg_uses_at_break != null ? Math.round(t.avg_uses_at_break) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {t.min_uses_at_break != null && t.max_uses_at_break != null
                        ? `${t.min_uses_at_break}–${t.max_uses_at_break}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {t.expected_lifespan_uses ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEditType(t)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteType(t)}
                          className="text-red-600 hover:text-red-700"
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

      {/* Plates list */}
      <Card>
        <CardHeader>
          <CardTitle>Plate Inventory</CardTitle>
          <div className="flex flex-col md:flex-row gap-3 mt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by plate code or type..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="plates-search"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as PlateStatus | "all")}
            >
              <SelectTrigger className="md:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="broken">Broken</SelectItem>
                <SelectItem value="retired">Retired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading...</div>
          ) : plates.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Square className="w-10 h-10 mx-auto mb-2 opacity-40" />
              No plates found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Total Uses</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Broke at use #</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plates.map((p) => {
                  const lifespan = effectiveLifespan(p, plateTypes);
                  const nearEol =
                    p.status === "active" &&
                    lifespan != null &&
                    p.total_uses >= lifespan * 0.8;
                  return (
                    <TableRow key={p.id} data-testid={`plate-row-${p.id}`}>
                      <TableCell className="font-mono text-sm">{p.plate_code || "—"}</TableCell>
                      <TableCell>{p.plate_type_name || "—"}</TableCell>
                      <TableCell className="text-right">
                        <span className={nearEol ? "text-amber-600 font-medium" : ""}>
                          {p.total_uses}
                          {lifespan != null ? ` / ${lifespan}` : ""}
                        </span>
                        {nearEol && (
                          <span className="ml-1 text-amber-600" title="Near expected end of life">
                            ⚠
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_BADGE[p.status]}>
                          {STATUS_LABEL[p.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {p.broke_at_use_count ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setHistoryPlate(p)}
                            title="Usage history"
                          >
                            <History className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => openEditPlate(p)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeletePlate(p)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Plate create/edit dialog */}
      <Dialog open={plateDialogOpen} onOpenChange={setPlateDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlate ? "Edit Plate" : "Add Plate"}</DialogTitle>
            <DialogDescription>
              {editingPlate
                ? "Update the plate details. Marking it broken records the break."
                : "Register a new physical plate."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitPlate} className="space-y-4" data-testid="plate-form">
            <div className="space-y-2">
              <Label htmlFor="plate_type_id">Plate Type *</Label>
              <Select
                value={plateForm.plate_type_id}
                onValueChange={(v) => setPlateForm({ ...plateForm, plate_type_id: v })}
              >
                <SelectTrigger id="plate_type_id">
                  <SelectValue placeholder="Select plate type" />
                </SelectTrigger>
                <SelectContent>
                  {plateTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                      {t.code ? ` (${t.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plate_code">Plate Code</Label>
                <Input
                  id="plate_code"
                  value={plateForm.plate_code}
                  onChange={(e) => setPlateForm({ ...plateForm, plate_code: e.target.value })}
                  placeholder="e.g. PLT-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expected_lifespan_uses">Expected lifespan (uses)</Label>
                <Input
                  id="expected_lifespan_uses"
                  type="number"
                  min={1}
                  value={plateForm.expected_lifespan_uses}
                  onChange={(e) =>
                    setPlateForm({ ...plateForm, expected_lifespan_uses: e.target.value })
                  }
                  placeholder="optional"
                />
              </div>
            </div>
            {editingPlate && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={plateForm.status}
                    onValueChange={(v) => setPlateForm({ ...plateForm, status: v as PlateStatus })}
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="broken">Broken</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {plateForm.status === "broken" && (
                  <div className="space-y-2">
                    <Label htmlFor="broken_reason">Break reason</Label>
                    <Textarea
                      id="broken_reason"
                      rows={2}
                      value={plateForm.broken_reason}
                      onChange={(e) =>
                        setPlateForm({ ...plateForm, broken_reason: e.target.value })
                      }
                    />
                  </div>
                )}
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="plate_notes">Notes</Label>
              <Textarea
                id="plate_notes"
                rows={2}
                value={plateForm.notes}
                onChange={(e) => setPlateForm({ ...plateForm, notes: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPlateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createPlate.isPending || updatePlate.isPending}>
                {editingPlate ? "Save Changes" : "Create Plate"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Plate type create/edit dialog */}
      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingType ? "Edit Plate Type" : "Add Plate Type"}</DialogTitle>
            <DialogDescription>
              A type groups plates that behave alike (e.g. polymer flexo, copper die).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitType} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type_name">Name *</Label>
                <Input
                  id="type_name"
                  value={typeForm.name}
                  onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type_code">Code</Label>
                <Input
                  id="type_code"
                  value={typeForm.code}
                  onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="type_lifespan">Expected lifespan (uses)</Label>
              <Input
                id="type_lifespan"
                type="number"
                min={1}
                value={typeForm.expected_lifespan_uses}
                onChange={(e) =>
                  setTypeForm({ ...typeForm, expected_lifespan_uses: e.target.value })
                }
                placeholder="optional — advisory only"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type_description">Description</Label>
              <Textarea
                id="type_description"
                rows={2}
                value={typeForm.description}
                onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTypeDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createType.isPending || updateType.isPending}>
                {editingType ? "Save Changes" : "Create Type"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Usage history dialog */}
      <PlateUsageDialog
        plate={historyPlate}
        onClose={() => setHistoryPlate(null)}
      />
    </div>
  );
}

function PlateUsageDialog({
  plate,
  onClose,
}: {
  plate: Plate | null;
  onClose: () => void;
}) {
  const { data: history, isLoading } = useQuery({
    queryKey: platesQueryKeys.usage(plate?.id ?? "none"),
    queryFn: () => PlatesApiService.getPlateUsageHistory(plate!.id),
    enabled: !!plate,
  });

  return (
    <Dialog open={!!plate} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Usage History — {plate?.plate_code || plate?.id}
          </DialogTitle>
          <DialogDescription>
            Each production run that used this plate. A break is the run where it failed.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : !history || history.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No recorded usage yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">Use #</TableHead>
                <TableHead>Run</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>When</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="text-right font-medium">
                    {u.use_number ?? "—"}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{u.run_number || "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        u.outcome === "broke"
                          ? "bg-red-100 text-red-700 border-red-200"
                          : "bg-green-100 text-green-700 border-green-200"
                      }
                    >
                      {u.outcome === "broke" ? "Broke" : "Used"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {u.used_at ? new Date(u.used_at).toLocaleString() : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.notes || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold ${tone ?? ""}`}>{value}</p>
          </div>
          <Icon className={`w-8 h-8 opacity-40 ${tone ?? ""}`} />
        </div>
      </CardContent>
    </Card>
  );
}
