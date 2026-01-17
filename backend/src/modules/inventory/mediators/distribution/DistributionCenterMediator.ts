import pool from "@/database/connection";
import { MyLogger } from "@/utils/new-logger";
import {
  DistributionCenter,
  CreateDistributionCenterRequest,
  UpdateDistributionCenterRequest,
  DistributionCenterQueryParams,
  DistributionCenterStats,
} from "@/types/distribution";

export class DistributionCenterMediator {
  static async getDistributionCenters(
    params: DistributionCenterQueryParams = {}
  ): Promise<{
    centers: DistributionCenter[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const action = "Get Distribution Centers";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { params });

      const {
        page = 1,
        limit = 20,
        search,
        type,
        status,
        city,
        state,
        sortBy = "name",
        sortOrder = "asc",
      } = params;

      const offset = (page - 1) * limit;

      // Build the base query
      let query = `
        SELECT 
          dc.*,
          u.username as manager_name
        FROM distribution_centers dc
        LEFT JOIN users u ON dc.manager_id = u.id
        WHERE 1=1
      `;

      const queryParams: any[] = [];
      let paramIndex = 1;

      // Apply filters
      if (search) {
        query += ` AND (
          dc.name ILIKE $${paramIndex} OR 
          dc.code ILIKE $${paramIndex} OR 
          dc.city ILIKE $${paramIndex} OR
          dc.contact_person ILIKE $${paramIndex}
        )`;
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      if (type) {
        query += ` AND dc.type = $${paramIndex}`;
        queryParams.push(type);
        paramIndex++;
      }

      if (status) {
        query += ` AND dc.status = $${paramIndex}`;
        queryParams.push(status);
        paramIndex++;
      }

      if (city) {
        query += ` AND dc.city ILIKE $${paramIndex}`;
        queryParams.push(`%${city}%`);
        paramIndex++;
      }

      if (state) {
        query += ` AND dc.state ILIKE $${paramIndex}`;
        queryParams.push(`%${state}%`);
        paramIndex++;
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM (${query}) as count_query`;
      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // Add sorting and pagination
      const validSortColumns = [
        "name",
        "type",
        "city",
        "state",
        "created_at",
        "updated_at",
      ];
      const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : "name";
      const safeSortOrder = sortOrder === "desc" ? "DESC" : "ASC";

      query += ` ORDER BY dc.${safeSortBy} ${safeSortOrder}`;
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(limit, offset);

      const result = await client.query(query, queryParams);
      const totalPages = Math.ceil(total / limit);

      MyLogger.success(action, {
        centersCount: result.rows.length,
        total,
        page,
        totalPages,
      });

      return {
        centers: result.rows,
        total,
        page,
        totalPages,
      };
    } catch (error: any) {
      MyLogger.error(action, error, { params });
      throw error;
    } finally {
      client.release();
    }
  }

  static async getDistributionCenterById(
    id: number
  ): Promise<DistributionCenter | null> {
    const action = "Get Distribution Center By ID";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { id });

      const query = `
        SELECT 
          dc.*,
          u.username as manager_name
        FROM distribution_centers dc
        LEFT JOIN users u ON dc.manager_id = u.id
        WHERE dc.id = $1
      `;

      const result = await client.query(query, [id]);

      if (result.rows.length === 0) {
        MyLogger.warn(action, { id, message: "Distribution center not found" });
        return null;
      }

      MyLogger.success(action, { id, centerName: result.rows[0].name });
      return result.rows[0];
    } catch (error: any) {
      MyLogger.error(action, error, { id });
      throw error;
    } finally {
      client.release();
    }
  }

  static async createDistributionCenter(
    data: CreateDistributionCenterRequest,
    createdBy: number
  ): Promise<DistributionCenter> {
    const action = "Create Distribution Center";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { name: data.name, type: data.type });

      await client.query("BEGIN");

      // Check if name already exists
      const existingQuery =
        "SELECT id FROM distribution_centers WHERE name = $1";
      const existingResult = await client.query(existingQuery, [data.name]);

      if (existingResult.rows.length > 0) {
        throw new Error("Distribution center with this name already exists");
      }

      const insertQuery = `
        INSERT INTO distribution_centers (
          name, type, address, city, state, zip_code, country,
          latitude, longitude, contact_person, phone, email,
          capacity_volume, capacity_weight, operating_hours, facilities,
          manager_id, cost_center_id, notes
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
        ) RETURNING *
      `;

      const result = await client.query(insertQuery, [
        data.name,
        data.type || "warehouse",
        data.address,
        data.city,
        data.state,
        data.zip_code,
        data.country || "USA",
        data.latitude,
        data.longitude,
        data.contact_person,
        data.phone,
        data.email,
        data.capacity_volume,
        data.capacity_weight,
        data.operating_hours ? JSON.stringify(data.operating_hours) : null,
        data.facilities ? JSON.stringify(data.facilities) : null,
        data.manager_id,
        data.cost_center_id,
        data.notes,
      ]);

      await client.query("COMMIT");

      const center = result.rows[0];
      MyLogger.success(action, {
        centerId: center.id,
        centerName: center.name,
        code: center.code,
      });

      return center;
    } catch (error: any) {
      await client.query("ROLLBACK");
      MyLogger.error(action, error, { name: data.name });
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateDistributionCenter(
    id: number,
    data: UpdateDistributionCenterRequest,
    updatedBy: number
  ): Promise<DistributionCenter> {
    const action = "Update Distribution Center";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { id, updates: Object.keys(data) });

      await client.query("BEGIN");

      // Check if center exists
      const existingQuery = "SELECT * FROM distribution_centers WHERE id = $1";
      const existingResult = await client.query(existingQuery, [id]);

      if (existingResult.rows.length === 0) {
        throw new Error("Distribution center not found");
      }

      // Check if name is being changed and already exists
      if (data.name && data.name !== existingResult.rows[0].name) {
        const nameQuery =
          "SELECT id FROM distribution_centers WHERE name = $1 AND id != $2";
        const nameResult = await client.query(nameQuery, [data.name, id]);

        if (nameResult.rows.length > 0) {
          throw new Error("Distribution center with this name already exists");
        }
      }

      // Build dynamic update query
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      const fieldMap = {
        name: "name",
        type: "type",
        address: "address",
        city: "city",
        state: "state",
        zip_code: "zip_code",
        country: "country",
        latitude: "latitude",
        longitude: "longitude",
        contact_person: "contact_person",
        phone: "phone",
        email: "email",
        capacity_volume: "capacity_volume",
        capacity_weight: "capacity_weight",
        manager_id: "manager_id",
        cost_center_id: "cost_center_id",
        status: "status",
        is_primary: "is_primary",
        notes: "notes",
      };

      Object.entries(fieldMap).forEach(([key, dbField]) => {
        if (data.hasOwnProperty(key)) {
          updateFields.push(`${dbField} = $${paramIndex}`);
          updateValues.push((data as any)[key]);
          paramIndex++;
        }
      });

      // Handle JSON fields separately
      if (data.operating_hours !== undefined) {
        updateFields.push(`operating_hours = $${paramIndex}`);
        updateValues.push(
          data.operating_hours ? JSON.stringify(data.operating_hours) : null
        );
        paramIndex++;
      }

      if (data.facilities !== undefined) {
        updateFields.push(`facilities = $${paramIndex}`);
        updateValues.push(
          data.facilities ? JSON.stringify(data.facilities) : null
        );
        paramIndex++;
      }

      if (updateFields.length === 0) {
        throw new Error("No fields to update");
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      const updateQuery = `
        UPDATE distribution_centers 
        SET ${updateFields.join(", ")}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      updateValues.push(id);

      const result = await client.query(updateQuery, updateValues);
      await client.query("COMMIT");

      const center = result.rows[0];
      MyLogger.success(action, {
        centerId: center.id,
        centerName: center.name,
        updatedFields: Object.keys(data),
      });

      return center;
    } catch (error: any) {
      await client.query("ROLLBACK");
      MyLogger.error(action, error, { id, updates: Object.keys(data) });
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteDistributionCenter(
    id: number,
    deletedBy: number
  ): Promise<void> {
    const action = "Delete Distribution Center";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { id });

      await client.query("BEGIN");

      // Check if center exists
      const existingQuery =
        "SELECT name, is_primary FROM distribution_centers WHERE id = $1";
      const existingResult = await client.query(existingQuery, [id]);

      if (existingResult.rows.length === 0) {
        throw new Error("Distribution center not found");
      }

      const center = existingResult.rows[0];

      // Prevent deletion of primary center
      if (center.is_primary) {
        throw new Error("Cannot delete the primary distribution center");
      }

      // Check for existing stock
      const stockQuery =
        "SELECT COUNT(*) as count FROM product_locations WHERE distribution_center_id = $1 AND current_stock > 0";
      const stockResult = await client.query(stockQuery, [id]);

      if (parseInt(stockResult.rows[0].count) > 0) {
        throw new Error(
          "Cannot delete distribution center with existing stock. Transfer stock first."
        );
      }

      // Check for pending transfers
      const transferQuery = `
        SELECT COUNT(*) as count 
        FROM stock_transfers 
        WHERE (from_center_id = $1 OR to_center_id = $1) 
        AND status IN ('pending', 'approved', 'shipped', 'in_transit')
      `;
      const transferResult = await client.query(transferQuery, [id]);

      if (parseInt(transferResult.rows[0].count) > 0) {
        throw new Error(
          "Cannot delete distribution center with pending transfers"
        );
      }

      // Soft delete - mark as inactive
      const deleteQuery = `
        UPDATE distribution_centers 
        SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;
      await client.query(deleteQuery, [id]);

      await client.query("COMMIT");

      MyLogger.success(action, { id, centerName: center.name });
    } catch (error: any) {
      await client.query("ROLLBACK");
      MyLogger.error(action, error, { id });
      throw error;
    } finally {
      client.release();
    }
  }

  static async getDistributionCenterStats(): Promise<
    DistributionCenterStats[]
  > {
    const action = "Get Distribution Center Stats";
    const client = await pool.connect();

    try {
      MyLogger.info(action);

      const query = `
        SELECT * FROM distribution_center_stats
        ORDER BY name
      `;

      const result = await client.query(query);

      MyLogger.success(action, { statsCount: result.rows.length });
      return result.rows;
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async setPrimaryDistributionCenter(
    id: number,
    updatedBy: number
  ): Promise<void> {
    const action = "Set Primary Distribution Center";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { id });

      await client.query("BEGIN");

      // Verify center exists and is active
      const existingQuery =
        "SELECT name, status FROM distribution_centers WHERE id = $1";
      const existingResult = await client.query(existingQuery, [id]);

      if (existingResult.rows.length === 0) {
        throw new Error("Distribution center not found");
      }

      if (existingResult.rows[0].status !== "active") {
        throw new Error(
          "Only active distribution centers can be set as primary"
        );
      }

      // Remove primary flag from all centers
      await client.query("UPDATE distribution_centers SET is_primary = false");

      // Set the specified center as primary
      const updateQuery = `
        UPDATE distribution_centers 
        SET is_primary = true, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;
      await client.query(updateQuery, [id]);

      await client.query("COMMIT");

      MyLogger.success(action, {
        id,
        centerName: existingResult.rows[0].name,
      });
    } catch (error: any) {
      await client.query("ROLLBACK");
      MyLogger.error(action, error, { id });
      throw error;
    } finally {
      client.release();
    }
  }
}
