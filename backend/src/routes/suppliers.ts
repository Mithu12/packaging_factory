import express from 'express';
import { SupplierService } from '../services/supplierService';
import { 
  createSupplierSchema, 
  updateSupplierSchema, 
  supplierQuerySchema 
} from '../validation/supplierValidation';
import { createError } from '../middleware/errorHandler';

const router = express.Router();
const supplierService = new SupplierService();

// Validation middleware
const validateRequest = (schema: any) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: {
          message: 'Validation error',
          details: error.details.map((detail: any) => detail.message)
        }
      });
    }
    req.body = value;
    next();
  };
};

const validateQuery = (schema: any) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const { error, value } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({
        error: {
          message: 'Query validation error',
          details: error.details.map((detail: any) => detail.message)
        }
      });
    }
    req.query = value;
    next();
  };
};

// GET /api/suppliers - Get all suppliers with pagination and filtering
router.get('/', validateQuery(supplierQuerySchema), async (req, res, next) => {
  try {
    const result = await supplierService.getSuppliers(req.query);
    res.json({
      success: true,
      data: result,
      message: 'Suppliers retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/suppliers/stats - Get supplier statistics
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await supplierService.getSupplierStats();
    res.json({
      success: true,
      data: stats,
      message: 'Supplier statistics retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/suppliers/categories - Get all supplier categories
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await supplierService.getSupplierCategories();
    res.json({
      success: true,
      data: categories,
      message: 'Supplier categories retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/suppliers/search - Search suppliers
router.get('/search', async (req, res, next) => {
  try {
    const { q, limit } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        error: {
          message: 'Search query is required'
        }
      });
    }

    const suppliers = await supplierService.searchSuppliers(
      q, 
      limit ? parseInt(limit as string) : 10
    );
    
    res.json({
      success: true,
      data: suppliers,
      message: 'Search completed successfully'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/suppliers/:id - Get supplier by ID
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        error: {
          message: 'Invalid supplier ID'
        }
      });
    }

    const supplier = await supplierService.getSupplierById(id);
    res.json({
      success: true,
      data: supplier,
      message: 'Supplier retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/suppliers - Create new supplier
router.post('/', validateRequest(createSupplierSchema), async (req, res, next) => {
  try {
    const supplier = await supplierService.createSupplier(req.body);
    res.status(201).json({
      success: true,
      data: supplier,
      message: 'Supplier created successfully'
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/suppliers/:id - Update supplier
router.put('/:id', validateRequest(updateSupplierSchema), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        error: {
          message: 'Invalid supplier ID'
        }
      });
    }

    const supplier = await supplierService.updateSupplier(id, req.body);
    res.json({
      success: true,
      data: supplier,
      message: 'Supplier updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/suppliers/:id/toggle-status - Toggle supplier status
router.patch('/:id/toggle-status', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        error: {
          message: 'Invalid supplier ID'
        }
      });
    }

    const supplier = await supplierService.toggleSupplierStatus(id);
    res.json({
      success: true,
      data: supplier,
      message: `Supplier ${supplier.status === 'active' ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/suppliers/:id - Delete supplier
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        error: {
          message: 'Invalid supplier ID'
        }
      });
    }

    await supplierService.deleteSupplier(id);
    res.json({
      success: true,
      message: 'Supplier deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
