import express from 'express';
import reportsRoutes from './routes/reports.routes';

const router = express.Router();

// Mount sales reports routes under /reports
router.use('/reports', reportsRoutes);

export default router;