import { NextFunction, Request, Response } from "express";
import GetSuppliersMediator from "../mediators/suppliers/GetSupplierInfo.mediator";
import AddSupplierMediator from "../mediators/suppliers/AddSupplier.mediator";
import UpdateSupplierInfoMediator from "../mediators/suppliers/UpdateSupplierInfo.mediator";
import DeleteSupplierMediator from "../mediators/suppliers/DeleteSupplier.mediator";
import { serializeSuccessResponse } from "@/utils/responseHelper";

class SuppliersController {
  async getAllSuppliers(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const result = await GetSuppliersMediator.getSupplierList(req.query);
    serializeSuccessResponse(res, result, "SUCCESS");
  }

  async getSupplierStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const stats = await GetSuppliersMediator.getSupplierStats();
    serializeSuccessResponse(res, stats, "SUCCESS");
  }

  async getSupplierCategories(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const categories = await GetSuppliersMediator.getSupplierCategories();
    serializeSuccessResponse(res, categories, "SUCCESS");
  }

  async searchSuppliers(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { q, limit } = req.query;
    const suppliers = await GetSuppliersMediator.searchSuppliers(
      q as string,
      limit ? parseInt(limit as string) : 10
    );
    serializeSuccessResponse(res, suppliers, "SUCCESS");
  }

  async getSupplierById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const id = parseInt(req.params.id);
    const supplier = await GetSuppliersMediator.getSupplierById(id);
    serializeSuccessResponse(res, supplier, "SUCCESS");
  }

  async createSupplier(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const supplier = await AddSupplierMediator.createSupplier(req.body);
    serializeSuccessResponse(res, supplier, "SUCCESS");
  }

  async updateSupplier(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const id = parseInt(req.params.id);
    const supplier = await UpdateSupplierInfoMediator.updateSupplier(
      id,
      req.body
    );
    serializeSuccessResponse(res, supplier, "SUCCESS");
  }

  async toggleSupplierStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const id = parseInt(req.params.id);
    const supplier = await UpdateSupplierInfoMediator.toggleSupplierStatus(id);
    serializeSuccessResponse(res, supplier, "SUCCESS");
  }

  async deleteSupplier(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const id = parseInt(req.params.id);
    await DeleteSupplierMediator.deleteSupplier(id);
    serializeSuccessResponse(res, {}, "Deleted Successfully");
  }
}

export default new SuppliersController();
