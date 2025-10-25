import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, Clock, Factory, User } from "lucide-react";
import { SalesRepOrder, SalesRepOrderItem } from "../types";
import { salesRepApi } from "../services/salesrep-api";
import { useToast } from "@/hooks/use-toast";

interface EnhancedOrderApprovalWorkflowProps {
  order: SalesRepOrder;
  onOrderUpdated: (updatedOrder: SalesRepOrder) => void;
  userRole: "admin" | "factory_manager" | "sales_rep";
  availableFactories?: Array<{ id: number; name: string; code: string }>;
}

export default function EnhancedOrderApprovalWorkflow({
  order,
  onOrderUpdated,
  userRole,
  availableFactories = [],
}: EnhancedOrderApprovalWorkflowProps) {
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [showFactoryAcceptanceDialog, setShowFactoryAcceptanceDialog] =
    useState(false);
  const [loading, setLoading] = useState(false);
  const [approvalData, setApprovalData] = useState({
    assigned_factory_id: "",
    rejection_reason: "",
  });
  const [productAssignments, setProductAssignments] = useState<
    Record<number, number>
  >({});

  const { toast } = useToast();

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: {
        color: "bg-gray-100 text-gray-800",
        icon: Clock,
        label: "Draft",
      },
      submitted_for_approval: {
        color: "bg-yellow-100 text-yellow-800",
        icon: Clock,
        label: "Pending Admin Approval",
      },
      approved: {
        color: "bg-blue-100 text-blue-800",
        icon: CheckCircle,
        label: "Admin Approved",
      },
      rejected: {
        color: "bg-red-100 text-red-800",
        icon: XCircle,
        label: "Rejected",
      },
      factory_accepted: {
        color: "bg-green-100 text-green-800",
        icon: CheckCircle,
        label: "Factory Accepted",
      },
      confirmed: {
        color: "bg-purple-100 text-purple-800",
        icon: CheckCircle,
        label: "Confirmed",
      },
      processing: {
        color: "bg-orange-100 text-orange-800",
        icon: Factory,
        label: "Processing",
      },
      shipped: {
        color: "bg-blue-100 text-blue-800",
        icon: CheckCircle,
        label: "Shipped",
      },
      delivered: {
        color: "bg-green-100 text-green-800",
        icon: CheckCircle,
        label: "Delivered",
      },
      cancelled: {
        color: "bg-red-100 text-red-800",
        icon: XCircle,
        label: "Cancelled",
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      color: "bg-gray-100 text-gray-800",
      icon: Clock,
      label: status,
    };

    const IconComponent = config.icon;

    return (
      <Badge className={config.color}>
        <IconComponent className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const handleAdminApproval = async (approved: boolean) => {
    if (loading) return;

    setLoading(true);
    try {
      let result;

      if (approved) {
        // Check if we have product-specific assignments
        const hasProductAssignments =
          Object.keys(productAssignments).length > 0;

        if (hasProductAssignments) {
          // Use new per-product factory assignment
          const productAssignmentsArray = Object.entries(
            productAssignments
          ).map(([itemId, factoryId]) => ({
            item_id: parseInt(itemId),
            assigned_factory_id: factoryId,
          }));

          result =
            await salesRepApi.adminApproveOrderWithProductFactoryAssignment(
              order.id,
              {
                approved: true,
                product_assignments: productAssignmentsArray,
              }
            );
        } else {
          // Use legacy single factory assignment
          result = await salesRepApi.adminApproveOrder(order.id, {
            approved: true,
            assigned_factory_id: parseInt(approvalData.assigned_factory_id),
          });
        }
      } else {
        // Rejection
        result = await salesRepApi.adminApproveOrder(order.id, {
          approved: false,
          rejection_reason: approvalData.rejection_reason,
        });
      }

      onOrderUpdated(result);
      setShowApprovalDialog(false);
      setShowRejectionDialog(false);

      toast({
        title: "Success",
        description: approved
          ? "Order approved successfully"
          : "Order rejected successfully",
      });
    } catch (error: any) {
      console.error("Error processing approval:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.error || "Failed to process approval",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFactoryAcceptance = async (accepted: boolean) => {
    if (loading) return;

    setLoading(true);
    try {
      const result = await salesRepApi.factoryManagerAcceptOrder(order.id, {
        accepted,
        rejection_reason: accepted ? undefined : approvalData.rejection_reason,
      });

      onOrderUpdated(result);
      setShowFactoryAcceptanceDialog(false);

      toast({
        title: "Success",
        description: accepted
          ? "Order accepted successfully"
          : "Order rejected successfully",
      });
    } catch (error: any) {
      console.error("Error processing factory acceptance:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.error || "Failed to process factory acceptance",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProductFactoryChange = (itemId: number, factoryId: string) => {
    setProductAssignments((prev) => ({
      ...prev,
      [itemId]: parseInt(factoryId),
    }));
  };

  const getProductFactoryAssignment = (item: SalesRepOrderItem) => {
    return productAssignments[item.id] || item.assigned_factory_id;
  };

  const hasAnyFactoryAssignments = () => {
    // Check if any items have factory assignments either in local state or database
    return (
      order.items?.some(
        (item) => productAssignments[item.id] || item.assigned_factory_id
      ) || false
    );
  };

  const renderProductFactoryAssignment = (item: SalesRepOrderItem) => {
    const currentFactoryId = getProductFactoryAssignment(item);

    return (
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium min-w-[80px]">Factory:</Label>
        <Select
          value={currentFactoryId?.toString() || ""}
          onValueChange={(value) => handleProductFactoryChange(item.id, value)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select factory" />
          </SelectTrigger>
          <SelectContent>
            {availableFactories.map((factory) => (
              <SelectItem key={factory.id} value={factory.id.toString()}>
                {factory.name} ({factory.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {item.assigned_factory_name && (
          <span className="text-xs text-muted-foreground">
            (Currently: {item.assigned_factory_name})
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Order Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Order #{order.order_number}</span>
            {getStatusBadge(order.status)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Customer:</span>{" "}
              {order.customer?.name}
            </div>
            <div>
              <span className="font-medium">Total Amount:</span> $
              {typeof order.final_amount === "number"
                ? order.final_amount.toFixed(2)
                : order.final_amount || "0.00"}
            </div>
            <div>
              <span className="font-medium">Order Date:</span>{" "}
              {new Date(order.order_date).toLocaleDateString()}
            </div>
            <div>
              <span className="font-medium">Status:</span> {order.status}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Items with Factory Assignment */}
      {order.items && order.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{item.product_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Quantity: {item.quantity} × $
                        {typeof item.unit_price === "number"
                          ? item.unit_price.toFixed(2)
                          : item.unit_price || "0.00"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        $
                        {item.total_price &&
                        typeof item.total_price === "number"
                          ? item.total_price.toFixed(2)
                          : typeof item.quantity === "number" &&
                            typeof item.unit_price === "number"
                          ? (item.quantity * item.unit_price).toFixed(2)
                          : "0.00"}
                      </p>
                    </div>
                  </div>

                  {/* Factory Assignment for this product */}
                  {userRole === "admin" &&
                    order.status === "submitted_for_approval" && (
                      <div className="mt-3 pt-3 border-t">
                        {renderProductFactoryAssignment(item)}
                      </div>
                    )}

                  {/* Show current factory assignment if already assigned */}
                  {item.assigned_factory_name && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      <Factory className="h-4 w-4 inline mr-1" />
                      Assigned to: {item.assigned_factory_name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {userRole === "admin" && order.status === "submitted_for_approval" && (
        <div className="flex gap-2">
          <Button
            onClick={() => setShowApprovalDialog(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve Order
          </Button>
          <Button
            onClick={() => setShowRejectionDialog(true)}
            variant="destructive"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject Order
          </Button>
        </div>
      )}

      {userRole === "factory_manager" && order.status === "approved" && (
        <div className="flex gap-2">
          <Button
            onClick={() => setShowFactoryAcceptanceDialog(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Accept Order
          </Button>
          <Button
            onClick={() => setShowFactoryAcceptanceDialog(true)}
            variant="destructive"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject Order
          </Button>
        </div>
      )}

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Order</DialogTitle>
            <DialogDescription>
              {hasAnyFactoryAssignments()
                ? "Review factory assignments for each product and confirm approval."
                : "Select a factory for this order and confirm approval."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!hasAnyFactoryAssignments() && (
              <div>
                <Label htmlFor="factory">Assign Factory (All Products)</Label>
                <Select
                  value={approvalData.assigned_factory_id}
                  onValueChange={(value) =>
                    setApprovalData({
                      ...approvalData,
                      assigned_factory_id: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a factory" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFactories.map((factory) => (
                      <SelectItem
                        key={factory.id}
                        value={factory.id.toString()}
                      >
                        {factory.name} ({factory.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {hasAnyFactoryAssignments() && (
              <div>
                <Label>Product Factory Assignments</Label>
                <div className="space-y-2 mt-2">
                  {order.items?.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <span className="text-sm">{item.product_name}</span>
                      <span className="text-sm text-muted-foreground">
                        {availableFactories.find(
                          (f) =>
                            f.id.toString() ===
                            getProductFactoryAssignment(item)?.toString()
                        )?.name || "Not assigned"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApprovalDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleAdminApproval(true)}
              disabled={
                loading ||
                (Object.keys(productAssignments).length === 0 &&
                  !approvalData.assigned_factory_id)
              }
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? "Processing..." : "Approve Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Order</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this order.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-reason">Rejection Reason</Label>
              <Textarea
                id="rejection-reason"
                value={approvalData.rejection_reason}
                onChange={(e) =>
                  setApprovalData({
                    ...approvalData,
                    rejection_reason: e.target.value,
                  })
                }
                placeholder="Enter reason for rejection..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectionDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleAdminApproval(false)}
              disabled={loading}
              variant="destructive"
            >
              {loading ? "Processing..." : "Reject Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Factory Acceptance Dialog */}
      <Dialog
        open={showFactoryAcceptanceDialog}
        onOpenChange={setShowFactoryAcceptanceDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Factory Manager Decision</DialogTitle>
            <DialogDescription>
              Accept or reject this order for your factory.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="factory-rejection-reason">
                Rejection Reason (if rejecting)
              </Label>
              <Textarea
                id="factory-rejection-reason"
                value={approvalData.rejection_reason}
                onChange={(e) =>
                  setApprovalData({
                    ...approvalData,
                    rejection_reason: e.target.value,
                  })
                }
                placeholder="Enter reason for rejection (optional)..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowFactoryAcceptanceDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleFactoryAcceptance(true)}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? "Processing..." : "Accept Order"}
            </Button>
            <Button
              onClick={() => handleFactoryAcceptance(false)}
              disabled={loading}
              variant="destructive"
            >
              {loading ? "Processing..." : "Reject Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
