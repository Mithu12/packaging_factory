import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Eye, Edit, Calendar, CreditCard, FileText, User, Building } from "lucide-react";
import { PaymentApi } from "@/modules/sales/services/payment-api";
import { PaymentWithDetails } from "@/services/types";
import { useFormatting } from "@/hooks/useFormatting";
import { useToast } from "@/hooks/use-toast";
import { useRBAC } from "@/contexts/RBACContext";
import { PERMISSIONS } from "@/types/rbac";

export default function PaymentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { formatCurrency, formatDate } = useFormatting();
  const { toast } = useToast();
  const { hasPermission } = useRBAC();

  const [payment, setPayment] = useState<PaymentWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPayment = async () => {
      if (!id) {
        setError("Payment ID is required");
        setLoading(false);
        return;
      }

      try {
        const paymentData = await PaymentApi.getPayment(parseInt(id));
        setPayment(paymentData);
      } catch (err: any) {
        console.error("Error fetching payment:", err);
        setError(err.message || "Failed to load payment details");
        toast({
          title: "Error",
          description: "Failed to load payment details. Please try again.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPayment();
  }, [id, toast]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success text-white";
      case "pending":
        return "bg-warning text-white";
      case "failed":
        return "bg-destructive text-white";
      case "cancelled":
        return "bg-secondary text-white";
      default:
        return "bg-muted";
    }
  };

  const getApprovalStatusColor = (approvalStatus: string) => {
    switch (approvalStatus) {
      case "approved":
        return "bg-success text-white";
      case "rejected":
        return "bg-destructive text-white";
      case "submitted":
        return "bg-warning text-white";
      case "draft":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-destructive mb-4">{error || "Payment not found"}</p>
          <Button onClick={() => navigate("/payments")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Payments
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            onClick={() => navigate("/payments")} 
            variant="outline" 
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Payments
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Payment Details</h1>
            <p className="text-muted-foreground">Payment #{payment.payment_number}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {hasPermission(PERMISSIONS.PAYMENTS_UPDATE) && (
            <Button onClick={() => navigate(`/edit-payment/${payment.id}`)} variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Edit Payment
            </Button>
          )}
          {payment.invoice_id && (
            <Button onClick={() => navigate(`/view-invoice/${payment.invoice_id}`)} variant="outline">
              <Eye className="w-4 h-4 mr-2" />
              View Invoice
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Payment Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Payment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Amount</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(payment.amount)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Payment Date</p>
                  <p className="text-lg font-semibold">{formatDate(payment.payment_date)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Payment Method</p>
                  <p className="font-medium">{payment.payment_method}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Reference</p>
                  <p className="font-medium">{payment.reference || "N/A"}</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge className={getStatusColor(payment.status)}>
                    {payment.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Approval Status</p>
                  <Badge className={getApprovalStatusColor(payment.approval_status)}>
                    {payment.approval_status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Notes */}
          {payment.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{payment.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Approval Notes */}
          {payment.approval_notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Approval Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{payment.approval_notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar Information */}
        <div className="space-y-6">
          {/* Supplier Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Supplier
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p className="font-medium">{payment.supplier_name || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Code</p>
                <p className="font-medium">{payment.supplier_code || "N/A"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Information */}
          {payment.invoice_id && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Related Invoice
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Invoice Number</p>
                  <p className="font-medium">{payment.invoice_number || "N/A"}</p>
                </div>
                <Button 
                  onClick={() => navigate(`/view-invoice/${payment.invoice_id}`)}
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Invoice
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Approval Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Approval Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {payment.submitted_at && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Submitted At</p>
                  <p className="text-sm">{formatDate(payment.submitted_at)}</p>
                </div>
              )}
              {payment.approved_at && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Approved At</p>
                  <p className="text-sm">{formatDate(payment.approved_at)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Timestamps
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p className="text-sm">{formatDate(payment.created_at)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                <p className="text-sm">{formatDate(payment.updated_at)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
