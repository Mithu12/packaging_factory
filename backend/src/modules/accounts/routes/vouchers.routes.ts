import { NextFunction, Router } from "express";
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
import expressAsyncHandler from "express-async-handler";
import { AuthenticatedRequest } from "@/types/rbac";

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// GET /api/accounts/vouchers - Get all vouchers with pagination and filtering
router.get(
  "/",
  requirePermission(PERMISSIONS.VOUCHERS_READ),
  validateQuery(getVouchersQuerySchema),
  expressAsyncHandler(getAllVouchers)
);

// GET /api/accounts/vouchers/stats - Get voucher statistics
router.get(
  "/stats",
  requirePermission(PERMISSIONS.VOUCHERS_READ),
  expressAsyncHandler(getVoucherStats)
);

// GET /api/accounts/vouchers/:id - Get single voucher by ID
router.get(
  "/:id",
  requirePermission(PERMISSIONS.VOUCHERS_READ),
  expressAsyncHandler(getVoucherById)
);

// POST /api/accounts/vouchers - Create new voucher
router.post(
  "/",
  requirePermission(PERMISSIONS.VOUCHERS_CREATE),
  validateRequest(createVoucherSchema),
  expressAsyncHandler(createVoucher)
);

// PUT /api/accounts/vouchers/:id - Update voucher
router.put(
  "/:id",
  requirePermission(PERMISSIONS.VOUCHERS_UPDATE),
  validateRequest(updateVoucherSchema),
  expressAsyncHandler(updateVoucher)
);

// PUT /api/accounts/vouchers/:id/approve - Approve voucher
router.put(
  "/:id/approve",
  requirePermission(PERMISSIONS.VOUCHERS_APPROVE),
  expressAsyncHandler(approveVoucher)
);

// PUT /api/accounts/vouchers/:id/void - Void voucher
router.put(
  "/:id/void",
  requirePermission(PERMISSIONS.VOUCHERS_REJECT),
  expressAsyncHandler(voidVoucher)
);

// DELETE /api/accounts/vouchers/:id - Delete voucher
router.delete(
  "/:id",
  requirePermission(PERMISSIONS.VOUCHERS_DELETE),
  expressAsyncHandler(deleteVoucher)    
);

export default router;
