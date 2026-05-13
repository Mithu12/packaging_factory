import type { PoolClient } from "pg";

export interface LocationUsesSnapshot {
  productId: number;
  distributionCenterId: number;
  usesPerUnit: number;
  currentStock: number;
  activeRemaining: number | null;
  reservedUses: number;
  availableUses: number;
}

export interface ConsumeUsesResult {
  unitsDepleted: number;
  newActiveRemaining: number | null;
  newCurrentStock: number;
}

export class InsufficientUsesError extends Error {
  constructor(public productId: number, public distributionCenterId: number, public requested: number, public available: number) {
    super(
      `Insufficient uses for product ${productId} at distribution center ${distributionCenterId}: requested ${requested}, available ${available}`
    );
    this.name = "InsufficientUsesError";
  }
}

export class NotReusableError extends Error {
  constructor(public productId: number) {
    super(`Product ${productId} is not reusable (uses_per_unit <= 1)`);
    this.name = "NotReusableError";
  }
}

function toNumber(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

export class ReusableStockService {
  static isReusable(product: { uses_per_unit?: number | string | null }): boolean {
    return toNumber(product?.uses_per_unit ?? 1) > 1;
  }

  /** Computes available uses given a location row + product's uses_per_unit. */
  static computeAvailableUses(opts: {
    usesPerUnit: number;
    currentStock: number;
    activeRemaining: number | null;
    reservedUses: number;
  }): number {
    const { usesPerUnit, currentStock, activeRemaining, reservedUses } = opts;
    if (currentStock <= 0) return 0;
    const remainingOnActive = activeRemaining === null ? usesPerUnit : activeRemaining;
    const total = (currentStock - 1) * usesPerUnit + remainingOnActive;
    return Math.max(total - reservedUses, 0);
  }

  /** Read product + location state under the given client (transactional). */
  static async getSnapshot(
    productId: number,
    distributionCenterId: number,
    client: PoolClient
  ): Promise<LocationUsesSnapshot> {
    const productRes = await client.query(
      `SELECT uses_per_unit FROM products WHERE id = $1`,
      [productId]
    );
    if (productRes.rows.length === 0) {
      throw new Error(`Product ${productId} not found`);
    }
    const usesPerUnit = toNumber(productRes.rows[0].uses_per_unit);
    if (usesPerUnit <= 1) {
      throw new NotReusableError(productId);
    }

    const locRes = await client.query(
      `SELECT current_stock, active_unit_remaining_uses, reserved_uses
       FROM product_locations
       WHERE product_id = $1 AND distribution_center_id = $2`,
      [productId, distributionCenterId]
    );
    if (locRes.rows.length === 0) {
      return {
        productId,
        distributionCenterId,
        usesPerUnit,
        currentStock: 0,
        activeRemaining: null,
        reservedUses: 0,
        availableUses: 0,
      };
    }
    const row = locRes.rows[0];
    const currentStock = toNumber(row.current_stock);
    const activeRemaining =
      row.active_unit_remaining_uses === null || row.active_unit_remaining_uses === undefined
        ? null
        : toNumber(row.active_unit_remaining_uses);
    const reservedUses = toNumber(row.reserved_uses);
    return {
      productId,
      distributionCenterId,
      usesPerUnit,
      currentStock,
      activeRemaining,
      reservedUses,
      availableUses: ReusableStockService.computeAvailableUses({
        usesPerUnit,
        currentStock,
        activeRemaining,
        reservedUses,
      }),
    };
  }

  /**
   * Consume `usesRequested` uses at the given location. Decrements `current_stock`
   * by 1 each time the active unit reaches zero remaining uses. Throws
   * `InsufficientUsesError` if not enough total uses are physically available
   * (ignores reserved_uses — callers that need a reservation-aware check should
   * call `getSnapshot` first).
   */
  static async consumeUses(
    productId: number,
    distributionCenterId: number,
    usesRequested: number,
    client: PoolClient
  ): Promise<ConsumeUsesResult> {
    if (!(usesRequested > 0)) {
      throw new Error("usesRequested must be > 0");
    }
    const snapshot = await ReusableStockService.getSnapshot(productId, distributionCenterId, client);
    const usesPerUnit = snapshot.usesPerUnit;
    let stock = snapshot.currentStock;
    let active: number | null = snapshot.activeRemaining;

    // Total physically available uses (ignoring reservations).
    const physicallyAvailable =
      stock <= 0 ? 0 : (stock - 1) * usesPerUnit + (active === null ? usesPerUnit : active);
    if (usesRequested > physicallyAvailable) {
      throw new InsufficientUsesError(productId, distributionCenterId, usesRequested, physicallyAvailable);
    }

    let remaining = usesRequested;
    let unitsDepleted = 0;
    while (remaining > 0) {
      if (active === null) {
        // Begin using a fresh unit; physical stock not decremented yet.
        active = usesPerUnit;
      }
      const take = Math.min(remaining, active);
      active -= take;
      remaining -= take;
      if (active === 0) {
        stock -= 1;
        unitsDepleted += 1;
        active = null;
      }
    }

    await client.query(
      `UPDATE product_locations
         SET current_stock = $1,
             active_unit_remaining_uses = $2,
             updated_at = CURRENT_TIMESTAMP
       WHERE product_id = $3 AND distribution_center_id = $4`,
      [stock, active, productId, distributionCenterId]
    );

    return { unitsDepleted, newActiveRemaining: active, newCurrentStock: stock };
  }

  /** Reserve uses against open allocations. Throws if reservation would exceed available uses. */
  static async reserveUses(
    productId: number,
    distributionCenterId: number,
    uses: number,
    client: PoolClient
  ): Promise<void> {
    if (!(uses > 0)) throw new Error("uses must be > 0");
    const snapshot = await ReusableStockService.getSnapshot(productId, distributionCenterId, client);
    if (uses > snapshot.availableUses) {
      throw new InsufficientUsesError(productId, distributionCenterId, uses, snapshot.availableUses);
    }
    await client.query(
      `UPDATE product_locations
         SET reserved_uses = reserved_uses + $1,
             updated_at = CURRENT_TIMESTAMP
       WHERE product_id = $2 AND distribution_center_id = $3`,
      [uses, productId, distributionCenterId]
    );
  }

  /** Release previously-reserved uses. Clamps at zero. */
  static async releaseReservedUses(
    productId: number,
    distributionCenterId: number,
    uses: number,
    client: PoolClient
  ): Promise<void> {
    if (!(uses > 0)) return;
    await client.query(
      `UPDATE product_locations
         SET reserved_uses = GREATEST(reserved_uses - $1, 0),
             updated_at = CURRENT_TIMESTAMP
       WHERE product_id = $2 AND distribution_center_id = $3`,
      [uses, productId, distributionCenterId]
    );
  }

  /** Insert a per-use audit row. */
  static async logConsumption(
    params: {
      productId: number;
      distributionCenterId: number;
      usesConsumed: number;
      unitsDepleted: number;
      source: "manual_adjustment" | "work_order_consumption";
      sourceReferenceId?: number | null;
      reason?: string | null;
      createdBy?: number | null;
    },
    client: PoolClient
  ): Promise<number> {
    const res = await client.query(
      `INSERT INTO product_use_consumptions
         (product_id, distribution_center_id, uses_consumed, units_depleted,
          source, source_reference_id, reason, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        params.productId,
        params.distributionCenterId,
        params.usesConsumed,
        params.unitsDepleted,
        params.source,
        params.sourceReferenceId ?? null,
        params.reason ?? null,
        params.createdBy ?? null,
      ]
    );
    return res.rows[0].id;
  }
}
