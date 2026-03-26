"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, FileText } from "lucide-react";
import { EmployeePayrollCardProps } from "../types";
import PayslipDetailView from "./PayslipDetailView";

const EmployeePayrollCard: React.FC<EmployeePayrollCardProps> = ({
  employee,
  payrollRecord,
  paymentRecord,
  isSelected = false,
  onSelect,
  onViewPayslip,
  loading = false,
  currency = "USD",
}) => {
  if (!payrollRecord) {
    return null;
  }

  return (
    <div className={`transition-all rounded-lg ${isSelected ? "ring-2 ring-primary ring-offset-2" : ""}`}>
      <PayslipDetailView
        employee={employee}
        payrollRecord={payrollRecord}
        paymentRecord={paymentRecord}
        currency={currency}
        leading={
          onSelect ? (
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              className="mt-1"
              disabled={loading}
            />
          ) : undefined
        }
        footerActions={
          <>
            <Button variant="outline" size="sm" onClick={onViewPayslip} disabled={!onViewPayslip || loading}>
              <Eye className="h-4 w-4 mr-2" />
              View Payslip
            </Button>
            <Button variant="outline" size="sm" onClick={onViewPayslip} disabled={!onViewPayslip || loading}>
              <FileText className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </>
        }
      />
    </div>
  );
};

export default EmployeePayrollCard;
