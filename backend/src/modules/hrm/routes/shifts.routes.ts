import express from 'express';
import { authenticate } from '@/middleware/auth';
import { requirePermission, PERMISSIONS } from '@/middleware/permission';
import expressAsyncHandler from 'express-async-handler';
import { auditMiddleware } from '@/middleware/audit';
import ShiftsController from '../controllers/shifts.controller';

const router = express.Router();
router.use(authenticate);
router.use(auditMiddleware);

// =====================================================
// Shift Routes
// =====================================================

// Get all shifts
router.get(
  '/',
  requirePermission(PERMISSIONS.HR_ATTENDANCE_READ),
  expressAsyncHandler(ShiftsController.getShifts.bind(ShiftsController))
);

// Create a new shift
router.post(
  '/',
  requirePermission(PERMISSIONS.HR_ATTENDANCE_CREATE),
  expressAsyncHandler(ShiftsController.createShift.bind(ShiftsController))
);

// Get shift by ID
router.get(
  '/:id',
  requirePermission(PERMISSIONS.HR_ATTENDANCE_READ),
  expressAsyncHandler(ShiftsController.getShiftById.bind(ShiftsController))
);

// Update a shift
router.put(
  '/:id',
  requirePermission(PERMISSIONS.HR_ATTENDANCE_UPDATE),
  expressAsyncHandler(ShiftsController.updateShift.bind(ShiftsController))
);

// Delete (deactivate) a shift
router.delete(
  '/:id',
  requirePermission(PERMISSIONS.HR_ATTENDANCE_MANAGE),
  expressAsyncHandler(ShiftsController.deleteShift.bind(ShiftsController))
);

// =====================================================
// Shift Assignment Routes
// =====================================================

// Get shift assignments
router.get(
  '/assignments/list',
  requirePermission(PERMISSIONS.HR_ATTENDANCE_READ),
  expressAsyncHandler(ShiftsController.getShiftAssignments.bind(ShiftsController))
);

// Assign a shift to an employee
router.post(
  '/assignments',
  requirePermission(PERMISSIONS.HR_ATTENDANCE_CREATE),
  expressAsyncHandler(ShiftsController.assignShift.bind(ShiftsController))
);

// Update a shift assignment
router.put(
  '/assignments/:id',
  requirePermission(PERMISSIONS.HR_ATTENDANCE_UPDATE),
  expressAsyncHandler(ShiftsController.updateShiftAssignment.bind(ShiftsController))
);

// Remove a shift assignment
router.delete(
  '/assignments/:id',
  requirePermission(PERMISSIONS.HR_ATTENDANCE_MANAGE),
  expressAsyncHandler(ShiftsController.removeShiftAssignment.bind(ShiftsController))
);

export default router;
