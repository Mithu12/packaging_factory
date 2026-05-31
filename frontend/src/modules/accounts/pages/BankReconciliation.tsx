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
import { Loader2, Save, CheckCircle, Scale, Landmark } from "lucide-react";
import { toast } from "sonner";
import { useFormatting } from "@/hooks/useFormatting";
import {
  BankReconciliationApiService,
  ChartOfAccountsApiService,
} from "@/services/accounts-api";

export default function BankReconciliation() {
  const { formatCurrency } = useFormatting();

  const today = new Date().toISOString().split("T")[0];
  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [statementDate, setStatementDate] = useState<string>(today);
  const [statementBalance, setStatementBalance] = useState<string>("");
  const [cleared, setCleared] = useState<Record<number, boolean>>({});

  const { data: accounts } = useQuery({
    queryKey: ["coa-posting-accounts"],
    queryFn: () => ChartOfAccountsApiService.getChartOfAccounts({ limit: 500 }),
  });
  const postingAccounts = (accounts?.data ?? []).filter((a) => a.type === "Posting");

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
    // Pre-tick entries already cleared in a prior reconciliation.
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
