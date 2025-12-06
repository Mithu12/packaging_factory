import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Package } from "lucide-react";
import { WorkOrder } from "@/services/work-orders-api";

export interface MaterialConsumption {
  material_id: string;
  material_name: string;
  material_sku?: string;
  required_quantity: number;
  consumed_quantity: number;
  wastage_quantity?: number;
  wastage_reason?: string;
  batch_number?: string;
  unit_of_measure?: string;
}

interface MaterialConsumptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrder: WorkOrder | null;
  materialRequirements: Array<{
    id: string;
    material_id: string;
    material_name: string;
    material_sku?: string;
    required_quantity: number;
    allocated_quantity?: number;
    consumed_quantity?: number;
    unit_of_measure?: string;
  }>;
  onComplete: (consumptions: MaterialConsumption[], notes?: string) => void;
  onSkip: () => void;
  isLoading?: boolean;
}

export function MaterialConsumptionDialog({
  open,
  onOpenChange,
  workOrder,
  materialRequirements,
  onComplete,
  onSkip,
  isLoading = false,
}: MaterialConsumptionDialogProps) {
  const [consumptions, setConsumptions] = useState<MaterialConsumption[]>([]);
  const [notes, setNotes] = useState("");

  // Check if any material requirements are already fulfilled
  const hasFulfilledRequirements = materialRequirements.some(req => req.status === 'fulfilled');
  const hasAnyRequirements = materialRequirements.length > 0;

  // If requirements are already fulfilled, auto-skip this dialog
  useEffect(() => {
    if (hasFulfilledRequirements && open) {
      onSkip(); // Auto-skip if requirements are already fulfilled
    }
  }, [hasFulfilledRequirements, open, onSkip]);

  // Initialize consumptions from material requirements
  useEffect(() => {
    if (materialRequirements && materialRequirements.length > 0 && !hasFulfilledRequirements) {
      const initialConsumptions: MaterialConsumption[] = materialRequirements
        .filter(req => req.status !== 'fulfilled') // Only include non-fulfilled requirements
        .map((req) => ({
          material_id: req.material_id,
          material_name: req.material_name,
          material_sku: req.material_sku,
          required_quantity: req.required_quantity,
          consumed_quantity: req.required_quantity, // Default to required quantity
          wastage_quantity: 0,
          wastage_reason: "",
          batch_number: "",
          unit_of_measure: req.unit_of_measure,
        }));
      setConsumptions(initialConsumptions);
    }
  }, [materialRequirements, hasFulfilledRequirements]);

  const handleConsumptionChange = (
    materialId: string,
    field: keyof MaterialConsumption,
    value: string | number
  ) => {
    setConsumptions((prev) =>
      prev.map((c) => {
        if (c.material_id === materialId) {
          return { ...c, [field]: value };
        }
        return c;
      })
    );
  };

  const handleComplete = () => {
    onComplete(consumptions, notes);
  };

  const handleSkip = () => {
    onSkip();
  };

  const getTotalConsumption = (consumption: MaterialConsumption) => {
    return consumption.consumed_quantity + (consumption.wastage_quantity || 0);
  };

  const getConsumptionStatus = (consumption: MaterialConsumption) => {
    const total = getTotalConsumption(consumption);
    if (total === consumption.required_quantity) {
      return { label: "Exact", color: "bg-green-100 text-green-800" };
    } else if (total > consumption.required_quantity) {
      return { label: "Over", color: "bg-orange-100 text-orange-800" };
    } else {
      return { label: "Under", color: "bg-yellow-100 text-yellow-800" };
    }
  };

  if (!workOrder) return null;

  // If requirements are already fulfilled, don't show the dialog
  if (hasFulfilledRequirements) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Material Consumption</DialogTitle>
          <DialogDescription>
            Work Order: <strong>{workOrder.work_order_number}</strong> - {workOrder.product_name}
            <br />
            <span className="text-xs text-muted-foreground mt-1 block">
              Completing without a production run. Record actual material usage or use BOM defaults.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {materialRequirements.length === 0 ? (
            <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-md">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <p className="text-sm text-blue-900">
                No material requirements found for this work order. You can complete it without recording consumption.
              </p>
            </div>
          ) : hasFulfilledRequirements ? (
            <div className="flex items-center gap-2 p-4 bg-green-50 rounded-md">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-sm text-green-900">
                Material consumptions have already been recorded for this work order. Completing directly...
              </p>
            </div>
          ) : consumptions.length === 0 ? (
            <div className="flex items-center gap-2 p-4 bg-orange-50 rounded-md">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <p className="text-sm text-orange-900">
                All material requirements are already fulfilled. No additional consumption recording needed.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-md">
                <Package className="h-4 w-4 text-blue-600" />
                <p className="text-xs text-blue-900">
                  Review and adjust material consumption below. Values are pre-filled based on BOM requirements.
                </p>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Required</TableHead>
                    <TableHead className="text-right">Consumed</TableHead>
                    <TableHead className="text-right">Wastage</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consumptions.map((consumption) => {
                    const status = getConsumptionStatus(consumption);
                    return (
                      <TableRow key={consumption.material_id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{consumption.material_name}</div>
                            {consumption.material_sku && (
                              <div className="text-xs text-muted-foreground">
                                SKU: {consumption.material_sku}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-medium">
                            {consumption.required_quantity} {consumption.unit_of_measure || "units"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={consumption.consumed_quantity}
                            onChange={(e) =>
                              handleConsumptionChange(
                                consumption.material_id,
                                "consumed_quantity",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-24 text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={consumption.wastage_quantity || 0}
                            onChange={(e) =>
                              handleConsumptionChange(
                                consumption.material_id,
                                "wastage_quantity",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-24 text-right"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={status.color}>{status.label}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="completion-notes">Completion Notes (Optional)</Label>
            <Textarea
              id="completion-notes"
              placeholder="Add any notes about material consumption, quality, or completion..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            {materialRequirements.length > 0 && !hasFulfilledRequirements && consumptions.length > 0 && (
              <Button variant="secondary" onClick={handleSkip} disabled={isLoading}>
                Skip & Use BOM Defaults
              </Button>
            )}
          </div>
          <Button onClick={hasFulfilledRequirements ? () => onOpenChange(false) : handleComplete} disabled={isLoading}>
            {isLoading ? (
              <>Processing...</>
            ) : hasFulfilledRequirements ? (
              <>Close</>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete Work Order
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

