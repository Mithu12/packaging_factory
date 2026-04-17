import pool from "@/database/connection";
import { MyLogger } from "@/utils/new-logger";
import {
  Machine,
  MachineMaintenanceLog,
  MachineStatus,
  CreateMachineRequest,
  UpdateMachineRequest,
  CreateMachineMaintenanceLogRequest,
} from "@/types/factory";

type MachineRow = {
  id: number | string;
  factory_id: number | null;
  production_line_id: number | null;
  name: string;
  code: string;
  model: string | null;
  serial_number: string | null;
  manufacturer: string | null;
  purchase_date: Date | null;
  location: string | null;
  status: MachineStatus;
  next_service_date: Date | null;
  notes: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date | null;
  production_line_name?: string | null;
  factory_name?: string | null;
};

function serializeMachine(row: MachineRow): Machine {
  return {
    id: row.id.toString(),
    factory_id: row.factory_id,
    production_line_id: row.production_line_id,
    name: row.name,
    code: row.code,
    model: row.model ?? undefined,
    serial_number: row.serial_number ?? undefined,
    manufacturer: row.manufacturer ?? undefined,
    purchase_date: row.purchase_date
      ? row.purchase_date.toISOString().slice(0, 10)
      : undefined,
    location: row.location ?? undefined,
    status: row.status,
    next_service_date: row.next_service_date
      ? row.next_service_date.toISOString().slice(0, 10)
      : undefined,
    notes: row.notes ?? undefined,
    is_active: row.is_active,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at?.toISOString(),
    production_line_name: row.production_line_name ?? undefined,
    factory_name: row.factory_name ?? undefined,
  };
}

function serializeLog(row: any): MachineMaintenanceLog {
  return {
    id: row.id.toString(),
    machine_id: row.machine_id.toString(),
    maintenance_type: row.maintenance_type,
    performed_at: row.performed_at.toISOString(),
    technician: row.technician ?? undefined,
    cost: Number(row.cost ?? 0),
    next_service_date: row.next_service_date
      ? row.next_service_date.toISOString().slice(0, 10)
      : undefined,
    notes: row.notes ?? undefined,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at?.toISOString(),
  };
}

export class MachineMediator {
  static async getMachines(
    params: {
      factory_id?: number;
      production_line_id?: number;
      status?: MachineStatus;
      is_active?: boolean;
      search?: string;
      sort_by?: string;
      sort_order?: "asc" | "desc";
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    machines: Machine[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const action = "Get Machines";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { params });

      const {
        factory_id,
        production_line_id,
        status,
        is_active = true,
        search,
        sort_by = "name",
        sort_order = "asc",
        page = 1,
        limit = 20,
      } = params;

      const allowedSort = new Set([
        "name",
        "code",
        "status",
        "next_service_date",
        "created_at",
      ]);
      const sortColumn = allowedSort.has(sort_by) ? sort_by : "name";
      const sortDir = sort_order === "desc" ? "DESC" : "ASC";

      const offset = (page - 1) * limit;

      const whereConditions: string[] = [];
      const queryParams: any[] = [];

      if (factory_id !== undefined && factory_id !== null) {
        whereConditions.push(`m.factory_id = $${queryParams.length + 1}`);
        queryParams.push(factory_id);
      }

      if (production_line_id !== undefined && production_line_id !== null) {
        whereConditions.push(`m.production_line_id = $${queryParams.length + 1}`);
        queryParams.push(production_line_id);
      }

      if (status) {
        whereConditions.push(`m.status = $${queryParams.length + 1}`);
        queryParams.push(status);
      }

      if (is_active !== undefined) {
        whereConditions.push(`m.is_active = $${queryParams.length + 1}`);
        queryParams.push(is_active);
      }

      if (search) {
        whereConditions.push(
          `(m.name ILIKE $${queryParams.length + 1} OR m.code ILIKE $${queryParams.length + 1} OR m.model ILIKE $${queryParams.length + 1} OR m.manufacturer ILIKE $${queryParams.length + 1})`
        );
        queryParams.push(`%${search}%`);
      }

      const whereClause = whereConditions.length
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

      const countQuery = `SELECT COUNT(*) AS total FROM machines m ${whereClause}`;
      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total, 10);

      const dataQuery = `
        SELECT
          m.*,
          pl.name AS production_line_name,
          f.name AS factory_name
        FROM machines m
        LEFT JOIN production_lines pl ON m.production_line_id = pl.id
        LEFT JOIN factories f ON m.factory_id = f.id
        ${whereClause}
        ORDER BY m.${sortColumn} ${sortDir}
        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
      `;
      queryParams.push(limit, offset);

      const result = await client.query(dataQuery, queryParams);
      const machines = result.rows.map(serializeMachine);
      const totalPages = Math.ceil(total / limit);

      MyLogger.success(action, { count: machines.length, total, page, totalPages });

      return { machines, total, page, totalPages };
    } catch (error: any) {
      MyLogger.error(action, error, { params });
      throw error;
    } finally {
      client.release();
    }
  }

  static async getMachineById(id: string): Promise<Machine> {
    const action = "Get Machine by ID";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { id });
      const result = await client.query(
        `SELECT m.*, pl.name AS production_line_name, f.name AS factory_name
         FROM machines m
         LEFT JOIN production_lines pl ON m.production_line_id = pl.id
         LEFT JOIN factories f ON m.factory_id = f.id
         WHERE m.id = $1`,
        [id]
      );
      if (result.rows.length === 0) {
        const err: any = new Error(`Machine with ID ${id} not found`);
        err.statusCode = 404;
        throw err;
      }
      const machine = serializeMachine(result.rows[0]);
      MyLogger.success(action, { id: machine.id });
      return machine;
    } catch (error: any) {
      MyLogger.error(action, error, { id });
      throw error;
    } finally {
      client.release();
    }
  }

  static async createMachine(
    factory_id: number | null,
    data: CreateMachineRequest,
    created_by: number
  ): Promise<Machine> {
    const action = "Create Machine";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { factory_id, data, created_by });
      const result = await client.query(
        `INSERT INTO machines (
           factory_id, production_line_id, name, code, model, serial_number,
           manufacturer, purchase_date, location, status, next_service_date,
           notes, created_by
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING *`,
        [
          factory_id,
          data.production_line_id ?? null,
          data.name,
          data.code,
          data.model ?? null,
          data.serial_number ?? null,
          data.manufacturer ?? null,
          data.purchase_date ?? null,
          data.location ?? null,
          data.status ?? "active",
          data.next_service_date ?? null,
          data.notes ?? null,
          created_by,
        ]
      );
      const machine = serializeMachine(result.rows[0]);
      MyLogger.success(action, { id: machine.id, name: machine.name });
      return machine;
    } catch (error: any) {
      MyLogger.error(action, error, { data });
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateMachine(
    id: string,
    data: UpdateMachineRequest
  ): Promise<Machine> {
    const action = "Update Machine";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { id, data });

      const updateFields: string[] = [];
      const queryParams: any[] = [];
      const setField = (column: string, value: unknown) => {
        updateFields.push(`${column} = $${queryParams.length + 1}`);
        queryParams.push(value);
      };

      if (data.name !== undefined) setField("name", data.name);
      if (data.code !== undefined) setField("code", data.code);
      if (data.model !== undefined) setField("model", data.model);
      if (data.serial_number !== undefined) setField("serial_number", data.serial_number);
      if (data.manufacturer !== undefined) setField("manufacturer", data.manufacturer);
      if (data.purchase_date !== undefined) setField("purchase_date", data.purchase_date);
      if (data.location !== undefined) setField("location", data.location);
      if (data.production_line_id !== undefined) setField("production_line_id", data.production_line_id);
      if (data.status !== undefined) setField("status", data.status);
      if (data.next_service_date !== undefined) setField("next_service_date", data.next_service_date);
      if (data.notes !== undefined) setField("notes", data.notes);
      if (data.is_active !== undefined) setField("is_active", data.is_active);

      if (updateFields.length === 0) {
        throw new Error("No fields to update");
      }

      queryParams.push(id);
      const query = `
        UPDATE machines
        SET ${updateFields.join(", ")}
        WHERE id = $${queryParams.length}
        RETURNING *
      `;
      const result = await client.query(query, queryParams);
      if (result.rows.length === 0) {
        const err: any = new Error(`Machine with ID ${id} not found`);
        err.statusCode = 404;
        throw err;
      }
      const machine = serializeMachine(result.rows[0]);
      MyLogger.success(action, { id: machine.id });
      return machine;
    } catch (error: any) {
      MyLogger.error(action, error, { id, data });
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteMachine(id: string): Promise<boolean> {
    const action = "Delete Machine";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { id });
      const result = await client.query(`DELETE FROM machines WHERE id = $1`, [id]);
      const deleted = (result.rowCount ?? 0) > 0;
      MyLogger.success(action, { id, deleted });
      return deleted;
    } catch (error: any) {
      MyLogger.error(action, error, { id });
      throw error;
    } finally {
      client.release();
    }
  }

  static async getMachineStats(factory_id?: number): Promise<{
    total_machines: number;
    active_machines: number;
    inactive_machines: number;
    under_maintenance: number;
    overdue_service: number;
  }> {
    const action = "Get Machine Stats";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { factory_id });
      let whereClause = "";
      const queryParams: any[] = [];
      if (factory_id !== undefined && factory_id !== null) {
        whereClause = "WHERE factory_id = $1";
        queryParams.push(factory_id);
      }
      const result = await client.query(
        `SELECT
           COUNT(*) AS total_machines,
           COUNT(*) FILTER (WHERE status = 'active') AS active_machines,
           COUNT(*) FILTER (WHERE status = 'inactive') AS inactive_machines,
           COUNT(*) FILTER (WHERE status = 'under_maintenance') AS under_maintenance,
           COUNT(*) FILTER (WHERE next_service_date IS NOT NULL AND next_service_date < CURRENT_DATE) AS overdue_service
         FROM machines
         ${whereClause}`,
        queryParams
      );
      const row = result.rows[0];
      const stats = {
        total_machines: parseInt(row.total_machines, 10),
        active_machines: parseInt(row.active_machines, 10),
        inactive_machines: parseInt(row.inactive_machines, 10),
        under_maintenance: parseInt(row.under_maintenance, 10),
        overdue_service: parseInt(row.overdue_service, 10),
      };
      MyLogger.success(action, { stats });
      return stats;
    } catch (error: any) {
      MyLogger.error(action, error, { factory_id });
      throw error;
    } finally {
      client.release();
    }
  }

  // ---------------- Maintenance Logs ----------------

  static async getMaintenanceLogs(
    machine_id: string,
    params: { page?: number; limit?: number } = {}
  ): Promise<{
    logs: MachineMaintenanceLog[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const action = "Get Maintenance Logs";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { machine_id, params });
      const page = params.page ?? 1;
      const limit = params.limit ?? 20;
      const offset = (page - 1) * limit;

      const countRes = await client.query(
        `SELECT COUNT(*) AS total FROM machine_maintenance_logs WHERE machine_id = $1`,
        [machine_id]
      );
      const total = parseInt(countRes.rows[0].total, 10);

      const result = await client.query(
        `SELECT *
         FROM machine_maintenance_logs
         WHERE machine_id = $1
         ORDER BY performed_at DESC
         LIMIT $2 OFFSET $3`,
        [machine_id, limit, offset]
      );

      const logs = result.rows.map(serializeLog);
      const totalPages = Math.ceil(total / limit);
      MyLogger.success(action, { count: logs.length, total });
      return { logs, total, page, totalPages };
    } catch (error: any) {
      MyLogger.error(action, error, { machine_id });
      throw error;
    } finally {
      client.release();
    }
  }

  static async createMaintenanceLog(
    machine_id: string,
    data: CreateMachineMaintenanceLogRequest,
    created_by: number
  ): Promise<MachineMaintenanceLog> {
    const action = "Create Maintenance Log";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { machine_id, data, created_by });
      await client.query("BEGIN");

      const logResult = await client.query(
        `INSERT INTO machine_maintenance_logs (
           machine_id, maintenance_type, performed_at, technician, cost,
           next_service_date, notes, created_by
         ) VALUES ($1,$2, COALESCE($3, CURRENT_TIMESTAMP), $4, COALESCE($5, 0), $6, $7, $8)
         RETURNING *`,
        [
          machine_id,
          data.maintenance_type,
          data.performed_at ?? null,
          data.technician ?? null,
          data.cost ?? 0,
          data.next_service_date ?? null,
          data.notes ?? null,
          created_by,
        ]
      );

      if (data.next_service_date) {
        await client.query(
          `UPDATE machines SET next_service_date = $1 WHERE id = $2`,
          [data.next_service_date, machine_id]
        );
      }

      await client.query("COMMIT");

      const log = serializeLog(logResult.rows[0]);
      MyLogger.success(action, { id: log.id });
      return log;
    } catch (error: any) {
      await client.query("ROLLBACK").catch(() => undefined);
      MyLogger.error(action, error, { machine_id, data });
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteMaintenanceLog(
    machine_id: string,
    log_id: string
  ): Promise<boolean> {
    const action = "Delete Maintenance Log";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { machine_id, log_id });
      const result = await client.query(
        `DELETE FROM machine_maintenance_logs WHERE id = $1 AND machine_id = $2`,
        [log_id, machine_id]
      );
      const deleted = (result.rowCount ?? 0) > 0;
      MyLogger.success(action, { deleted });
      return deleted;
    } catch (error: any) {
      MyLogger.error(action, error, { machine_id, log_id });
      throw error;
    } finally {
      client.release();
    }
  }
}
