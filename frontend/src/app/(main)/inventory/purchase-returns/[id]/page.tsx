"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Loader2 } from "lucide-react";
import { PurchaseReturnApi } from "@/modules/inventory/services/purchase-return-api";
import { PurchaseReturnWithDetails } from "@/services/types";
import { useFormatting } from "@/hooks/useFormatting";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import { PERMISSIONS } from "@/types/rbac";

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-status-draft text-white",
  submitted: "bg-status-pending text-white",
  approved: "bg-success text-white",
  rejected: "bg-destructive text-white",
  cancelled: "bg-muted text-foreground",
};

export default function PurchaseReturnDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : params.id?.[0];
  const { formatCurrency } = useFormatting();

  const [data, setData] = useState<PurchaseReturnWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioning, setActioning] = useState(false);

  useEffect(() => {
    if (id) void fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await PurchaseReturnApi.getPurchaseReturn(parseInt(id!));
      setData(result);
    } catch (err: any) {
      setError(err?.message || "Failed to load purchase return");
    } finally {
      setLoading(false);
    }
  };

  const performAction = async (action: () => Promise<unknown>, successMsg: string) => {
    try {
      setActioning(true);
      await action();
      toast.success(successMsg);
      await fetchDetail();
    } catch (err: any) {
      toast.error("Action failed", { description: err?.message });
    } finally {
      setActioning(false);
    }
  };

  const handleSubmit = () =>
    performAction(() => PurchaseReturnApi.submitPurchaseReturn(data!.id), "Submitted for approval");

  const handleApprove = () =>
    performAction(() => PurchaseReturnApi.approvePurchaseReturn(data!.id), "Purchase return approved");

  const handleReject = () => {
    const notes = window.prompt("Reason for rejection?") || undefined;
    return performAction(
      () => PurchaseReturnApi.rejectPurchaseReturn(data!.id, notes),
      "Purchase return rejected"
    );
  };

  const handleCancel = () => {
    const reason = window.prompt("Cancellation reason?");
    if (!reason) return;
    return performAction(
      () => PurchaseReturnApi.cancelPurchaseReturn(data!.id, reason),
      "Purchase return cancelled"
    );
  };

  const handleDelete = () => {
    if (!window.confirm("Delete this draft purchase return?")) return;
    return performAction(async () => {
      await PurchaseReturnApi.deletePurchaseReturn(data!.id);
      router.push("/inventory/purchase-returns");
    }, "Purchase return deleted");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-destructive">
            {error || "Not found"}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground">
                {data.return_number}
              </h1>
              <Badge className={STATUS_COLOR[data.status] || "bg-muted"}>
                {data.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Purchase return for {data.purchase_order.po_number} —{" "}
              {data.supplier.name}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {data.status === "draft" && (
            <>
              <Button
                variant="outline"
                onClick={() => router.push(`/inventory/purchase-returns/${data.id}/edit`)}
                disabled={actioning}
              >
                Edit
              </Button>
              <Button onClick={handleSubmit} disabled={actioning}>
                Submit for Approval
              </Button>
              <PermissionGuard permission={PERMISSIONS.PURCHASE_RETURNS_DELETE}>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={actioning}
                >
                  Delete
                </Button>
              </PermissionGuard>
            </>
          )}
          <PermissionGuard permission={PERMISSIONS.PURCHASE_RETURNS_APPROVE}>
            {data.status === "submitted" && (
              <>
                <Button onClick={handleApprove} disabled={actioning}>
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={actioning}
                >
                  Reject
                </Button>
              </>
            )}
          </PermissionGuard>
          {(data.status === "draft" ||
            data.status === "submitted" ||
            data.status === "rejected") && (
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={actioning}
            >
              Cancel Return
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Supplier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-medium">{data.supplier.name}</div>
            {data.supplier.email && (
              <div className="text-xs text-muted-foreground">{data.supplier.email}</div>
            )}
            {data.supplier.phone && (
              <div className="text-xs text-muted-foreground">{data.supplier.phone}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Source
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              <div>
                PO:{" "}
                <span className="font-medium">{data.purchase_order.po_number}</span>
              </div>
              {data.purchase_order_receipt && (
                <div className="text-muted-foreground">
                  GRN: {data.purchase_order_receipt.receipt_number} (
                  {new Date(data.purchase_order_receipt.receipt_date).toLocaleDateString()}
                  )
                </div>
              )}
              {data.cost_basis_source && (
                <div className="text-xs text-muted-foreground mt-1">
                  Cost basis: {data.cost_basis_source.toUpperCase()}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Accounting
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.voucher ? (
              <div className="text-sm">
                <div>
                  Voucher: <span className="font-medium">{data.voucher.voucher_no}</span>
                </div>
                <div className="text-xs text-success">Posted</div>
              </div>
            ) : data.status === "approved" ? (
              <div className="text-sm text-destructive">
                <div>No voucher recorded</div>
                {data.accounting_integration_error && (
                  <div className="text-xs">{data.accounting_integration_error}</div>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Posts on approval
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Line Items</CardTitle>
            <div className="text-sm">
              Total:{" "}
              <span className="font-medium">
                {formatCurrency(data.total_amount, "bdt")}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Return Qty</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.line_items.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>
                    <div className="font-medium">{line.product_name}</div>
                    {line.product_sku && (
                      <div className="text-xs text-muted-foreground">
                        {line.product_sku}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {line.return_quantity}{" "}
                    <span className="text-xs text-muted-foreground">
                      {line.unit_of_measure}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(line.unit_cost, "bdt")}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(line.total_cost, "bdt")}
                  </TableCell>
                  <TableCell>{line.condition || "—"}</TableCell>
                  <TableCell className="text-sm">{line.notes || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">Reason:</span>{" "}
            <span className="font-medium">{data.reason}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Return date:</span>{" "}
            {new Date(data.return_date).toLocaleDateString()}
          </div>
          <div>
            <span className="text-muted-foreground">Created by:</span>{" "}
            {data.created_by}
          </div>
          <div>
            <span className="text-muted-foreground">Created at:</span>{" "}
            {new Date(data.created_at).toLocaleString()}
          </div>
          {data.approved_by && (
            <div>
              <span className="text-muted-foreground">Approved by:</span>{" "}
              {data.approved_by}
            </div>
          )}
          {data.approved_at && (
            <div>
              <span className="text-muted-foreground">Approved at:</span>{" "}
              {new Date(data.approved_at).toLocaleString()}
            </div>
          )}
          {data.reason_notes && (
            <div className="md:col-span-2">
              <span className="text-muted-foreground">Reason notes:</span>{" "}
              {data.reason_notes}
            </div>
          )}
          {data.approval_notes && (
            <div className="md:col-span-2">
              <span className="text-muted-foreground">Approval notes:</span>{" "}
              {data.approval_notes}
            </div>
          )}
          {data.cancellation_reason && (
            <div className="md:col-span-2">
              <span className="text-muted-foreground">Cancellation reason:</span>{" "}
              {data.cancellation_reason}
            </div>
          )}
          {data.notes && (
            <div className="md:col-span-2">
              <span className="text-muted-foreground">Notes:</span> {data.notes}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
