import { Request, Response } from 'express';
import { CreateDepartmentRequest, UpdateDepartmentRequest, DepartmentQueryParams } from '../../../types/hrm';
import DepartmentMediator from '../mediators/departments/DepartmentMediator';
import { MyLogger } from '../../../utils/new-logger';
import { serializeSuccessResponse } from '../../../utils/responseHelper';

/**
 * Get all departments with pagination and filtering
 */
export const getDepartments = async (req: Request, res: Response): Promise<void> => {
  const action = "departments.controller.getDepartments";
  try {
    MyLogger.info(action, { query: req.query });

    const queryParams: DepartmentQueryParams = {
      search: req.query.search as string,
      manager_id: req.query.manager_id ? parseInt(req.query.manager_id as string) : undefined,
      parent_department_id: req.query.parent_department_id ? parseInt(req.query.parent_department_id as string) : undefined,
      is_active: req.query.is_active ? req.query.is_active === 'true' : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
      sort_by: req.query.sort_by as string || 'created_at',
      sort_order: (req.query.sort_order as 'asc' | 'desc') || 'desc'
    };

    const result = await DepartmentMediator.getDepartments(queryParams);

    MyLogger.success(action, {
      total: result.total,
      page: result.page,
      limit: result.limit,
      departmentsCount: result.departments.length
    });

    serializeSuccessResponse(res, result, 'SUCCESS');
  } catch (error: any) {
    MyLogger.error(action, error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve departments',
      error: error.message
    });
  }
};

/**
 * Get department by ID
 */
export const getDepartmentById = async (req: Request, res: Response): Promise<void> => {
  const action = "departments.controller.getDepartmentById";
  try {
    const departmentId = parseInt(req.params.id);
    MyLogger.info(action, { departmentId });

    if (isNaN(departmentId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid department ID'
      });
      return;
    }

    const department = await DepartmentMediator.getDepartmentById(departmentId);

    MyLogger.success(action, {
      departmentId: department.id,
      departmentName: department.name
    });

    serializeSuccessResponse(res, { department }, 'SUCCESS');
  } catch (error: any) {
    MyLogger.error(action, error);
    if (error.message === 'Department not found') {
      res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve department',
        error: error.message
      });
    }
  }
};

/**
 * Create new department
 */
export const createDepartment = async (req: Request, res: Response): Promise<void> => {
  const action = "departments.controller.createDepartment";
  try {
    MyLogger.info(action, { body: req.body });

    const departmentData: CreateDepartmentRequest = req.body;

    // Basic validation
    if (!departmentData.name?.trim()) {
      res.status(400).json({
        success: false,
        message: 'Department name is required'
      });
      return;
    }

    const createdBy = req.user?.user_id;
    const department = await DepartmentMediator.createDepartment(departmentData, createdBy);

    MyLogger.success(action, {
      departmentId: department.id,
      departmentName: department.name,
      departmentCode: department.code
    });

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: department
    });
  } catch (error: any) {
    MyLogger.error(action, error);
    if (error.message === 'Department code already exists') {
      res.status(409).json({
        success: false,
        message: 'Department code already exists'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to create department',
        error: error.message
      });
    }
  }
};

/**
 * Update department
 */
export const updateDepartment = async (req: Request, res: Response): Promise<void> => {
  const action = "departments.controller.updateDepartment";
  try {
    const departmentId = parseInt(req.params.id);
    MyLogger.info(action, { departmentId, body: req.body });

    if (isNaN(departmentId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid department ID'
      });
      return;
    }

    const updateData: UpdateDepartmentRequest = req.body;
    const updatedBy = req.user?.user_id;

    const department = await DepartmentMediator.updateDepartment(departmentId, updateData, updatedBy);

    MyLogger.success(action, {
      departmentId: department.id,
      departmentName: department.name
    });

    serializeSuccessResponse(res, { department }, 'Department updated successfully');
  } catch (error: any) {
    MyLogger.error(action, error);
    if (error.message === 'Department not found') {
      res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    } else if (error.message === 'Department code already exists') {
      res.status(409).json({
        success: false,
        message: 'Department code already exists'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to update department',
        error: error.message
      });
    }
  }
};

/**
 * Delete department (soft delete)
 */
export const deleteDepartment = async (req: Request, res: Response): Promise<void> => {
  const action = "departments.controller.deleteDepartment";
  try {
    const departmentId = parseInt(req.params.id);
    MyLogger.info(action, { departmentId });

    if (isNaN(departmentId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid department ID'
      });
      return;
    }

    const deletedBy = req.user?.user_id;
    await DepartmentMediator.deleteDepartment(departmentId, deletedBy);

    MyLogger.success(action, {
      departmentId,
      message: 'Department deleted successfully'
    });

    serializeSuccessResponse(res, {}, 'Department deleted successfully');
  } catch (error: any) {
    MyLogger.error(action, error);
    if (error.message === 'Department not found') {
      res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    } else if (error.message.includes('Cannot delete department with')) {
      res.status(409).json({
        success: false,
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to delete department',
        error: error.message
      });
    }
  }
};

/**
 * Get department hierarchy
 */
export const getDepartmentHierarchy = async (req: Request, res: Response): Promise<void> => {
  const action = "departments.controller.getDepartmentHierarchy";
  try {
    MyLogger.info(action, {});

    const hierarchy = await DepartmentMediator.getDepartmentHierarchy();

    MyLogger.success(action, {
      departmentsCount: hierarchy.length
    });

    serializeSuccessResponse(res, { hierarchy }, 'SUCCESS');
  } catch (error: any) {
    MyLogger.error(action, error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve department hierarchy',
      error: error.message
    });
  }
};