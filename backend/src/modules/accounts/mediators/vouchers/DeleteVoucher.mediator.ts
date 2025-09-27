import {
  VoucherStatus,
} from "@/types/accounts";
import { MediatorInterface } from "@/types";
import pool from "@/database/connection";
import { createError } from "@/middleware/errorHandler";
import { MyLogger } from "@/utils/new-logger";

class DeleteVoucherMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    throw new Error("Not Implemented");
  }

  // Delete voucher (only drafts can be deleted)
  async deleteVoucher(id: number, deletedBy: number): Promise<void> {
    let action = "Delete Voucher";
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      MyLogger.info(action, { voucherId: id, deletedBy });

      // Check if voucher exists and get current status
      const existingResult = await client.query(
        "SELECT id, voucher_no, status, amount, cost_center_id FROM vouchers WHERE id = $1",
        [id]
      );

      if (existingResult.rows.length === 0) {
        throw createError("Voucher not found", 404);
      }

      const existing = existingResult.rows[0];

      // Only allow deletion of draft vouchers
      if (existing.status !== VoucherStatus.DRAFT) {
        throw createError("Only draft vouchers can be deleted", 400);
      }

      // Delete voucher lines first (foreign key constraint)
      await client.query('DELETE FROM voucher_lines WHERE voucher_id = $1', [id]);

      // Delete voucher
      await client.query('DELETE FROM vouchers WHERE id = $1', [id]);

      await client.query('COMMIT');

      MyLogger.success(action, {
        voucherId: id,
        voucherNo: existing.voucher_no,
        status: existing.status
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { voucherId: id, deletedBy });
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new DeleteVoucherMediator();
