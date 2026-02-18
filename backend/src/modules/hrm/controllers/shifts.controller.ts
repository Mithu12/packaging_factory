import { Request, Response, NextFunction } from 'express';
import ShiftMediator from '../mediators/shifts/ShiftMediator';
import { serializeSuccessResponse } from '../../../utils/responseHelper';
import { MyLogger } from '../../../utils/new-logger';

class ShiftsController {
  /**
   * Get all shifts
   */
  async getShifts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const includeInactive = req.query.include_inactive === 'true';
      const filters = includeInactive ? undefined : { is_active: true };
      const shifts = await ShiftMediator.getShifts(filters);
      serializeSuccessResponse(res, { shifts }, 'Shifts retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get shift by ID
   */
  async getShiftById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const shift = await ShiftMediator.getShiftById(id);
      serializeSuccessResponse(res, { shift }, 'Shift retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new shift
   */
  async createShift(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const shift = await ShiftMediator.createShift(req.body, req.user?.user_id);
      serializeSuccessResponse(res, { shift }, 'Shift created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a shift
   */
  async updateShift(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const shift = await ShiftMediator.updateShift(id, req.body, req.user?.user_id);
      serializeSuccessResponse(res, { shift }, 'Shift updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete (deactivate) a shift
   */
  async deleteShift(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      await ShiftMediator.deleteShift(id);
      serializeSuccessResponse(res, null, 'Shift deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get shift assignments
   */
  async getShiftAssignments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        employee_id: req.query.employee_id ? parseInt(req.query.employee_id as string) : undefined,
        shift_id: req.query.shift_id ? parseInt(req.query.shift_id as string) : undefined,
      };
      const assignments = await ShiftMediator.getShiftAssignments(filters);
      serializeSuccessResponse(res, { assignments }, 'Shift assignments retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Assign a shift to an employee
   */
  async assignShift(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const assignment = await ShiftMediator.assignShift(req.body, req.user?.user_id);
      serializeSuccessResponse(res, { assignment }, 'Shift assigned successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a shift assignment
   */
  async updateShiftAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const assignment = await ShiftMediator.updateShiftAssignment(id, req.body);
      serializeSuccessResponse(res, { assignment }, 'Shift assignment updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove a shift assignment
   */
  async removeShiftAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      await ShiftMediator.removeShiftAssignment(id);
      serializeSuccessResponse(res, null, 'Shift assignment removed successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new ShiftsController();
