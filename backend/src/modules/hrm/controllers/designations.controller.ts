import { Request, Response, NextFunction } from 'express';
import {
  CreateDesignationRequest,
  UpdateDesignationRequest,
  DesignationQueryParams
} from '../../../types/hrm';
import DesignationMediator from '../mediators/designations/DesignationMediator';
import { serializeSuccessResponse } from '../../../utils/responseHelper';
import { MyLogger } from '../../../utils/new-logger';

class DesignationsController {
  /**
   * Get all designations with filtering and pagination
   */
  async getDesignations(req: Request, res: Response, next: NextFunction): Promise<void> {
    const action = 'designations.controller.getDesignations';
    try {
      MyLogger.info(action, { query: req.query });

      const queryParams: DesignationQueryParams = {
        search: req.query.search as string,
        department_id: req.query.department_id ? parseInt(req.query.department_id as string) : undefined,
        grade_level: req.query.grade_level as string,
        is_active: req.query.is_active ? req.query.is_active === 'true' : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        sort_by: (req.query.sort_by as string) || 'created_at',
        sort_order: (req.query.sort_order as 'asc' | 'desc') || 'desc'
      };

      const result = await DesignationMediator.getDesignations(queryParams);

      MyLogger.success(action, {
        total: result.total,
        page: result.page,
        limit: result.limit,
        designationsCount: result.designations.length
      });

      serializeSuccessResponse(res, result, 'SUCCESS');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get designation by ID
   */
  async getDesignationById(req: Request, res: Response, next: NextFunction): Promise<void> {
    const action = 'designations.controller.getDesignationById';
    try {
      const designationId = parseInt(req.params.id);
      MyLogger.info(action, { designationId });

      if (isNaN(designationId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid designation ID'
        });
        return;
      }

      const designation = await DesignationMediator.getDesignationById(designationId);

      MyLogger.success(action, { designationId: designation.id, designationCode: designation.code });
      serializeSuccessResponse(res, { designation }, 'SUCCESS');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create designation
   */
  async createDesignation(req: Request, res: Response, next: NextFunction): Promise<void> {
    const action = 'designations.controller.createDesignation';
    try {
      MyLogger.info(action, { body: req.body });

      const designationData: CreateDesignationRequest = req.body;
      if (!designationData.title?.trim()) {
        res.status(400).json({
          success: false,
          message: 'Designation title is required'
        });
        return;
      }

      const createdBy = req.user?.user_id;
      const designation = await DesignationMediator.createDesignation(designationData, createdBy);

      MyLogger.success(action, { designationId: designation.id, designationCode: designation.code });
      serializeSuccessResponse(res, { designation }, 'SUCCESS', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update designation
   */
  async updateDesignation(req: Request, res: Response, next: NextFunction): Promise<void> {
    const action = 'designations.controller.updateDesignation';
    try {
      const designationId = parseInt(req.params.id);
      MyLogger.info(action, { designationId, body: req.body });

      if (isNaN(designationId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid designation ID'
        });
        return;
      }

      const updateData: UpdateDesignationRequest = req.body;
      const updatedBy = req.user?.user_id;
      const designation = await DesignationMediator.updateDesignation(designationId, updateData, updatedBy);

      MyLogger.success(action, { designationId: designation.id });
      serializeSuccessResponse(res, { designation }, 'SUCCESS');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete designation (soft delete)
   */
  async deleteDesignation(req: Request, res: Response, next: NextFunction): Promise<void> {
    const action = 'designations.controller.deleteDesignation';
    try {
      const designationId = parseInt(req.params.id);
      MyLogger.info(action, { designationId });

      if (isNaN(designationId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid designation ID'
        });
        return;
      }

      const deletedBy = req.user?.user_id;
      await DesignationMediator.deleteDesignation(designationId, deletedBy);

      MyLogger.success(action, { designationId });
      serializeSuccessResponse(res, null, 'SUCCESS');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle designation active status
   */
  async toggleDesignationStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    const action = 'designations.controller.toggleDesignationStatus';
    try {
      const designationId = parseInt(req.params.id);
      MyLogger.info(action, { designationId });

      if (isNaN(designationId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid designation ID'
        });
        return;
      }

      const designation = await DesignationMediator.toggleStatus(designationId);

      MyLogger.success(action, { designationId, is_active: designation.is_active });
      serializeSuccessResponse(res, { designation }, 'SUCCESS');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk update designations
   */
  async bulkUpdateDesignations(req: Request, res: Response, next: NextFunction): Promise<void> {
    const action = 'designations.controller.bulkUpdateDesignations';
    try {
      const { action: actionType, designation_ids } = req.body;
      MyLogger.info(action, { actionType, designation_ids });

      if (!actionType || !['activate', 'deactivate', 'delete'].includes(actionType)) {
        res.status(400).json({
          success: false,
          message: 'Invalid bulk action'
        });
        return;
      }

      if (!Array.isArray(designation_ids) || designation_ids.length === 0) {
        res.status(400).json({
          success: false,
          message: 'designation_ids must be a non-empty array'
        });
        return;
      }

      const parsedIds = designation_ids
        .map((id: any) => parseInt(id))
        .filter((id: number) => !isNaN(id));

      if (parsedIds.length === 0) {
        res.status(400).json({
          success: false,
          message: 'designation_ids must contain valid numeric values'
        });
        return;
      }

      const result = await DesignationMediator.bulkUpdate(actionType, parsedIds);

      MyLogger.success(action, { actionType, updated_count: result.updated_count });
      serializeSuccessResponse(res, result, 'SUCCESS');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get designation hierarchy
   */
  async getDesignationHierarchy(req: Request, res: Response, next: NextFunction): Promise<void> {
    const action = 'designations.controller.getDesignationHierarchy';
    try {
      MyLogger.info(action, {});

      const hierarchy = await DesignationMediator.getDesignationHierarchy();

      MyLogger.success(action, { nodes: hierarchy.length });
      serializeSuccessResponse(res, { hierarchy }, 'SUCCESS');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export designations (CSV)
   */
  async exportDesignations(req: Request, res: Response, next: NextFunction): Promise<void> {
    const action = 'designations.controller.exportDesignations';
    try {
      MyLogger.info(action, { query: req.query });

      const queryParams: DesignationQueryParams = {
        search: req.query.search as string,
        department_id: req.query.department_id ? parseInt(req.query.department_id as string) : undefined,
        grade_level: req.query.grade_level as string,
        is_active: req.query.is_active ? req.query.is_active === 'true' : undefined,
        page: 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 1000,
        sort_by: (req.query.sort_by as string) || 'created_at',
        sort_order: (req.query.sort_order as 'asc' | 'desc') || 'desc'
      };

      const result = await DesignationMediator.getDesignations(queryParams);
      const format = (req.query.format as string) || 'csv';

      const headers = [
        'ID',
        'Title',
        'Code',
        'Department',
        'Grade Level',
        'Reports To',
        'Min Salary',
        'Max Salary',
        'Active'
      ];

      const rows = result.designations.map((d) => [
        d.id,
        d.title,
        d.code,
        d.department?.name || '',
        d.grade_level || '',
        d.reports_to?.title || '',
        d.min_salary ?? '',
        d.max_salary ?? '',
        d.is_active ? 'Yes' : 'No'
      ]);

      const csv = [headers, ...rows]
        .map((row) =>
          row
            .map((value) => {
              const str = value !== null && value !== undefined ? String(value) : '';
              return `"${str.replace(/"/g, '""')}"`;
            })
            .join(',')
        )
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=designations_export.${format}`);
      res.send(csv);

      MyLogger.success(action, { exported: rows.length, format });
    } catch (error) {
      next(error);
    }
  }
}

export default new DesignationsController();

