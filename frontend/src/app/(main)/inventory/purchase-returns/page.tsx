"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataTablePagination } from "@/components/DataTablePagination";
import { useClientPagination } from "@/hooks/usePagination";
import { toast } from "@/components/ui/sonner";
import { PurchaseReturnApi } from "@/modules/inventory/services/purchase-return-api";
import { PurchaseReturn, PurchaseReturnStats } from "@/services/types";
import { useFormatting } from "@/hooks/useFormatting";
import {
  Plus,
  Search,
  MoreHorizontal,
  Undo2,
  Calendar,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PERMISSIONS } from "@/types/rbac";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-status-draft text-white",
  submitted: "bg-status-pending text-white",
  approved: "bg-success text-white",
  rejected: "bg-destructive text-white",
  cancelled: "bg-muted text-foreground",
};

export default function PurchaseReturnsPage() {
  const router = useRouter();
  const { formatCurrency } = useFormatting();
  const [searchTerm, setSearchTerm] = useState("");
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [stats, setStats] = useState<PurchaseReturnStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [listResponse, statsResponse] = await Promise.all([
        PurchaseReturnApi.getPurchaseReturns({ limit: 100 }),
        PurchaseReturnApi.getPurchaseReturnStats(),
      ]);
      setReturns(listResponse.purchase_returns);
      setStats(statsResponse);
    } catch (err) {
      console.error("Error fetching purchase returns:", err);
      setError("Failed to load purchase returns");
      toast.error("Failed to load purchase returns", {
        description: "Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  };

  const filtered = returns.filter((r) => {
    const term = searchTerm.toLowerCase();
    return (
      r.return_number.toLowerCase().includes(term) ||
      (r.purchase_order_number || "").toLowerCase().includes(term) ||
      (r.supplier_name || "").toLowerCase().includes(term) ||
      r.status.toLowerCase().includes(term)
    );
  });

  const pagination = useClientPagination(filtered, { initialPageSize: 10 });

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this draft purchase return?")) return;
    try {
      await PurchaseReturnApi.deletePurchaseReturn(id);
      toast.success("Purchase return deleted");
      await fetchData();
    } catch (err: any) {
      toast.error("Failed to delete", { description: err?.message });
    }
  };

  const handleSubmit = async (id: number) => {
    try {
      await PurchaseReturnApi.submitPurchaseReturn(id);
      toast.success("Purchase return submitted for approval");
      await fetchData();
    } catch (err: any) {
      toast.error("Failed to submit", { description: err?.message });
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await PurchaseReturnApi.approvePurchaseReturn(id);
      toast.success("Purchase return approved");
      await fetchData();
    } catch (err: any) {
      toast.error("Failed to approve", { description: err?.message });
    }
  };

  const handleReject = async (id: number) => {
    try {
      await PurchaseReturnApi.rejectPurchaseReturn(id);
      toast.success("Purchase return rejected");
      await fetchData();
    } catch (err: any) {
      toast.error("Failed to reject", { description: err?.message });
    }
  };

  const handleCancel = async (id: number) => {
    const reason = window.prompt("Cancellation reason?");
    if (!reason) return;
    try {
      await PurchaseReturnApi.cancelPurchaseReturn(id, reason);
      toast.success("Purchase return cancelled");
      await fetchData();
    } catch (err: any) {
      toast.error("Failed to cancel", { description: err?.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Purchase Returns</h1>
          <p className="text-muted-foreground">
            Return received goods to suppliers and post the corresponding debit note
          </p>
        </div>
        <PermissionGuard permission={PERMISSIONS.PURCHASE_RETURNS_CREATE}>
          <Button
            type="button"
            variant="add"
            onClick={() => router.push("/inventory/purchase-returns/new")}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Purchase Return
          </Button>
        </PermissionGuard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Returns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_returns ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.draft_returns ?? 0} draft / {stats?.submitted_returns ?? 0} submitted
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {stats?.approved_returns ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Posted to accounts</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.returns_this_month ?? 0}</div>
            <p className="text-xs text-muted-foreground">New returns created</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Returned Value (Approved)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.total_value ?? 0, "bdt")}
            </div>
            <p className="text-xs text-muted-foreground">Lifetime total</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle>Purchase Returns</CardTitle>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search returns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-80"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Return #</TableHead>
                <TableHead>PO / GRN</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Return Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <span className="ml-2">Loading purchase returns...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-destructive">
                    {error}
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-2"
                      onClick={() => void fetchData()}
                    >
                      Retry
                    </Button>
                  </TableCell>
                </TableRow>
              ) : pagination.totalItems === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No purchase returns found
                  </TableCell>
                </TableRow>
              ) : (
                pagination.data.map((r) => (
                  <TableRow key={r.id} className="hover:bg-accent/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Undo2 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{r.return_number}</div>
                          {r.voucher_no && (
                            <div className="text-xs text-muted-foreground">
                              Voucher {r.voucher_no}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{r.purchase_order_number}</div>
                        {r.purchase_order_receipt_number && (
                          <div className="text-xs text-muted-foreground">
                            GRN {r.purchase_order_receipt_number}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {r.supplier_name || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-3 h-3" />
                        {new Date(r.return_date).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLOR[r.status] || "bg-muted"}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {r.line_items_count ?? 0} items
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {formatCurrency(r.total_amount, "bdt")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/inventory/purchase-returns/${r.id}`)
                            }
                          >
                            View Details
                          </DropdownMenuItem>
                          {r.status === "draft" && (
                            <>
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(`/inventory/purchase-returns/${r.id}/edit`)
                                }
                              >
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSubmit(r.id)}>
                                Submit for Approval
                              </DropdownMenuItem>
                              <PermissionGuard
                                permission={PERMISSIONS.PURCHASE_RETURNS_DELETE}
                              >
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDelete(r.id)}
                                >
                                  Delete
                                </DropdownMenuItem>
                              </PermissionGuard>
                            </>
                          )}
                          <PermissionGuard
                            permission={PERMISSIONS.PURCHASE_RETURNS_APPROVE}
                          >
                            {r.status === "submitted" && (
                              <>
                                <DropdownMenuItem
                                  className="text-success"
                                  onClick={() => handleApprove(r.id)}
                                >
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleReject(r.id)}
                                >
                                  Reject
                                </DropdownMenuItem>
                              </>
                            )}
                          </PermissionGuard>
                          {(r.status === "draft" ||
                            r.status === "submitted" ||
                            r.status === "rejected") && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleCancel(r.id)}
                            >
                              Cancel
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="mt-4">
            <DataTablePagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              pageSize={pagination.pageSize}
              totalItems={pagination.totalItems}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
