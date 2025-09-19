import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import { validateCreateBrand, validateUpdateBrand } from '@/validation/brandValidation';
import { validateRequest } from '@/middleware/validation';
import { authenticate, employeeAndAbove, managerAndAbove, adminOnly } from '@/middleware/auth';
import BrandsController from "@/controllers/brands/brands.controller";

const router = express.Router();

// Get all brands
router.get('/', authenticate, employeeAndAbove, expressAsyncHandler(BrandsController.getAllBrands));

// Get brand by ID
router.get('/:id',
  authenticate,
  employeeAndAbove, // Employees and above can view brand details
  expressAsyncHandler(BrandsController.getBrandById)
);

// Create new brand
router.post('/',
  authenticate,
  managerAndAbove,
  validateRequest(validateCreateBrand),
  expressAsyncHandler(BrandsController.createBrand)
);

// Update brand
router.put('/:id',
  authenticate,
  managerAndAbove,
  validateRequest(validateUpdateBrand),
  expressAsyncHandler(BrandsController.updateBrand)
);

// Delete brand (soft delete)
router.delete('/:id',
  authenticate,
  adminOnly, // Only admins can delete brands
  expressAsyncHandler(BrandsController.deleteBrand)
);

// Get brands by status
router.get('/status/:status',
  authenticate,
  employeeAndAbove, // Employees and above can view brands by status
  expressAsyncHandler(BrandsController.getBrandsByStatus)
);

export default router;
