import { Layers, Printer, Package2, type LucideIcon } from "lucide-react";
import type { BOMCategory } from "@/services/bom-api";

export type BOMCategoryMeta = {
  label: string;
  /** Heading variant of the label (defaults to `label` when omitted). */
  titleLabel?: string;
  slug: string; // URL-safe segment
  icon: LucideIcon;
  badgeClass: string;
};

export const CATEGORY_META: Record<BOMCategory, BOMCategoryMeta> = {
  corrugation: {
    label: "Corrugation",
    titleLabel: "Corrugation - Pre-Production",
    slug: "corrugation",
    icon: Layers,
    badgeClass: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  },
  printing: {
    label: "Printing",
    slug: "printing",
    icon: Printer,
    badgeClass: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  },
  ready_goods: {
    label: "Ready Goods",
    slug: "ready-goods",
    icon: Package2,
    badgeClass: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  },
};

export const SLUG_TO_CATEGORY: Record<string, BOMCategory> = {
  corrugation: "corrugation",
  printing: "printing",
  "ready-goods": "ready_goods",
};
