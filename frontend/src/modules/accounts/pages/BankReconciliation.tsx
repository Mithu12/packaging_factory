"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Save, CheckCircle, Scale, Landmark, Ban } from "lucide-react";
import { toast } from "sonner";
import { useFormatting } from "@/hooks/useFormatting";
import {
  BankReconciliationApiService,
  ChartOfAccountsApiService,
  ChequesApiService,
} from "@/services/accounts-api";
import { CustomerOrdersApiService } from "@/modules/factory/services/customer-orders-api";

export default function BankReconciliation() {
  const { formatCurrency, formatDate } = useFormatting();

  const today = new Date().toISOString().split("T")[0];
  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [statementDate, setStatementDate] = useState<string>(today);
  const [statementBalance, setStatementBalance] = useState<string>("");
  const [cleared, setCleared] = useState<Record<number, boolean>>({});
  const [customerId, setCustomerId] = useState<string>("");

  const { data: accounts } = useQuery({
    queryKey: ["coa-posting-accounts"],
    queryFn: () => ChartOfAccountsApiService.getChartOfAccounts({ limit: 500 }),
  });
  const postingAccounts = (accounts?.data ?? []).filter((a) => a.type === "Posting");

  const { data: customers } = useQuery({
    queryKey: ["factory-customers"],
    queryFn: () => CustomerOrdersApiService.getAllCustomers(),
  });

  const { data: entriesData, isFetching, refetch } = useQuery({
    queryKey: ["recon-entries", bankAccountId, statementDate],
    queryFn: () => BankReconciliationApiService.getEntries(Number(bankAccountId), statementDate),
    enabled: false,
  });

  const loadEntries = async () => {
    if (!bankAccountId) {
      toast.error("Select a bank account first");
      return;
    }
    const res = await refetch();
    if (res.data) {
      const preset: Record<number, boolean> = {};
      res.data.entries.forEach((e) => { if (e.already_cleared) preset[e.ledger_entry_id] = true; });
      setCleared(preset);
    }
  };

  const clearedBalance = useMemo(() => {
    if (!entriesData) return 0;
    return entriesData.entries.reduce(
      (acc, e) => (cleared[e.ledger_entry_id] ? acc + e.debit - e.credit : acc),
      0
    );
  }, [entriesData, cleared]);

  const statementNum = parseFloat(statementBalance) || 0;
  const difference = +(statementNum - clearedBalance).toFixed(2);
  const isBalanced = Math.abs(difference) < 0.005;

  const saveMut = useMutation({
    mutationFn: (complete: boolean) =>
      BankReconciliationApiService.save({
        bank_account_id: Number(bankAccountId),
        statement_date: statementDate,
        statement_balance: statementNum,
        cleared_ledger_entry_ids: Object.entries(cleared).filter(([, v]) => v).map(([k]) => Number(k)),
        complete,
      }),
    onSuccess: (_d, complete) => {
      toast.success(complete ? "Reconciliation completed" : "Reconciliation saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save reconciliation"),
  });

  const selectedCustomer = customers?.find((c) => String(c.id) === customerId);
  const customerPayee = selectedCustomer?.company || selectedCustomer?.name || "";

  const { data: chequesData, isFetching: chequesLoading } = useQuery({
    queryKey: ["customer-cheques", bankAccountId, customerPayee],
    queryFn: () =>
      ChequesApiService.getCheques({
        bank_account_id: bankAccountId ? Number(bankAccountId) : undefined,
        search: customerPayee || undefined,
        limit: 200,
      }),
    enabled: !!bankAccountId && !!customerPayee,
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bank Reconciliation</h1>
        <p className="text-muted-foreground">
          Tick the ledger entries that have cleared your bank statement and confirm the balance matches.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Statement</CardTitle>
          <CardDescription>Choose the bank ledger account and enter the statement closing balance.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label className="mb-1 block">Bank account</Label>
              <Select value={bankAccountId} onValueChange={setBankAccountId}>
                <SelectTrigger className="w-64"><SelectValue placeholder="Select bank account" /></SelectTrigger>
                <SelectContent>
                  {postingAccounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>{a.code} — {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block">Statement date</Label>
              <Input type="date" value={statementDate} onChange={(e) => setStatementDate(e.target.value)} className="w-44" />
            </div>
            <div>
              <Label className="mb-1 block">Statement balance</Label>
              <Input type="number" step="0.01" value={statementBalance} onChange={(e) => setStatementBalance(e.target.value)} className="w-44" placeholder="0.00" />
            </div>
            <Button onClick={loadEntries} disabled={isFetching}>
              {isFetching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Landmark className="h-4 w-4 mr-2" />}
              Load Entries
            </Button>
          </div>
        </CardContent>
      </Card>

      {entriesData && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <SummaryCard label="Book Balance" value={formatCurrency(entriesData.book_balance)} />
            <SummaryCard label="Cleared Balance" value={formatCurrency(clearedBalance)} />
            <SummaryCard label="Statement Balance" value={formatCurrency(statementNum)} />
            <SummaryCard
              label="Difference"
              value={formatCurrency(difference)}
              tone={isBalanced ? "good" : "bad"}
            />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Ledger Entries</CardTitle>
                <CardDescription>Up to {statementDate}. Tick entries that appear on the statement.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {isBalanced ? (
                  <Badge className="gap-1"><Scale className="h-3 w-3" /> Balanced</Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1"><Scale className="h-3 w-3" /> Out by {formatCurrency(Math.abs(difference))}</Badge>
                )}
                <Button variant="outline" onClick={() => saveMut.mutate(false)} disabled={saveMut.isPending}>
                  <Save className="h-4 w-4 mr-2" /> Save
                </Button>
                <Button onClick={() => saveMut.mutate(true)} disabled={saveMut.isPending || !isBalanced} title={isBalanced ? "Complete reconciliation" : "Balance must be zero to complete"}>
                  <CheckCircle className="h-4 w-4 mr-2" /> Complete
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Cleared</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Voucher</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entriesData.entries.length > 0 ? entriesData.entries.map((e) => (
                    <TableRow key={e.ledger_entry_id}>
                      <TableCell>
                        <Checkbox
                          checked={!!cleared[e.ledger_entry_id]}
                          onCheckedChange={(v) =>
                            setCleared((prev) => ({ ...prev, [e.ledger_entry_id]: !!v }))
                          }
                        />
                      </TableCell>
                      <TableCell>{e.date?.slice(0, 10)}</TableCell>
                      <TableCell className="font-mono text-xs">{e.voucher_no ?? "—"}</TableCell>
                      <TableCell className="max-w-md truncate" title={e.description}>{e.description}</TableCell>
                      <TableCell className="text-right">{e.debit ? formatCurrency(e.debit) : "—"}</TableCell>
                      <TableCell className="text-right">{e.credit ? formatCurrency(e.credit) : "—"}</TableCell>
                    </TableRow>
                  )) : <TableRow><TableCell colSpan={6} className="h-24 text-center">No ledger entries for this account up to the statement date.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Customer Cheques</CardTitle>
          <CardDescription>Select a customer to view cheques issued against this bank account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label className="mb-1 block">Customer</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="w-64"><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {(customers ?? []).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.company || c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {chequesLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : chequesData && chequesData.cheques.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cheque #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Payee</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cancelled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chequesData.cheques.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.cheque_no}</TableCell>
                    <TableCell>{formatDate(c.cheque_date)}</TableCell>
                    <TableCell>{c.payee}</TableCell>
                    <TableCell>
                      <div>{c.bank_account_name ?? "—"}</div>
                      {c.drawee_bank_name && (
                        <div className="text-xs text-muted-foreground">{c.drawee_bank_name}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(c.amount)}</TableCell>
                    <TableCell>
                      <Badge variant={
                        c.status === "cleared" ? "default" :
                        c.status === "bounced" ? "destructive" :
                        c.status === "cancelled" ? "outline" : "secondary"
                      } className="gap-1 capitalize">
                        {c.status === "cancelled" && <Ban className="h-3 w-3" />}
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(c.cancellation_count ?? 0) > 0 ? (
                        <Badge variant="outline" className="text-red-500 border-red-300">
                          Cancelled {c.cancellation_count} time{(c.cancellation_count ?? 0) > 1 ? "s" : ""}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">No</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : customerPayee ? (
            <div className="text-center py-8 text-muted-foreground">
              <Landmark className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No cheques found for this customer</p>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Landmark className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Select a customer to view cheques</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  const color = tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-red-600" : "";
  return (
    <Card className="border-none shadow-md">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle></CardHeader>
      <CardContent><div className={`text-2xl font-bold ${color}`}>{value}</div></CardContent>
    </Card>
  );
}
