import pool from "@/database/connection";
import { FactoryCapacity } from "@/types/factory";
import { MyLogger } from "@/utils/new-logger";

export class FactoryCapacityService {
  /**
   * Get factory capacity information for routing decisions
   */
  static async getFactoryCapacity(factoryId: number): Promise<FactoryCapacity> {
    const action = "FactoryCapacityService.getFactoryCapacity";
    
    try {
      MyLogger.info(action, { factoryId });

      // Get factory basic info
      const factoryQuery = `
        SELECT id, name, code, is_active 
        FROM factories 
        WHERE id = $1 AND is_active = true
      `;
      const factoryResult = await pool.query(factoryQuery, [factoryId]);
      
      if (factoryResult.rows.length === 0) {
        throw new Error(`Factory with ID ${factoryId} not found or inactive`);
      }

      const factory = factoryResult.rows[0];

      // Get current orders count (routed and in_production)
      const ordersQuery = `
        SELECT COUNT(*) as current_orders
        FROM factory_customer_orders 
        WHERE factory_id = $1 
        AND status IN ('routed', 'in_production')
      `;
      const ordersResult = await pool.query(ordersQuery, [factoryId]);
      const currentOrders = parseInt(ordersResult.rows[0].current_orders) || 0;

      // Get active work orders count
      const workOrdersQuery = `
        SELECT COUNT(*) as active_work_orders
        FROM work_orders wo
        INNER JOIN factory_customer_orders fco ON wo.customer_order_id = fco.id
        WHERE fco.factory_id = $1 
        AND wo.status IN ('planned', 'released', 'in_progress')
      `;
      const workOrdersResult = await pool.query(workOrdersQuery, [factoryId]);
      const activeWorkOrders = parseInt(workOrdersResult.rows[0].active_work_orders) || 0;

      // Get production lines info
      const productionLinesQuery = `
        SELECT 
          COUNT(*) as total_lines,
          COUNT(CASE WHEN status = 'available' THEN 1 END) as available_lines,
          COALESCE(SUM(capacity), 0) as total_capacity,
          COALESCE(SUM(current_load), 0) as current_load
        FROM production_lines 
        WHERE factory_id = $1 AND is_active = true
      `;
      const productionLinesResult = await pool.query(productionLinesQuery, [factoryId]);
      const productionLines = productionLinesResult.rows[0];

      const totalLines = parseInt(productionLines.total_lines) || 0;
      const availableLines = parseInt(productionLines.available_lines) || 0;
      const totalCapacity = parseFloat(productionLines.total_capacity) || 0;
      const currentLoad = parseFloat(productionLines.current_load) || 0;

      // Calculate capacity utilization
      const capacityUtilization = totalCapacity > 0 ? (currentLoad / totalCapacity) * 100 : 0;

      // Determine if over capacity (using 80% as threshold)
      const isOverCapacity = capacityUtilization > 80 || availableLines === 0;

      // Generate warning message if needed
      let warningMessage: string | undefined;
      if (isOverCapacity) {
        if (availableLines === 0) {
          warningMessage = "No production lines available";
        } else {
          warningMessage = `High capacity utilization (${capacityUtilization.toFixed(1)}%)`;
        }
      }

      // Estimate completion date (simple calculation based on current load)
      let estimatedCompletionDate: string | undefined;
      if (currentOrders > 0) {
        const avgDaysPerOrder = 7; // Assume 7 days average per order
        const estimatedDays = Math.ceil(currentOrders * avgDaysPerOrder / Math.max(totalLines, 1));
        const completionDate = new Date();
        completionDate.setDate(completionDate.getDate() + estimatedDays);
        estimatedCompletionDate = completionDate.toISOString();
      }

      const capacity: FactoryCapacity = {
        factory_id: factoryId,
        factory_name: factory.name,
        factory_code: factory.code,
        current_orders: currentOrders,
        active_work_orders: activeWorkOrders,
        production_lines_count: totalLines,
        available_production_lines: availableLines,
        capacity_utilization: Math.round(capacityUtilization * 100) / 100, // Round to 2 decimal places
        estimated_completion_date: estimatedCompletionDate,
        is_over_capacity: isOverCapacity,
        warning_message: warningMessage
      };

      MyLogger.success(action, { 
        factoryId, 
        capacityUtilization: capacity.capacity_utilization,
        isOverCapacity: capacity.is_over_capacity 
      });

      return capacity;

    } catch (error: any) {
      MyLogger.error(action, error, { factoryId });
      throw error;
    }
  }

  /**
   * Get capacity information for multiple factories
   */
  static async getMultipleFactoryCapacities(factoryIds: number[]): Promise<FactoryCapacity[]> {
    const action = "FactoryCapacityService.getMultipleFactoryCapacities";
    
    try {
      MyLogger.info(action, { factoryCount: factoryIds.length });

      const capacities: FactoryCapacity[] = [];
      
      for (const factoryId of factoryIds) {
        try {
          const capacity = await this.getFactoryCapacity(factoryId);
          capacities.push(capacity);
        } catch (error: any) {
          MyLogger.warn(action, { 
            factoryId, 
            error: error.message,
            message: "Failed to get capacity for factory, skipping" 
          });
        }
      }

      MyLogger.success(action, { 
        requestedFactories: factoryIds.length,
        successfulFactories: capacities.length 
      });

      return capacities;

    } catch (error: any) {
      MyLogger.error(action, error, { factoryIds });
      throw error;
    }
  }

  /**
   * Validate if a factory can accept new orders
   */
  static async validateFactoryForRouting(factoryId: number): Promise<{
    canRoute: boolean;
    capacity: FactoryCapacity;
    warnings: string[];
  }> {
    const action = "FactoryCapacityService.validateFactoryForRouting";
    
    try {
      MyLogger.info(action, { factoryId });

      const capacity = await this.getFactoryCapacity(factoryId);
      const warnings: string[] = [];
      let canRoute = true;

      // Check if factory is over capacity
      if (capacity.is_over_capacity) {
        warnings.push(capacity.warning_message || "Factory is over capacity");
        // Don't prevent routing, just warn
      }

      // Check if factory has no production lines
      if (capacity.production_lines_count === 0) {
        warnings.push("Factory has no production lines configured");
        canRoute = false;
      }

      // Check if all production lines are unavailable
      if (capacity.available_production_lines === 0 && capacity.production_lines_count > 0) {
        warnings.push("All production lines are currently unavailable");
        // Don't prevent routing, just warn - lines might become available
      }

      MyLogger.success(action, { 
        factoryId, 
        canRoute, 
        warningCount: warnings.length 
      });

      return {
        canRoute,
        capacity,
        warnings
      };

    } catch (error: any) {
      MyLogger.error(action, error, { factoryId });
      throw error;
    }
  }
}