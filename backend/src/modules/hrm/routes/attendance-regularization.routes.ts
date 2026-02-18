import express from 'express';
import { authenticate } from '@/middleware/auth';
import { requirePermission, PERMISSIONS } from '@/middleware/permission';
import expressAsyncHandler from 'express-async-handler';
import { auditMiddleware } from '@/middleware/audit';
import AttendanceRegularizationController from '../controllers/attendance-regularization.controller';

const router = express.Router();
router.use(authenticate);
router.use(auditMiddleware);

// Get all regularization requests
router.get(
  '/',
  requirePermission(PERMISSIONS.HR_ATTENDANCE_READ),
  expressAsyncHandler(AttendanceRegularizationController.getRegularizationRequests.bind(AttendanceRegularizationController))
);

// Create a new regularization request
router.post(
  '/',
  requirePermission(PERMISSIONS.HR_ATTENDANCE_CREATE),
  expressAsyncHandler(AttendanceRegularizationController.createRegularizationRequest.bind(AttendanceRegularizationController))
);

// Get a single regularization request
router.get(
  '/:id',
  requirePermission(PERMISSIONS.HR_ATTENDANCE_READ),
  expressAsyncHandler(AttendanceRegularizationController.getRegularizationRequestById.bind(AttendanceRegularizationController))
);

// Update a regularization request (while still pending)
router.put(
  '/:id',
  requirePermission(PERMISSIONS.HR_ATTENDANCE_UPDATE),
  expressAsyncHandler(AttendanceRegularizationController.updateRegularizationRequest.bind(AttendanceRegularizationController))
);

// Review a regularization request (approve/reject)
router.post(
  '/:id/review',
  requirePermission(PERMISSIONS.HR_ATTENDANCE_MANAGE),
  expressAsyncHandler(AttendanceRegularizationController.reviewRegularizationRequest.bind(AttendanceRegularizationController))
);

// Cancel a regularization request
router.post(
  '/:id/cancel',
  requirePermission(PERMISSIONS.HR_ATTENDANCE_UPDATE),
  expressAsyncHandler(AttendanceRegularizationController.cancelRegularizationRequest.bind(AttendanceRegularizationController))
);

export default router;
