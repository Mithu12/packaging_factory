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
import { auditMiddleware } from "@/middleware/audit";
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
  auditMiddleware({
    action: "vouchers.list",
    resourceType: "voucher",
    details: (req) => ({
      query: req.query,
      endpoint: "/",
      method: "GET",
    }),
  }),
  async (req, res, next) => {
    try {
      MyLogger.info("Validate Query Parameters", {
        endpoint: "/",
        method: "GET",
        query: req.query,
      });
      MyLogger.success("Validate Query Parameters", {
        endpoint: "/",
        method: "GET",
      });
      await getAllVouchers(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/accounts/vouchers/stats - Get voucher statistics
router.get(
  "/stats",
  requirePermission(PERMISSIONS.ACCOUNTS_READ),
  auditMiddleware({
    action: "vouchers.stats",
    resourceType: "voucher",
    details: (req) => ({
      query: req.query,
      endpoint: "/stats",
      method: "GET",
    }),
  }),
  async (req, res, next) => {
    try {
      await getVoucherStats(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/accounts/vouchers/:id - Get single voucher by ID
router.get(
  "/:id",
  requirePermission(PERMISSIONS.ACCOUNTS_READ),
  auditMiddleware({
    action: "vouchers.read",
    resourceType: "voucher",
    resourceId: (req) => req.params.id,
    details: (req) => ({
      voucherId: req.params.id,
      endpoint: "/:id",
      method: "GET",
    }),
  }),
  async (req, res, next) => {
    try {
      await getVoucherById(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/accounts/vouchers - Create new voucher
router.post(
  "/",
  requirePermission(PERMISSIONS.ACCOUNTS_CREATE),
  validateRequest(createVoucherSchema),
  auditMiddleware({
    action: "vouchers.create",
    resourceType: "voucher",
    details: (req) => ({
      voucherData: {
        type: req.body.type,
        date: req.body.date,
        amount: req.body.lines?.reduce((sum: number, line: any) => 
          sum + Math.max(line.debit || 0, line.credit || 0), 0) || 0,
        linesCount: req.body.lines?.length || 0,
      },
      endpoint: "/",
      method: "POST",
    }),
  }),
  async (req, res, next) => {
    try {
      MyLogger.info("Validate Request Body", {
        endpoint: "/",
        method: "POST",
        bodyKeys: Object.keys(req.body),
      });
      MyLogger.success("Validate Request Body", {
        endpoint: "/",
        method: "POST",
      });
      await createVoucher(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/accounts/vouchers/:id - Update voucher
router.put(
  "/:id",
  requirePermission(PERMISSIONS.ACCOUNTS_UPDATE),
  validateRequest(updateVoucherSchema),
  auditMiddleware({
    action: "vouchers.update",
    resourceType: "voucher",
    resourceId: (req) => req.params.id,
    details: (req) => ({
      voucherId: req.params.id,
      updateFields: Object.keys(req.body),
      endpoint: "/:id",
      method: "PUT",
    }),
  }),
  async (req, res, next) => {
    try {
      MyLogger.info("Validate Request Body", {
        endpoint: "/:id",
        method: "PUT",
        voucherId: req.params.id,
        bodyKeys: Object.keys(req.body),
      });
      MyLogger.success("Validate Request Body", {
        endpoint: "/:id",
        method: "PUT",
        voucherId: req.params.id,
      });
      await updateVoucher(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/accounts/vouchers/:id/approve - Approve voucher
router.put(
  "/:id/approve",
  requirePermission(PERMISSIONS.ACCOUNTS_UPDATE), // Special approve permission
  auditMiddleware({
    action: "vouchers.approve",
    resourceType: "voucher",
    resourceId: (req) => req.params.id,
    details: (req) => ({
      voucherId: req.params.id,
      endpoint: "/:id/approve",
      method: "PUT",
    }),
  }),
  async (req, res, next) => {
    try {
      await approveVoucher(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/accounts/vouchers/:id/void - Void voucher
router.put(
  "/:id/void",
  requirePermission(PERMISSIONS.ACCOUNTS_DELETE), // Use delete permission for voiding
  auditMiddleware({
    action: "vouchers.void",
    resourceType: "voucher",
    resourceId: (req) => req.params.id,
    details: (req) => ({
      voucherId: req.params.id,
      endpoint: "/:id/void",
      method: "PUT",
    }),
  }),
  async (req, res, next) => {
    try {
      await voidVoucher(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/accounts/vouchers/:id - Delete voucher
router.delete(
  "/:id",
  requirePermission(PERMISSIONS.ACCOUNTS_DELETE),
  auditMiddleware({
    action: "vouchers.delete",
    resourceType: "voucher",
    resourceId: (req) => req.params.id,
    details: (req) => ({
      voucherId: req.params.id,
      endpoint: "/:id",
      method: "DELETE",
    }),
  }),
  async (req, res, next) => {
    try {
      await deleteVoucher(req, res);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
