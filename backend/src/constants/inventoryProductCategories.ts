/** Canonical DB names for the fixed inventory product types (categories.name). */
export const INVENTORY_PRIMARY_CATEGORY_NAMES = [
  "Raw Materials",
  "Ready Raw Materials",
  "Ready Goods",
] as const;

export type InventoryPrimaryCategoryName =
  (typeof INVENTORY_PRIMARY_CATEGORY_NAMES)[number];

export function isInventoryPrimaryCategoryName(
  name: string
): name is InventoryPrimaryCategoryName {
  return (INVENTORY_PRIMARY_CATEGORY_NAMES as readonly string[]).includes(
    name
  );
}

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
