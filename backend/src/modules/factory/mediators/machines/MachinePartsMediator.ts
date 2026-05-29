import { PoolClient } from "pg";
import pool from "@/database/connection";
import { MyLogger } from "@/utils/new-logger";
import { interModuleConnector } from "@/utils/InterModuleConnector";
import {
  MachinePart,
  MachinePartReplacement,
  MachinePartStatus,
  CreateMachinePartRequest,
  UpdateMachinePartRequest,
  CreateMachinePartReplacementRequest,
  MachinePartQueryParams,
  SpareStockAlert,
  SpareStockAlertStatus,
  MachinePartConsumptionReport,
  MachinePartConsumptionRow,
} from "@/types/factory";

type MachinePartRow = {
  id: number | string;
  machine_id: number | string;
  name: string;
  part_code: string | null;
  position: string | null;
  quantity: string | number;
  manufacturer: string | null;
  model_number: string | null;
  installed_at: Date | null;
  expected_lifespan_days: number | null;
  last_replaced_at: Date | null;
  next_replacement_date: Date | null;
  status: MachinePartStatus;
  notes: string | null;
  is_active: boolean;
  product_id: number | string | null;
  product_name?: string | null;
  product_sku?: string | null;
  created_at: Date;
  updated_at: Date | null;
};

function serializeMachinePart(row: MachinePartRow): MachinePart {
  return {
    id: row.id.toString(),
    machine_id: row.machine_id.toString(),
    name: row.name,
    part_code: row.part_code ?? undefined,
    position: row.position ?? undefined,
    quantity: Number(row.quantity ?? 0),
    manufacturer: row.manufacturer ?? undefined,
    model_number: row.model_number ?? undefined,
    installed_at: row.installed_at
      ? row.installed_at.toISOString().slice(0, 10)
      : undefined,
    expected_lifespan_days: row.expected_lifespan_days ?? undefined,
    last_replaced_at: row.last_replaced_at
      ? row.last_replaced_at.toISOString().slice(0, 10)
      : undefined,
    next_replacement_date: row.next_replacement_date
      ? row.next_replacement_date.toISOString().slice(0, 10)
      : undefined,
    status: row.status,
    notes: row.notes ?? undefined,
    is_active: row.is_active,
    product_id:
      row.product_id !== null && row.product_id !== undefined
        ? row.product_id.toString()
        : undefined,
    product_name: row.product_name ?? undefined,
    product_sku: row.product_sku ?? undefined,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at?.toISOString(),
  };
}

function serializeReplacement(row: any): MachinePartReplacement {
  return {
    id: row.id.toString(),
    machine_part_id: row.machine_part_id.toString(),
    maintenance_log_id:
      row.maintenance_log_id !== null && row.maintenance_log_id !== undefined
        ? row.maintenance_log_id.toString()
        : undefined,
    replaced_at: row.replaced_at.toISOString(),
    reason: row.reason,
    technician: row.technician ?? undefined,
    cost: Number(row.cost ?? 0),
    next_replacement_date: row.next_replacement_date
      ? row.next_replacement_date.toISOString().slice(0, 10)
      : undefined,
    notes: row.notes ?? undefined,
    product_id:
      row.product_id !== null && row.product_id !== undefined
        ? row.product_id.toString()
        : undefined,
    quantity:
      row.quantity !== null && row.quantity !== undefined
        ? Number(row.quantity)
        : undefined,
    distribution_center_id:
      row.distribution_center_id !== null &&
      row.distribution_center_id !== undefined
        ? row.distribution_center_id.toString()
        : undefined,
    stock_adjustment_id:
      row.stock_adjustment_id !== null && row.stock_adjustment_id !== undefined
        ? row.stock_adjustment_id.toString()
        : undefined,
    product_name: row.product_name ?? undefined,
    product_sku: row.product_sku ?? undefined,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at?.toISOString(),
  };
}

export class MachinePartsMediator {
  static async listParts(
    machine_id: string,
    params: MachinePartQueryParams = {}
  ): Promise<{
    parts: MachinePart[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const action = "List Machine Parts";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { machine_id, params });

      const {
        status,
        is_active,
        search,
        overdue_only,
        sort_by = "name",
        sort_order = "asc",
        page = 1,
        limit = 20,
      } = params;

      const allowedSort = new Set([
        "name",
        "part_code",
        "status",
        "next_replacement_date",
        "created_at",
      ]);
      const sortColumn = allowedSort.has(sort_by) ? sort_by : "name";
      const sortDir = sort_order === "desc" ? "DESC" : "ASC";

      const offset = (page - 1) * limit;

      const whereConditions: string[] = ["mp.machine_id = $1"];
      const queryParams: any[] = [machine_id];

      if (status) {
        whereConditions.push(`mp.status = $${queryParams.length + 1}`);
        queryParams.push(status);
      }

      if (is_active !== undefined) {
        whereConditions.push(`mp.is_active = $${queryParams.length + 1}`);
        queryParams.push(is_active);
      }

      if (overdue_only) {
        whereConditions.push(
          `mp.next_replacement_date IS NOT NULL AND mp.next_replacement_date < CURRENT_DATE`
        );
      }

      if (search) {
        whereConditions.push(
          `(mp.name ILIKE $${queryParams.length + 1} OR mp.part_code ILIKE $${queryParams.length + 1} OR mp.position ILIKE $${queryParams.length + 1} OR mp.manufacturer ILIKE $${queryParams.length + 1})`
        );
        queryParams.push(`%${search}%`);
      }

      const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

      const countQuery = `SELECT COUNT(*) AS total FROM machine_parts mp ${whereClause}`;
      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total, 10);

      const dataQuery = `
        SELECT mp.*, p.name AS product_name, p.sku AS product_sku
        FROM machine_parts mp
        LEFT JOIN products p ON p.id = mp.product_id
        ${whereClause}
        ORDER BY mp.${sortColumn} ${sortDir}, mp.id ASC
        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
      `;
      queryParams.push(limit, offset);

      const result = await client.query(dataQuery, queryParams);
      const parts = result.rows.map(serializeMachinePart);
      const totalPages = Math.ceil(total / limit);

      MyLogger.success(action, { count: parts.length, total, page, totalPages });
      return { parts, total, page, totalPages };
    } catch (error: any) {
      MyLogger.error(action, error, { machine_id, params });
      throw error;
    } finally {
      client.release();
    }
  }

  static async getPart(machine_id: string, part_id: string): Promise<MachinePart> {
    const action = "Get Machine Part";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { machine_id, part_id });
      const result = await client.query(
        `SELECT mp.*, p.name AS product_name, p.sku AS product_sku
         FROM machine_parts mp
         LEFT JOIN products p ON p.id = mp.product_id
         WHERE mp.id = $1 AND mp.machine_id = $2`,
        [part_id, machine_id]
      );
      if (result.rows.length === 0) {
        const err: any = new Error(
          `Machine part ${part_id} not found for machine ${machine_id}`
        );
        err.statusCode = 404;
        throw err;
      }
      const part = serializeMachinePart(result.rows[0]);
      MyLogger.success(action, { id: part.id });
      return part;
    } catch (error: any) {
      MyLogger.error(action, error, { machine_id, part_id });
      throw error;
    } finally {
      client.release();
    }
  }

  static async createPart(
    machine_id: string,
    data: CreateMachinePartRequest,
    created_by: number
  ): Promise<MachinePart> {
    const action = "Create Machine Part";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { machine_id, data, created_by });

      // Derive next_replacement_date from installed_at + lifespan if not provided.
      let nextReplacement = data.next_replacement_date ?? null;
      if (!nextReplacement && data.installed_at && data.expected_lifespan_days) {
        const installed = new Date(data.installed_at);
        installed.setDate(installed.getDate() + data.expected_lifespan_days);
        nextReplacement = installed.toISOString().slice(0, 10);
      }

      const result = await client.query(
        `INSERT INTO machine_parts (
           machine_id, name, part_code, position, quantity, manufacturer,
           model_number, installed_at, expected_lifespan_days, last_replaced_at,
           next_replacement_date, status, notes, created_by, product_id
         ) VALUES (
           $1,$2,$3,$4, COALESCE($5, 1), $6,
           $7,$8,$9,$10,
           $11, COALESCE($12, 'active'), $13, $14, $15
         )
         RETURNING *`,
        [
          machine_id,
          data.name,
          data.part_code ?? null,
          data.position ?? null,
          data.quantity ?? null,
          data.manufacturer ?? null,
          data.model_number ?? null,
          data.installed_at ?? null,
          data.expected_lifespan_days ?? null,
          data.last_replaced_at ?? null,
          nextReplacement,
          data.status ?? null,
          data.notes ?? null,
          created_by,
          data.product_id ?? null,
        ]
      );
      const part = serializeMachinePart(result.rows[0]);
      MyLogger.success(action, { id: part.id, name: part.name });
      return part;
    } catch (error: any) {
      MyLogger.error(action, error, { machine_id, data });
      throw error;
    } finally {
      client.release();
    }
  }

  static async updatePart(
    machine_id: string,
    part_id: string,
    data: UpdateMachinePartRequest
  ): Promise<MachinePart> {
    const action = "Update Machine Part";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { machine_id, part_id, data });

      const updateFields: string[] = [];
      const queryParams: any[] = [];
      const setField = (column: string, value: unknown) => {
        updateFields.push(`${column} = $${queryParams.length + 1}`);
        queryParams.push(value);
      };

      if (data.name !== undefined) setField("name", data.name);
      if (data.part_code !== undefined) setField("part_code", data.part_code);
      if (data.position !== undefined) setField("position", data.position);
      if (data.quantity !== undefined) setField("quantity", data.quantity);
      if (data.manufacturer !== undefined) setField("manufacturer", data.manufacturer);
      if (data.model_number !== undefined) setField("model_number", data.model_number);
      if (data.installed_at !== undefined) setField("installed_at", data.installed_at);
      if (data.expected_lifespan_days !== undefined)
        setField("expected_lifespan_days", data.expected_lifespan_days);
      if (data.last_replaced_at !== undefined) setField("last_replaced_at", data.last_replaced_at);
      if (data.next_replacement_date !== undefined)
        setField("next_replacement_date", data.next_replacement_date);
      if (data.status !== undefined) setField("status", data.status);
      if (data.notes !== undefined) setField("notes", data.notes);
      if (data.is_active !== undefined) setField("is_active", data.is_active);
      if (data.product_id !== undefined) setField("product_id", data.product_id);

      if (updateFields.length === 0) {
        throw new Error("No fields to update");
      }

      queryParams.push(part_id, machine_id);
      const query = `
        UPDATE machine_parts
        SET ${updateFields.join(", ")}
        WHERE id = $${queryParams.length - 1} AND machine_id = $${queryParams.length}
        RETURNING *
      `;
      const result = await client.query(query, queryParams);
      if (result.rows.length === 0) {
        const err: any = new Error(
          `Machine part ${part_id} not found for machine ${machine_id}`
        );
        err.statusCode = 404;
        throw err;
      }
      const part = serializeMachinePart(result.rows[0]);
      MyLogger.success(action, { id: part.id });
      return part;
    } catch (error: any) {
      MyLogger.error(action, error, { machine_id, part_id, data });
      throw error;
    } finally {
      client.release();
    }
  }

  static async deletePart(machine_id: string, part_id: string): Promise<boolean> {
    const action = "Delete Machine Part";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { machine_id, part_id });
      const result = await client.query(
        `DELETE FROM machine_parts WHERE id = $1 AND machine_id = $2`,
        [part_id, machine_id]
      );
      const deleted = (result.rowCount ?? 0) > 0;
      MyLogger.success(action, { deleted });
      return deleted;
    } catch (error: any) {
      MyLogger.error(action, error, { machine_id, part_id });
      throw error;
    } finally {
      client.release();
    }
  }

  // ---------------- Replacements ----------------

  static async listReplacements(
    machine_id: string,
    part_id: string,
    params: { page?: number; limit?: number } = {}
  ): Promise<{
    replacements: MachinePartReplacement[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const action = "List Part Replacements";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { machine_id, part_id, params });
      const page = params.page ?? 1;
      const limit = params.limit ?? 20;
      const offset = (page - 1) * limit;

      // Verify the part belongs to this machine before listing.
      const partRes = await client.query(
        `SELECT id FROM machine_parts WHERE id = $1 AND machine_id = $2`,
        [part_id, machine_id]
      );
      if (partRes.rows.length === 0) {
        const err: any = new Error(
          `Machine part ${part_id} not found for machine ${machine_id}`
        );
        err.statusCode = 404;
        throw err;
      }

      const countRes = await client.query(
        `SELECT COUNT(*) AS total FROM machine_part_replacements WHERE machine_part_id = $1`,
        [part_id]
      );
      const total = parseInt(countRes.rows[0].total, 10);

      const result = await client.query(
        `SELECT r.*, p.name AS product_name, p.sku AS product_sku
         FROM machine_part_replacements r
         LEFT JOIN products p ON p.id = r.product_id
         WHERE r.machine_part_id = $1
         ORDER BY r.replaced_at DESC
         LIMIT $2 OFFSET $3`,
        [part_id, limit, offset]
      );
      const replacements = result.rows.map(serializeReplacement);
      const totalPages = Math.ceil(total / limit);
      MyLogger.success(action, { count: replacements.length, total });
      return { replacements, total, page, totalPages };
    } catch (error: any) {
      MyLogger.error(action, error, { machine_id, part_id });
      throw error;
    } finally {
      client.release();
    }
  }

  static async createReplacement(
    machine_id: string,
    part_id: string,
    data: CreateMachinePartReplacementRequest,
    created_by: number
  ): Promise<MachinePartReplacement> {
    const action = "Create Part Replacement";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { machine_id, part_id, data, created_by });
      await client.query("BEGIN");

      // Lock the parent part row and confirm it belongs to the machine.
      const partRes = await client.query(
        `SELECT id, expected_lifespan_days, product_id
         FROM machine_parts
         WHERE id = $1 AND machine_id = $2
         FOR UPDATE`,
        [part_id, machine_id]
      );
      if (partRes.rows.length === 0) {
        const err: any = new Error(
          `Machine part ${part_id} not found for machine ${machine_id}`
        );
        err.statusCode = 404;
        throw err;
      }
      const expectedLifespanDays: number | null =
        partRes.rows[0].expected_lifespan_days ?? null;

      // Optional FK: if maintenance_log_id supplied, verify it belongs to this machine.
      if (data.maintenance_log_id) {
        const logRes = await client.query(
          `SELECT id FROM machine_maintenance_logs WHERE id = $1 AND machine_id = $2`,
          [data.maintenance_log_id, machine_id]
        );
        if (logRes.rows.length === 0) {
          const err: any = new Error(
            `Maintenance log ${data.maintenance_log_id} not found for machine ${machine_id}`
          );
          err.statusCode = 400;
          throw err;
        }
      }

      // Decide whether this replacement consumes inventory stock. It does only
      // when a product is linked (on the part, or overridden on the request)
      // and a positive quantity is supplied. Otherwise it stays a cost-only
      // record, preserving the original behaviour.
      const effectiveProductId =
        data.product_id ?? partRes.rows[0].product_id ?? null;
      const consumeQty = data.quantity ?? 0;
      let stockResult: {
        stockAdjustmentId: number;
        distributionCenterId: number;
        adjustmentData: any;
      } | null = null;

      if (effectiveProductId && consumeQty > 0) {
        stockResult = await MachinePartsMediator.issueStockForReplacement(client, {
          product_id: Number(effectiveProductId),
          quantity: consumeQty,
          distribution_center_id: data.distribution_center_id ?? null,
          machine_id,
          part_id,
          adjusted_by: created_by.toString(),
        });
      }

      const insertRes = await client.query(
        `INSERT INTO machine_part_replacements (
           machine_part_id, maintenance_log_id, replaced_at, reason, technician,
           cost, next_replacement_date, notes, created_by,
           product_id, quantity, distribution_center_id, stock_adjustment_id
         ) VALUES (
           $1, $2, COALESCE($3, CURRENT_TIMESTAMP), $4, $5,
           COALESCE($6, 0), $7, $8, $9,
           $10, $11, $12, $13
         )
         RETURNING *`,
        [
          part_id,
          data.maintenance_log_id ?? null,
          data.replaced_at ?? null,
          data.reason,
          data.technician ?? null,
          data.cost ?? 0,
          data.next_replacement_date ?? null,
          data.notes ?? null,
          created_by,
          stockResult ? Number(effectiveProductId) : null,
          stockResult ? consumeQty : null,
          stockResult ? stockResult.distributionCenterId : null,
          stockResult ? stockResult.stockAdjustmentId : null,
        ]
      );

      // Denormalize last_replaced_at and next_replacement_date onto the part.
      // If the caller didn't supply an override and the part has a lifespan,
      // derive next_replacement_date from the new last_replaced_at.
      await client.query(
        `UPDATE machine_parts
         SET last_replaced_at = $1::timestamptz::date,
             next_replacement_date = COALESCE(
               $2,
               CASE
                 WHEN $3::int IS NOT NULL
                 THEN ($1::timestamptz::date + ($3::int) * INTERVAL '1 day')::date
                 ELSE next_replacement_date
               END
             )
         WHERE id = $4`,
        [
          insertRes.rows[0].replaced_at,
          data.next_replacement_date ?? null,
          expectedLifespanDays,
          part_id,
        ]
      );

      await client.query("COMMIT");

      // Post the accounting voucher after commit so a voucher failure doesn't
      // roll back the stock movement (mirrors StockAdjustmentMediator).
      if (stockResult) {
        try {
          await interModuleConnector.accModule.addStockAdjustmentVoucher(
            stockResult.adjustmentData,
            created_by
          );
        } catch (voucherError: any) {
          MyLogger.error("Failed to post voucher for part replacement", voucherError, {
            machine_id,
            part_id,
            stockAdjustmentId: stockResult.stockAdjustmentId,
          });
        }
      }

      const replacement = serializeReplacement(insertRes.rows[0]);
      MyLogger.success(action, { id: replacement.id });
      return replacement;
    } catch (error: any) {
      await client.query("ROLLBACK").catch(() => undefined);
      MyLogger.error(action, error, { machine_id, part_id, data });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Issue a stock decrease for a product-linked part replacement, writing to the
   * existing stock_adjustments ledger and decrementing both the per-location and
   * global product stock — all within the caller's transaction. Mirrors the
   * ledger writes in StockAdjustmentMediator.applyUnitsLine (decrease path).
   */
  private static async issueStockForReplacement(
    client: PoolClient,
    params: {
      product_id: number;
      quantity: number;
      distribution_center_id: number | null;
      machine_id: string;
      part_id: string;
      adjusted_by: string;
    }
  ): Promise<{
    stockAdjustmentId: number;
    distributionCenterId: number;
    adjustmentData: any;
  }> {
    // Resolve the source distribution center: explicit choice, else the primary.
    let distributionCenterId = params.distribution_center_id;
    if (!distributionCenterId) {
      const dcRes = await client.query(
        "SELECT id FROM distribution_centers WHERE is_primary = true LIMIT 1"
      );
      if (dcRes.rows.length === 0) {
        const err: any = new Error("No primary distribution center configured");
        err.statusCode = 500;
        throw err;
      }
      distributionCenterId = Number(dcRes.rows[0].id);
    }

    const locationResult = await client.query(
      "SELECT current_stock FROM product_locations WHERE product_id = $1 AND distribution_center_id = $2",
      [params.product_id, distributionCenterId]
    );
    if (locationResult.rows.length === 0) {
      const err: any = new Error(
        "Product has no stock at this distribution center"
      );
      err.statusCode = 400;
      throw err;
    }
    const currentLocationStock = parseFloat(locationResult.rows[0].current_stock);
    const newLocationStock = currentLocationStock - params.quantity;
    if (newLocationStock < 0) {
      const err: any = new Error(
        "Cannot consume more stock than is available at this distribution center"
      );
      err.statusCode = 400;
      throw err;
    }

    await client.query(
      "UPDATE product_locations SET current_stock = $1, updated_at = CURRENT_TIMESTAMP WHERE product_id = $2 AND distribution_center_id = $3",
      [newLocationStock, params.product_id, distributionCenterId]
    );

    const productResult = await client.query(
      "SELECT name, sku, current_stock FROM products WHERE id = $1 FOR UPDATE",
      [params.product_id]
    );
    if (productResult.rows.length === 0) {
      const err: any = new Error("Product not found");
      err.statusCode = 400;
      throw err;
    }
    const product = productResult.rows[0];
    const currentGlobalStock = parseFloat(product.current_stock);
    const newGlobalStock = currentGlobalStock - params.quantity;

    const reason = "Machine part replacement";
    const reference = `MACHINE-${params.machine_id}-PART-${params.part_id}`;

    const adjustmentResult = await client.query(
      `INSERT INTO stock_adjustments (
        product_id, adjustment_type, quantity, previous_stock, new_stock,
        reason, reference, notes, adjusted_by, distribution_center_id
      ) VALUES ($1, 'decrease', $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id`,
      [
        params.product_id,
        params.quantity,
        currentGlobalStock,
        newGlobalStock,
        reason,
        reference,
        null,
        params.adjusted_by,
        distributionCenterId,
      ]
    );
    const stockAdjustmentId = Number(adjustmentResult.rows[0].id);

    await client.query(
      "UPDATE products SET current_stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [newGlobalStock, params.product_id]
    );

    return {
      stockAdjustmentId,
      distributionCenterId,
      adjustmentData: {
        adjustmentId: stockAdjustmentId,
        productId: params.product_id,
        productName: product.name || "Unknown Product",
        productSku: product.sku || "UNKNOWN",
        adjustmentType: "decrease",
        quantity: params.quantity,
        previousStock: currentGlobalStock,
        newStock: newGlobalStock,
        reason,
        reference,
        notes: null,
        adjustmentDate: new Date().toISOString().split("T")[0],
        distributionCenterId,
      },
    };
  }

  // NOTE: Deleting a replacement does NOT recompute last_replaced_at or
  // next_replacement_date on the parent part. Admins should manually adjust
  // the part if the deleted row was the most recent one.
  static async deleteReplacement(
    machine_id: string,
    part_id: string,
    replacement_id: string
  ): Promise<boolean> {
    const action = "Delete Part Replacement";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { machine_id, part_id, replacement_id });
      const result = await client.query(
        `DELETE FROM machine_part_replacements r
         USING machine_parts p
         WHERE r.id = $1
           AND r.machine_part_id = $2
           AND p.id = r.machine_part_id
           AND p.machine_id = $3`,
        [replacement_id, part_id, machine_id]
      );
      const deleted = (result.rowCount ?? 0) > 0;
      MyLogger.success(action, { deleted });
      return deleted;
    } catch (error: any) {
      MyLogger.error(action, error, { machine_id, part_id, replacement_id });
      throw error;
    } finally {
      client.release();
    }
  }

  // ---------------- Stock traceability ----------------

  /**
   * Low-spare alerts: active, product-linked parts whose linked product's stock
   * is at or below its min_stock_level. Reuses the product min-stock thresholds
   * used across inventory (see InventoryMediator stock_status logic).
   */
  static async getSpareStockAlerts(
    machine_id?: string
  ): Promise<SpareStockAlert[]> {
    const action = "Get Spare Stock Alerts";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { machine_id });

      const params: any[] = [];
      let machineFilter = "";
      if (machine_id) {
        params.push(machine_id);
        machineFilter = `AND mp.machine_id = $${params.length}`;
      }

      const result = await client.query(
        `SELECT
           mp.id AS part_id,
           mp.name AS part_name,
           mp.part_code,
           mp.machine_id,
           m.name AS machine_name,
           p.id AS product_id,
           p.name AS product_name,
           p.sku AS product_sku,
           p.current_stock,
           p.min_stock_level,
           CASE
             WHEN p.current_stock <= 0 THEN 'out_of_stock'
             WHEN p.current_stock <= (p.min_stock_level * 0.5) THEN 'critical'
             ELSE 'low'
           END AS alert_status
         FROM machine_parts mp
         JOIN products p ON p.id = mp.product_id
         JOIN machines m ON m.id = mp.machine_id
         WHERE mp.product_id IS NOT NULL
           AND mp.status = 'active'
           AND mp.is_active = true
           AND p.current_stock <= p.min_stock_level
           ${machineFilter}
         ORDER BY p.current_stock ASC, m.name ASC, mp.name ASC`,
        params
      );

      const alerts: SpareStockAlert[] = result.rows.map((row) => ({
        part_id: row.part_id.toString(),
        part_name: row.part_name,
        part_code: row.part_code ?? undefined,
        machine_id: row.machine_id.toString(),
        machine_name: row.machine_name,
        product_id: row.product_id.toString(),
        product_name: row.product_name,
        product_sku: row.product_sku,
        current_stock: Number(row.current_stock ?? 0),
        min_stock_level: Number(row.min_stock_level ?? 0),
        alert_status: row.alert_status as SpareStockAlertStatus,
      }));

      MyLogger.success(action, { count: alerts.length });
      return alerts;
    } catch (error: any) {
      MyLogger.error(action, error, { machine_id });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Consumption report: stock-consuming part replacements joined to machine,
   * part, product and the stock movement they created, with qty + cost rollup.
   */
  static async getConsumptionReport(params: {
    machine_id?: string;
    date_from?: string;
    date_to?: string;
  } = {}): Promise<MachinePartConsumptionReport> {
    const action = "Get Machine Part Consumption Report";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { params });

      const conditions: string[] = ["r.product_id IS NOT NULL"];
      const queryParams: any[] = [];

      if (params.machine_id) {
        queryParams.push(params.machine_id);
        conditions.push(`mp.machine_id = $${queryParams.length}`);
      }
      if (params.date_from) {
        queryParams.push(params.date_from);
        conditions.push(`r.replaced_at >= $${queryParams.length}`);
      }
      if (params.date_to) {
        queryParams.push(params.date_to);
        conditions.push(`r.replaced_at <= $${queryParams.length}`);
      }

      const whereClause = `WHERE ${conditions.join(" AND ")}`;

      const result = await client.query(
        `SELECT
           r.id AS replacement_id,
           r.replaced_at,
           mp.machine_id,
           m.name AS machine_name,
           mp.id AS part_id,
           mp.name AS part_name,
           r.product_id,
           p.name AS product_name,
           p.sku AS product_sku,
           r.quantity,
           r.cost,
           r.stock_adjustment_id,
           r.reason
         FROM machine_part_replacements r
         JOIN machine_parts mp ON mp.id = r.machine_part_id
         JOIN machines m ON m.id = mp.machine_id
         LEFT JOIN products p ON p.id = r.product_id
         ${whereClause}
         ORDER BY r.replaced_at DESC`,
        queryParams
      );

      const rows: MachinePartConsumptionRow[] = result.rows.map((row) => ({
        replacement_id: row.replacement_id.toString(),
        replaced_at: row.replaced_at.toISOString(),
        machine_id: row.machine_id.toString(),
        machine_name: row.machine_name,
        part_id: row.part_id.toString(),
        part_name: row.part_name,
        product_id:
          row.product_id !== null && row.product_id !== undefined
            ? row.product_id.toString()
            : undefined,
        product_name: row.product_name ?? undefined,
        product_sku: row.product_sku ?? undefined,
        quantity:
          row.quantity !== null && row.quantity !== undefined
            ? Number(row.quantity)
            : undefined,
        cost: Number(row.cost ?? 0),
        stock_adjustment_id:
          row.stock_adjustment_id !== null && row.stock_adjustment_id !== undefined
            ? row.stock_adjustment_id.toString()
            : undefined,
        reason: row.reason,
      }));

      const total_quantity = rows.reduce((sum, r) => sum + (r.quantity ?? 0), 0);
      const total_cost = rows.reduce((sum, r) => sum + r.cost, 0);

      MyLogger.success(action, { count: rows.length });
      return { rows, total_quantity, total_cost };
    } catch (error: any) {
      MyLogger.error(action, error, { params });
      throw error;
    } finally {
      client.release();
    }
  }
}
