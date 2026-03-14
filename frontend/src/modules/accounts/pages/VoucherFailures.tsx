"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  AlertTriangle,
  Search,
  RefreshCw,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "@/components/ui/sonner";
import {
  VoucherFailuresApiService,
  type VoucherFailure,
  type VoucherFailureQueryParams,
} from "@/services/accounts-api";
import { useRouter } from "next/navigation";

const SOURCE_MODULES = ["factory", "inventory", "sales"];
const OPERATION_TYPES = [
  "addFactoryOrderReceivable",
  "addMaterialConsumptionVoucher",
  "addWastageVoucher",
  "addProductionRunVouchers",
  "addWorkOrderCompletionVoucher",
  "addFactoryPaymentVoucher",
  "addFactoryOrderShipmentVoucher",
  "addFactoryReturnVoucher",
];

export default function VoucherFailures() {
  const router = useRouter();
  const [failures, setFailures] = useState<VoucherFailure[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [sourceModuleFilter, setSourceModuleFilter] = useState<string>("All");
  const [operationTypeFilter, setOperationTypeFilter] = useState<string>("All");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });

  const loadFailures = async () => {
    try {
      setIsLoading(true);
      const params: VoucherFailureQueryParams = {
        page,
        limit,
      };
      if (sourceModuleFilter !== "All") params.sourceModule = sourceModuleFilter;
      if (operationTypeFilter !== "All") params.operationType = operationTypeFilter;
      if (dateRange?.from) params.dateFrom = format(dateRange.from, "yyyy-MM-dd");
      if (dateRange?.to) params.dateTo = format(dateRange.to, "yyyy-MM-dd");

      const result = await VoucherFailuresApiService.getVoucherFailures(params);
      setFailures(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (error) {
      console.error("Error loading voucher failures:", error);
      toast.error("Failed to load voucher failures");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFailures();
  }, [page, sourceModuleFilter, operationTypeFilter, dateRange]);

  const getFailureCategoryBadge = (category: string) => {
    const variants: Record<string, "destructive" | "secondary" | "outline" | "default"> = {
      missing_accounts: "destructive",
      validation_error: "destructive",
      system_error: "secondary",
      other: "outline",
    };
    return <Badge variant={variants[category] || "outline"}>{category}</Badge>;
  };

  const getSourceEntityLink = (failure: VoucherFailure) => {
    if (failure.sourceEntityType === "customer_order") {
      return `/factory/customer-orders?search=${failure.sourceEntityId}`;
    }
    if (failure.sourceEntityType === "work_order") {
      return `/factory/work-orders?search=${failure.sourceEntityId}`;
    }
    if (failure.sourceEntityType === "material_consumption") {
      return `/factory/material-consumptions`;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Voucher Failures</h1>
          <p className="text-sm text-muted-foreground">
            Failed voucher creation attempts from factory, inventory, and other modules. Use this to diagnose missing accounts or configuration issues.
          </p>
        </div>
        <Button variant="outline" onClick={loadFailures} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-4">
            <Select value={sourceModuleFilter} onValueChange={setSourceModuleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Source module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All modules</SelectItem>
                {SOURCE_MODULES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={operationTypeFilter} onValueChange={setOperationTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Operation type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All operations</SelectItem>
                {OPERATION_TYPES.map((op) => (
                  <SelectItem key={op} value={op}>
                    {op.replace("add", "").replace(/([A-Z])/g, " $1").trim()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DateRangePicker
              date={dateRange}
              onDateChange={setDateRange}
              placeholder="Date range"
              className="md:col-span-1"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {total} failure{total !== 1 ? "s" : ""} match your filters.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : failures.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No voucher failures found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Adjust filters or check that factory operations are running correctly.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Operation</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {failures.map((f) => {
                    const link = getSourceEntityLink(f);
                    return (
                      <TableRow key={f.id}>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {format(new Date(f.createdAt), "yyyy-MM-dd HH:mm")}
                        </TableCell>
                        <TableCell>{f.sourceModule}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {f.operationType}
                        </TableCell>
                        <TableCell>
                          {f.sourceEntityType} #{f.sourceEntityId}
                        </TableCell>
                        <TableCell>{getFailureCategoryBadge(f.failureCategory)}</TableCell>
                        <TableCell className="max-w-md truncate" title={f.errorMessage}>
                          {f.errorMessage}
                        </TableCell>
                        <TableCell>
                          {link && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => router.push(link)}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
