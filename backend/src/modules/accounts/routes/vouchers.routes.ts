import { Router } from "express";
import {
  getAllVouchers,
  getVoucherStats,
  getVoucherById,
  createVoucher,
  updateVoucher,
  approveVoucher,
  voidVoucher,
  deleteVoucher,
} from "../controllers/vouchers.controller";
import { authenticate } from "@/middleware/auth";
import { requirePermission } from "@/middleware/permission";
import { validateRequest, validateQuery } from "@/middleware/validation";
// import { auditMiddleware } from "@/middleware/audit";
import { PERMISSIONS } from "@/middleware/permission";
import {
  createVoucherSchema,
  updateVoucherSchema,
  getVouchersQuerySchema,
} from "../validation/voucherValidation";
import { MyLogger } from "@/utils/new-logger";

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// GET /api/accounts/vouchers - Get all vouchers with pagination and filtering
router.get(
  "/",
  requirePermission(PERMISSIONS.ACCOUNTS_READ),
  validateQuery(getVouchersQuerySchema),
  getAllVouchers
);

// GET /api/accounts/vouchers/stats - Get voucher statistics
router.get(
  "/stats",
  requirePermission(PERMISSIONS.ACCOUNTS_READ),
  getVoucherStats
);

// GET /api/accounts/vouchers/:id - Get single voucher by ID
router.get(
  "/:id",
  requirePermission(PERMISSIONS.ACCOUNTS_READ),
  getVoucherById
);

// POST /api/accounts/vouchers - Create new voucher
router.post(
  "/",
  requirePermission(PERMISSIONS.ACCOUNTS_CREATE),
  validateRequest(createVoucherSchema),
  createVoucher
);

// PUT /api/accounts/vouchers/:id - Update voucher
router.put(
  "/:id",
  requirePermission(PERMISSIONS.ACCOUNTS_UPDATE),
  validateRequest(updateVoucherSchema),
  updateVoucher
);

// PUT /api/accounts/vouchers/:id/approve - Approve voucher
router.put(
  "/:id/approve",
  requirePermission(PERMISSIONS.ACCOUNTS_UPDATE),
  approveVoucher
);

// PUT /api/accounts/vouchers/:id/void - Void voucher
router.put(
  "/:id/void",
  requirePermission(PERMISSIONS.ACCOUNTS_DELETE),
  voidVoucher
);

// DELETE /api/accounts/vouchers/:id - Delete voucher
router.delete(
  "/:id",
  requirePermission(PERMISSIONS.ACCOUNTS_DELETE),
  deleteVoucher
);

export default router;
