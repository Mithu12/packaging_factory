import { Request, Response } from "express";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { MyLogger } from "@/utils/new-logger";
import GetVoucherInfoMediator from "../mediators/vouchers/GetVoucherInfo.mediator";
import AddVoucherMediator from "../mediators/vouchers/AddVoucher.mediator";
import UpdateVoucherInfoMediator from "../mediators/vouchers/UpdateVoucherInfo.mediator";
import DeleteVoucherMediator from "../mediators/vouchers/DeleteVoucher.mediator";
import { VoucherQueryParams, CreateVoucherRequest, UpdateVoucherRequest } from "@/types/accounts";

// Get all vouchers with pagination and filtering
export const getAllVouchers = async (req: Request, res: Response) => {
  try {
    const query = req.query as unknown as VoucherQueryParams;
    MyLogger.info("GET /api/accounts/vouchers", { query });

    const result = await GetVoucherInfoMediator.getVoucherList(query);

    MyLogger.success("GET /api/accounts/vouchers", {
      total: result.pagination.total,
      page: result.pagination.page,
      limit: result.pagination.limit,
      totalPages: result.pagination.totalPages
    });

  serializeSuccessResponse(res, result, "SUCCESS")
  } catch (error) {
    throw error;
  }
};

// Get voucher statistics
export const getVoucherStats = async (req: Request, res: Response) => {
  try {
    const { type } = req.query;
    MyLogger.info("GET /api/accounts/vouchers/stats", { type });

    const stats = await GetVoucherInfoMediator.getVoucherStats(type as string);

    MyLogger.success("GET /api/accounts/vouchers/stats", { type, stats });

    serializeSuccessResponse(res, stats, "SUCCESS");
  } catch (error) {
    throw error;
  }
};

// Get single voucher by ID
export const getVoucherById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    MyLogger.info("GET /api/accounts/vouchers/:id", { voucherId: id });

    const voucher = await GetVoucherInfoMediator.getVoucherById(parseInt(id));

    MyLogger.success("GET /api/accounts/vouchers/:id", {
      voucherId: id,
      voucherNo: voucher.voucherNo,
      type: voucher.type
    });

    serializeSuccessResponse(res, voucher, "SUCCESS");
  } catch (error) {
    throw error;
  }
};

// Create new voucher
export const createVoucher = async (req: Request, res: Response) => {
  try {
    const voucherData: CreateVoucherRequest = req.body;
    const createdBy = req.user?.id || 1; // Get from authenticated user
    MyLogger.info("POST /api/accounts/vouchers", { voucherData, createdBy });

    const voucher = await AddVoucherMediator.createVoucher(voucherData, createdBy);

    MyLogger.success("POST /api/accounts/vouchers", {
      voucherId: voucher.id,
      voucherNo: voucher.voucherNo,
      type: voucher.type,
      amount: voucher.amount
    });

    serializeSuccessResponse(res, voucher, "SUCCESS", 201);
  } catch (error) {
    throw error;
  }
};

// Update voucher
export const updateVoucher = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData: UpdateVoucherRequest = req.body;
    const updatedBy = req.user?.id || 1; // Get from authenticated user
    MyLogger.info("PUT /api/accounts/vouchers/:id", { voucherId: id, updateData, updatedBy });

    const voucher = await UpdateVoucherInfoMediator.updateVoucher(
      parseInt(id),
      updateData,
      updatedBy
    );

    MyLogger.success("PUT /api/accounts/vouchers/:id", {
      voucherId: id,
      voucherNo: voucher.voucherNo,
      updatedFields: Object.keys(updateData)
    });

    serializeSuccessResponse(res, voucher, "SUCCESS");
  } catch (error) {
    throw error;
  }
};

// Approve voucher
export const approveVoucher = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const approvedBy = req.user?.id || 1; // Get from authenticated user
    MyLogger.info("PUT /api/accounts/vouchers/:id/approve", { voucherId: id, approvedBy });

    const voucher = await UpdateVoucherInfoMediator.approveVoucher(parseInt(id), approvedBy);

    MyLogger.success("PUT /api/accounts/vouchers/:id/approve", {
      voucherId: id,
      voucherNo: voucher.voucherNo,
      status: voucher.status
    });

    serializeSuccessResponse(res, voucher, "SUCCESS");
  } catch (error) {
    throw error;
  }
};

// Void voucher
export const voidVoucher = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const voidedBy = req.user?.id || 1; // Get from authenticated user
    MyLogger.info("PUT /api/accounts/vouchers/:id/void", { voucherId: id, voidedBy });

    const voucher = await UpdateVoucherInfoMediator.voidVoucher(parseInt(id), voidedBy);

    MyLogger.success("PUT /api/accounts/vouchers/:id/void", {
      voucherId: id,
      voucherNo: voucher.voucherNo,
      status: voucher.status
    });

    serializeSuccessResponse(res, voucher, "SUCCESS");
  } catch (error) {
    throw error;
  }
};

// Delete voucher
export const deleteVoucher = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deletedBy = req.user?.id || 1; // Get from authenticated user
    MyLogger.info("DELETE /api/accounts/vouchers/:id", { voucherId: id, deletedBy });

    await DeleteVoucherMediator.deleteVoucher(parseInt(id), deletedBy);

    MyLogger.success("DELETE /api/accounts/vouchers/:id", {
      voucherId: id,
      deleted: true
    });

    serializeSuccessResponse(res, { message: "Voucher deleted successfully" }, "SUCCESS");
  } catch (error) {
    throw error;
  }
};
