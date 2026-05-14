import pool from "@/database/connection";
import { MyLogger } from "@/utils/new-logger";
import {
  MachinePart,
  MachinePartReplacement,
  MachinePartStatus,
  CreateMachinePartRequest,
  UpdateMachinePartRequest,
  CreateMachinePartReplacementRequest,
  MachinePartQueryParams,
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

      const whereConditions: string[] = ["machine_id = $1"];
      const queryParams: any[] = [machine_id];

      if (status) {
        whereConditions.push(`status = $${queryParams.length + 1}`);
        queryParams.push(status);
      }

      if (is_active !== undefined) {
        whereConditions.push(`is_active = $${queryParams.length + 1}`);
        queryParams.push(is_active);
      }

      if (overdue_only) {
        whereConditions.push(
          `next_replacement_date IS NOT NULL AND next_replacement_date < CURRENT_DATE`
        );
      }

      if (search) {
        whereConditions.push(
          `(name ILIKE $${queryParams.length + 1} OR part_code ILIKE $${queryParams.length + 1} OR position ILIKE $${queryParams.length + 1} OR manufacturer ILIKE $${queryParams.length + 1})`
        );
        queryParams.push(`%${search}%`);
      }

      const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

      const countQuery = `SELECT COUNT(*) AS total FROM machine_parts ${whereClause}`;
      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total, 10);

      const dataQuery = `
        SELECT *
        FROM machine_parts
        ${whereClause}
        ORDER BY ${sortColumn} ${sortDir}, id ASC
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
        `SELECT * FROM machine_parts WHERE id = $1 AND machine_id = $2`,
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
           next_replacement_date, status, notes, created_by
         ) VALUES (
           $1,$2,$3,$4, COALESCE($5, 1), $6,
           $7,$8,$9,$10,
           $11, COALESCE($12, 'active'), $13, $14
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
        `SELECT *
         FROM machine_part_replacements
         WHERE machine_part_id = $1
         ORDER BY replaced_at DESC
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
        `SELECT id, expected_lifespan_days
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

      const insertRes = await client.query(
        `INSERT INTO machine_part_replacements (
           machine_part_id, maintenance_log_id, replaced_at, reason, technician,
           cost, next_replacement_date, notes, created_by
         ) VALUES (
           $1, $2, COALESCE($3, CURRENT_TIMESTAMP), $4, $5,
           COALESCE($6, 0), $7, $8, $9
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
}
