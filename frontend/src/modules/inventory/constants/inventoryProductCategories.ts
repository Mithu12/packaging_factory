/** Canonical names in DB (categories.name). */
export const INVENTORY_PRIMARY_CATEGORY_NAMES = [
  "Raw Materials",
  "Ready Goods",
] as const;

export type InventoryPrimaryCategoryName =
  (typeof INVENTORY_PRIMARY_CATEGORY_NAMES)[number];

export function isRawMaterialsCategory(name: string): boolean {
  return name === "Raw Materials";
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
  return canonicalName;
}
