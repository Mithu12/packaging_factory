"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import {
  Loader2,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Ban,
  CreditCard,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useFormatting } from "@/hooks/useFormatting";
import {
  ChequesApiService,
  ChartOfAccountsApiService,
  type ChequeStatus,
  type CreateChequeRequest,
} from "@/services/accounts-api";

const STATUS_VARIANTS: Record<
  ChequeStatus,
  { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }
> = {
  issued: { variant: "secondary", icon: Clock },
  cleared: { variant: "default", icon: CheckCircle },
  bounced: { variant: "destructive", icon: XCircle },
  cancelled: { variant: "outline", icon: Ban },
};

export default function ChequeRegister() {
  const { formatCurrency, formatDate } = useFormatting();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["cheques", statusFilter, search, page],
    queryFn: () =>
      ChequesApiService.getCheques({
        status: statusFilter !== "all" ? (statusFilter as ChequeStatus) : undefined,
        search: search || undefined,
        page,
        limit: 20,
      }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["cheques"] });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: ChequeStatus }) =>
      ChequesApiService.updateChequeStatus(id, status),
    onSuccess: (_d, vars) => { toast.success(`Cheque marked ${vars.status}`); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to update cheque"),
  });

  const getStatusBadge = (status: ChequeStatus) => {
    const cfg = STATUS_VARIANTS[status] ?? STATUS_VARIANTS.issued;
    const Icon = cfg.icon;
    return (
      <Badge variant={cfg.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cheque Register</h1>
          <p className="text-muted-foreground">
            Cheques and pay-orders issued, with their clearing status.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Cheque
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by cheque # or payee..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="issued">Issued</SelectItem>
                <SelectItem value="cleared">Cleared</SelectItem>
                <SelectItem value="bounced">Bounced</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cheques</CardTitle>
          <CardDescription>
            {data ? `Showing ${data.cheques.length} of ${data.total} cheques` : "Loading..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : data && data.cheques.length > 0 ? (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cheque #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Payee</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.cheques.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.cheque_no}</TableCell>
                      <TableCell>{formatDate(c.cheque_date)}</TableCell>
                      <TableCell className="capitalize">{c.instrument_type.replace(/_/g, " ")}</TableCell>
                      <TableCell>{c.payee}</TableCell>
                      <TableCell>{c.bank_account_name ?? c.drawee_bank_name ?? "—"}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(c.amount)}</TableCell>
                      <TableCell>{getStatusBadge(c.status)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          {c.status === "issued" && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => statusMut.mutate({ id: c.id, status: "cleared" })} disabled={statusMut.isPending} title="Mark cleared">
                                <CheckCircle className="h-4 w-4 mr-1" /> Clear
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => statusMut.mutate({ id: c.id, status: "bounced" })} disabled={statusMut.isPending} title="Mark bounced">
                                <XCircle className="h-4 w-4 mr-1" /> Bounce
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => statusMut.mutate({ id: c.id, status: "cancelled" })} disabled={statusMut.isPending} title="Cancel cheque">
                                <Ban className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Page {data.page} of {totalPages}</div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>Previous</Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>Next</Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No cheques found</p>
            </div>
          )}
        </CardContent>
      </Card>

      <NewChequeDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={() => { invalidate(); setDialogOpen(false); }} />
    </div>
  );
}

function NewChequeDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState<CreateChequeRequest>({
    cheque_no: "",
    cheque_date: today,
    instrument_type: "cheque",
    payee: "",
    amount: 0,
  });

  // Posting accounts to choose the drawee bank ledger from.
  const { data: accounts } = useQuery({
    queryKey: ["coa-posting-accounts"],
    queryFn: () => ChartOfAccountsApiService.getChartOfAccounts({ limit: 500 }),
    enabled: open,
  });

  const createMut = useMutation({
    mutationFn: (payload: CreateChequeRequest) => ChequesApiService.createCheque(payload),
    onSuccess: () => {
      toast.success("Cheque recorded");
      setForm({ cheque_no: "", cheque_date: today, instrument_type: "cheque", payee: "", amount: 0 });
      onCreated();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to create cheque"),
  });

  const postingAccounts = (accounts?.data ?? []).filter((a) => a.type === "Posting");

  const set = (patch: Partial<CreateChequeRequest>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Cheque / Pay-Order</DialogTitle>
          <DialogDescription>Record an issued cheque or pay-order.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block">Instrument</Label>
              <Select value={form.instrument_type} onValueChange={(v) => set({ instrument_type: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="pay_order">Pay Order</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block">Cheque / PO No.</Label>
              <Input value={form.cheque_no} onChange={(e) => set({ cheque_no: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block">Date</Label>
              <Input type="date" value={form.cheque_date} onChange={(e) => set({ cheque_date: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1 block">Amount</Label>
              <Input type="number" min={0} step="0.01" value={form.amount} onChange={(e) => set({ amount: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>

          <div>
            <Label className="mb-1 block">Payee</Label>
            <Input value={form.payee} onChange={(e) => set({ payee: e.target.value })} placeholder="Pay to the order of..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block">Drawee Bank (ledger)</Label>
              <Select
                value={form.bank_account_id ? String(form.bank_account_id) : undefined}
                onValueChange={(v) => set({ bank_account_id: Number(v) })}
              >
                <SelectTrigger><SelectValue placeholder="Select bank account" /></SelectTrigger>
                <SelectContent>
                  {postingAccounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>{a.code} — {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block">Bank Name (free text)</Label>
              <Input value={form.drawee_bank_name ?? ""} onChange={(e) => set({ drawee_bank_name: e.target.value })} />
            </div>
          </div>

          <div>
            <Label className="mb-1 block">Memo</Label>
            <Input value={form.memo ?? ""} onChange={(e) => set({ memo: e.target.value })} placeholder="Optional" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => createMut.mutate(form)}
            disabled={!form.cheque_no || !form.payee || createMut.isPending}
          >
            {createMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save Cheque
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
