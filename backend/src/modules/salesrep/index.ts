// Sales Rep Module
import express from 'express';
import salesRepRoutes from './routes/salesRep.routes';

const router = express.Router();

// Mount sales rep routes under /api/salesrep
router.use('/', salesRepRoutes);

export default router;

