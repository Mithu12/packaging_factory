import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import path from 'path';

// Import routes
import supplierRoutes from './routes/suppliers.routes';
import categoryRoutes from './routes/categories.routes';
import productRoutes from './routes/products.routes';
import stockAdjustmentRoutes from './routes/stockAdjustments.routes';
import purchaseOrderRoutes from './routes/purchaseOrders.routes';
import inventoryRoutes from './routes/inventory.routes';
import paymentRoutes from './routes/payments.routes';
import { errorHandler } from './middleware/errorHandler';
import {MyLogger} from './utils/new-logger';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
// app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: true, // Allow all origins
  credentials: true
}));

// Logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploaded images
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  let action = 'Health Check'
  try {
    MyLogger.info(action, { ip: req.ip, userAgent: req.get('User-Agent') })
    const healthData = { 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
    MyLogger.success(action, healthData)
    res.status(200).json(healthData);
  } catch (error: any) {
    MyLogger.error(action, error, { ip: req.ip })
    res.status(500).json({ status: 'ERROR', message: 'Health check failed' });
  }
});

// API routes
app.use('/api/suppliers', supplierRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/stock-adjustments', stockAdjustmentRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/payments', paymentRoutes);

// 404 handler
app.use('*', (req, res) => {
  let action = '404 Route Not Found'
  try {
    MyLogger.warn(action, { 
      path: req.originalUrl, 
      method: req.method, 
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    res.status(404).json({ 
      error: 'Route not found',
      path: req.originalUrl 
    });
  } catch (error: any) {
    MyLogger.error(action, error, { path: req.originalUrl })
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  let action = 'Server Startup'
  try {
    const serverInfo = {
      port: PORT,
      healthCheckUrl: `http://localhost:${PORT}/health`,
      apiBaseUrl: `http://localhost:${PORT}/api`,
      environment: process.env.NODE_ENV || 'development'
    };
    MyLogger.success(action, serverInfo);
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  } catch (error: any) {
    MyLogger.error(action, error, { port: PORT });
    console.error('Failed to start server:', error);
  }
});

export default app;
