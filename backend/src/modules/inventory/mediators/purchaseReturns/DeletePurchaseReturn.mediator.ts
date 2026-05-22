import pool from "@/database/connection";
import { createError } from "@/middleware/errorHandler";
import { MyLogger } from "@/utils/new-logger";

class DeletePurchaseReturnMediator {
  async deletePurchaseReturn(id: number): Promise<void> {
    const action = "Delete Purchase Return";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { purchaseReturnId: id });
      await client.query("BEGIN");

      const checkResult = await client.query(
        `SELECT id, status, return_number FROM purchase_returns WHERE id = $1`,
        [id]
      );
      if (checkResult.rows.length === 0) {
        throw createError("Purchase return not found", 404);
      }
      const row = checkResult.rows[0];
      if (row.status !== "draft") {
        throw createError(
          `Only draft purchase returns can be deleted (current status: ${row.status})`,
          400
        );
      }

      await client.query(`DELETE FROM purchase_returns WHERE id = $1`, [id]);

      await client.query("COMMIT");
      MyLogger.success(action, {
        purchaseReturnId: id,
        returnNumber: row.return_number,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      MyLogger.error(action, error, { purchaseReturnId: id });
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new DeletePurchaseReturnMediator();
