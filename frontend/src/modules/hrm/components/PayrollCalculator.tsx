"use client";

import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calculator } from "lucide-react";
import { PayrollCalculatorProps, PayrollCalculationForm, PayrollPeriod } from "../types";
import PayrollEmployeePicker from "./PayrollEmployeePicker";

const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);

function formatPeriodDateRange(period: PayrollPeriod | null | undefined): string {
  const start = period?.start_date;
  const end = period?.end_date;
  if (!start && !end) return "Dates not set";
  const fmt = (raw: string) => {
    const normalized = raw.length === 10 ? `${raw}T12:00:00` : raw;
    const d = new Date(normalized);
    return Number.isNaN(d.getTime())
      ? raw
      : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  };
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  return fmt(start || end || "");
}

const PayrollCalculator: React.FC<PayrollCalculatorProps> = ({
  employees,
  selectedEmployeeIds,
  onCalculate,
  onSelectionChange,
  onGeneratePayslips,
  loading = false,
  canCalculate = true,
  currency = "USD",
  pickerRows,
  selectedPeriod = null,
}) => {
  const selectedNetTotal = useMemo(() => {
    let sum = 0;
    for (const id of selectedEmployeeIds) {
      const row = pickerRows.find((r) => r.employeeId === id);
      if (row?.netSalary != null) sum += row.netSalary;
    }
    return sum;
  }, [selectedEmployeeIds, pickerRows]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: PayrollCalculationForm = {
        employee_ids: selectedEmployeeIds.length > 0 ? selectedEmployeeIds : undefined,
        recalculate_all: selectedEmployeeIds.length === 0,
      };
      await onCalculate(payload);
    } catch {
      // Parent shows toast
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Period</p>
          {selectedPeriod ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-semibold">{selectedPeriod.name}</span>
                {selectedPeriod.status ? (
                  <Badge variant="outline" className="text-xs font-normal">
                    {selectedPeriod.status}
                  </Badge>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground tabular-nums">
                {formatPeriodDateRange(selectedPeriod)}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a payroll period at the top of the page.
            </p>
          )}
        </div>
        <form onSubmit={handleSubmit} className="shrink-0">
          <Button type="submit" disabled={loading || !canCalculate}>
            <Calculator className="h-4 w-4 mr-2" />
            {loading ? "Calculating…" : "Calculate payroll"}
          </Button>
        </form>
      </div>

      <div className="border-t pt-5 space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Employees to include</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Leave none selected to include everyone. Otherwise only checked employees are calculated.
          </p>
        </div>
        <PayrollEmployeePicker
          rows={pickerRows}
          selectedIds={selectedEmployeeIds}
          onSelectionChange={onSelectionChange}
          currency={currency}
          contextLabel="in this run"
          emptyMessage={
            employees.length === 0 ? "No employees loaded." : "No rows to display."
          }
          showNetColumn
          showStatusColumn
        />
      </div>

      {selectedEmployeeIds.length > 0 && (
        <div className="space-y-2 border-t pt-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Selection</p>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Selected</dt>
              <dd className="font-semibold tabular-nums">{selectedEmployeeIds.length}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Net (period)</dt>
              <dd className="font-semibold tabular-nums text-green-600 dark:text-green-500">
                {selectedNetTotal > 0 ? formatCurrency(selectedNetTotal, currency) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Period</dt>
              <dd className="font-semibold">
                {selectedPeriod?.name ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Avg. net</dt>
              <dd className="font-semibold tabular-nums text-orange-600 dark:text-orange-500">
                {selectedNetTotal > 0 && selectedEmployeeIds.length > 0
                  ? formatCurrency(selectedNetTotal / selectedEmployeeIds.length, currency)
                  : "—"}
              </dd>
            </div>
          </dl>
          {selectedNetTotal === 0 && (
            <p className="text-sm text-muted-foreground">
              Net amounts appear after you run payroll for this period.
            </p>
          )}
        </div>
      )}

      <div className="flex justify-end flex-wrap gap-2 border-t pt-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onSelectionChange([])}
          disabled={loading || selectedEmployeeIds.length === 0}
        >
          Clear selection
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => onGeneratePayslips?.(selectedEmployeeIds)}
          disabled={loading || !onGeneratePayslips}
        >
          Generate payslips
        </Button>
      </div>
    </div>
  );
};

export default PayrollCalculator;
