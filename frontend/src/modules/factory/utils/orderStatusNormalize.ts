/** Normalize API/DB order status for reliable comparisons. */
export function normalizeFactoryOrderStatus(
  status: string | undefined | null
): string {
  return String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}
