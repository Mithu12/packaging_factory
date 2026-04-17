"use client";

import { useState } from "react";
import Link from "next/link";
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
  Cog,
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
  Wrench,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import {
  MachinesApiService,
  machinesQueryKeys,
  type Machine,
  type MachineStatus,
  type CreateMachineRequest,
  type UpdateMachineRequest,
} from "@/services/machines-api";
import {
  ProductionLinesApiService,
  productionLinesQueryKeys,
} from "@/services/production-lines-api";

type FormState = CreateMachineRequest & { id?: string };

const emptyForm: FormState = {
  name: "",
  code: "",
  model: "",
  serial_number: "",
  manufacturer: "",
  location: "",
  purchase_date: "",
  next_service_date: "",
  production_line_id: null,
  status: "active",
  notes: "",
};

const STATUS_LABEL: Record<MachineStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  under_maintenance: "Under Maintenance",
};

const STATUS_BADGE: Record<MachineStatus, string> = {
  active: "bg-green-100 text-green-700 border-green-200",
  inactive: "bg-gray-100 text-gray-700 border-gray-200",
  under_maintenance: "bg-amber-100 text-amber-700 border-amber-200",
};

function isOverdue(dateStr?: string): boolean {
  if (!dateStr) return false;
  const due = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

export default function MachinesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MachineStatus | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState(false);

  const queryParams = {
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    is_active: true,
    page: 1,
    limit: 100,
  };

  const { data: machinesData, isLoading } = useQuery({
    queryKey: machinesQueryKeys.list(queryParams),
    queryFn: () => MachinesApiService.getMachines(queryParams),
  });

  const { data: stats } = useQuery({
    queryKey: machinesQueryKeys.stats(),
    queryFn: () => MachinesApiService.getMachineStats(),
  });

  const { data: lines } = useQuery({
    queryKey: productionLinesQueryKeys.list({ limit: 100, is_active: true }),
    queryFn: () =>
      ProductionLinesApiService.getProductionLines({ limit: 100, is_active: true }),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: machinesQueryKeys.all });
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateMachineRequest) => MachinesApiService.createMachine(data),
    onSuccess: () => {
      toast.success("Machine created");
      setDialogOpen(false);
      setForm(emptyForm);
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to create machine"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMachineRequest }) =>
      MachinesApiService.updateMachine(id, data),
    onSuccess: () => {
      toast.success("Machine updated");
      setDialogOpen(false);
      setEditing(false);
      setForm(emptyForm);
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update machine"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => MachinesApiService.deleteMachine(id),
    onSuccess: () => {
      toast.success("Machine deleted");
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to delete machine"),
  });

  const openCreate = () => {
    setEditing(false);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (machine: Machine) => {
    setEditing(true);
    setForm({
      id: machine.id,
      name: machine.name,
      code: machine.code,
      model: machine.model ?? "",
      serial_number: machine.serial_number ?? "",
      manufacturer: machine.manufacturer ?? "",
      location: machine.location ?? "",
      purchase_date: machine.purchase_date ?? "",
      next_service_date: machine.next_service_date ?? "",
      production_line_id: machine.production_line_id ?? null,
      status: machine.status,
      notes: machine.notes ?? "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      toast.error("Name and code are required");
      return;
    }
    const payload: CreateMachineRequest = {
      name: form.name.trim(),
      code: form.code.trim(),
      model: form.model || undefined,
      serial_number: form.serial_number || undefined,
      manufacturer: form.manufacturer || undefined,
      location: form.location || undefined,
      purchase_date: form.purchase_date || undefined,
      next_service_date: form.next_service_date || undefined,
      production_line_id: form.production_line_id ?? null,
      status: form.status,
      notes: form.notes || undefined,
    };
    if (editing && form.id) {
      updateMutation.mutate({ id: form.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (machine: Machine) => {
    if (!confirm(`Delete machine "${machine.name}"?`)) return;
    deleteMutation.mutate(machine.id);
  };

  const machines = machinesData?.machines || [];
  const productionLines = lines?.production_lines || [];

  return (
    <div className="space-y-6" data-testid="machines-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Machines</h1>
          <p className="text-muted-foreground">
            Manage factory machines and their maintenance history
          </p>
        </div>
        <Button onClick={openCreate} data-testid="machines-add-button">
          <Plus className="w-4 h-4 mr-2" />
          Add Machine
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Cog} label="Total" value={stats?.total_machines ?? 0} />
        <StatCard
          icon={CheckCircle}
          label="Active"
          value={stats?.active_machines ?? 0}
          tone="text-green-600"
        />
        <StatCard
          icon={Wrench}
          label="Under Maintenance"
          value={stats?.under_maintenance ?? 0}
          tone="text-amber-600"
        />
        <StatCard
          icon={AlertTriangle}
          label="Overdue Service"
          value={stats?.overdue_service ?? 0}
          tone="text-red-600"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Machine List</CardTitle>
          <div className="flex flex-col md:flex-row gap-3 mt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, code, model, manufacturer..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="machines-search"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as MachineStatus | "all")}
            >
              <SelectTrigger className="md:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="under_maintenance">Under Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading...</div>
          ) : machines.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Cog className="w-10 h-10 mx-auto mb-2 opacity-40" />
              No machines found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Production Line</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Next Service</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {machines.map((m) => (
                  <TableRow key={m.id} data-testid={`machine-row-${m.id}`}>
                    <TableCell className="font-mono text-sm">{m.code}</TableCell>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.model || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.production_line_name || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_BADGE[m.status]}>
                        {STATUS_LABEL[m.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {m.next_service_date ? (
                        <span
                          className={
                            isOverdue(m.next_service_date)
                              ? "text-red-600 font-medium"
                              : ""
                          }
                        >
                          {m.next_service_date}
                          {isOverdue(m.next_service_date) && " (overdue)"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button asChild size="icon" variant="ghost">
                          <Link href={`/factory/machines/${m.id}`}>
                            <Eye className="w-4 h-4" />
                          </Link>
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(m)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(m)}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Machine" : "Add Machine"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update the machine details below." : "Register a new machine in the factory."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4" data-testid="machine-form">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={form.model ?? ""}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serial">Serial Number</Label>
                <Input
                  id="serial"
                  value={form.serial_number ?? ""}
                  onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manufacturer">Manufacturer</Label>
                <Input
                  id="manufacturer"
                  value={form.manufacturer ?? ""}
                  onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={form.location ?? ""}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchase_date">Purchase Date</Label>
                <Input
                  id="purchase_date"
                  type="date"
                  value={form.purchase_date ?? ""}
                  onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="next_service_date">Next Service Date</Label>
                <Input
                  id="next_service_date"
                  type="date"
                  value={form.next_service_date ?? ""}
                  onChange={(e) => setForm({ ...form, next_service_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="production_line_id">Production Line</Label>
                <Select
                  value={
                    form.production_line_id ? String(form.production_line_id) : "none"
                  }
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      production_line_id: v === "none" ? null : parseInt(v, 10),
                    })
                  }
                >
                  <SelectTrigger id="production_line_id">
                    <SelectValue placeholder="Select production line" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {productionLines.map((pl) => (
                      <SelectItem key={pl.id} value={pl.id}>
                        {pl.name} ({pl.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.status ?? "active"}
                  onValueChange={(v) => setForm({ ...form, status: v as MachineStatus })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="under_maintenance">Under Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={3}
                value={form.notes ?? ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editing ? "Save Changes" : "Create Machine"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
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
