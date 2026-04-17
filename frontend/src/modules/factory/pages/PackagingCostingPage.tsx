"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileSpreadsheet } from "lucide-react";
import { useFormatting } from "@/hooks/useFormatting";
import {
  CM_PER_INCH,
  SHEET_MASS_DIVISOR,
  computePackagingCosting,
  getDefaultPackagingCostingInput,
  type DimensionCmInput,
  type PackagingCostingInput,
} from "@/modules/factory/utils/packagingCostingCalculator";

/** Mimics Excel “red” calculated cells. */
const calcCell =
  "bg-red-100/90 text-right tabular-nums dark:bg-red-950/40 dark:text-red-50 " +
  "border border-red-200/70 px-2 py-1.5 text-sm dark:border-red-900/60";

const hdrCell =
  "border border-border bg-muted/90 px-2 py-1.5 text-left text-xs font-medium " +
  "whitespace-nowrap text-foreground";

const inCell = "border border-border p-1";
const sectionBar =
  "border border-b-0 border-border bg-slate-200 px-2 py-1.5 text-sm font-semibold " +
  "dark:bg-slate-800";

function intLocale(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return Math.round(n).toLocaleString("en-US");
}

function decStr(n: number, digits: number): string {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}

function TableNumInput({
  id,
  value,
  onChange,
  className = "",
}: {
  id: string;
  value: number;
  onChange: (n: number) => void;
  className?: string;
}) {
  return (
    <Input
      id={id}
      type="number"
      inputMode="decimal"
      step="any"
      className={`h-8 border-0 bg-transparent text-right tabular-nums shadow-none focus-visible:ring-1 ${className}`}
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => {
        const v = parseFloat(e.target.value);
        onChange(Number.isFinite(v) ? v : 0);
      }}
    />
  );
}

export default function PackagingCostingPage() {
  const { formatCurrency, formatNumber, isLoading } = useFormatting();
  const [input, setInput] = useState<PackagingCostingInput>(() =>
    getDefaultPackagingCostingInput()
  );

  const result = useMemo(() => computePackagingCosting(input), [input]);

  const setMeta = (
    patch: Partial<
      Pick<PackagingCostingInput, "customerName" | "itemName" | "description">
    >
  ) => {
    setInput((prev) => ({ ...prev, ...patch }));
  };

  const fmt = (n: number) => (isLoading ? "…" : formatNumber(n));
  const fmtCur = (n: number) => (isLoading ? "…" : formatCurrency(n));

  return (
    <div className="container mx-auto max-w-[1200px] space-y-4 p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <FileSpreadsheet className="h-7 w-7 shrink-0" />
          Packaging costing
        </h1>
        <p className="text-muted-foreground text-sm">
          Layout aligned with the cost-analysis workbook.
        </p>
      </div>

      <div className="overflow-x-auto rounded-md border border-border shadow-sm">
        <table className="w-full min-w-[880px] border-collapse text-sm">
          <tbody>
            {/* —— Header / summary —— */}
            <tr>
              <td className={hdrCell}>Customer name</td>
              <td className={`${inCell} min-w-[12rem]`} colSpan={3}>
                <Input
                  className="h-8 border-0 shadow-none focus-visible:ring-1"
                  value={input.customerName}
                  onChange={(e) => setMeta({ customerName: e.target.value })}
                  placeholder=""
                />
              </td>
              <td className={hdrCell}>Rill size</td>
              <td className={calcCell} colSpan={2}>
                {isLoading ? "…" : decStr(result.rill.linearInch, 2)}
              </td>
            </tr>
            <tr>
              <td className={hdrCell}>Item name</td>
              <td className={`${inCell} min-w-[12rem]`} colSpan={3}>
                <Input
                  className="h-8 border-0 shadow-none focus-visible:ring-1"
                  value={input.itemName}
                  onChange={(e) => setMeta({ itemName: e.target.value })}
                  placeholder=""
                />
              </td>
              <td className={hdrCell}>Cutting size</td>
              <td className={calcCell} colSpan={2}>
                {isLoading ? "…" : fmt(result.cutting.linearCm)}
              </td>
            </tr>
            <tr>
              <td className={`${hdrCell} align-top`}>Description</td>
              <td className={`${inCell} min-w-[12rem]`} colSpan={6}>
                <Textarea
                  className="min-h-[52px] resize-y border-0 shadow-none focus-visible:ring-1"
                  value={input.description}
                  onChange={(e) => setMeta({ description: e.target.value })}
                  placeholder=""
                  rows={2}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* —— Liner paper —— */}
      <div className="overflow-x-auto rounded-md border border-border shadow-sm">
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <thead>
            <tr>
              <th className={sectionBar} colSpan={10}>
                Liner paper
              </th>
            </tr>
            <tr>
              <th className={hdrCell}>Rill size (inch)</th>
              <th className={hdrCell}>Cutting size (cm)</th>
              <th className={hdrCell}>Liner GSM</th>
              <th className={hdrCell}>cm to inch</th>
              <th className={hdrCell}>Total</th>
              <th className={hdrCell}>Formula</th>
              <th className={hdrCell}>Total (result)</th>
              <th className={hdrCell}>Broad size</th>
              <th className={hdrCell}>Rate</th>
              <th className={hdrCell}>Liner rate</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={inCell}>
                <TableNumInput
                  id="liner-w"
                  value={input.liner.width}
                  onChange={(width) =>
                    setInput((p) => ({ ...p, liner: { ...p.liner, width } }))
                  }
                />
              </td>
              <td className={inCell}>
                <TableNumInput
                  id="liner-h"
                  value={input.liner.height}
                  onChange={(height) =>
                    setInput((p) => ({ ...p, liner: { ...p.liner, height } }))
                  }
                />
              </td>
              <td className={inCell}>
                <TableNumInput
                  id="liner-gsm"
                  value={input.liner.gsm}
                  onChange={(gsm) =>
                    setInput((p) => ({ ...p, liner: { ...p.liner, gsm } }))
                  }
                />
              </td>
              <td className={calcCell}>{decStr(CM_PER_INCH, 2)}</td>
              <td className={calcCell}>{intLocale(result.liner.productF)}</td>
              <td className={calcCell}>{intLocale(SHEET_MASS_DIVISOR)}</td>
              <td className={calcCell}>{decStr(result.liner.afterDivisorH, 3)}</td>
              <td className={calcCell}>{decStr(result.liner.broadI, 4)}</td>
              <td className={inCell}>
                <TableNumInput
                  id="liner-rate"
                  value={input.liner.rate}
                  onChange={(rate) =>
                    setInput((p) => ({ ...p, liner: { ...p.liner, rate } }))
                  }
                />
              </td>
              <td className={calcCell}>{fmtCur(result.liner.lineCost)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* —— Media paper —— */}
      <div className="overflow-x-auto rounded-md border border-border shadow-sm">
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <thead>
            <tr>
              <th className={sectionBar} colSpan={10}>
                Media paper
              </th>
            </tr>
            <tr>
              <th className={hdrCell}>Rill size (inch)</th>
              <th className={hdrCell}>Cutting size (cm)</th>
              <th className={hdrCell}>Media GSM</th>
              <th className={hdrCell}>cm to inch</th>
              <th className={hdrCell}>Total</th>
              <th className={hdrCell}>Formula</th>
              <th className={hdrCell}>Total (result)</th>
              <th className={hdrCell}>Broad size</th>
              <th className={hdrCell}>Rate</th>
              <th className={hdrCell}>Media rate</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={inCell}>
                <TableNumInput
                  id="media-w"
                  value={input.media.width}
                  onChange={(width) =>
                    setInput((p) => ({ ...p, media: { ...p.media, width } }))
                  }
                />
              </td>
              <td className={inCell}>
                <TableNumInput
                  id="media-h"
                  value={input.media.height}
                  onChange={(height) =>
                    setInput((p) => ({ ...p, media: { ...p.media, height } }))
                  }
                />
              </td>
              <td className={inCell}>
                <TableNumInput
                  id="media-gsm"
                  value={input.media.gsm}
                  onChange={(gsm) =>
                    setInput((p) => ({ ...p, media: { ...p.media, gsm } }))
                  }
                />
              </td>
              <td className={calcCell}>{decStr(CM_PER_INCH, 2)}</td>
              <td className={calcCell}>{intLocale(result.media.productF)}</td>
              <td className={calcCell}>{intLocale(SHEET_MASS_DIVISOR)}</td>
              <td className={calcCell}>{decStr(result.media.afterDivisorH, 3)}</td>
              <td className={calcCell}>{decStr(result.media.broadI, 3)}</td>
              <td className={inCell}>
                <TableNumInput
                  id="media-rate"
                  value={input.media.rate}
                  onChange={(rate) =>
                    setInput((p) => ({ ...p, media: { ...p.media, rate } }))
                  }
                />
              </td>
              <td className={calcCell}>{fmtCur(result.media.lineCost)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* —— Silicate + total costing —— */}
      <div className="overflow-x-auto rounded-md border border-border shadow-sm">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr>
              <th className={sectionBar} colSpan={4}>
                Silicate costing
              </th>
            </tr>
            <tr>
              <th className={hdrCell}>Media broad</th>
              <th className={hdrCell}>Silicate %</th>
              <th className={hdrCell}>Silicate rate</th>
              <th className={hdrCell}>Silicate (calc)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={calcCell}>{decStr(result.media.broadI, 3)}</td>
              <td className={calcCell}>{decStr(result.silicateTotals.silicatePortion, 3)}</td>
              <td className={inCell}>
                <TableNumInput
                  id="sil-rate"
                  value={input.silicateRate}
                  onChange={(silicateRate) =>
                    setInput((p) => ({ ...p, silicateRate }))
                  }
                />
              </td>
              <td className={calcCell}>{fmtCur(result.silicateTotals.silicateCost)}</td>
            </tr>
            <tr>
              <th className={sectionBar} colSpan={6}>
                Total costing
              </th>
            </tr>
            <tr>
              <th className={hdrCell}>Printing rate</th>
              <th className={hdrCell}>Transport</th>
              <th className={hdrCell}>Labor</th>
              <th className={hdrCell}>Total</th>
              <th className={hdrCell}>Percent</th>
              <th className={hdrCell}>Total per rate</th>
            </tr>
            <tr>
              <td className={inCell}>
                <TableNumInput
                  id="print-rate"
                  value={input.printingRate}
                  onChange={(printingRate) =>
                    setInput((p) => ({ ...p, printingRate }))
                  }
                />
              </td>
              <td className={inCell}>
                <TableNumInput
                  id="transport-adder"
                  value={input.mediaRateAdder}
                  onChange={(mediaRateAdder) =>
                    setInput((p) => ({ ...p, mediaRateAdder }))
                  }
                />
              </td>
              <td className={inCell}>
                <TableNumInput
                  id="labor"
                  value={input.transportAdder}
                  onChange={(transportAdder) =>
                    setInput((p) => ({ ...p, transportAdder }))
                  }
                />
              </td>
              <td className={calcCell}>{fmtCur(result.silicateTotals.subtotalBeforeMarkup)}</td>
              <td className={calcCell}>{fmtCur(result.silicateTotals.markup)}</td>
              <td className={`${calcCell} font-semibold`}>
                {fmtCur(result.silicateTotals.grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border bg-muted/30 px-2 py-1.5 text-xs text-muted-foreground">
          <label className="flex items-center gap-2">
            <span className="font-medium text-foreground">Share of media broad</span>
            <Input
              type="number"
              step="any"
              className="h-7 w-24"
              value={input.silicateShareOfBroad}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setInput((p) => ({
                  ...p,
                  silicateShareOfBroad: Number.isFinite(v) ? v : 0,
                }));
              }}
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="font-medium text-foreground">Markup on subtotal</span>
            <Input
              id="markup-pct"
              type="number"
              step="any"
              className="h-7 w-24"
              value={input.markupPercent ?? 0.2}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setInput((p) => ({
                  ...p,
                  markupPercent: Number.isFinite(v) ? v : 0,
                }));
              }}
            />
          </label>
        </div>
      </div>

      {/* —— Rill size calculation —— */}
      <div className="overflow-x-auto rounded-md border border-border shadow-sm">
        <table className="w-full min-w-[880px] border-collapse text-sm">
          <thead>
            <tr>
              <th className={sectionBar} colSpan={9}>
                Rill size
              </th>
            </tr>
            <tr>
              <th className={hdrCell}>W</th>
              <th className={hdrCell}>H</th>
              <th className={hdrCell}>Total (W+H)</th>
              <th className={hdrCell}>Broad size</th>
              <th className={hdrCell}>Total</th>
              <th className={hdrCell}>Plus</th>
              <th className={hdrCell}>Total</th>
              <th className={hdrCell}>cm to inch</th>
              <th className={hdrCell}>Rill size</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <RillCutRow
                dim={input.rill}
                derived={result.rill}
                onChange={(rill) => setInput((p) => ({ ...p, rill }))}
                idPrefix="rill"
              />
            </tr>
          </tbody>
        </table>
      </div>

      {/* —— Cutting size calculation —— */}
      <div className="overflow-x-auto rounded-md border border-border shadow-sm">
        <table className="w-full min-w-[800px] border-collapse text-sm">
          <thead>
            <tr>
              <th className={sectionBar} colSpan={8}>
                Cutting size
              </th>
            </tr>
            <tr>
              <th className={hdrCell}>L</th>
              <th className={hdrCell}>W</th>
              <th className={hdrCell}>Total (L+W)</th>
              <th className={hdrCell}>Broad size</th>
              <th className={hdrCell}>Total</th>
              <th className={hdrCell}>Plus</th>
              <th className={hdrCell} colSpan={2}>
                Cutting size (cm)
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <CuttingRow
                dim={input.cutting}
                derived={result.cutting}
                onChange={(cutting) => setInput((p) => ({ ...p, cutting }))}
              />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RillCutRow({
  dim,
  derived,
  onChange,
  idPrefix,
}: {
  dim: DimensionCmInput;
  derived: { sumWidthHeight: number; afterLengthMultiplier: number; linearCm: number; linearInch: number };
  onChange: (next: DimensionCmInput) => void;
  idPrefix: string;
}) {
  return (
    <>
      <td className={inCell}>
        <TableNumInput
          id={`${idPrefix}-w`}
          value={dim.widthCm}
          onChange={(widthCm) => onChange({ ...dim, widthCm })}
        />
      </td>
      <td className={inCell}>
        <TableNumInput
          id={`${idPrefix}-h`}
          value={dim.heightCm}
          onChange={(heightCm) => onChange({ ...dim, heightCm })}
        />
      </td>
      <td className={calcCell}>{decStr(derived.sumWidthHeight, 2)}</td>
      <td className={inCell}>
        <TableNumInput
          id={`${idPrefix}-l`}
          value={dim.lengthCm}
          onChange={(lengthCm) => onChange({ ...dim, lengthCm })}
        />
      </td>
      <td className={calcCell}>{decStr(derived.afterLengthMultiplier, 2)}</td>
      <td className={inCell}>
        <TableNumInput
          id={`${idPrefix}-plus`}
          value={dim.plusCm}
          onChange={(plusCm) => onChange({ ...dim, plusCm })}
        />
      </td>
      <td className={calcCell}>{decStr(derived.linearCm, 2)}</td>
      <td className={calcCell}>{decStr(CM_PER_INCH, 2)}</td>
      <td className={calcCell}>{decStr(derived.linearInch, 2)}</td>
    </>
  );
}

function CuttingRow({
  dim,
  derived,
  onChange,
}: {
  dim: DimensionCmInput;
  derived: { sumWidthHeight: number; afterLengthMultiplier: number; linearCm: number };
  onChange: (next: DimensionCmInput) => void;
}) {
  return (
    <>
      <td className={inCell}>
        <TableNumInput
          id="cut-l"
          value={dim.widthCm}
          onChange={(widthCm) => onChange({ ...dim, widthCm })}
        />
      </td>
      <td className={inCell}>
        <TableNumInput
          id="cut-w"
          value={dim.heightCm}
          onChange={(heightCm) => onChange({ ...dim, heightCm })}
        />
      </td>
      <td className={calcCell}>{decStr(derived.sumWidthHeight, 2)}</td>
      <td className={inCell}>
        <TableNumInput
          id="cut-broad"
          value={dim.lengthCm}
          onChange={(lengthCm) => onChange({ ...dim, lengthCm })}
        />
      </td>
      <td className={calcCell}>{decStr(derived.afterLengthMultiplier, 2)}</td>
      <td className={inCell}>
        <TableNumInput
          id="cut-plus"
          value={dim.plusCm}
          onChange={(plusCm) => onChange({ ...dim, plusCm })}
        />
      </td>
      <td className={`${calcCell} font-semibold`} colSpan={2}>
        {decStr(derived.linearCm, 2)}
      </td>
    </>
  );
}
