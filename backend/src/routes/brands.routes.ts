import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import { BrandMediator } from '@/mediators/brands/BrandMediator';
import { validateCreateBrand, validateUpdateBrand } from '@/validation/brandValidation';
import { validateRequest } from '@/middleware/validation';
import { authenticate, employeeAndAbove, managerAndAbove, adminOnly } from '@/middleware/auth';
import BrandsController from "@/controllers/brands.controller";

const router = express.Router();

// Get all brands
router.get('/', authenticate, employeeAndAbove, expressAsyncHandler(BrandsController.getAllBrands));

// Get brand by ID
router.get('/:id',
  authenticate,
  employeeAndAbove, // Employees and above can view brand details
  expressAsyncHandler(async (req, res, next) => {
    const brandId = parseInt(req.params.id);
    if (isNaN(brandId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid brand ID'
      });
    }

    const brand = await BrandMediator.getBrandById(brandId);
    res.json({
      success: true,
      message: 'Brand retrieved successfully',
      data: brand
    });
  })
);

// Create new brand
router.post('/',
  authenticate,
  managerAndAbove,
  validateRequest(validateCreateBrand),
  expressAsyncHandler(async (req, res, next) => {
    const brand = await BrandMediator.createBrand(req.body);
    res.status(201).json({
      success: true,
      message: 'Brand created successfully',
      data: brand
    });
  })
);

// Update brand
router.put('/:id',
  authenticate,
  managerAndAbove,
  validateRequest(validateUpdateBrand),
  expressAsyncHandler(async (req, res, next) => {
    const brandId = parseInt(req.params.id);
    if (isNaN(brandId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid brand ID'
      });
    }

    const brand = await BrandMediator.updateBrand(brandId, req.body);
    res.json({
      success: true,
      message: 'Brand updated successfully',
      data: brand
    });
  })
);

// Delete brand (soft delete)
router.delete('/:id',
  authenticate,
  adminOnly, // Only admins can delete brands
  expressAsyncHandler(async (req, res, next) => {
    const brandId = parseInt(req.params.id);
    if (isNaN(brandId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid brand ID'
      });
    }

    await BrandMediator.deleteBrand(brandId);
    res.json({
      success: true,
      message: 'Brand deleted successfully'
    });
  })
);

// Get brands by status
router.get('/status/:status',
  authenticate,
  employeeAndAbove, // Employees and above can view brands by status
  expressAsyncHandler(async (req, res, next) => {
    const status = req.params.status as 'active' | 'inactive';
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be active or inactive'
      });
    }

    const brands = await BrandMediator.getBrandsByStatus(status === 'active' ? true : false);
    res.json({
      success: true,
      message: `Brands with status ${status} retrieved successfully`,
      data: brands
    });
  })
);

export default router;
