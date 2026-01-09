"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  ChevronLeft,
  Upload,
  X,
  FileText,
  User,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { PaymentApi } from "@/modules/sales/services/payment-api";
import { useFormatting } from "@/hooks/useFormatting";
import { useRBAC, useFinancePermissions } from "@/contexts/RBACContext";
import { PERMISSIONS } from "@/types/rbac";
import { PaymentWithDetails } from "@/services/types";
import { Separator } from "@/components/ui/separator";

export default function PaymentDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const paymentId = parseInt(params.id as string);
  const { formatCurrency, formatDate } = useFormatting();
  const { hasPermission } = useRBAC();
  const { canApprovePayments } = useFinancePermissions();

  const [payment, setPayment] = useState<PaymentWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const fetchPaymentDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await PaymentApi.getPayment(paymentId);
      setPayment(data);
    } catch (err: any) {
      console.error("Error fetching payment details:", err);
      setError(err.message || "Failed to load payment details");
      toast.error("Failed to load payment details.");
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  useEffect(() => {
    if (paymentId) {
      fetchPaymentDetails();
    }
  }, [paymentId, fetchPaymentDetails]);

  const handleApprove = async () => {
    try {
      setIsActionLoading(true);
      await PaymentApi.approvePayment(paymentId, { action: 'approve', notes: 'Approved from details page' });
      toast.success("Payment approved successfully.");
      fetchPaymentDetails();
    } catch (error) {
      console.error("Error approving payment:", error);
      toast.error("Failed to approve payment.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      setIsActionLoading(true);
      await PaymentApi.approvePayment(paymentId, { action: 'reject', notes: 'Rejected from details page' });
      toast.success("Payment rejected.");
      fetchPaymentDetails();
    } catch (error) {
      console.error("Error rejecting payment:", error);
      toast.error("Failed to reject payment.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSubmitForApproval = async () => {
    try {
      setIsActionLoading(true);
      await PaymentApi.submitPaymentForApproval(paymentId, 'Submitted from details page');
      toast.success("Payment submitted for approval.");
      fetchPaymentDetails();
    } catch (error) {
      console.error("Error submitting payment:", error);
      toast.error("Failed to submit payment for approval.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "pending":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getApprovalStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "submitted":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "draft":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading payment details...</span>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="text-center">
          <h3 className="text-lg font-semibold">Error</h3>
          <p className="text-muted-foreground">{error || "Payment not found"}</p>
        </div>
        <Button onClick={() => router.back()} variant="outline">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Payment Detail</h1>
            <p className="text-muted-foreground">Payment #{payment.id}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {payment.approval_status === "draft" && hasPermission(PERMISSIONS.PAYMENTS_CREATE) && (
            <Button onClick={handleSubmitForApproval} disabled={isActionLoading}>
              <Upload className="w-4 h-4 mr-2" />
              Submit for Approval
            </Button>
          )}
          {payment.approval_status === "submitted" && canApprovePayments && (
            <>
              <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700" disabled={isActionLoading}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </Button>
              <Button onClick={handleReject} variant="destructive" disabled={isActionLoading}>
                <X className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Payment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Amount</label>
                  <p className="text-2xl font-bold">{formatCurrency(payment.amount)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Payment Date</label>
                  <p className="text-lg">{formatDate(payment.payment_date)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Payment Method</label>
                  <p className="text-lg capitalize">{payment.payment_method?.replace('_', ' ')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Reference</label>
                  <p className="text-lg">{payment.reference || "N/A"}</p>
                </div>
              </div>
              <Separator />
              <div>
                <label className="text-sm font-medium text-muted-foreground">Notes</label>
                <p className="text-base mt-1 italic text-muted-foreground">
                  {payment.notes || "No notes provided."}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Status & History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">Status</label>
                  <Badge className={getStatusColor(payment.status)}>
                    {payment.status.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">Approval Status</label>
                  <Badge className={getApprovalStatusColor(payment.approval_status)}>
                    {payment.approval_status.toUpperCase()}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {payment.submitted_at && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    Submitted: {formatDate(payment.submitted_at)}
                  </div>
                )}
                {payment.approved_at && (
                  <div className="flex items-center gap-2 text-green-600 font-medium">
                    <CheckCircle className="w-4 h-4" />
                    Approved: {formatDate(payment.approved_at)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Supplier Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-bold text-lg">{payment.supplier?.name}</p>
              <p className="text-sm text-muted-foreground">Code: {payment.supplier?.supplier_code}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-2"
                onClick={() => router.push(`/inventory/suppliers/${payment.supplier_id}`)}
              >
                View Supplier
              </Button>
            </CardContent>
          </Card>

          {payment.invoice && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Related Invoice
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-bold text-lg">{payment.invoice.invoice_number}</p>
                <p className="text-sm text-muted-foreground">#{payment.invoice.id}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={() => router.push(`/inventory/payments`)} // Or specific invoice view if exists
                >
                  View All Invoices
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
