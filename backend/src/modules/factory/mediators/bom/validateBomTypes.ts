import { PoolClient } from "pg";
import {
  isRawMaterialsCategory,
  isReadyRawMaterialsCategory,
  isReadyGoodsCategory,
} from "@/constants/inventoryProductCategories";
import { createError } from "@/middleware/errorHandler";

/**
 * Enforces BOM parent/child rules based on each product's primary category:
 *   - Parent must be Ready Goods (FG) or Ready Raw Materials (RRM); never Raw Materials (RM).
 *   - RRM parent → all components must be RM.
 *   - FG  parent → components must be RM or RRM (no FG-in-FG).
 *
 * Run inside the same transaction client as the rest of the mediator so a
 * concurrent product category change cannot slip past.
 */
export async function validateBomProductTypes(
  client: PoolClient,
  parentProductId: number | string,
  componentProductIds: Array<number | string>
): Promise<void> {
  const parentId = Number(parentProductId);
  const componentIds = componentProductIds.map((id) => Number(id));
  const allIds = Array.from(new Set([parentId, ...componentIds]));

  if (allIds.length === 0) return;

  const result = await client.query<{ id: number; primary_category: string | null }>(
    `SELECT p.id, c.name AS primary_category
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.id = ANY($1::int[])`,
    [allIds]
  );

  const typeById = new Map<number, string | null>();
  for (const row of result.rows) {
    typeById.set(Number(row.id), row.primary_category);
  }

  const parentType = typeById.get(parentId);
  if (parentType === undefined) {
    throw createError(`Parent product ${parentId} not found`, 404);
  }
  if (parentType === null || isRawMaterialsCategory(parentType)) {
    throw createError(
      "Raw Materials cannot have a BOM. Choose a Ready Goods or Ready Raw Materials product as the parent.",
      400
    );
  }

  const parentIsRRM = isReadyRawMaterialsCategory(parentType);
  const parentIsFG = isReadyGoodsCategory(parentType);

  for (const componentId of componentIds) {
    const componentType = typeById.get(componentId);
    if (componentType === undefined) {
      throw createError(`Component product ${componentId} not found`, 404);
    }

    if (parentIsRRM) {
      if (!componentType || !isRawMaterialsCategory(componentType)) {
        throw createError(
          `Ready Raw Materials can only be made from Raw Materials. Component ${componentId} is "${componentType ?? "uncategorized"}".`,
          400
        );
      }
      continue;
    }

    if (parentIsFG) {
      if (
        !componentType ||
        (!isRawMaterialsCategory(componentType) &&
          !isReadyRawMaterialsCategory(componentType))
      ) {
        throw createError(
          `Ready Goods can only contain Raw Materials or Ready Raw Materials. Component ${componentId} is "${componentType ?? "uncategorized"}".`,
          400
        );
      }
      continue;
    }

    throw createError(
      `Unsupported parent product type "${parentType}". Expected Ready Goods or Ready Raw Materials.`,
      400
    );
  }
}
