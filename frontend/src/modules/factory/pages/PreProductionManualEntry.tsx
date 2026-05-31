"use client";

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  SearchableSelect,
  SearchableSelectOption,
} from "@/components/ui/searchable-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Save, Factory } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useFormatting } from "@/hooks/useFormatting";
import { DistributionApi } from "@/modules/inventory/services/distribution-api";
import {
  PreProductionApiService,
  PreProductionType,
  PRODUCTION_TYPE_SUBCATEGORY,
  PRODUCTION_TYPE_LABEL,
  CreatePreProductionEntryRequest,
} from "@/modules/factory/services/pre-production-api";

const PRODUCTION_TYPE_OPTIONS: { value: PreProductionType; label: string }[] = [
  { value: "printing", label: PRODUCTION_TYPE_LABEL.printing },
  { value: "corrugation_media", label: PRODUCTION_TYPE_LABEL.corrugation_media },
  { value: "corrugation_liner", label: PRODUCTION_TYPE_LABEL.corrugation_liner },
];

export default function PreProductionManualEntry() {
  const queryClient = useQueryClient();
  const { formatDate } = useFormatting();

  const [productionType, setProductionType] = useState<PreProductionType>("printing");
  const [distributionCenterId, setDistributionCenterId] = useState<string>("");
  const [rawMaterialId, setRawMaterialId] = useState<string>("");
  const [rawConsumed, setRawConsumed] = useState<string>("");
  const [finishedProductId, setFinishedProductId] = useState<string>("");
  const [finishedProduced, setFinishedProduced] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const { data: dcData } = useQuery({
    queryKey: ["distribution-centers", { status: "active" }],
    queryFn: () => DistributionApi.getDistributionCenters({ status: "active", limit: 200 }),
  });
  const centers = dcData?.centers ?? [];

  // Default to the primary DC once centers load.
  useEffect(() => {
    if (!distributionCenterId && centers.length > 0) {
      const primary = centers.find((c) => c.is_primary) ?? centers[0];
      setDistributionCenterId(String(primary.id));
    }
  }, [centers, distributionCenterId]);

  const { data: rawProducts = [] } = useQuery({
    queryKey: ["pre-production-raw-materials"],
    queryFn: () => PreProductionApiService.getRawMaterialProducts(),
  });

  const { data: finishedProducts = [] } = useQuery({
    queryKey: ["pre-production-finished-products"],
    queryFn: () => PreProductionApiService.getFinishedProducts(),
  });

  const { data: entryList, isLoading: entriesLoading } = useQuery({
    queryKey: ["pre-production-entries"],
    queryFn: () => PreProductionApiService.listEntries({ limit: 50 }),
  });

  // Finished products filtered to the subcategory matching the production type.
  const filteredFinished = useMemo(() => {
    const wanted = PRODUCTION_TYPE_SUBCATEGORY[productionType];
    return finishedProducts.filter((p) => p.subcategory_name === wanted);
  }, [finishedProducts, productionType]);

  // Reset the finished selection when production type changes and the current
  // pick no longer matches the filtered list.
  useEffect(() => {
    if (
      finishedProductId &&
      !filteredFinished.some((p) => String(p.id) === finishedProductId)
    ) {
      setFinishedProductId("");
    }
  }, [filteredFinished, finishedProductId]);

  const createMutation = useMutation({
    mutationFn: (data: CreatePreProductionEntryRequest) =>
      PreProductionApiService.createEntry(data),
    onSuccess: (entry) => {
      toast.success(`Recorded ${entry.entry_number}`);
      queryClient.invalidateQueries({ queryKey: ["pre-production-entries"] });
      // Keep DC + production type; clear the per-entry fields.
      setRawMaterialId("");
      setRawConsumed("");
      setFinishedProductId("");
      setFinishedProduced("");
      setNotes("");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to record pre-production entry");
    },
  });

  const handleSubmit = () => {
    if (!distributionCenterId) return toast.error("Select a distribution center");
    if (!rawMaterialId) return toast.error("Select a raw material");
    if (!finishedProductId) return toast.error("Select a finished product");
    const consumed = parseFloat(rawConsumed);
    const produced = parseFloat(finishedProduced);
    if (!(consumed > 0)) return toast.error("Consumed quantity must be greater than 0");
    if (!(produced > 0)) return toast.error("Produced quantity must be greater than 0");

    createMutation.mutate({
      production_type: productionType,
      raw_material_id: parseInt(rawMaterialId, 10),
      raw_consumed_quantity: consumed,
      finished_product_id: parseInt(finishedProductId, 10),
      finished_produced_quantity: produced,
      distribution_center_id: parseInt(distributionCenterId, 10),
      notes: notes || undefined,
    });
  };

  const rawOptions: SearchableSelectOption[] = rawProducts.map((p) => ({
    value: String(p.id),
    label: p.name,
    keywords: `${p.sku} ${p.brand_name ?? ""}`,
    hint: p.sku,
    badge: p.brand_name ? (
      <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
        {p.brand_name}
      </span>
    ) : undefined,
  }));

  const finishedOptions: SearchableSelectOption[] = filteredFinished.map((p) => ({
    value: String(p.id),
    label: p.name,
    keywords: `${p.sku} ${p.subcategory_name ?? ""}`,
    hint: p.sku,
  }));

  const isSaving = createMutation.isPending;

  return (
    <div className="space-y-6" data-testid="manual-pre-production-container">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Factory className="h-7 w-7" /> Manual Pre-Production Entry
        </h1>
        <p className="text-muted-foreground">
          Record in-house production: consume raw paper and produce finished
          corrugation/printing stock at a distribution center.
        </p>
      </div>

      <Card data-testid="manual-pre-production-form">
        <CardHeader>
          <CardTitle>New Entry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Distribution Center *</Label>
              <SearchableSelect
                value={distributionCenterId}
                onValueChange={setDistributionCenterId}
                placeholder="Select distribution center"
                searchPlaceholder="Search centers..."
                emptyMessage="No centers found."
                options={centers.map<SearchableSelectOption>((c) => ({
                  value: String(c.id),
                  label: c.is_primary ? `${c.name} (Primary)` : c.name,
                  keywords: c.code,
                  hint: c.code,
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Production Type *</Label>
              <SearchableSelect
                value={productionType}
                onValueChange={(v) => setProductionType(v as PreProductionType)}
                placeholder="Select production type"
                searchPlaceholder="Search types..."
                emptyMessage="No types."
                options={PRODUCTION_TYPE_OPTIONS.map((o) => ({
                  value: o.value,
                  label: o.label,
                }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Raw Material (Paper) *</Label>
              <SearchableSelect
                value={rawMaterialId}
                onValueChange={setRawMaterialId}
                placeholder="Select raw material"
                searchPlaceholder="Search by name / SKU / brand..."
                emptyMessage="No raw materials found."
                options={rawOptions}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rawConsumed">Consumed Quantity *</Label>
              <Input
                id="rawConsumed"
                type="number"
                min="0.0001"
                step="0.0001"
                value={rawConsumed}
                onChange={(e) => setRawConsumed(e.target.value)}
                placeholder="e.g. 500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Finished Product *</Label>
              <SearchableSelect
                value={finishedProductId}
                onValueChange={setFinishedProductId}
                placeholder={`Select ${PRODUCTION_TYPE_SUBCATEGORY[productionType]} product`}
                searchPlaceholder="Search by name / SKU..."
                emptyMessage={`No ${PRODUCTION_TYPE_SUBCATEGORY[productionType]} products found.`}
                options={finishedOptions}
              />
              <p className="text-xs text-muted-foreground">
                Showing Ready Raw Materials tagged “{PRODUCTION_TYPE_SUBCATEGORY[productionType]}”.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="finishedProduced">Produced Quantity *</Label>
              <Input
                id="finishedProduced"
                type="number"
                min="0.0001"
                step="0.0001"
                value={finishedProduced}
                onChange={(e) => setFinishedProduced(e.target.value)}
                placeholder="e.g. 480"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={isSaving} data-testid="submit-entry-button">
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isSaving ? "Saving..." : "Record Entry"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="manual-pre-production-history">
        <CardHeader>
          <CardTitle>Recent Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {entriesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !entryList || entryList.entries.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No entries yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entry #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Raw Material</TableHead>
                  <TableHead>Consumed</TableHead>
                  <TableHead>Finished Product</TableHead>
                  <TableHead>Produced</TableHead>
                  <TableHead>Center</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entryList.entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.entry_number}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{PRODUCTION_TYPE_LABEL[e.production_type]}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{e.raw_material_name}</div>
                      <div className="text-xs text-muted-foreground">{e.raw_material_sku}</div>
                    </TableCell>
                    <TableCell>{e.raw_consumed_quantity}</TableCell>
                    <TableCell>
                      <div className="font-medium">{e.finished_product_name}</div>
                      <div className="text-xs text-muted-foreground">{e.finished_product_sku}</div>
                    </TableCell>
                    <TableCell>{e.finished_produced_quantity}</TableCell>
                    <TableCell>{e.distribution_center_name ?? "—"}</TableCell>
                    <TableCell>{formatDate(e.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
