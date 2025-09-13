import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import { BrandMediator } from '@/mediators/brands/BrandMediator';
import { validateCreateBrand, validateUpdateBrand } from '@/validation/brandValidation';
import { validateRequest } from '@/middleware/validation';
import { authenticate, managerAndAbove } from '@/middleware/auth';

const router = express.Router();

// Get all brands
router.get('/',
  authenticate,
  expressAsyncHandler(async (req, res, next) => {
    const brands = await BrandMediator.getAllBrands();
    res.json({
      success: true,
      message: 'Brands retrieved successfully',
      data: brands
    });
  })
);

// Get brand by ID
router.get('/:id',
  authenticate,
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
  managerAndAbove,
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
  expressAsyncHandler(async (req, res, next) => {
    const status = req.params.status as 'active' | 'inactive';
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be active or inactive'
      });
    }
    
    const brands = await BrandMediator.getBrandsByStatus(status);
    res.json({
      success: true,
      message: `Brands with status ${status} retrieved successfully`,
      data: brands
    });
  })
);

export default router;
