import express from 'express';
import {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartmentHierarchy
} from '../controllers/departments.controller';

const router = express.Router();

/**
 * @route   GET /api/hrm/departments
 * @desc    Get all departments with pagination and filtering
 * @access  Private
 * @query   page, limit, search, manager_id, parent_department_id, is_active, sort_by, sort_order
 */
router.get('/', getDepartments);

/**
 * @route   GET /api/hrm/departments/hierarchy
 * @desc    Get department hierarchy (recursive tree structure)
 * @access  Private
 */
router.get('/hierarchy', getDepartmentHierarchy);

/**
 * @route   GET /api/hrm/departments/:id
 * @desc    Get department by ID
 * @access  Private
 */
router.get('/:id', getDepartmentById);

/**
 * @route   POST /api/hrm/departments
 * @desc    Create new department
 * @access  Private
 * @body    { name, code, description?, manager_id?, parent_department_id? }
 */
router.post('/', createDepartment);

/**
 * @route   PUT /api/hrm/departments/:id
 * @desc    Update department
 * @access  Private
 * @body    { name?, code?, description?, manager_id?, parent_department_id?, is_active? }
 */
router.put('/:id', updateDepartment);

/**
 * @route   DELETE /api/hrm/departments/:id
 * @desc    Delete department (soft delete)
 * @access  Private
 */
router.delete('/:id', deleteDepartment);

export default router;