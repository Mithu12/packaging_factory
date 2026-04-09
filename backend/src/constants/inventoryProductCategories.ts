/** Canonical DB names for the two fixed inventory product types (categories.name). */
export const INVENTORY_PRIMARY_CATEGORY_NAMES = [
  "Raw Materials",
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
