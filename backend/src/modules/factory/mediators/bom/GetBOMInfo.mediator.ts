import pool from "@/database/connection";
import {
  BillOfMaterials,
  BOMComponent,
  WorkOrderMaterialRequirement,
  WorkOrderMaterialAllocation,
  WorkOrderMaterialConsumption,
  MaterialShortage,
  BOMStats,
  MaterialPlanningStats,
  BOMQueryParams,
  MaterialRequirementsQueryParams
} from "@/types/bom";
import { MyLogger } from "@/utils/new-logger";

// Helper function to get user's accessible factories
async function getUserFactories(userId: number): Promise<{factory_id: string, factory_name: string, factory_code: string, role: string, is_primary: boolean}[]> {
  const query = `
    SELECT uf.factory_id, f.name as factory_name, f.code as factory_code, uf.role, uf.is_primary
    FROM user_factories uf
    JOIN factories f ON uf.factory_id = f.id
    WHERE uf.user_id = $1
  `;

  const result = await pool.query(query, [userId]);
  return result.rows;
}

// Helper function to check if user is admin
async function isUserAdmin(userId: number): Promise<boolean> {
  const query = 'SELECT role_id FROM users WHERE id = $1';
  const result = await pool.query(query, [userId]);
  if (result.rows.length === 0) return false;

  // Assuming role_id 1 is admin based on common patterns
  return result.rows[0].role_id === 1;
}

export class GetBOMInfoMediator {
  // Get all BOMs with pagination and filtering
  static async getBOMs(
    params: BOMQueryParams,
    userId: number
  ): Promise<{
    boms: BillOfMaterials[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const action = "GetBOMInfoMediator.getBOMs";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { params, userId });

      // Get user's accessible factories
      const userFactories = await getUserFactories(userId);
      const userFactoryIds = userFactories.map(f => f.factory_id);

      // Base query for BOMs
      const values: any[] = [];
      let paramIndex = 1;
      let query = `
        SELECT
          bom.id,
          bom.parent_product_id,
          p.name as parent_product_name,
          p.sku as parent_product_sku,
          bom.version,
          bom.effective_date,
          bom.is_active,
          bom.total_cost,
          bom.created_by,
          bom.created_at,
          bom.updated_by,
          bom.updated_at,
          bom.notes,
          u.full_name as created_by_name,
          ub.full_name as updated_by_name
        FROM bill_of_materials bom
        JOIN products p ON bom.parent_product_id = p.id
        LEFT JOIN users u ON bom.created_by = u.id
        LEFT JOIN users ub ON bom.updated_by = ub.id
      `;

      // Add factory access filter for non-admin users
      if (userFactoryIds.length > 0) {
        query += ` WHERE p.factory_id = ANY($${paramIndex}::uuid[])`;
        values.push(userFactoryIds);
        paramIndex++;
      } else {
        query += ` WHERE 1=1`;  // Add a dummy WHERE clause for consistency
      }

      // Apply filters
      const conditions = [];

      if (params.search) {
        conditions.push(`(p.name ILIKE $${paramIndex} OR p.sku ILIKE $${paramIndex} OR bom.version ILIKE $${paramIndex})`);
        values.push(`%${params.search}%`);
        paramIndex++;
      }

      if (params.parent_product_id) {
        conditions.push(`bom.parent_product_id = $${paramIndex}`);
        values.push(params.parent_product_id);
        paramIndex++;
      }

      if (params.is_active !== undefined) {
        conditions.push(`bom.is_active = $${paramIndex}`);
        values.push(params.is_active);
        paramIndex++;
      }

      if (conditions.length > 0) {
        query += ` AND ${conditions.join(' AND ')}`;
      }

      // Apply sorting
      const sortBy = params.sort_by || 'created_at';
      const sortOrder = params.sort_order || 'desc';
      query += ` ORDER BY bom.${sortBy} ${sortOrder}`;

      // Apply pagination
      const page = params.page || 1;
      const limit = params.limit || 20;
      const offset = (page - 1) * limit;
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      values.push(limit, offset);

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as total
        FROM bill_of_materials bom
        JOIN products p ON bom.parent_product_id = p.id
      `;

      if (userFactoryIds.length > 0) {
        countQuery += ` WHERE p.factory_id = ANY($${paramIndex}::uuid[])`;
      }

      if (conditions.length > 0) {
        countQuery += ` AND ${conditions.slice(0, -2).join(' AND ')}`; // Remove pagination conditions
      }

      const countValues = userFactoryIds.length > 0 ? [...userFactoryIds] : [];
      for (let i = 0; i < conditions.length - 2; i++) {
        countValues.push(values[userFactoryIds.length + i]);
      }

      const countResult = await client.query(countQuery, countValues);
      const total = parseInt(countResult.rows[0].total);

      // Get BOMs
      const result = await client.query(query, values);
      const boms: BillOfMaterials[] = result.rows.map(row => ({
        id: row.id,
        parent_product_id: row.parent_product_id,
        parent_product_name: row.parent_product_name,
        parent_product_sku: row.parent_product_sku,
        version: row.version,
        effective_date: row.effective_date,
        is_active: row.is_active,
        total_cost: parseFloat(row.total_cost),
        created_by: row.created_by,
        created_at: row.created_at,
        updated_by: row.updated_by,
        updated_at: row.updated_at,
        notes: row.notes
      }));

      const totalPages = Math.ceil(total / limit);

      MyLogger.success(action, {
        total,
        page,
        limit,
        bomsCount: boms.length
      });

      return {
        boms,
        total,
        page,
        limit,
        totalPages
      };

    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get BOM by ID with components
  static async getBOMById(bomId: string, userId: number): Promise<BillOfMaterials | null> {
    const action = "GetBOMInfoMediator.getBOMById";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { bomId, userId });

      // Get user's accessible factories
      const userFactories = await getUserFactories(userId);
      const userFactoryIds = userFactories.map(f => f.factory_id);

      // Get BOM with product info
      let query = `
        SELECT
          bom.id,
          bom.parent_product_id,
          p.name as parent_product_name,
          p.sku as parent_product_sku,
          bom.version,
          bom.effective_date,
          bom.is_active,
          bom.total_cost,
          bom.created_by,
          bom.created_at,
          bom.updated_by,
          bom.updated_at,
          bom.notes,
          u.full_name as created_by_name,
          ub.full_name as updated_by_name
        FROM bill_of_materials bom
        JOIN products p ON bom.parent_product_id = p.id
        LEFT JOIN users u ON bom.created_by = u.id
        LEFT JOIN users ub ON bom.updated_by = ub.id
        WHERE bom.id = $1
      `;

      const values: any[] = [bomId];

      // Add factory access filter for non-admin users
      // if (userFactoryIds.length > 0) {
      //   query += ` AND p.factory_id = ANY($2)`;
      //   values.push(userFactoryIds);
      // }

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        return null;
      }

      const bomRow = result.rows[0];

      // Get BOM components
      const componentsQuery = `
        SELECT
          bc.id,
          bc.bom_id,
          bc.component_product_id,
          p.name as component_product_name,
          p.sku as component_product_sku,
          bc.quantity_required,
          bc.unit_of_measure,
          bc.is_optional,
          bc.scrap_factor,
          bc.unit_cost,
          bc.total_cost,
          bc.lead_time_days,
          bc.supplier_id,
          s.name as supplier_name,
          bc.specifications,
          bc.notes,
          bc.created_at,
          bc.updated_at
        FROM bom_components bc
        JOIN products p ON bc.component_product_id = p.id
        LEFT JOIN suppliers s ON bc.supplier_id = s.id
        WHERE bc.bom_id = $1
        ORDER BY bc.created_at
      `;

      const componentsResult = await client.query(componentsQuery, [bomId]);
      const components: BOMComponent[] = componentsResult.rows.map(row => ({
        id: row.id,
        bom_id: row.bom_id,
        component_product_id: row.component_product_id,
        component_product_name: row.component_product_name,
        component_product_sku: row.component_product_sku,
        quantity_required: parseFloat(row.quantity_required),
        unit_of_measure: row.unit_of_measure,
        is_optional: row.is_optional,
        scrap_factor: parseFloat(row.scrap_factor),
        unit_cost: parseFloat(row.unit_cost),
        total_cost: parseFloat(row.total_cost),
        lead_time_days: row.lead_time_days,
        supplier_id: row.supplier_id,
        supplier_name: row.supplier_name,
        specifications: row.specifications,
        notes: row.notes,
        created_at: row.created_at,
        updated_at: row.updated_at
      }));

      const bom: BillOfMaterials = {
        id: bomRow.id,
        parent_product_id: bomRow.parent_product_id,
        parent_product_name: bomRow.parent_product_name,
        parent_product_sku: bomRow.parent_product_sku,
        version: bomRow.version,
        effective_date: bomRow.effective_date,
        is_active: bomRow.is_active,
        total_cost: parseFloat(bomRow.total_cost),
        created_by: bomRow.created_by,
        created_at: bomRow.created_at,
        updated_by: bomRow.updated_by,
        updated_at: bomRow.updated_at,
        notes: bomRow.notes,
        components
      };

      MyLogger.success(action, { bomId, found: true });
      return bom;

    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get BOM statistics
  static async getBOMStats(userId: number): Promise<BOMStats> {
    const action = "GetBOMInfoMediator.getBOMStats";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { userId });

      // Get user's accessible factories
      const userFactories = await getUserFactories(userId);
      const userFactoryIds = userFactories.map(f => f.factory_id);

      const values: any[] = [];
      let paramIndex = 1;

      // Get BOM statistics
      const statsQuery = `
        SELECT
          COUNT(*) as total_boms,
          COUNT(*) FILTER (WHERE bom.is_active = true) as active_boms,
          AVG(component_count) as average_components,
          AVG(bom.total_cost) as average_cost,
          MAX(bom.total_cost) as max_cost,
          MIN(bom.total_cost) as min_cost,
          COUNT(*) FILTER (WHERE bc.supplier_id IS NULL) as components_without_supplier,
          COUNT(*) FILTER (WHERE bom.effective_date < CURRENT_DATE) as outdated_boms
        FROM bill_of_materials bom
        JOIN products p ON bom.parent_product_id = p.id
        LEFT JOIN (
          SELECT bom_id, COUNT(*) as component_count
          FROM bom_components
          GROUP BY bom_id
        ) comp_count ON bom.id = comp_count.bom_id
        LEFT JOIN bom_components bc ON bom.id = bc.bom_id
        ${userFactoryIds.length > 0 ? `WHERE p.factory_id = ANY($${paramIndex}::uuid[])` : ''}
      `;

      if (userFactoryIds.length > 0) {
        values.push(userFactoryIds);
      }

      const statsResult = await client.query(statsQuery, values);
      const stats = statsResult.rows[0];

      // Get BOM names for most/least expensive
      const costQuery = `
        SELECT
          p.name as product_name,
          bom.total_cost
        FROM bill_of_materials bom
        JOIN products p ON bom.parent_product_id = p.id
        ${userFactoryIds.length > 0 ? `WHERE p.factory_id IN (${userFactoryIds.map(() => '?').join(',')})` : ''}
        ORDER BY bom.total_cost DESC
        LIMIT 2
      `;

      const costValues = userFactoryIds.length > 0 ? [...userFactoryIds] : [];

      const costResult = await client.query(costQuery, costValues);
      const mostExpensive = costResult.rows[0]?.product_name || 'None';
      const leastExpensive = costResult.rows[1]?.product_name || 'None';

      const bomStats: BOMStats = {
        total_boms: parseInt(stats.total_boms),
        active_boms: parseInt(stats.active_boms),
        average_components: parseFloat(stats.average_components || 0),
        average_cost: parseFloat(stats.average_cost || 0),
        most_expensive_bom: mostExpensive,
        least_expensive_bom: leastExpensive,
        components_without_supplier: parseInt(stats.components_without_supplier || 0),
        outdated_boms: parseInt(stats.outdated_boms || 0)
      };

      MyLogger.success(action, bomStats);
      return bomStats;

    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get material requirements for work orders
  static async getMaterialRequirements(
    params: MaterialRequirementsQueryParams,
    userId: number
  ): Promise<{
    requirements: WorkOrderMaterialRequirement[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const action = "GetBOMInfoMediator.getMaterialRequirements";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { params, userId });

      // Get user's accessible factories
      const userFactories = await getUserFactories(userId);
      const userFactoryIds = userFactories.map(f => f.factory_id);

      // Base query for material requirements
      const values: any[] = [];
      let paramIndex = 1;
      let query = `
        SELECT
          wmr.id,
          wmr.work_order_id,
          wmr.material_id,
          wmr.material_name,
          wmr.material_sku,
          wmr.required_quantity,
          wmr.allocated_quantity,
          wmr.consumed_quantity,
          wmr.unit_of_measure,
          wmr.status,
          wmr.priority,
          wmr.required_date,
          wmr.bom_component_id,
          wmr.supplier_id,
          wmr.supplier_name,
          wmr.unit_cost,
          wmr.total_cost,
          wmr.lead_time_days,
          wmr.is_critical,
          wmr.notes,
          wmr.created_at,
          wmr.updated_at,
          wo.work_order_number,
          p.name as product_name,
          p.sku as product_sku
        FROM work_order_material_requirements wmr
        JOIN work_orders wo ON wmr.work_order_id = wo.id
        JOIN products p ON wo.product_id = p.id
      `;

      // Add factory access filter for non-admin users
      if (userFactoryIds.length > 0) {
        query += ` WHERE p.factory_id = ANY($${paramIndex}::uuid[])`;
        values.push(userFactoryIds);
        paramIndex++;
      } else {
        query += ` WHERE 1=1`;  // Add a dummy WHERE clause for consistency
      }

      // Apply filters
      const conditions = [];

      if (params.work_order_id) {
        conditions.push(`wmr.work_order_id = $${paramIndex}`);
        values.push(params.work_order_id);
        paramIndex++;
      }

      if (params.status) {
        conditions.push(`wmr.status = $${paramIndex}`);
        values.push(params.status);
        paramIndex++;
      }

      if (params.material_id) {
        conditions.push(`wmr.material_id = $${paramIndex}`);
        values.push(params.material_id);
        paramIndex++;
      }

      if (params.required_date_from) {
        conditions.push(`wmr.required_date >= $${paramIndex}`);
        values.push(params.required_date_from);
        paramIndex++;
      }

      if (params.required_date_to) {
        conditions.push(`wmr.required_date <= $${paramIndex}`);
        values.push(params.required_date_to);
        paramIndex++;
      }

      if (conditions.length > 0) {
        query += ` AND ${conditions.join(' AND ')}`;
      }

      // Apply sorting
      const sortBy = params.sort_by || 'required_date';
      const sortOrder = params.sort_order || 'asc';
      query += ` ORDER BY wmr.${sortBy} ${sortOrder}`;

      // Apply pagination
      const page = params.page || 1;
      const limit = params.limit || 20;
      const offset = (page - 1) * limit;
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      values.push(limit, offset);

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as total
        FROM work_order_material_requirements wmr
        JOIN work_orders wo ON wmr.work_order_id = wo.id
        JOIN products p ON wo.product_id = p.id
      `;

      if (userFactoryIds.length > 0) {
        countQuery += ` WHERE p.factory_id = ANY($${paramIndex}::uuid[])`;
      }

      if (conditions.length > 0) {
        countQuery += ` AND ${conditions.slice(0, -2).join(' AND ')}`;
      }

      const countValues = userFactoryIds.length > 0 ? [...userFactoryIds] : [];
      for (let i = 0; i < conditions.length - 2; i++) {
        countValues.push(values[userFactoryIds.length + i]);
      }

      const countResult = await client.query(countQuery, countValues);
      const total = parseInt(countResult.rows[0].total);

      // Get material requirements
      const result = await client.query(query, values);
      const requirements: WorkOrderMaterialRequirement[] = result.rows.map(row => ({
        id: row.id,
        work_order_id: row.work_order_id,
        material_id: row.material_id,
        material_name: row.material_name,
        material_sku: row.material_sku,
        required_quantity: parseFloat(row.required_quantity),
        allocated_quantity: parseFloat(row.allocated_quantity),
        consumed_quantity: parseFloat(row.consumed_quantity),
        unit_of_measure: row.unit_of_measure,
        status: row.status,
        priority: row.priority,
        required_date: row.required_date,
        bom_component_id: row.bom_component_id,
        supplier_id: row.supplier_id,
        supplier_name: row.supplier_name,
        unit_cost: parseFloat(row.unit_cost),
        total_cost: parseFloat(row.total_cost),
        lead_time_days: row.lead_time_days,
        is_critical: row.is_critical,
        notes: row.notes,
        created_at: row.created_at,
        updated_at: row.updated_at
      }));

      const totalPages = Math.ceil(total / limit);

      MyLogger.success(action, {
        total,
        page,
        limit,
        requirementsCount: requirements.length
      });

      return {
        requirements,
        total,
        page,
        limit,
        totalPages
      };

    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get material planning statistics
  static async getMaterialPlanningStats(userId: number): Promise<MaterialPlanningStats> {
    const action = "GetBOMInfoMediator.getMaterialPlanningStats";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { userId });

      // Get user's accessible factories
      const userFactories = await getUserFactories(userId);
      const userFactoryIds = userFactories.map(f => f.factory_id);

      const values: any[] = [];
      let paramIndex = 1;
      const statsQuery = `
        SELECT
          COUNT(*) as total_requirements,
          COUNT(*) FILTER (WHERE wmr.status = 'pending') as pending_allocations,
          COUNT(*) FILTER (WHERE wmr.status = 'short') as material_shortages,
          COUNT(*) FILTER (WHERE wmr.status = 'short' AND wmr.is_critical = true) as critical_shortages,
          SUM(wmr.total_cost) as total_material_value,
          AVG(wmr.lead_time_days) as average_lead_time,
          COUNT(*) FILTER (WHERE wmr.status = 'fulfilled') as fulfilled_requirements,
          COUNT(*) as total_fulfilled_or_allocated
        FROM work_order_material_requirements wmr
        JOIN work_orders wo ON wmr.work_order_id = wo.id
        JOIN products p ON wo.product_id = p.id
        WHERE wmr.status IN ('allocated', 'fulfilled')
        ${userFactoryIds.length > 0 ? `AND p.factory_id = ANY($${paramIndex}::uuid[])` : ''}
      `;

      if (userFactoryIds.length > 0) {
        values.push(userFactoryIds);
      }

      const statsResult = await client.query(statsQuery, values);
      const stats = statsResult.rows[0];

      // Calculate on-time delivery rate
      const onTimeDelivery = stats.total_fulfilled_or_allocated > 0
        ? (parseInt(stats.fulfilled_requirements || 0) / parseInt(stats.total_fulfilled_or_allocated)) * 100
        : 0;

      const materialPlanningStats: MaterialPlanningStats = {
        total_requirements: parseInt(stats.total_requirements || 0),
        pending_allocations: parseInt(stats.pending_allocations || 0),
        material_shortages: parseInt(stats.material_shortages || 0),
        critical_shortages: parseInt(stats.critical_shortages || 0),
        total_material_value: parseFloat(stats.total_material_value || 0),
        average_lead_time: parseFloat(stats.average_lead_time || 0),
        on_time_delivery: onTimeDelivery,
        cost_variance: 0 // Would need more complex calculation for cost variance
      };

      MyLogger.success(action, materialPlanningStats);
      return materialPlanningStats;

    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }
}
