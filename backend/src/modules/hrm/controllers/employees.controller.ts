import { Request, Response } from 'express';
import { Employee, CreateEmployeeRequest, UpdateEmployeeRequest, EmployeeQueryParams } from '../../../types/hrm';
import { EmployeeMediator } from '../mediators/employees/EmployeeMediator';
import { responseHelper } from '../../../utils/responseHelper';
import { AuthenticatedRequest } from '../../../types/rbac';

export class EmployeeController {
  private employeeMediator: EmployeeMediator;

  constructor() {
    this.employeeMediator = new EmployeeMediator();
  }

  /**
   * Get all employees with filtering and pagination
   */
  async getEmployees(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
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

      const result = await this.employeeMediator.getEmployees(queryParams);
      responseHelper.success(res, result, 'Employees retrieved successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to retrieve employees');
    }
  }

  /**
   * Get employee by ID
   */
  async getEmployeeById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const employeeId = parseInt(req.params.id);
      const employee = await this.employeeMediator.getEmployeeById(employeeId);

      responseHelper.success(res, { employee }, 'Employee retrieved successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to retrieve employee');
    }
  }

  /**
   * Create new employee
   */
  async createEmployee(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const employeeData: CreateEmployeeRequest = req.body;
      const createdEmployee = await this.employeeMediator.createEmployee(employeeData, req.user?.user_id);

      responseHelper.success(res, { employee: createdEmployee }, 'Employee created successfully', 201);
    } catch (error) {
      responseHelper.error(res, error, 'Failed to create employee');
    }
  }

  /**
   * Update employee
   */
  async updateEmployee(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const employeeId = parseInt(req.params.id);
      const updateData: UpdateEmployeeRequest = req.body;
      const updatedEmployee = await this.employeeMediator.updateEmployee(employeeId, updateData, req.user?.user_id);

      responseHelper.success(res, { employee: updatedEmployee }, 'Employee updated successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to update employee');
    }
  }

  /**
   * Delete employee (soft delete)
   */
  async deleteEmployee(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const employeeId = parseInt(req.params.id);
      await this.employeeMediator.deleteEmployee(employeeId, req.user?.user_id);

      responseHelper.success(res, null, 'Employee deleted successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to delete employee');
    }
  }

  /**
   * Get employee dashboard statistics
   */
  async getEmployeeDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const factoryId = req.query.factory_id ? parseInt(req.query.factory_id as string) : undefined;
      const stats = await this.employeeMediator.getEmployeeDashboard(factoryId);

      responseHelper.success(res, { stats }, 'Employee dashboard retrieved successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to retrieve employee dashboard');
    }
  }

  /**
   * Get employees by department
   */
  async getEmployeesByDepartment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const departmentId = parseInt(req.params.departmentId);
      const employees = await this.employeeMediator.getEmployeesByDepartment(departmentId);

      responseHelper.success(res, { employees }, 'Employees retrieved successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to retrieve employees by department');
    }
  }

  /**
   * Get employees by designation
   */
  async getEmployeesByDesignation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const designationId = parseInt(req.params.designationId);
      const employees = await this.employeeMediator.getEmployeesByDesignation(designationId);

      responseHelper.success(res, { employees }, 'Employees retrieved successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to retrieve employees by designation');
    }
  }

  /**
   * Get employee hierarchy (reporting structure)
   */
  async getEmployeeHierarchy(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const employeeId = req.params.employeeId ? parseInt(req.params.employeeId) : undefined;
      const hierarchy = await this.employeeMediator.getEmployeeHierarchy(employeeId);

      responseHelper.success(res, { hierarchy }, 'Employee hierarchy retrieved successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to retrieve employee hierarchy');
    }
  }

  /**
   * Search employees
   */
  async searchEmployees(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const searchTerm = req.query.q as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const employees = await this.employeeMediator.searchEmployees(searchTerm, limit);

      responseHelper.success(res, { employees }, 'Employee search completed successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to search employees');
    }
  }

  /**
   * Bulk import employees
   */
  async bulkImportEmployees(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const employeesData: CreateEmployeeRequest[] = req.body.employees;
      const result = await this.employeeMediator.bulkImportEmployees(employeesData, req.user?.user_id);

      responseHelper.success(res, result, 'Bulk import completed successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to bulk import employees');
    }
  }

  /**
   * Export employees data
   */
  async exportEmployees(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const queryParams: EmployeeQueryParams = {
        factory_id: req.query.factory_id ? parseInt(req.query.factory_id as string) : undefined,
        department_id: req.query.department_id ? parseInt(req.query.department_id as string) : undefined,
        designation_id: req.query.designation_id ? parseInt(req.query.designation_id as string) : undefined,
        employment_type: req.query.employment_type as string,
        is_active: req.query.is_active ? req.query.is_active === 'true' : undefined,
        search: req.query.search as string
      };

      const format = (req.query.format as string) || 'excel';
      const exportData = await this.employeeMediator.exportEmployees(queryParams, format);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=employees_export.${format}`);

      res.send(exportData);
    } catch (error) {
      responseHelper.error(res, error, 'Failed to export employees');
    }
  }

  /**
   * Get employee documents
   */
  async getEmployeeDocuments(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const employeeId = parseInt(req.params.id);
      const documents = await this.employeeMediator.getEmployeeDocuments(employeeId);

      responseHelper.success(res, { documents }, 'Employee documents retrieved successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to retrieve employee documents');
    }
  }

  /**
   * Upload employee document
   */
  async uploadEmployeeDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const employeeId = parseInt(req.params.id);
      const file = req.file;
      const documentType = req.body.document_type;

      if (!file) {
        return responseHelper.error(res, new Error('No file uploaded'), 'File is required');
      }

      const document = await this.employeeMediator.uploadEmployeeDocument(
        employeeId,
        file,
        documentType,
        req.user?.user_id
      );

      responseHelper.success(res, { document }, 'Document uploaded successfully', 201);
    } catch (error) {
      responseHelper.error(res, error, 'Failed to upload document');
    }
  }

  /**
   * Get employee salary history
   */
  async getEmployeeSalaryHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const employeeId = parseInt(req.params.id);
      const history = await this.employeeMediator.getEmployeeSalaryHistory(employeeId);

      responseHelper.success(res, { history }, 'Salary history retrieved successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to retrieve salary history');
    }
  }

  /**
   * Update employee salary
   */
  async updateEmployeeSalary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const employeeId = parseInt(req.params.id);
      const { newSalary, effectiveDate, reason } = req.body;

      const result = await this.employeeMediator.updateEmployeeSalary(
        employeeId,
        newSalary,
        effectiveDate,
        reason,
        req.user?.user_id
      );

      responseHelper.success(res, result, 'Salary updated successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to update salary');
    }
  }
}
