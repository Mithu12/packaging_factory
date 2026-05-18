/** Canonical names in DB (categories.name). */
export const INVENTORY_PRIMARY_CATEGORY_NAMES = [
  "Raw Materials",
  "Ready Raw Materials",
  "Ready Goods",
] as const;

export type InventoryPrimaryCategoryName =
  (typeof INVENTORY_PRIMARY_CATEGORY_NAMES)[number];

export function isRawMaterialsCategory(name: string): boolean {
  return name === "Raw Materials";
}

export function isReadyRawMaterialsCategory(name: string): boolean {
  return name === "Ready Raw Materials";
}

export function isReadyGoodsCategory(name: string): boolean {
  return name === "Ready Goods";
}

/** True for primary categories that are NOT directly orderable by customers (RM, RRM). */
export function isInternalPrimaryCategory(name: string): boolean {
  return isRawMaterialsCategory(name) || isReadyRawMaterialsCategory(name);
}

/** True for categories whose cost price is auto-derived from a BOM (RRM, RG) — pricing inputs are hidden on the product form. */
export function isBomDrivenCostCategory(name: string): boolean {
  return isReadyRawMaterialsCategory(name) || isReadyGoodsCategory(name);
}

export function isInventoryPrimaryCategory(name: string): boolean {
  return (INVENTORY_PRIMARY_CATEGORY_NAMES as readonly string[]).includes(
    name
  );
}

export function displayPrimaryCategoryLabel(canonicalName: string): string {
  if (canonicalName === "Raw Materials") {
    return "Raw Material";
  }
  if (canonicalName === "Ready Raw Materials") {
    return "Ready Raw Material";
  }
  return canonicalName;
}

/** True when the product is reusable: a single physical unit yields multiple consumptions. */
export function isReusableProduct(product: {
  uses_per_unit?: number | string | null;
}): boolean {
  const n = Number(product?.uses_per_unit ?? 1);
  return Number.isFinite(n) && n > 1;
}

/** Allowed corrugation layer counts for cartons. */
export const CARTON_PLY_OPTIONS = [3, 5, 7, 9, 11] as const;

export type CartonPly = (typeof CARTON_PLY_OPTIONS)[number];

/** Formats a ply count for display (e.g. 5 → "05 Ply"). */
export function formatPlyLabel(n: number): string {
  return `${String(n).padStart(2, "0")} Ply`;
}
