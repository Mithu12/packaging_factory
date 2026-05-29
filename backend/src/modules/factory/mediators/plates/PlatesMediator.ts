import pool from "@/database/connection";
import { MyLogger } from "@/utils/new-logger";
import { createError } from "@/utils/responseHelper";
import {
  Plate,
  PlateType,
  ProductionRunPlate,
  CreatePlateRequest,
  UpdatePlateRequest,
  CreatePlateTypeRequest,
  UpdatePlateTypeRequest,
  PlateQueryParams,
} from "@/types/factory";

function serializePlateType(row: any): PlateType {
  return {
    id: row.id.toString(),
    name: row.name,
    code: row.code ?? undefined,
    description: row.description ?? undefined,
    expected_lifespan_uses: row.expected_lifespan_uses ?? undefined,
    is_active: row.is_active,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at?.toISOString(),
    plate_count: row.plate_count !== undefined ? Number(row.plate_count) : undefined,
    active_count: row.active_count !== undefined ? Number(row.active_count) : undefined,
    broken_count: row.broken_count !== undefined ? Number(row.broken_count) : undefined,
    avg_uses_at_break:
      row.avg_uses_at_break !== undefined && row.avg_uses_at_break !== null
        ? Number(row.avg_uses_at_break)
        : undefined,
    min_uses_at_break:
      row.min_uses_at_break !== undefined && row.min_uses_at_break !== null
        ? Number(row.min_uses_at_break)
        : undefined,
    max_uses_at_break:
      row.max_uses_at_break !== undefined && row.max_uses_at_break !== null
        ? Number(row.max_uses_at_break)
        : undefined,
  };
}

function serializePlate(row: any): Plate {
  return {
    id: row.id.toString(),
    plate_type_id: row.plate_type_id.toString(),
    plate_type_name: row.plate_type_name ?? undefined,
    plate_code: row.plate_code ?? undefined,
    total_uses: Number(row.total_uses ?? 0),
    status: row.status,
    broke_at_use_count: row.broke_at_use_count ?? undefined,
    broken_at: row.broken_at?.toISOString(),
    broken_reason: row.broken_reason ?? undefined,
    expected_lifespan_uses: row.expected_lifespan_uses ?? undefined,
    factory_id: row.factory_id !== null && row.factory_id !== undefined ? row.factory_id.toString() : undefined,
    notes: row.notes ?? undefined,
    is_active: row.is_active,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at?.toISOString(),
  };
}

function serializeRunPlate(row: any): ProductionRunPlate {
  return {
    id: row.id.toString(),
    production_run_id: row.production_run_id.toString(),
    plate_id: row.plate_id.toString(),
    plate_code: row.plate_code ?? undefined,
    plate_type_name: row.plate_type_name ?? undefined,
    outcome: row.outcome,
    use_number: row.use_number ?? undefined,
    used_at: row.used_at?.toISOString(),
    notes: row.notes ?? undefined,
    created_at: row.created_at.toISOString(),
    run_number: row.run_number ?? undefined,
  };
}

export class PlatesMediator {
  // ---------------- Plate Types ----------------

  static async listPlateTypes(includeStats = true): Promise<PlateType[]> {
    const action = "List Plate Types";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { includeStats });
      // Aggregate lifespan stats per type so the UI can show "breaks around use N".
      const query = includeStats
        ? `SELECT t.*,
                  COUNT(p.id)                                   AS plate_count,
                  COUNT(p.id) FILTER (WHERE p.status = 'active') AS active_count,
                  COUNT(p.id) FILTER (WHERE p.status = 'broken') AS broken_count,
                  AVG(p.broke_at_use_count) FILTER (WHERE p.status = 'broken') AS avg_uses_at_break,
                  MIN(p.broke_at_use_count) FILTER (WHERE p.status = 'broken') AS min_uses_at_break,
                  MAX(p.broke_at_use_count) FILTER (WHERE p.status = 'broken') AS max_uses_at_break
           FROM plate_types t
           LEFT JOIN plates p ON p.plate_type_id = t.id
           GROUP BY t.id
           ORDER BY t.name ASC`
        : `SELECT * FROM plate_types ORDER BY name ASC`;
      const result = await client.query(query);
      const types = result.rows.map(serializePlateType);
      MyLogger.success(action, { count: types.length });
      return types;
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async createPlateType(
    data: CreatePlateTypeRequest,
    created_by: number
  ): Promise<PlateType> {
    const action = "Create Plate Type";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { data, created_by });
      const result = await client.query(
        `INSERT INTO plate_types (name, code, description, expected_lifespan_uses, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          data.name,
          data.code ?? null,
          data.description ?? null,
          data.expected_lifespan_uses ?? null,
          created_by,
        ]
      );
      const type = serializePlateType(result.rows[0]);
      MyLogger.success(action, { id: type.id });
      return type;
    } catch (error: any) {
      MyLogger.error(action, error, { data });
      throw error;
    } finally {
      client.release();
    }
  }

  static async updatePlateType(
    id: string,
    data: UpdatePlateTypeRequest
  ): Promise<PlateType> {
    const action = "Update Plate Type";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { id, data });
      const fields: string[] = [];
      const params: any[] = [];
      const set = (col: string, val: unknown) => {
        fields.push(`${col} = $${params.length + 1}`);
        params.push(val);
      };
      if (data.name !== undefined) set("name", data.name);
      if (data.code !== undefined) set("code", data.code);
      if (data.description !== undefined) set("description", data.description);
      if (data.expected_lifespan_uses !== undefined)
        set("expected_lifespan_uses", data.expected_lifespan_uses);
      if (data.is_active !== undefined) set("is_active", data.is_active);
      if (fields.length === 0) throw createError("No fields to update", 400);

      params.push(id);
      const result = await client.query(
        `UPDATE plate_types SET ${fields.join(", ")} WHERE id = $${params.length} RETURNING *`,
        params
      );
      if (result.rows.length === 0) throw createError("Plate type not found", 404);
      const type = serializePlateType(result.rows[0]);
      MyLogger.success(action, { id: type.id });
      return type;
    } catch (error: any) {
      MyLogger.error(action, error, { id, data });
      throw error;
    } finally {
      client.release();
    }
  }

  static async deletePlateType(id: string): Promise<boolean> {
    const action = "Delete Plate Type";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { id });
      // Block deletion if plates of this type exist (FK has no cascade by design).
      const inUse = await client.query(
        `SELECT 1 FROM plates WHERE plate_type_id = $1 LIMIT 1`,
        [id]
      );
      if (inUse.rows.length > 0) {
        throw createError(
          "Cannot delete a plate type that still has plates. Retire or reassign them first.",
          400
        );
      }
      const result = await client.query(`DELETE FROM plate_types WHERE id = $1`, [id]);
      const deleted = (result.rowCount ?? 0) > 0;
      MyLogger.success(action, { deleted });
      return deleted;
    } catch (error: any) {
      MyLogger.error(action, error, { id });
      throw error;
    } finally {
      client.release();
    }
  }

  // ---------------- Plates ----------------

  static async listPlates(params: PlateQueryParams = {}): Promise<{
    plates: Plate[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const action = "List Plates";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { params });
      const {
        status,
        plate_type_id,
        factory_id,
        is_active,
        search,
        sort_by = "created_at",
        sort_order = "desc",
        page = 1,
        limit = 20,
      } = params;

      const allowedSort = new Set(["plate_code", "total_uses", "status", "created_at"]);
      const sortColumn = allowedSort.has(sort_by) ? `p.${sort_by}` : "p.created_at";
      const sortDir = sort_order === "asc" ? "ASC" : "DESC";
      const offset = (page - 1) * limit;

      const where: string[] = ["1=1"];
      const qp: any[] = [];
      if (status) {
        where.push(`p.status = $${qp.length + 1}`);
        qp.push(status);
      }
      if (plate_type_id) {
        where.push(`p.plate_type_id = $${qp.length + 1}`);
        qp.push(plate_type_id);
      }
      if (factory_id) {
        where.push(`p.factory_id = $${qp.length + 1}`);
        qp.push(factory_id);
      }
      if (is_active !== undefined) {
        where.push(`p.is_active = $${qp.length + 1}`);
        qp.push(is_active);
      }
      if (search) {
        where.push(`(p.plate_code ILIKE $${qp.length + 1} OR t.name ILIKE $${qp.length + 1})`);
        qp.push(`%${search}%`);
      }
      const whereClause = `WHERE ${where.join(" AND ")}`;

      const countResult = await client.query(
        `SELECT COUNT(*) AS total FROM plates p JOIN plate_types t ON t.id = p.plate_type_id ${whereClause}`,
        qp
      );
      const total = parseInt(countResult.rows[0].total, 10);

      const dataResult = await client.query(
        `SELECT p.*, t.name AS plate_type_name
         FROM plates p
         JOIN plate_types t ON t.id = p.plate_type_id
         ${whereClause}
         ORDER BY ${sortColumn} ${sortDir}, p.id ASC
         LIMIT $${qp.length + 1} OFFSET $${qp.length + 2}`,
        [...qp, limit, offset]
      );
      const plates = dataResult.rows.map(serializePlate);
      MyLogger.success(action, { count: plates.length, total });
      return { plates, total, page, totalPages: Math.ceil(total / limit) };
    } catch (error: any) {
      MyLogger.error(action, error, { params });
      throw error;
    } finally {
      client.release();
    }
  }

  static async getPlate(id: string): Promise<Plate> {
    const action = "Get Plate";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { id });
      const result = await client.query(
        `SELECT p.*, t.name AS plate_type_name
         FROM plates p JOIN plate_types t ON t.id = p.plate_type_id
         WHERE p.id = $1`,
        [id]
      );
      if (result.rows.length === 0) throw createError("Plate not found", 404);
      return serializePlate(result.rows[0]);
    } catch (error: any) {
      MyLogger.error(action, error, { id });
      throw error;
    } finally {
      client.release();
    }
  }

  static async createPlate(
    data: CreatePlateRequest,
    created_by: number
  ): Promise<Plate> {
    const action = "Create Plate";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { data, created_by });
      const result = await client.query(
        `INSERT INTO plates (plate_type_id, plate_code, expected_lifespan_uses, factory_id, notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          data.plate_type_id,
          data.plate_code ?? null,
          data.expected_lifespan_uses ?? null,
          data.factory_id ?? null,
          data.notes ?? null,
          created_by,
        ]
      );
      const plate = await this.getPlate(result.rows[0].id.toString());
      MyLogger.success(action, { id: plate.id });
      return plate;
    } catch (error: any) {
      MyLogger.error(action, error, { data });
      throw error;
    } finally {
      client.release();
    }
  }

  static async updatePlate(id: string, data: UpdatePlateRequest): Promise<Plate> {
    const action = "Update Plate";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { id, data });
      const fields: string[] = [];
      const params: any[] = [];
      const set = (col: string, val: unknown) => {
        fields.push(`${col} = $${params.length + 1}`);
        params.push(val);
      };
      if (data.plate_type_id !== undefined) set("plate_type_id", data.plate_type_id);
      if (data.plate_code !== undefined) set("plate_code", data.plate_code);
      if (data.expected_lifespan_uses !== undefined)
        set("expected_lifespan_uses", data.expected_lifespan_uses);
      if (data.factory_id !== undefined) set("factory_id", data.factory_id);
      if (data.notes !== undefined) set("notes", data.notes);
      if (data.is_active !== undefined) set("is_active", data.is_active);
      if (data.broken_reason !== undefined) set("broken_reason", data.broken_reason);

      // Status transitions: manually marking broken/retired stamps broken_at.
      if (data.status !== undefined) {
        set("status", data.status);
        if (data.status === "broken") {
          fields.push(`broken_at = COALESCE(broken_at, CURRENT_TIMESTAMP)`);
          fields.push(`broke_at_use_count = COALESCE(broke_at_use_count, total_uses)`);
        }
      }

      if (fields.length === 0) throw createError("No fields to update", 400);

      params.push(id);
      const result = await client.query(
        `UPDATE plates SET ${fields.join(", ")} WHERE id = $${params.length} RETURNING id`,
        params
      );
      if (result.rows.length === 0) throw createError("Plate not found", 404);
      const plate = await this.getPlate(id);
      MyLogger.success(action, { id: plate.id });
      return plate;
    } catch (error: any) {
      MyLogger.error(action, error, { id, data });
      throw error;
    } finally {
      client.release();
    }
  }

  static async deletePlate(id: string): Promise<boolean> {
    const action = "Delete Plate";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { id });
      // Block deletion if the plate has recorded usage (preserve production history).
      const used = await client.query(
        `SELECT 1 FROM production_run_plates WHERE plate_id = $1 LIMIT 1`,
        [id]
      );
      if (used.rows.length > 0) {
        throw createError(
          "Cannot delete a plate with recorded usage. Retire it instead.",
          400
        );
      }
      const result = await client.query(`DELETE FROM plates WHERE id = $1`, [id]);
      const deleted = (result.rowCount ?? 0) > 0;
      MyLogger.success(action, { deleted });
      return deleted;
    } catch (error: any) {
      MyLogger.error(action, error, { id });
      throw error;
    } finally {
      client.release();
    }
  }

  // ---------------- Usage history & analytics ----------------

  static async getPlateUsageHistory(plateId: string): Promise<ProductionRunPlate[]> {
    const action = "Get Plate Usage History";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { plateId });
      const result = await client.query(
        `SELECT rp.*, pr.run_number
         FROM production_run_plates rp
         LEFT JOIN production_runs pr ON pr.id = rp.production_run_id
         WHERE rp.plate_id = $1
         ORDER BY rp.used_at DESC, rp.id DESC`,
        [plateId]
      );
      const history = result.rows.map(serializeRunPlate);
      MyLogger.success(action, { count: history.length });
      return history;
    } catch (error: any) {
      MyLogger.error(action, error, { plateId });
      throw error;
    } finally {
      client.release();
    }
  }

  static async getRunPlates(runId: string): Promise<ProductionRunPlate[]> {
    const action = "Get Run Plates";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { runId });
      const result = await client.query(
        `SELECT rp.*, p.plate_code, t.name AS plate_type_name
         FROM production_run_plates rp
         JOIN plates p ON p.id = rp.plate_id
         JOIN plate_types t ON t.id = p.plate_type_id
         WHERE rp.production_run_id = $1
         ORDER BY rp.id ASC`,
        [runId]
      );
      return result.rows.map(serializeRunPlate);
    } catch (error: any) {
      MyLogger.error(action, error, { runId });
      throw error;
    } finally {
      client.release();
    }
  }

  // Lifespan stats per plate type — reuses the aggregation in listPlateTypes.
  static async getLifespanStats(): Promise<PlateType[]> {
    return this.listPlateTypes(true);
  }
}
