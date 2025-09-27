import { MediatorInterface } from "@/types";
import pool from "@/database/connection";
import { createError } from "@/middleware/errorHandler";
import { MyLogger } from "@/utils/new-logger";

class DeleteCostCenterMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    throw new Error("Not Implemented");
  }

  // Delete cost center
  async deleteCostCenter(id: number): Promise<void> {
    let action = "Delete Cost Center";
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      MyLogger.info(action, { costCenterId: id });

      // Check if cost center exists
      const existingResult = await client.query(
        "SELECT id, name FROM cost_centers WHERE id = $1",
        [id]
      );

      if (existingResult.rows.length === 0) {
        throw createError("Cost center not found", 404);
      }

      const costCenter = existingResult.rows[0];

      // Check if cost center is used in voucher lines
      const voucherLinesResult = await client.query(
        "SELECT COUNT(*) as count FROM voucher_lines WHERE cost_center_id = $1",
        [id]
      );

      if (parseInt(voucherLinesResult.rows[0].count) > 0) {
        throw createError(
          "Cannot delete cost center that has transaction history. Deactivate instead of deleting.",
          400
        );
      }

      // Check if cost center is used in expenses (when expense module exists)
      // This is a placeholder for future expense module integration
      
      // Delete the cost center
      await client.query(
        "DELETE FROM cost_centers WHERE id = $1",
        [id]
      );

      await client.query('COMMIT');

      MyLogger.success(action, {
        costCenterId: id,
        costCenterName: costCenter.name,
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { costCenterId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  // Soft delete cost center (set status to Inactive)
  async deactivateCostCenter(id: number): Promise<void> {
    let action = "Deactivate Cost Center";
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      MyLogger.info(action, { costCenterId: id });

      // Check if cost center exists
      const existingResult = await client.query(
        "SELECT id, name, status FROM cost_centers WHERE id = $1",
        [id]
      );

      if (existingResult.rows.length === 0) {
        throw createError("Cost center not found", 404);
      }

      const costCenter = existingResult.rows[0];

      if (costCenter.status === 'Inactive') {
        throw createError("Cost center is already inactive", 400);
      }

      // Update status to Inactive
      await client.query(
        "UPDATE cost_centers SET status = 'Inactive', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [id]
      );

      await client.query('COMMIT');

      MyLogger.success(action, {
        costCenterId: id,
        costCenterName: costCenter.name,
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { costCenterId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  // Reactivate cost center (set status to Active)
  async activateCostCenter(id: number): Promise<void> {
    let action = "Activate Cost Center";
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      MyLogger.info(action, { costCenterId: id });

      // Check if cost center exists
      const existingResult = await client.query(
        "SELECT id, name, status FROM cost_centers WHERE id = $1",
        [id]
      );

      if (existingResult.rows.length === 0) {
        throw createError("Cost center not found", 404);
      }

      const costCenter = existingResult.rows[0];

      if (costCenter.status === 'Active') {
        throw createError("Cost center is already active", 400);
      }

      // Update status to Active
      await client.query(
        "UPDATE cost_centers SET status = 'Active', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [id]
      );

      await client.query('COMMIT');

      MyLogger.success(action, {
        costCenterId: id,
        costCenterName: costCenter.name,
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { costCenterId: id });
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new DeleteCostCenterMediator();
