"use client";

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
import { SalesRepOrder } from "../types";
import { salesRepApi } from "../services/salesrep-api";
import { useToast } from "@/hooks/use-toast";

interface OrderApprovalWorkflowProps {
  order: SalesRepOrder;
  onOrderUpdated: (updatedOrder: SalesRepOrder) => void;
  userRole: "admin" | "factory_manager" | "sales_rep";
  availableFactories?: Array<{ id: number; name: string; code: string }>;
}

export default function OrderApprovalWorkflow({
  order,
  onOrderUpdated,
  userRole,
  availableFactories = [],
}: OrderApprovalWorkflowProps) {
  const { toast } = useToast();
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [showFactoryAcceptanceDialog, setShowFactoryAcceptanceDialog] =
    useState(false);
  const [loading, setLoading] = useState(false);
  const [approvalData, setApprovalData] = useState({
    assigned_factory_id: "",
    rejection_reason: "",
  });

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

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const handleSubmitForApproval = async () => {
    try {
      setLoading(true);
      const updatedOrder = await salesRepApi.submitDraftOrderForApproval(
        order.id
      );
      onOrderUpdated(updatedOrder);
      toast({
        title: "Order Submitted",
        description: "Order has been submitted for admin approval.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit order for approval.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdminApproval = async (approved: boolean) => {
    try {
      setLoading(true);
      const updatedOrder = await salesRepApi.adminApproveOrder(order.id, {
        approved,
        assigned_factory_id: approved
          ? parseInt(approvalData.assigned_factory_id)
          : undefined,
        rejection_reason: !approved ? approvalData.rejection_reason : undefined,
      });
      onOrderUpdated(updatedOrder);
      toast({
        title: approved ? "Order Approved" : "Order Rejected",
        description: approved
          ? "Order has been approved and assigned to factory."
          : "Order has been rejected.",
      });
      setShowApprovalDialog(false);
      setShowRejectionDialog(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process order approval.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFactoryAcceptance = async (accepted: boolean) => {
    try {
      setLoading(true);
      const updatedOrder = await salesRepApi.factoryManagerAcceptOrder(
        order.id,
        {
          accepted,
          rejection_reason: !accepted
            ? approvalData.rejection_reason
            : undefined,
        }
      );
      onOrderUpdated(updatedOrder);
      toast({
        title: accepted ? "Order Accepted" : "Order Rejected",
        description: accepted
          ? "Order has been accepted by factory manager."
          : "Order has been rejected by factory manager.",
      });
      setShowFactoryAcceptanceDialog(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process factory acceptance.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const canSubmitForApproval =
    order.status === "draft" && userRole === "sales_rep";
  const canApprove =
    order.status === "submitted_for_approval" && userRole === "admin";
  const canFactoryAccept =
    order.status === "approved" && userRole === "factory_manager";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Order Approval Workflow</span>
          {getStatusBadge(order.status)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Workflow Status */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">
              Current Status: {order.status.replace("_", " ").toUpperCase()}
            </span>
          </div>

          {order.submitted_for_approval_at && (
            <div className="text-sm text-gray-600">
              Submitted for approval:{" "}
              {new Date(order.submitted_for_approval_at).toLocaleString()}
            </div>
          )}

          {order.admin_approved_at && (
            <div className="text-sm text-gray-600">
              Admin decision:{" "}
              {new Date(order.admin_approved_at).toLocaleString()}
              {order.assigned_factory_name &&
                ` - Assigned to ${order.assigned_factory_name}`}
            </div>
          )}

          {order.factory_manager_accepted_at && (
            <div className="text-sm text-gray-600">
              Factory manager decision:{" "}
              {new Date(order.factory_manager_accepted_at).toLocaleString()}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          {canSubmitForApproval && (
            <Button
              onClick={handleSubmitForApproval}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Submit for Approval
            </Button>
          )}

          {canApprove && (
            <>
              <Button
                onClick={() => setShowApprovalDialog(true)}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                Approve Order
              </Button>
              <Button
                onClick={() => setShowRejectionDialog(true)}
                disabled={loading}
                variant="destructive"
              >
                Reject Order
              </Button>
            </>
          )}

          {canFactoryAccept && (
            <>
              <Button
                onClick={() => setShowFactoryAcceptanceDialog(true)}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                Accept Order
              </Button>
              <Button
                onClick={() => {
                  setApprovalData({ ...approvalData, rejection_reason: "" });
                  setShowFactoryAcceptanceDialog(true);
                }}
                disabled={loading}
                variant="destructive"
              >
                Reject Order
              </Button>
            </>
          )}
        </div>

        {/* Admin Approval Dialog */}
        <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Order</DialogTitle>
              <DialogDescription>
                Select a factory for this order and confirm approval.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="factory">Assign Factory</Label>
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
                disabled={!approvalData.assigned_factory_id || loading}
                className="bg-green-600 hover:bg-green-700"
              >
                Approve Order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Admin Rejection Dialog */}
        <Dialog
          open={showRejectionDialog}
          onOpenChange={setShowRejectionDialog}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Order</DialogTitle>
              <DialogDescription>
                Provide a reason for rejecting this order.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="rejection_reason">Rejection Reason</Label>
                <Textarea
                  id="rejection_reason"
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
                Reject Order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Factory Manager Acceptance Dialog */}
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
                <Label htmlFor="factory_rejection_reason">
                  Rejection Reason (if rejecting)
                </Label>
                <Textarea
                  id="factory_rejection_reason"
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
                className="bg-green-600 hover:bg-green-700"
              >
                Accept Order
              </Button>
              <Button
                onClick={() => handleFactoryAcceptance(false)}
                disabled={loading}
                variant="destructive"
              >
                Reject Order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
