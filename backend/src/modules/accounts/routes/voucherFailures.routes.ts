import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { requirePermission } from '@/middleware/permission';
import { PERMISSIONS } from '@/middleware/permission';
import expressAsyncHandler from 'express-async-handler';
import { getVoucherFailures } from '../controllers/voucherFailures.controller';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requirePermission(PERMISSIONS.VOUCHERS_READ),
  expressAsyncHandler(getVoucherFailures)
);

export default router;
