import pool from "@/database/connection";
import {
  WorkOrder,
  CreateWorkOrderRequest,
  ProductionLine,
  Operator
} from "@/types/factory";
import { MyLogger } from "@/utils/new-logger";

// Helper function to get user's accessible factories
async function getUserFactories(userId: number): Promise<{factory_id: string, factory_name: string, factory_code: string, role: string, is_primary: boolean}[]> {
  const query = 'SELECT * FROM get_user_factories($1)';
  const result = await pool.query(query, [userId]);
  return result.rows;
}

// Helper function to check if user is admin
async function isUserAdmin(userId: number): Promise<boolean> {
  const query = 'SELECT role_id FROM users WHERE id = $1';
  const result = await pool.query(query, [userId]);
  if (result.rows.length === 0) return false;

  // Assuming role_id 1 is admin based on common patterns
  // You might need to adjust this based on your actual role structure
  return result.rows[0].role_id === 1;
}

export class AddWorkOrderMediator {
  static async createWorkOrder(
    workOrderData: CreateWorkOrderRequest,
    userId: string
  ): Promise<WorkOrder> {
    const action = "AddWorkOrderMediator.createWorkOrder";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { workOrderData, userId });

      // Get user's accessible factories
      const userFactories = await getUserFactories(parseInt(userId));
      const userFactoryIds = userFactories.map(f => f.factory_id);

      // Get user info for created_by field
      const userQuery = 'SELECT full_name, factory_id FROM users WHERE id = $1';
      const userResult = await client.query(userQuery, [userId]);
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }
      const user = userResult.rows[0];
      const userFactoryId = user.factory_id;

      // Validate factory access for non-admin users
      if (userFactories.length > 0 && workOrderData.customer_order_id) {
        // If linking to customer order, ensure user has access to that factory
        const customerOrderQuery = `
          SELECT fco.factory_id
          FROM factory_customer_orders fco
          WHERE fco.id = $1 AND fco.factory_id = ANY($2::bigint[])
        `;
        const customerOrderResult = await client.query(customerOrderQuery, [workOrderData.customer_order_id, userFactoryIds]);

        if (customerOrderResult.rows.length === 0) {
          throw new Error('Access denied to customer order or factory');
        }
      }

      // Generate work order number
      const workOrderNumberQuery = "SELECT nextval('work_order_sequence')";
      const numberResult = await client.query(workOrderNumberQuery);
      const workOrderNumber = `WO-${String(numberResult.rows[0].nextval).padStart(6, '0')}`;

      // Get product details
      const productQuery = `
        SELECT p.name, p.sku, p.unit_of_measure, p.id as product_id
        FROM products p
        WHERE p.id = $1
      `;
      const productResult = await client.query(productQuery, [workOrderData.product_id]);

      if (productResult.rows.length === 0) {
        throw new Error('Product not found');
      }

      const product = productResult.rows[0];

      // Validate production line if provided
      if (workOrderData.production_line_id) {
        const productionLineQuery = `
          SELECT id, name, capacity, current_load, status
          FROM production_lines
          WHERE id = $1 AND is_active = true
        `;
        const productionLineResult = await client.query(productionLineQuery, [workOrderData.production_line_id]);

        if (productionLineResult.rows.length === 0) {
          throw new Error('Production line not found or inactive');
        }

        const productionLine = productionLineResult.rows[0];

        // Check if production line has capacity
        if (productionLine.status !== 'available') {
          throw new Error(`Production line ${productionLine.name} is not available`);
        }
      }

      // Validate operators if provided
      if (workOrderData.assigned_operators && workOrderData.assigned_operators.length > 0) {
        const operatorIds = workOrderData.assigned_operators;
        const operatorsQuery = `
          SELECT id, name, availability_status, current_work_order_id
          FROM operators
          WHERE id IN (${operatorIds.map(() => '?').join(',')}) AND is_active = true
        `;
        const operatorsResult = await client.query(operatorsQuery, operatorIds);

        if (operatorsResult.rows.length !== operatorIds.length) {
          throw new Error('One or more operators not found or inactive');
        }

        // Check if operators are available
        const unavailableOperators = operatorsResult.rows.filter(op => op.availability_status !== 'available');
        if (unavailableOperators.length > 0) {
          throw new Error(`Operators not available: ${unavailableOperators.map(op => op.name).join(', ')}`);
        }
      }

      // Create work order
      const createWorkOrderQuery = `
        INSERT INTO work_orders (
          work_order_number,
          customer_order_id,
          product_id,
          product_name,
          product_sku,
          quantity,
          unit_of_measure,
          deadline,
          status,
          priority,
          progress,
          estimated_hours,
          actual_hours,
          production_line_id,
          production_line_name,
          assigned_operators,
          created_by,
          notes,
          specifications
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *
      `;

      const workOrderValues = [
        workOrderNumber,
        workOrderData.customer_order_id || null,
        workOrderData.product_id,
        product.name,
        product.sku,
        workOrderData.quantity,
        product.unit_of_measure,
        workOrderData.deadline,
        'draft', // All work orders start as draft
        workOrderData.priority,
        0, // Initial progress
        workOrderData.estimated_hours,
        0, // Initial actual hours
        workOrderData.production_line_id || null,
        workOrderData.production_line_id ? 'Production Line' : null, // Will be updated when assigned
        JSON.stringify(workOrderData.assigned_operators || []),
        userId,
        workOrderData.notes || null,
        workOrderData.specifications || null
      ];

      const workOrderResult = await client.query(createWorkOrderQuery, workOrderValues);

      if (workOrderResult.rows.length === 0) {
        throw new Error('Failed to create work order');
      }

      const newWorkOrder = workOrderResult.rows[0];

      // Create assignments if operators were provided
      if (workOrderData.assigned_operators && workOrderData.assigned_operators.length > 0) {
        const assignmentQuery = `
          INSERT INTO work_order_assignments (
            work_order_id,
            production_line_id,
            operator_id,
            assigned_at,
            assigned_by,
            notes
          ) VALUES ${workOrderData.assigned_operators?.map((_, index) =>
            `($${index * 6 + 1}, $${index * 6 + 2}, $${index * 6 + 3}, $${index * 6 + 4}, $${index * 6 + 5}, $${index * 6 + 6})`
          ).join(', ')}
        `;

        const assignmentValues = [];
        if (workOrderData.assigned_operators) {
          for (const operatorId of workOrderData.assigned_operators) {
            assignmentValues.push(
              newWorkOrder.id,
              workOrderData.production_line_id || null,
              operatorId,
              new Date(),
              userId,
              'Initial assignment'
            );
          }
        }

        await client.query(assignmentQuery, assignmentValues);

        // Update operator availability status
        if (workOrderData.assigned_operators) {
          const updateOperatorQuery = `
            UPDATE operators
            SET availability_status = 'busy', current_work_order_id = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id IN (${workOrderData.assigned_operators.map(() => '?').join(',')})
          `;
          await client.query(updateOperatorQuery, [newWorkOrder.id, ...workOrderData.assigned_operators]);
        }
      }

      // Update production line current load if assigned
      if (workOrderData.production_line_id) {
        // Calculate estimated load based on estimated hours and line capacity
        // This is a simplified calculation - in reality you'd want more sophisticated load calculation
        const estimatedLoad = Math.min((workOrderData.estimated_hours / 8) * 10, 100); // Assume 8-hour day, convert to percentage

        await client.query(`
          UPDATE production_lines
          SET current_load = current_load + $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [estimatedLoad, workOrderData.production_line_id]);
      }

      // Create material requirements from BOM if BOM exists for this product
      const bomQuery = `
        SELECT bom.id, bom.total_cost, bc.*, s.name as supplier_name
        FROM bill_of_materials bom
        JOIN bom_components bc ON bom.id = bc.bom_id
        LEFT JOIN suppliers s ON bc.supplier_id = s.id
        WHERE bom.parent_product_id = $1 AND bom.is_active = true
        ORDER BY bc.created_at
      `;

      const bomResult = await client.query(bomQuery, [workOrderData.product_id]);

      if (bomResult.rows.length > 0) {
        const bomComponents = bomResult.rows;
        const workOrderQuantity = parseFloat(workOrderData.quantity.toString());

        // Create material requirements for each BOM component
        for (const component of bomComponents) {
          const requiredQuantity = parseFloat(component.quantity_required) * workOrderQuantity;
          const scrapQuantity = requiredQuantity * (parseFloat(component.scrap_factor) / 100);
          const totalRequiredQuantity = requiredQuantity + scrapQuantity;

          // Get current inventory for this material
          const inventoryQuery = `
            SELECT p.current_stock, p.cost_price, p.unit_of_measure, p.name, p.sku
            FROM products p
            WHERE p.id = $1
          `;
          const inventoryResult = await client.query(inventoryQuery, [component.component_product_id]);

          if (inventoryResult.rows.length > 0) {
            const material = inventoryResult.rows[0];
            const availableStock = parseFloat(material.current_stock);
            const unitCost = parseFloat(material.cost_price || component.unit_cost);
            const totalCost = totalRequiredQuantity * unitCost;

            // Determine requirement status based on availability
            let status: 'pending' | 'allocated' | 'short' | 'fulfilled' = 'pending';
            let allocatedQuantity = 0;

            if (availableStock >= totalRequiredQuantity) {
              // Full allocation possible
              status = 'allocated';
              allocatedQuantity = totalRequiredQuantity;
            } else if (availableStock > 0) {
              // Partial allocation possible
              status = 'short';
              allocatedQuantity = availableStock;
            } else {
              // No stock available
              status = 'short';
              allocatedQuantity = 0;
            }

            // Determine if this is a critical requirement (based on priority or lead time)
            const isCritical = component.lead_time_days > 7 || component.is_optional === false;

            // Insert material requirement
            const requirementQuery = `
              INSERT INTO work_order_material_requirements (
                work_order_id,
                material_id,
                material_name,
                material_sku,
                required_quantity,
                allocated_quantity,
                consumed_quantity,
                unit_of_measure,
                status,
                priority,
                required_date,
                bom_component_id,
                supplier_id,
                supplier_name,
                unit_cost,
                total_cost,
                lead_time_days,
                is_critical,
                notes
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
              RETURNING id
            `;

            const requirementValues = [
              newWorkOrder.id,
              component.component_product_id,
              material.name,
              material.sku,
              totalRequiredQuantity,
              allocatedQuantity,
              0, // consumed_quantity initially 0
              material.unit_of_measure,
              status,
              1, // priority - could be calculated based on various factors
              workOrderData.deadline,
              component.id,
              component.supplier_id,
              component.supplier_name,
              unitCost,
              totalCost,
              component.lead_time_days,
              isCritical,
              `Required for work order ${workOrderNumber}. Scrap factor: ${component.scrap_factor}%`
            ];

            const requirementResult = await client.query(requirementQuery, requirementValues);

            // If we can allocate materials, create allocation records
            if (allocatedQuantity > 0) {
              // Create material allocation
              const allocationQuery = `
                INSERT INTO work_order_material_allocations (
                  work_order_requirement_id,
                  inventory_item_id,
                  allocated_quantity,
                  allocated_from_location,
                  allocated_by,
                  status,
                  notes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
              `;

              await client.query(allocationQuery, [
                requirementResult.rows[0].id,
                component.component_product_id,
                allocatedQuantity,
                'Main Warehouse', // Could be more sophisticated
                userId,
                'allocated',
                `Allocated ${allocatedQuantity} units for work order ${workOrderNumber}`
              ]);

              // Update product stock (reduce available stock)
              await client.query(`
                UPDATE products
                SET current_stock = current_stock - $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
              `, [allocatedQuantity, component.component_product_id]);
            }

            // If there's a shortage, create a shortage record
            if (status === 'short') {
              const shortfallQuantity = totalRequiredQuantity - allocatedQuantity;

              const shortageQuery = `
                INSERT INTO material_shortages (
                  material_id,
                  material_name,
                  material_sku,
                  required_quantity,
                  available_quantity,
                  shortfall_quantity,
                  work_order_id,
                  work_order_number,
                  required_date,
                  priority,
                  supplier_id,
                  supplier_name,
                  lead_time_days,
                  suggested_action,
                  status,
                  notes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
              `;

              const priority = isCritical ? 'critical' : 'medium';
              const suggestedAction = availableStock === 0 ? 'purchase' : 'substitute';

              await client.query(shortageQuery, [
                component.component_product_id,
                material.name,
                material.sku,
                totalRequiredQuantity,
                availableStock,
                shortfallQuantity,
                newWorkOrder.id,
                workOrderNumber,
                workOrderData.deadline,
                priority,
                component.supplier_id,
                component.supplier_name,
                component.lead_time_days,
                suggestedAction,
                'open',
                `Short ${shortfallQuantity} units for work order ${workOrderNumber}`
              ]);
            }
          }
        }
      }

      // Get the complete work order with production line name
      const finalQuery = `
        SELECT
          wo.*,
          pl.name as production_line_name
        FROM work_orders wo
        LEFT JOIN production_lines pl ON wo.production_line_id = pl.id
        WHERE wo.id = $1
      `;

      const finalResult = await client.query(finalQuery, [newWorkOrder.id]);
      const completeWorkOrder = finalResult.rows[0];

      const workOrder: WorkOrder = {
        id: completeWorkOrder.id,
        work_order_number: completeWorkOrder.work_order_number,
        customer_order_id: completeWorkOrder.customer_order_id,
        product_id: completeWorkOrder.product_id,
        product_name: completeWorkOrder.product_name,
        product_sku: completeWorkOrder.product_sku,
        quantity: parseFloat(completeWorkOrder.quantity),
        unit_of_measure: completeWorkOrder.unit_of_measure,
        deadline: completeWorkOrder.deadline,
        status: completeWorkOrder.status,
        priority: completeWorkOrder.priority,
        progress: parseFloat(completeWorkOrder.progress),
        estimated_hours: parseFloat(completeWorkOrder.estimated_hours),
        actual_hours: parseFloat(completeWorkOrder.actual_hours),
        production_line_id: completeWorkOrder.production_line_id,
        production_line_name: completeWorkOrder.production_line_name,
        assigned_operator_ids: completeWorkOrder.assigned_operators || [],
        created_by: completeWorkOrder.created_by,
        created_at: completeWorkOrder.created_at,
        updated_by: completeWorkOrder.updated_by,
        updated_at: completeWorkOrder.updated_at,
        started_at: completeWorkOrder.started_at,
        completed_at: completeWorkOrder.completed_at,
        notes: completeWorkOrder.notes,
        specifications: completeWorkOrder.specifications
      };

      MyLogger.success(action, {
        workOrderId: workOrder.id,
        workOrderNumber: workOrder.work_order_number
      });

      return workOrder;

    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }
}
