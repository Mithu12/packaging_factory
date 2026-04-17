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
import { ArrowLeft, Plus, Trash2, Wrench } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import {
  MachinesApiService,
  machinesQueryKeys,
  type CreateMachineMaintenanceLogRequest,
  type MaintenanceType,
} from "@/services/machines-api";
import { useFormatting } from "@/hooks/useFormatting";

const TYPE_LABEL: Record<MaintenanceType, string> = {
  preventive: "Preventive",
  corrective: "Corrective",
};

const TYPE_BADGE: Record<MaintenanceType, string> = {
  preventive: "bg-blue-100 text-blue-700 border-blue-200",
  corrective: "bg-orange-100 text-orange-700 border-orange-200",
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

export default function MachineDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : params.id?.[0];
  const queryClient = useQueryClient();
  const { formatCurrency } = useFormatting();

  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [logForm, setLogForm] = useState<LogForm>(emptyLogForm);

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
