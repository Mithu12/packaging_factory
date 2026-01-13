import express from 'express';
import reportsRoutes from './routes/reports.routes';
import customersRoutes from './routes/customers.routes';

const router = express.Router();

// Mount sales reports routes under /reports
router.use('/reports', reportsRoutes);

// Mount sales customers routes under /customers
router.use('/customers', customersRoutes);

export default router;