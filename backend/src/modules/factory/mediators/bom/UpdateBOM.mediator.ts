import pool from "@/database/connection";
import { MyLogger } from "@/utils/new-logger";
import {
  BillOfMaterials,
  UpdateBOMRequest,
  UpdateBOMComponentRequest,
} from "@/types/bom";
import { validateBomProductTypes } from "./validateBomTypes";

const action = "UpdateBOMMediator";

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

export class UpdateBOMMediator {
  static async updateBOM(
    bomId: string,
    updateData: UpdateBOMRequest,
    userId: string
  ): Promise<BillOfMaterials> {
    
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      MyLogger.info(action, { bomId, updateData, userId });

      // Get user's accessible factories
      const userFactories = await getUserFactories(parseInt(userId));
      const userFactoryIds = userFactories.map(f => f.factory_id);

      // Verify the BOM exists and user has access to it
      const bomQuery = `
        SELECT bom.*, p.name as parent_product_name, p.sku as parent_product_sku
        FROM bill_of_materials bom
        JOIN products p ON bom.parent_product_id = p.id
        WHERE bom.id = $1
      `; 

      const bomResult = await client.query(bomQuery, [bomId]);

      if (bomResult.rows.length === 0) {
        throw new Error('BOM not found');
      }

      const existingBOM = bomResult.rows[0];

      // Check if user has access to the BOM's product factory
      if (userFactoryIds.length > 0 && !userFactoryIds.includes(existingBOM.factory_id)) {
        throw new Error('Access denied to this BOM');
      }

      // Check if version is being changed and if new version already exists
      if (updateData.version && updateData.version !== existingBOM.version) {
        const existingVersionQuery = `
          SELECT id FROM bill_of_materials
          WHERE parent_product_id = $1 AND version = $2 AND id != $3 AND is_active = true
        `;

        const existingVersionResult = await client.query(existingVersionQuery, [
          existingBOM.parent_product_id,
          updateData.version,
          bomId
        ]);

        if (existingVersionResult.rows.length > 0) {
          throw new Error(`BOM version ${updateData.version} already exists for this product`);
        }
      }

      // Update BOM basic information
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (updateData.version !== undefined) {
        updateFields.push(`version = $${paramIndex++}`);
        updateValues.push(updateData.version);
      }

      if (updateData.effective_date !== undefined) {
        updateFields.push(`effective_date = $${paramIndex++}`);
        updateValues.push(updateData.effective_date);
      }

      if (updateData.is_active !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        updateValues.push(updateData.is_active);
      }

      if (updateData.notes !== undefined) {
        updateFields.push(`notes = $${paramIndex++}`);
        updateValues.push(updateData.notes);
      }

      // Always update the updated_by and updated_at fields
      updateFields.push(`updated_by = $${paramIndex++}`);
      updateValues.push(parseInt(userId));
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      // Update BOM if there are fields to update
      if (updateFields.length > 1) { // More than just updated_by and updated_at
        const updateBOMQuery = `
          UPDATE bill_of_materials
          SET ${updateFields.join(', ')}
          WHERE id = $${paramIndex}
          RETURNING *
        `;
        updateValues.push(bomId);

        await client.query(updateBOMQuery, updateValues);
      }

      // Handle component updates if provided
      if (updateData.components && updateData.components.length > 0) {
        // Get existing components
        const existingComponentsQuery = `
          SELECT * FROM bom_components WHERE bom_id = $1
        `;
        const existingComponentsResult = await client.query(existingComponentsQuery, [bomId]);
        const existingComponents = existingComponentsResult.rows;

        // Process component updates
        for (const componentUpdate of updateData.components) {
          if (componentUpdate.id) {
            // Update existing component
            const existingComponent = existingComponents.find(c => c.id === componentUpdate.id);
            if (!existingComponent) {
              throw new Error(`Component with ID ${componentUpdate.id} not found in BOM`);
            }

            // Validate component product if being changed
            if (componentUpdate.component_product_id && componentUpdate.component_product_id !== existingComponent.component_product_id) {
              const componentProductQuery = `
                SELECT p.id, p.name, p.sku, p.cost_price
                FROM products p
                WHERE p.id = $1
              `;

              const componentProductResult = await client.query(componentProductQuery, [componentUpdate.component_product_id]);

              if (componentProductResult.rows.length === 0) {
                throw new Error(`Component product ${componentUpdate.component_product_id} not found`);
              }

              const componentProduct = componentProductResult.rows[0];

              // Check if user has access to the component product's factory
              // if (userFactoryIds.length > 0 && !userFactoryIds.includes(componentProduct.factory_id)) {
              //   throw new Error(`Access denied to component product ${componentProduct.name}`);
              // }
            }

            // Build update query for component
            const componentUpdateFields: string[] = [];
            const componentUpdateValues: any[] = [];
            let componentParamIndex = 1;

            if (componentUpdate.component_product_id !== undefined) {
              componentUpdateFields.push(`component_product_id = $${componentParamIndex++}`);
              componentUpdateValues.push(componentUpdate.component_product_id);
            }

            if (componentUpdate.quantity_required !== undefined) {
              componentUpdateFields.push(`quantity_required = $${componentParamIndex++}`);
              componentUpdateValues.push(componentUpdate.quantity_required);
            }

            if (componentUpdate.unit_of_measure !== undefined) {
              componentUpdateFields.push(`unit_of_measure = $${componentParamIndex++}`);
              componentUpdateValues.push(componentUpdate.unit_of_measure);
            }

            if (componentUpdate.is_optional !== undefined) {
              componentUpdateFields.push(`is_optional = $${componentParamIndex++}`);
              componentUpdateValues.push(componentUpdate.is_optional);
            }

            if (componentUpdate.scrap_factor !== undefined) {
              componentUpdateFields.push(`scrap_factor = $${componentParamIndex++}`);
              componentUpdateValues.push(componentUpdate.scrap_factor);
            }

            if (componentUpdate.specifications !== undefined) {
              componentUpdateFields.push(`specifications = $${componentParamIndex++}`);
              componentUpdateValues.push(componentUpdate.specifications);
            }

            if (componentUpdate.notes !== undefined) {
              componentUpdateFields.push(`notes = $${componentParamIndex++}`);
              componentUpdateValues.push(componentUpdate.notes);
            }

            // Calculate costs if quantity or product changed
            if (componentUpdate.quantity_required !== undefined || componentUpdate.component_product_id !== undefined) {
              const quantity = componentUpdate.quantity_required ?? existingComponent.quantity_required;
              let unitCost = existingComponent.unit_cost;

              if (componentUpdate.component_product_id) {
                const productQuery = `SELECT cost_price FROM products WHERE id = $1`;
                const productResult = await client.query(productQuery, [componentUpdate.component_product_id]);
                if (productResult.rows.length > 0) {
                  unitCost = productResult.rows[0].cost_price || 0;
                }
              }

              componentUpdateFields.push(`unit_cost = $${componentParamIndex++}`);
              componentUpdateValues.push(unitCost);
              componentUpdateFields.push(`total_cost = $${componentParamIndex++}`);
              componentUpdateValues.push(unitCost * quantity);
            }

            // Update component if there are fields to update
            if (componentUpdateFields.length > 0) {
              const updateComponentQuery = `
                UPDATE bom_components
                SET ${componentUpdateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $${componentParamIndex}
              `;
              componentUpdateValues.push(componentUpdate.id);

              await client.query(updateComponentQuery, componentUpdateValues);
            }
          } else {
            // Add new component (if component_product_id is provided)
            if (componentUpdate.component_product_id) {
              // Validate component product
              const componentProductQuery = `
                SELECT p.id, p.name, p.sku, p.cost_price, p.supplier_id
                FROM products p
                WHERE p.id = $1
              `;

              const componentProductResult = await client.query(componentProductQuery, [componentUpdate.component_product_id]);

              if (componentProductResult.rows.length === 0) {
                throw new Error(`Component product ${componentUpdate.component_product_id} not found`);
              }

              const componentProduct = componentProductResult.rows[0];

              // Check if user has access to the component product's factory
              // if (userFactoryIds.length > 0 && !userFactoryIds.includes(componentProduct.factory_id)) {
              //   throw new Error(`Access denied to component product ${componentProduct.name}`);
              // }

              const quantity = componentUpdate.quantity_required || 1;
              const unitCost = componentProduct.cost_price || 0;
              const supplierId = componentProduct.supplier_id || null;
              const totalCost = unitCost * quantity;

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
                componentUpdate.component_product_id,
                quantity,
                componentUpdate.unit_of_measure || 'pcs',
                componentUpdate.is_optional || false,
                componentUpdate.scrap_factor || 0,
                unitCost,
                totalCost,
                0, // lead_time_days - could be enhanced to get from product
                supplierId, // supplier_id - could be enhanced to get from product
                componentUpdate.specifications || null,
                componentUpdate.notes || null
              ];

              await client.query(createComponentQuery, componentValues);
            }
          }
        }
      }

      // Recalculate total cost
      const totalCostQuery = `
        UPDATE bill_of_materials
        SET total_cost = (
          SELECT COALESCE(SUM(total_cost), 0)
          FROM bom_components
          WHERE bom_id = $1
        )
        WHERE id = $1
      `;

      await client.query(totalCostQuery, [bomId]);

      // Enforce product-type rules against the post-update state. Reads the actual
      // bom_components rows so updates that change parent or components are caught.
      const finalComponentsResult = await client.query<{ component_product_id: number }>(
        `SELECT component_product_id FROM bom_components WHERE bom_id = $1`,
        [bomId]
      );
      await validateBomProductTypes(
        client,
        existingBOM.parent_product_id,
        finalComponentsResult.rows.map((r) => r.component_product_id)
      );

      await client.query('COMMIT');

      // Get the updated BOM with components
      const finalQuery = `
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

      const finalResult = await client.query(finalQuery, [bomId]);

      if (finalResult.rows.length === 0) {
        throw new Error('Failed to retrieve updated BOM');
      }

      const updatedBOM = finalResult.rows[0];

      // Get components
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

      const result: BillOfMaterials = {
        ...updatedBOM,
        components: componentsResult.rows
      };

      MyLogger.success(action, {
        bomId: result.id,
        version: result.version,
        componentsCount: result.components?.length || 0,
        totalCost: result.total_cost
      });

      return result;

    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error as Error, { bomId, updateData, userId });
      throw error;
    } finally {
      client.release();
    }
  }
}
