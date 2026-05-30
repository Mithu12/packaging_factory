"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Cog, ExternalLink, Search } from "lucide-react";
import {
  MachinePartsApiService,
  machinePartsQueryKeys,
  type MachinePartListQueryParams,
  type MachinePartStatus,
  type SpareStockAlertStatus,
} from "@/services/machine-parts-api";

const PART_STATUS_LABEL: Record<MachinePartStatus, string> = {
  active: "Active",
  replaced: "Replaced",
  retired: "Retired",
};

const PART_STATUS_BADGE: Record<MachinePartStatus, string> = {
  active: "bg-green-100 text-green-700 border-green-200",
  replaced: "bg-amber-100 text-amber-700 border-amber-200",
  retired: "bg-gray-100 text-gray-700 border-gray-200",
};

const SPARE_ALERT_LABEL: Record<SpareStockAlertStatus, string> = {
  low: "Low",
  critical: "Critical",
  out_of_stock: "Out of stock",
};

const SPARE_ALERT_BADGE: Record<SpareStockAlertStatus, string> = {
  low: "bg-amber-100 text-amber-700 border-amber-200",
  critical: "bg-orange-100 text-orange-700 border-orange-200",
  out_of_stock: "bg-red-100 text-red-700 border-red-200",
};

function isOverdue(dateStr?: string): boolean {
  if (!dateStr) return false;
  const due = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

const LIMIT = 20;

export default function SparePartsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<MachinePartStatus | "all">("all");
  const [linkedOnly, setLinkedOnly] = useState(false);
  const [page, setPage] = useState(1);

  const params: MachinePartListQueryParams = {
    page,
    limit: LIMIT,
    search: search.trim() || undefined,
    status: status === "all" ? undefined : status,
    linked_only: linkedOnly || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: machinePartsQueryKeys.allParts(params),
    queryFn: () => MachinePartsApiService.listAllParts(params),
  });

  const parts = data?.parts ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const resetToFirstPage = () => setPage(1);

  return (
    <div className="space-y-6" data-testid="spare-parts-page">
      <div>
        <h1 className="text-3xl font-bold">Spare Parts</h1>
        <p className="text-muted-foreground">
          All tracked machine parts across the factory, with their linked inventory
          stock.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Cog className="w-5 h-5" />
            Parts ({total})
          </CardTitle>
          <div className="flex items-end gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  resetToFirstPage();
                }}
                placeholder="Search part, machine, product…"
                className="pl-8 w-64"
              />
            </div>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v as MachinePartStatus | "all");
                resetToFirstPage();
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="replaced">Replaced</SelectItem>
                <SelectItem value="retired">Retired</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 pb-2">
              <input
                id="linked_only"
                type="checkbox"
                checked={linkedOnly}
                onChange={(e) => {
                  setLinkedOnly(e.target.checked);
                  resetToFirstPage();
                }}
                className="h-4 w-4"
              />
              <Label htmlFor="linked_only" className="text-sm font-normal">
                Linked to inventory
              </Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading parts...</div>
          ) : parts.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No parts match these filters.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part</TableHead>
                    <TableHead>Machine</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Spare Product</TableHead>
                    <TableHead className="text-right">In Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Next Replacement</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parts.map((part) => (
                    <TableRow key={part.id}>
                      <TableCell className="font-medium">{part.name}</TableCell>
                      <TableCell>
                        <Link
                          href={`/factory/machines/${part.machine_id}`}
                          className="text-primary hover:underline"
                        >
                          {part.machine_name}
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {part.part_code || "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {part.product_id ? (
                          <>
                            <span className="font-medium">{part.product_name}</span>
                            {part.product_sku && (
                              <span className="text-muted-foreground"> · {part.product_sku}</span>
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {part.product_id ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="font-mono">{part.product_current_stock ?? 0}</span>
                            {part.alert_status && (
                              <Badge
                                variant="outline"
                                className={SPARE_ALERT_BADGE[part.alert_status]}
                              >
                                {SPARE_ALERT_LABEL[part.alert_status]}
                              </Badge>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={PART_STATUS_BADGE[part.status]}>
                          {PART_STATUS_LABEL[part.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {part.next_replacement_date ? (
                          <span
                            className={
                              isOverdue(part.next_replacement_date)
                                ? "text-red-600 font-medium"
                                : ""
                            }
                          >
                            {part.next_replacement_date}
                            {isOverdue(part.next_replacement_date) && " (overdue)"}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="icon" variant="ghost" title="Open machine">
                          <Link href={`/factory/machines/${part.machine_id}`}>
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
