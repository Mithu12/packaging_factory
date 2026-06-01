import { Pool, PoolClient } from 'pg';
import { createError } from '@/utils/responseHelper';

/**
 * Per-DC stock helpers. `product_locations` is the single source of truth for
 * physical stock; a DB trigger (V163) derives `products.current_stock` as the
 * sum across a product's locations. Therefore application code must NEVER write
 * `products.current_stock` directly — it moves stock through these helpers.
 */

type Queryable = Pick<Pool | PoolClient, 'query'>;

/** Resolve the primary distribution center id (fallback when no DC is given). */
export async function resolvePrimaryDcId(db: Queryable): Promise<number> {
  const res = await db.query('SELECT id FROM distribution_centers WHERE is_primary = true LIMIT 1');
  if (res.rows.length === 0) {
    throw createError('No primary distribution center configured', 500);
  }
  return Number(res.rows[0].id);
}

/**
 * Credit (increase) a DC's stock for a product. Upserts the product_locations
 * row; the trigger then bumps products.current_stock by the same amount.
 */
export async function creditLocationStock(
  db: Queryable,
  productId: number,
  distributionCenterId: number,
  quantity: number
): Promise<void> {
  if (quantity <= 0) return;
  await db.query(
    `INSERT INTO product_locations (product_id, distribution_center_id, current_stock, last_movement_date)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
     ON CONFLICT (product_id, distribution_center_id)
     DO UPDATE SET current_stock = product_locations.current_stock + EXCLUDED.current_stock,
                   last_movement_date = CURRENT_TIMESTAMP,
                   updated_at = CURRENT_TIMESTAMP`,
    [productId, distributionCenterId, quantity]
  );
}

/**
 * Debit (decrease) a DC's stock for a product, guarding against going negative
 * with a friendly error. The trigger then lowers products.current_stock to match.
 */
export async function debitLocationStock(
  db: Queryable,
  productId: number,
  distributionCenterId: number,
  quantity: number,
  productLabel?: string
): Promise<void> {
  if (quantity <= 0) return;
  const res = await db.query(
    `SELECT current_stock FROM product_locations
      WHERE product_id = $1 AND distribution_center_id = $2
      FOR UPDATE`,
    [productId, distributionCenterId]
  );
  const available = res.rows.length > 0 ? parseFloat(res.rows[0].current_stock) : 0;
  if (available < quantity - 1e-9) {
    const who = productLabel ? `"${productLabel}"` : `product ${productId}`;
    throw createError(
      `Insufficient stock for ${who} in the selected distribution center: have ${available}, need ${quantity}`,
      400
    );
  }
  await db.query(
    `UPDATE product_locations
        SET current_stock = current_stock - $1,
            last_movement_date = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
      WHERE product_id = $2 AND distribution_center_id = $3`,
    [quantity, productId, distributionCenterId]
  );
}
