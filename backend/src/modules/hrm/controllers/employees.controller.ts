import { Request, Response, NextFunction } from 'express';
import { Employee, CreateEmployeeRequest, UpdateEmployeeRequest, EmployeeQueryParams } from '../../../types/hrm';
import { EmployeeMediator } from '../mediators/employees/EmployeeMediator';
import { serializeSuccessResponse, serializeErrorResponse } from '../../../utils/responseHelper';
import { MyLogger } from '../../../utils/new-logger';

export class EmployeeController {

  /**
   * Get all employees with filtering and pagination
   */
  async getEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/hrm/employees";
      MyLogger.info(action, { query: req.query });

      const userId = req.user?.user_id;
      const queryParams: EmployeeQueryParams = {
        factory_id: req.query.factory_id ? parseInt(req.query.factory_id as string) : undefined,
        department_id: req.query.department_id ? parseInt(req.query.department_id as string) : undefined,
        designation_id: req.query.designation_id ? parseInt(req.query.designation_id as string) : undefined,
        employment_type: req.query.employment_type as string,
        is_active: req.query.is_active ? req.query.is_active === 'true' : undefined,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        sort_by: req.query.sort_by as string || 'created_at',
        sort_order: (req.query.sort_order as 'asc' | 'desc') || 'desc'
      };

      const result = await EmployeeMediator.getEmployees(queryParams);
      MyLogger.success(action, {
        total: result.total,
        page: result.page,
        limit: result.limit,
        employeesCount: result.employees.length
      });

      serializeSuccessResponse(res, result, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get employee by ID
   */
  async getEmployeeById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/hrm/employees/:id";
      const { id } = req.params;
      MyLogger.info(action, { employeeId: id });

      const userId = req.user?.user_id;
      const employee = await EmployeeMediator.getEmployeeById(parseInt(id));

      if (!employee) {
        serializeSuccessResponse(res, null, "Employee not found", 404);
        return;
      }

      MyLogger.success(action, { employeeId: id, found: true });
      serializeSuccessResponse(res, { employee }, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new employee
   */
  async createEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "POST /api/hrm/employees";
      const employeeData: CreateEmployeeRequest = req.body;
      MyLogger.info(action, { employeeData });

      const userId = req.user?.user_id;
      const createdEmployee = await EmployeeMediator.createEmployee(employeeData, userId);

      MyLogger.success(action, { employeeId: createdEmployee.id });
      serializeSuccessResponse(res, { employee: createdEmployee }, "SUCCESS", 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update employee
   */
  async updateEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "PUT /api/hrm/employees/:id";
      const { id } = req.params;
      MyLogger.info(action, { employeeId: id });

      const employeeId = parseInt(id);
      const updateData: UpdateEmployeeRequest = req.body;
      const userId = req.user?.user_id;
      const updatedEmployee = await EmployeeMediator.updateEmployee(employeeId, updateData, userId);

      MyLogger.success(action, { employeeId: id, updated: true });
      serializeSuccessResponse(res, { employee: updatedEmployee }, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete employee (soft delete)
   */
  async deleteEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "DELETE /api/hrm/employees/:id";
      const { id } = req.params;
      MyLogger.info(action, { employeeId: id });

      const employeeId = parseInt(id);
      const userId = req.user?.user_id;
      await EmployeeMediator.deleteEmployee(employeeId, userId);

      MyLogger.success(action, { employeeId: id, deleted: true });
      serializeSuccessResponse(res, null, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get employee dashboard statistics
   */
  async getEmployeeDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/hrm/employees/dashboard";
      MyLogger.info(action, { query: req.query });

      const factoryId = req.query.factory_id ? parseInt(req.query.factory_id as string) : undefined;
      const stats = await EmployeeMediator.getEmployeeDashboard(factoryId);

      MyLogger.success(action, { totalEmployees: stats.total_employees });
      serializeSuccessResponse(res, { stats }, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get employees by department
   */
  async getEmployeesByDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/hrm/employees/department/:departmentId";
      const { departmentId } = req.params;
      MyLogger.info(action, { departmentId });

      const employees = await EmployeeMediator.getEmployeesByDepartment(parseInt(departmentId));

      MyLogger.success(action, { departmentId, employeesCount: employees.length });
      serializeSuccessResponse(res, { employees }, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get employees by designation
   */
  async getEmployeesByDesignation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/hrm/employees/designation/:designationId";
      const { designationId } = req.params;
      MyLogger.info(action, { designationId });

      const employees = await EmployeeMediator.getEmployeesByDesignation(parseInt(designationId));

      MyLogger.success(action, { designationId, employeesCount: employees.length });
      serializeSuccessResponse(res, { employees }, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get employee hierarchy (reporting structure)
   */
  async getEmployeeHierarchy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/hrm/employees/hierarchy/:employeeId?";
      const { employeeId } = req.params;
      MyLogger.info(action, { employeeId });

      const hierarchy = await EmployeeMediator.getEmployeeHierarchy(employeeId ? parseInt(employeeId) : undefined);

      MyLogger.success(action, { employeeId });
      serializeSuccessResponse(res, { hierarchy }, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search employees
   */
  async searchEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/hrm/employees/search";
      const searchTerm = req.query.q as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      MyLogger.info(action, { searchTerm, limit });

      const employees = await EmployeeMediator.searchEmployees(searchTerm, limit);

      MyLogger.success(action, { searchTerm, resultsCount: employees.length });
      serializeSuccessResponse(res, { employees }, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk import employees
   */
  async bulkImportEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "POST /api/hrm/employees/bulk-import";
      const employeesData: CreateEmployeeRequest[] = req.body.employees;
      MyLogger.info(action, { employeesCount: employeesData.length });

      const userId = req.user?.user_id;
      const result = await EmployeeMediator.bulkImportEmployees(employeesData, userId);

      MyLogger.success(action, { successful: result.successful, failed: result.failed });
      serializeSuccessResponse(res, result, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export employees data
   */
  async exportEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/hrm/employees/export";
      MyLogger.info(action, { query: req.query });

      const queryParams: EmployeeQueryParams = {
        factory_id: req.query.factory_id ? parseInt(req.query.factory_id as string) : undefined,
        department_id: req.query.department_id ? parseInt(req.query.department_id as string) : undefined,
        designation_id: req.query.designation_id ? parseInt(req.query.designation_id as string) : undefined,
        employment_type: req.query.employment_type as string,
        is_active: req.query.is_active ? req.query.is_active === 'true' : undefined,
        search: req.query.search as string
      };

      const format = (req.query.format as string) || 'excel';
      const exportData = await EmployeeMediator.exportEmployees(queryParams, format);

      MyLogger.success(action, { format });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=employees_export.${format}`);
      res.send(exportData);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get employee documents
   */
  async getEmployeeDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/hrm/employees/:id/documents";
      const { id } = req.params;
      MyLogger.info(action, { employeeId: id });

      const documents = await EmployeeMediator.getEmployeeDocuments(parseInt(id));

      MyLogger.success(action, { employeeId: id, documentsCount: documents.length });
      serializeSuccessResponse(res, { documents }, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload employee document
   */
  async uploadEmployeeDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "POST /api/hrm/employees/:id/documents";
      const { id } = req.params;
      const file = req.file;
      const documentType = req.body.document_type;
      MyLogger.info(action, { employeeId: id, documentType });

      if (!file) {
        res.status(400).json({
          success: false,
          message: "File is required",
          data: null
        });
        return;
      }

      const userId = req.user?.user_id;
      const document = await EmployeeMediator.uploadEmployeeDocument(
        parseInt(id),
        file,
        documentType,
        userId
      );

      MyLogger.success(action, { employeeId: id, documentId: document.id });
      serializeSuccessResponse(res, { document }, "SUCCESS", 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get employee salary history
   */
  async getEmployeeSalaryHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/hrm/employees/:id/salary-history";
      const { id } = req.params;
      MyLogger.info(action, { employeeId: id });

      const history = await EmployeeMediator.getEmployeeSalaryHistory(parseInt(id));

      MyLogger.success(action, { employeeId: id, historyCount: history.length });
      serializeSuccessResponse(res, { history }, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update employee salary
   */
  async updateEmployeeSalary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "PUT /api/hrm/employees/:id/salary";
      const { id } = req.params;
      const { newSalary, effectiveDate, reason } = req.body;
      MyLogger.info(action, { employeeId: id, newSalary, effectiveDate });

      const userId = req.user?.user_id;
      const result = await EmployeeMediator.updateEmployeeSalary(
        parseInt(id),
        newSalary,
        effectiveDate,
        reason,
        userId
      );

      MyLogger.success(action, { employeeId: id });
      serializeSuccessResponse(res, result, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }
}
