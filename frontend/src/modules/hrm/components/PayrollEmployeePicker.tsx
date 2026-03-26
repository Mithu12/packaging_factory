"use client";

import React, { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, Users } from "lucide-react";
import type { PayrollPickerRow } from "../types";

export type { PayrollPickerRow };

export interface PayrollEmployeePickerProps {
  rows: PayrollPickerRow[];
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
  currency: string;
  /** Shown when rows.length === 0 */
  emptyMessage?: string;
  /** e.g. "Payroll calculation" / "Payment" */
  contextLabel?: string;
  /** Show net salary column (when period payroll exists) */
  showNetColumn?: boolean;
  /** Show payroll status badge */
  showStatusColumn?: boolean;
  /** When set, shows an actions column (e.g. view payslip) */
  onViewEmployee?: (employeeId: number) => void;
  viewButtonLabel?: string;
}

const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);

function statusBadgeVariant(
  status?: string
): "default" | "secondary" | "outline" | "destructive" {
  if (!status) return "outline";
  const s = status.toLowerCase();
  if (s === "paid") return "default";
  if (s === "calculated" || s === "approved") return "secondary";
  if (s === "cancelled") return "destructive";
  return "outline";
}

const PayrollEmployeePicker: React.FC<PayrollEmployeePickerProps> = ({
  rows,
  selectedIds,
  onSelectionChange,
  currency,
  emptyMessage = "No employees to show.",
  contextLabel = "employees",
  showNetColumn = true,
  showStatusColumn = true,
  onViewEmployee,
  viewButtonLabel = "View",
}) => {
  const [query, setQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("__all__");

  const departments = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.departmentLabel && r.departmentLabel !== "—") {
        set.add(r.departmentLabel);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (departmentFilter !== "__all__" && r.departmentLabel !== departmentFilter) {
        return false;
      }
      if (!q) return true;
      return (
        r.displayName.toLowerCase().includes(q) ||
        r.employeeCode.toLowerCase().includes(q) ||
        r.departmentLabel.toLowerCase().includes(q) ||
        r.designationLabel.toLowerCase().includes(q)
      );
    });
  }, [rows, query, departmentFilter]);

  const filteredIds = useMemo(
    () => filteredRows.map((r) => r.employeeId),
    [filteredRows]
  );

  const allFilteredSelected =
    filteredRows.length > 0 && filteredRows.every((r) => selectedIds.includes(r.employeeId));
  const someFilteredSelected = filteredRows.some((r) => selectedIds.includes(r.employeeId));

  const headerChecked: boolean | "indeterminate" = allFilteredSelected
    ? true
    : someFilteredSelected
      ? "indeterminate"
      : false;

  const toggleFilteredAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange([...new Set([...selectedIds, ...filteredIds])]);
    } else {
      onSelectionChange(selectedIds.filter((id) => !filteredIds.includes(id)));
    }
  };

  const selectEntireList = () => {
    onSelectionChange(rows.map((r) => r.employeeId));
  };

  const clearSelection = () => {
    onSelectionChange([]);
  };

  const selectedInList = selectedIds.filter((id) => rows.some((r) => r.employeeId === id));
  const selectedTotalNet = useMemo(() => {
    let sum = 0;
    for (const id of selectedInList) {
      const row = rows.find((r) => r.employeeId === id);
      if (row?.netSalary != null) sum += row.netSalary;
    }
    return sum;
  }, [selectedInList, rows]);

  const colCount =
    5 +
    (showNetColumn ? 1 : 0) +
    (showStatusColumn ? 1 : 0) +
    (onViewEmployee ? 1 : 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="space-y-2 flex-1 min-w-[200px] max-w-md">
          <Label htmlFor="payroll-picker-search">Search</Label>
          <Input
            id="payroll-picker-search"
            placeholder="Name, employee ID, department…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {departments.length > 0 && (
          <div className="space-y-2 w-full sm:w-56">
            <Label>Department</Label>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={selectEntireList}>
            Select all ({rows.length})
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearSelection}
            disabled={selectedIds.length === 0}
          >
            Clear
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4 shrink-0" />
        <span>
          <span className="font-medium text-foreground">{selectedInList.length}</span> of{" "}
          {rows.length} {contextLabel} selected
          {filteredRows.length !== rows.length && (
            <span className="ml-1">({filteredRows.length} match filter)</span>
          )}
        </span>
        {showNetColumn && selectedInList.length > 0 && selectedTotalNet > 0 && (
          <Badge variant="secondary" className="font-normal">
            Selected net: {formatCurrency(selectedTotalNet, currency)}
          </Badge>
        )}
      </div>

      <div className="rounded-md border max-h-[min(55vh,520px)] overflow-auto">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">{emptyMessage}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    aria-label="Select visible rows"
                    checked={headerChecked}
                    onCheckedChange={(v) => toggleFilteredAll(v === true)}
                  />
                </TableHead>
                <TableHead>Employee</TableHead>
                <TableHead className="hidden sm:table-cell">ID</TableHead>
                <TableHead className="hidden md:table-cell">Department</TableHead>
                <TableHead className="hidden lg:table-cell">Role</TableHead>
                {showNetColumn && <TableHead className="text-right">Net pay</TableHead>}
                {showStatusColumn && (
                  <TableHead className="hidden sm:table-cell">Payroll</TableHead>
                )}
                {onViewEmployee && (
                  <TableHead className="w-[1%] text-right whitespace-nowrap">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colCount} className="text-center text-muted-foreground py-8">
                    No employees match your search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row) => {
                  const checked = selectedIds.includes(row.employeeId);
                  return (
                    <TableRow
                      key={row.employeeId}
                      className={checked ? "bg-primary/5" : undefined}
                      data-state={checked ? "selected" : undefined}
                    >
                      <TableCell>
                        <Checkbox
                          aria-label={`Select ${row.displayName}`}
                          checked={checked}
                          onCheckedChange={(v) => {
                            const on = v === true;
                            if (on) {
                              onSelectionChange([...new Set([...selectedIds, row.employeeId])]);
                            } else {
                              onSelectionChange(
                                selectedIds.filter((id) => id !== row.employeeId)
                              );
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium leading-tight">{row.displayName}</div>
                        <div className="text-xs text-muted-foreground sm:hidden">
                          {row.employeeCode}
                          {row.departmentLabel !== "—" && ` · ${row.departmentLabel}`}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                        {row.employeeCode}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        {row.departmentLabel}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {row.designationLabel}
                      </TableCell>
                      {showNetColumn && (
                        <TableCell className="text-right text-sm tabular-nums">
                          {row.netSalary != null && row.netSalary > 0
                            ? formatCurrency(row.netSalary, currency)
                            : "—"}
                        </TableCell>
                      )}
                      {showStatusColumn && (
                        <TableCell className="hidden sm:table-cell">
                          {row.payrollStatus ? (
                            <Badge
                              variant={statusBadgeVariant(row.payrollStatus)}
                              className="capitalize font-normal text-xs"
                            >
                              {row.payrollStatus}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                      )}
                      {onViewEmployee && (
                        <TableCell className="text-right p-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1"
                            onClick={() => onViewEmployee(row.employeeId)}
                          >
                            <Eye className="h-4 w-4" />
                            <span className="hidden sm:inline">{viewButtonLabel}</span>
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default PayrollEmployeePicker;
