"use client";

import React, { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import type { Employee, EmployeePayrollRecord, PaymentRecord } from "../types";
import PayslipDetailView from "./PayslipDetailView";

export interface PayslipPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  payrollRecord: EmployeePayrollRecord | null;
  paymentRecord?: PaymentRecord | null;
  periodDisplayName: string;
  currency: string;
}

const PayslipPreviewDialog: React.FC<PayslipPreviewDialogProps> = ({
  open,
  onOpenChange,
  employee,
  payrollRecord,
  paymentRecord = null,
  periodDisplayName,
  currency,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const canShow = employee && payrollRecord;

  useEffect(() => {
    if (open) {
      document.body.classList.add("payslip-print-active");
    } else {
      document.body.classList.remove("payslip-print-active");
    }
    return () => document.body.classList.remove("payslip-print-active");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto print:max-w-none print:w-full print:max-h-none print:overflow-visible print:border-0 print:shadow-none sm:max-w-2xl payslip-preview-dialog-content">
        <DialogHeader className="print:hidden">
          <DialogTitle>Payslip</DialogTitle>
          <DialogDescription>
            Period: {periodDisplayName}. Use Print, then choose &quot;Save as PDF&quot; in the print dialog if
            needed.
          </DialogDescription>
        </DialogHeader>

        {!canShow ? (
          <p className="text-sm text-muted-foreground">No payslip data to display.</p>
        ) : (
          <div data-payslip-print-root className="payslip-print-root">
            <PayslipDetailView
              employee={employee}
              payrollRecord={payrollRecord}
              paymentRecord={paymentRecord}
              currency={currency}
              periodLabel={`Payroll period: ${periodDisplayName}`}
              className="print:shadow-none print:border print:border-neutral-300"
            />
          </div>
        )}

        <DialogFooter className="print:hidden gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" onClick={handlePrint} disabled={!canShow}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PayslipPreviewDialog;
