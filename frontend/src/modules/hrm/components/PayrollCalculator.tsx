"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator } from "lucide-react";
import { PayrollCalculatorProps, PayrollCalculationForm } from "../types";
import PayrollEmployeePicker from "./PayrollEmployeePicker";

const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);

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
}) => {
  const [calculationData, setCalculationData] = useState<PayrollCalculationForm>({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    employee_ids: [],
    recalculate_all: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedNetTotal = useMemo(() => {
    let sum = 0;
    for (const id of selectedEmployeeIds) {
      const row = pickerRows.find((r) => r.employeeId === id);
      if (row?.netSalary != null) sum += row.netSalary;
    }
    return sum;
  }, [selectedEmployeeIds, pickerRows]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (calculationData.month < 1 || calculationData.month > 12) {
      newErrors.month = "Month must be between 1 and 12";
    }

    if (calculationData.year < 2020 || calculationData.year > 2040) {
      newErrors.year = "Year must be between 2020 and 2040";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onCalculate({
        ...calculationData,
        employee_ids: selectedEmployeeIds.length > 0 ? selectedEmployeeIds : undefined,
        recalculate_all: selectedEmployeeIds.length === 0,
      });
    } catch {
      // Parent shows toast
    }
  };

  const handleInputChange = (field: keyof PayrollCalculationForm, value: number) => {
    setCalculationData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const monthOptions = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => ({
    value: (currentYear - 5 + i).toString(),
    label: (currentYear - 5 + i).toString(),
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Payroll calculation parameters
          </CardTitle>
          <CardDescription>
            Month/year labels are for your reference; the payroll period is the one selected above.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="month">Month *</Label>
                <Select
                  value={calculationData.month.toString()}
                  onValueChange={(value) => handleInputChange("month", parseInt(value, 10))}
                >
                  <SelectTrigger className={errors.month ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.month && <p className="text-sm text-destructive">{errors.month}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="year">Year *</Label>
                <Select
                  value={calculationData.year.toString()}
                  onValueChange={(value) => handleInputChange("year", parseInt(value, 10))}
                >
                  <SelectTrigger className={errors.year ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.year && <p className="text-sm text-destructive">{errors.year}</p>}
              </div>

              <div className="flex items-end">
                <Button type="submit" disabled={loading || !canCalculate} className="w-full">
                  <Calculator className="h-4 w-4 mr-2" />
                  {loading ? "Calculating…" : "Calculate payroll"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employees to include</CardTitle>
          <CardDescription>
            Leave none selected to calculate for all active employees. Otherwise only checked
            employees are included.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PayrollEmployeePicker
            rows={pickerRows}
            selectedIds={selectedEmployeeIds}
            onSelectionChange={onSelectionChange}
            currency={currency}
            contextLabel="in this run"
            emptyMessage={
              employees.length === 0
                ? "No employees loaded."
                : "No rows to display."
            }
            showNetColumn
            showStatusColumn
          />
        </CardContent>
      </Card>

      {selectedEmployeeIds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Selection summary</CardTitle>
            <CardDescription>Based on the current period payroll data (if calculated).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{selectedEmployeeIds.length}</div>
                <div className="text-sm text-muted-foreground">Selected</div>
              </div>

              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {selectedNetTotal > 0
                    ? formatCurrency(selectedNetTotal, currency)
                    : "—"}
                </div>
                <div className="text-sm text-muted-foreground">Net (this period)</div>
              </div>

              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {monthOptions.find((m) => m.value === calculationData.month.toString())?.label}{" "}
                  {calculationData.year}
                </div>
                <div className="text-sm text-muted-foreground">Reference period</div>
              </div>

              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {selectedNetTotal > 0 && selectedEmployeeIds.length > 0
                    ? formatCurrency(selectedNetTotal / selectedEmployeeIds.length, currency)
                    : "—"}
                </div>
                <div className="text-sm text-muted-foreground">Avg. net (selected)</div>
              </div>
            </div>
            {selectedNetTotal === 0 && (
              <p className="text-sm text-muted-foreground">
                Net amounts appear after you run payroll for the selected period.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end flex-wrap gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => onSelectionChange([])}
          disabled={loading || selectedEmployeeIds.length === 0}
        >
          Clear selection
        </Button>
        <Button
          type="button"
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
