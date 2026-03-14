import { Request, Response, NextFunction } from 'express';
import advanceSalaryMediator from '../mediators/advanceSalary/AdvanceSalaryMediator';
import { serializeSuccessResponse, serializeErrorResponse } from '../../../utils/responseHelper';
import { MyLogger } from '../../../utils/new-logger';

class AdvanceSalaryController {

  // Get all advance salaries with pagination
  async getAdvanceSalaries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, search, status, employee_id } = req.query;
      const result = await advanceSalaryMediator.getAdvanceSalaries({
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        search: search as string,
        status: status as string,
        employee_id: employee_id ? parseInt(employee_id as string) : undefined,
      });
      serializeSuccessResponse(res, result, "SUCCESS");
    } catch (error) {
      MyLogger.error('AdvanceSalaryController.getAdvanceSalaries', error);
      next(error);
    }
  }

  // Get advance salary by ID
  async getAdvanceSalaryById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await advanceSalaryMediator.getAdvanceSalaryById(parseInt(id));
      if (!result) {
        serializeErrorResponse(res, null, '404', 'Advance salary not found');
        return;
      }
      serializeSuccessResponse(res, result, "SUCCESS");
    } catch (error) {
      MyLogger.error('AdvanceSalaryController.getAdvanceSalaryById', error);
      next(error);
    }
  }

  // Create new advance salary
  async createAdvanceSalary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const result = await advanceSalaryMediator.createAdvanceSalary({
        ...req.body,
        created_by: userId,
      });
      serializeSuccessResponse(res, result, "SUCCESS", 201);
    } catch (error) {
      MyLogger.error('AdvanceSalaryController.createAdvanceSalary', error);
      next(error);
    }
  }

  // Approve or reject advance salary
  async approveAdvanceSalary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const { approved, notes } = req.body;
      const result = await advanceSalaryMediator.approveAdvanceSalary(
        parseInt(id),
        approved,
        userId,
        notes
      );
      serializeSuccessResponse(res, result, "SUCCESS");
    } catch (error) {
      MyLogger.error('AdvanceSalaryController.approveAdvanceSalary', error);
      next(error);
    }
  }

  // Get advance salary stats
  async getAdvanceSalaryStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await advanceSalaryMediator.getAdvanceSalaryStats();
      serializeSuccessResponse(res, result, "SUCCESS");
    } catch (error) {
      MyLogger.error('AdvanceSalaryController.getAdvanceSalaryStats', error);
      next(error);
    }
  }

  // Get upcoming deductions per employee
  async getUpcomingDeductions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await advanceSalaryMediator.getUpcomingDeductions();
      serializeSuccessResponse(res, result, "SUCCESS");
    } catch (error) {
      MyLogger.error('AdvanceSalaryController.getUpcomingDeductions', error);
      next(error);
    }
  }
}

export default new AdvanceSalaryController();
