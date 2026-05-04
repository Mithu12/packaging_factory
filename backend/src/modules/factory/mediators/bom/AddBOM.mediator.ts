import pool from "@/database/connection";
import {
  BillOfMaterials,
  BOMComponent,
  CreateBOMRequest,
  CreateBOMComponentRequest
} from "@/types/bom";
import { MyLogger } from "@/utils/new-logger";
import { validateBomProductTypes } from "./validateBomTypes";

// Helper function to get user's accessible factories
async function getUserFactories(userId: number): Promise<{factory_id: string, factory_name: string, factory_code: string, role: string, is_primary: boolean}[]> {
  const query = 'SELECT * FROM get_user_factories($1)';
  const result = await pool.query(query, [userId]);
  return result.rows;
}

export class AddBOMMediator {
  static async createBOM(
    bomData: CreateBOMRequest,
    userId: string
  ): Promise<BillOfMaterials> {
    const action = "AddBOMMediator.createBOM";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { bomData, userId });

      // Get user's accessible factories
      const userFactories = await getUserFactories(parseInt(userId));
      const userFactoryIds = userFactories.map(f => f.factory_id);

      // Verify the parent product exists and user has access to it
      const productQuery = `
        SELECT p.id, p.name, p.sku
        FROM products p
        WHERE p.id = $1
      `;

      const productResult = await client.query(productQuery, [bomData.parent_product_id]);

      if (productResult.rows.length === 0) {
        throw new Error('Parent product not found');
      }

      const product = productResult.rows[0];

      // Check if user has access to the product's factory
      // if (userFactoryIds.length > 0 && !userFactoryIds.includes(product.factory_id)) {
      //   throw new Error('Access denied to this product');
      // }

      // Check if BOM version already exists for this product
      const existingBOMQuery = `
        SELECT id FROM bill_of_materials
        WHERE parent_product_id = $1 AND version = $2 AND is_active = true
      `;

      const existingBOMResult = await client.query(existingBOMQuery, [
        bomData.parent_product_id,
        bomData.version
      ]);

      if (existingBOMResult.rows.length > 0) {
        throw new Error(`BOM version ${bomData.version} already exists for this product`);
      }

      // Enforce product-type rules: parent must be FG or RRM; components must match.
      await validateBomProductTypes(
        client,
        bomData.parent_product_id,
        bomData.components.map((c) => c.component_product_id)
      );

      // Calculate total cost from components
      let totalCost = 0;

      // Validate and prepare components
      const validatedComponents: CreateBOMComponentRequest[] = [];
      for (const component of bomData.components) {
        // Verify component product exists
        const componentProductQuery = `
          SELECT p.id, p.name, p.sku, p.cost_price, p.unit_of_measure, p.supplier_id
          FROM products p
          WHERE p.id = $1
        `;

        const componentProductResult = await client.query(componentProductQuery, [component.component_product_id]);

        if (componentProductResult.rows.length === 0) {
          throw new Error(`Component product ${component.component_product_id} not found`);
        }

        const componentProduct = componentProductResult.rows[0];

        // Check if user has access to the component product's factory
        // if (userFactoryIds.length > 0 && !userFactoryIds.includes(componentProduct.factory_id)) {
        //   throw new Error('Access denied to component product');
        // }

        const unitCost = parseFloat(componentProduct.cost_price || '0');
        const componentTotalCost = unitCost * component.quantity_required;

        totalCost += componentTotalCost;

        validatedComponents.push({
          ...component,
          // Use product cost price if available, otherwise use provided unit_cost
          unit_cost: unitCost,
          total_cost: componentTotalCost,
          supplier_id: componentProduct.supplier_id || null
        });
      }

      // Create BOM
      const createBOMQuery = `
        INSERT INTO bill_of_materials (
          parent_product_id,
          version,
          effective_date,
          is_active,
          category,
          total_cost,
          created_by,
          notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `;

      const bomValues = [
        bomData.parent_product_id,
        bomData.version,
        bomData.effective_date,
        true, // is_active
        bomData.category,
        totalCost,
        userId,
        bomData.notes || null
      ];

      const bomResult = await client.query(createBOMQuery, bomValues);

      if (bomResult.rows.length === 0) {
        throw new Error('Failed to create BOM');
      }

      const bomId = bomResult.rows[0].id;

      // Create BOM components
      for (const component of validatedComponents) {
        const createComponentQuery = `
          INSERT INTO bom_components (
            bom_id,
            component_product_id,
            quantity_required,
            unit_of_measure,
            is_optional,
            scrap_factor,
            unit_cost,
            total_cost,
            lead_time_days,
            supplier_id,
            specifications,
            notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `;

        const componentValues = [
          bomId,
          component.component_product_id,
          component.quantity_required,
          component.unit_of_measure,
          component.is_optional,
          component.scrap_factor,
          component.unit_cost,
          component.total_cost,
          component.lead_time_days || 0,
          component.supplier_id || null,
          component.specifications || null,
          component.notes || null 
        ];

        await client.query(createComponentQuery, componentValues);
      }

      // Get the complete BOM with components
      const finalQuery = `
        SELECT
          bom.id,
          bom.parent_product_id,
          p.name as parent_product_name,
          p.sku as parent_product_sku,
          bom.version,
          bom.effective_date,
          bom.is_active,
          bom.category,
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

      const finalResult = await client.query(finalQuery, [bomId]);
      const bomRow = finalResult.rows[0];

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
        category: bomRow.category,
        total_cost: parseFloat(bomRow.total_cost),
        created_by: bomRow.created_by,
        created_at: bomRow.created_at,
        updated_by: bomRow.updated_by,
        updated_at: bomRow.updated_at,
        notes: bomRow.notes,
        components
      };

      MyLogger.success(action, {
        bomId: bom.id,
        version: bom.version,
        componentsCount: components.length
      });

      return bom;

    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }
}
