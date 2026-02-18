import { Request, Response, NextFunction } from 'express';
import AttendanceRegularizationMediator from '../mediators/attendance-regularization/AttendanceRegularizationMediator';
import { serializeSuccessResponse } from '../../../utils/responseHelper';
import { MyLogger } from '../../../utils/new-logger';

class AttendanceRegularizationController {
  /**
   * Get all regularization requests
   */
  async getRegularizationRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        employee_id: req.query.employee_id ? parseInt(req.query.employee_id as string) : undefined,
        status: req.query.status as string | undefined,
        start_date: req.query.start_date as string | undefined,
        end_date: req.query.end_date as string | undefined,
      };
      const requests = await AttendanceRegularizationMediator.getRegularizationRequests(filters);
      serializeSuccessResponse(res, { regularization_requests: requests }, 'Regularization requests retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get regularization request by ID
   */
  async getRegularizationRequestById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const request = await AttendanceRegularizationMediator.getRegularizationRequestById(id);
      serializeSuccessResponse(res, { regularization_request: request }, 'Regularization request retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new regularization request
   */
  async createRegularizationRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const request = await AttendanceRegularizationMediator.createRegularizationRequest(
        req.body,
        req.user?.user_id
      );
      serializeSuccessResponse(res, { regularization_request: request }, 'Regularization request submitted successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a regularization request
   */
  async updateRegularizationRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const request = await AttendanceRegularizationMediator.updateRegularizationRequest(id, req.body);
      serializeSuccessResponse(res, { regularization_request: request }, 'Regularization request updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Review a regularization request (approve or reject)
   */
  async reviewRegularizationRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const { status, review_comments, rejection_reason } = req.body;
      const request = await AttendanceRegularizationMediator.reviewRegularizationRequest(
        id,
        { status, review_comments, rejection_reason },
        req.user?.user_id
      );
      serializeSuccessResponse(res, { regularization_request: request }, `Regularization request ${status} successfully`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel a regularization request
   */
  async cancelRegularizationRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const request = await AttendanceRegularizationMediator.cancelRegularizationRequest(id);
      serializeSuccessResponse(res, { regularization_request: request }, 'Regularization request cancelled successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new AttendanceRegularizationController();
