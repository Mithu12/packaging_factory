import express, {NextFunction, Request, Response} from 'express';
import {
    createProductSchema,
    updateProductSchema,
    productQuerySchema,
    stockAdjustmentSchema
} from '@/validation/productValidation';
import { authenticate, employeeAndAbove, managerAndAbove, adminOnly } from "@/middleware/auth";
import expressAsyncHandler from "express-async-handler";
import { MyLogger } from "@/utils/new-logger";
import { uploadProductImage, handleUploadError } from "@/middleware/upload";
import ProductsController from "@/controllers/products/products.controller";

const router = express.Router();

// Validation middleware
const validateRequest = (schema: any) => {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
        let action = 'Validate Request Body'
        try {
            MyLogger.info(action, { endpoint: req.path, method: req.method })
            const {error, value} = schema.validate(req.body);
            if (error) {
                MyLogger.warn(action, { endpoint: req.path, method: req.method, validationErrors: error.details })
                return res.status(400).json({
                    error: {
                        message: 'Validation error',
                        details: error.details.map((detail: any) => detail.message)
                    }
                });
            }
            req.body = value;
            MyLogger.success(action, { endpoint: req.path, method: req.method })
            return next();
        } catch (err: any) {
            MyLogger.error(action, err, { endpoint: req.path, method: req.method })
            throw err;
        }
    };
};

const validateQuery = (schema: any) => {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
        let action = 'Validate Query Parameters'
        try {
            MyLogger.info(action, { endpoint: req.path, method: req.method, query: req.query })
            const {error, value} = schema.validate(req.query);
            if (error) {
                MyLogger.warn(action, { endpoint: req.path, method: req.method, validationErrors: error.details })
                return res.status(400).json({
                    error: {
                        message: 'Validation error',
                        details: error.details.map((detail: any) => detail.message)
                    }
                });
            }
            req.query = value;
            MyLogger.success(action, { endpoint: req.path, method: req.method })
            return next();
        } catch (err: any) {
            MyLogger.error(action, err, { endpoint: req.path, method: req.method })
            throw err;
        }
    };
};

// GET /api/products - Get all products with pagination and filtering
router.get('/', 
  authenticate, 
  employeeAndAbove, // Employees and above can view products
  validateQuery(productQuerySchema), 
  expressAsyncHandler(ProductsController.getAllProducts)
);

// GET /api/products/stats - Get product statistics
router.get('/stats', 
  authenticate, 
  managerAndAbove, // Only managers and above can view product statistics
  expressAsyncHandler(ProductsController.getProductStats)
);

// GET /api/products/search - Search products
router.get('/search', expressAsyncHandler(ProductsController.searchProducts));

// GET /api/products/low-stock - Get low stock products
router.get('/low-stock', expressAsyncHandler(ProductsController.getLowStockProducts));

// GET /api/products/category/:categoryId - Get products by category
router.get('/category/:categoryId', expressAsyncHandler(ProductsController.getProductsByCategory));

// GET /api/products/supplier/:supplierId - Get products by supplier
router.get('/supplier/:supplierId', expressAsyncHandler(ProductsController.getProductsBySupplier));

// GET /api/products/:id - Get product by ID with details
router.get('/:id', expressAsyncHandler(async (req, res, next) => {
    let action = 'GET /api/products/:id'
    try {
        const id = parseInt(req.params.id);
        MyLogger.info(action, { productId: id })
        const product = await GetProductInfoMediator.getProductById(id);
        MyLogger.success(action, { productId: id, productName: product.name })
        serializeSuccessResponse(res, product, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { productId: req.params.id })
        throw error;
    }
}));

// POST /api/products - Create new product
router.post('/', 
  authenticate, 
  managerAndAbove, // Only managers and above can create products
  validateRequest(createProductSchema), 
  expressAsyncHandler(async (req, res, next) => {
    let action = 'Add Product'
    try {
        MyLogger.info(action, { productName: req.body.name, productSku: req.body.sku })
        const product = await AddProductMediator.createProduct(req.body);
        MyLogger.success(action, { productId: product.id, productName: product.name, productSku: product.sku })
        serializeSuccessResponse(res, product, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { productName: req.body.name, productSku: req.body.sku })
        throw error;
    }
}));

// POST /api/products/with-image - Create new product with image
router.post('/with-image', uploadProductImage, handleUploadError, expressAsyncHandler(async (req, res, next) => {
    let action = 'POST /api/products/with-image'
    try {
        // Parse the JSON data from FormData
        const productData = JSON.parse(req.body.data);
        
        MyLogger.info(action, { productName: productData.name, productSku: productData.sku, hasImage: !!req.file })
        
        // Add image URL to product data if file was uploaded
        if (req.file) {
            productData.image_url = `/uploads/products/${req.file.filename}`;
        }
        
        // Validate the product data
        const { error, value } = createProductSchema.validate(productData);
        if (error) {
            res.status(400).json({
                error: {
                    message: 'Validation error',
                    details: error.details.map((detail: any) => detail.message)
                }
            });
            return;
        }
        
        const product = await AddProductMediator.createProduct(value);
        MyLogger.success(action, { productId: product.id, productName: product.name, productSku: product.sku, hasImage: !!req.file })
        serializeSuccessResponse(res, product, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { productName: req.body.data?.name, productSku: req.body.data?.sku })
        throw error;
    }
}));

// PUT /api/products/:id - Update product
router.put('/:id', 
  authenticate, 
  managerAndAbove, // Only managers and above can update products
  validateRequest(updateProductSchema), 
  expressAsyncHandler(async (req, res, next) => {
    let action = 'PUT /api/products/:id'
    try {
        const id = parseInt(req.params.id);
        MyLogger.info(action, { productId: id, updateFields: Object.keys(req.body) })
        const product = await UpdateProductInfoMediator.updateProduct(id, req.body);
        MyLogger.success(action, { productId: id, productName: product.name, productSku: product.sku })
        serializeSuccessResponse(res, product, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { productId: req.params.id, updateFields: Object.keys(req.body) })
        throw error;
    }
}));

// PUT /api/products/:id/with-image - Update product with image
router.put('/:id/with-image', uploadProductImage, handleUploadError, expressAsyncHandler(async (req, res, next) => {
    let action = 'PUT /api/products/:id/with-image'
    try {
        const id = parseInt(req.params.id);
        
        // Parse the JSON data from FormData
        const productData = JSON.parse(req.body.data);
        
        MyLogger.info(action, { productId: id, updateFields: Object.keys(productData), hasImage: !!req.file })
        
        // Get current product to check for existing image
        let currentProduct = null;
        if (req.file) {
            try {
                currentProduct = await GetProductInfoMediator.getProductById(id);
            } catch (error) {
                MyLogger.warn('Could not fetch current product for image deletion', { productId: id, error });
            }
        }
        
        // Add image URL to product data if file was uploaded
        if (req.file) {
            productData.image_url = `/uploads/products/${req.file.filename}`;
        }
        
        // Validate the product data
        const { error, value } = updateProductSchema.validate(productData);
        if (error) {
            MyLogger.error(action, error, {})
            res.status(400).json({
                error: {
                    message: 'Validation error',
                    details: error.details.map((detail: any) => detail.message)
                }
            });
            return;
        }
        
        const product = await UpdateProductInfoMediator.updateProduct(id, value);
        
        // Delete old image file if a new image was uploaded and old image exists
        if (req.file && currentProduct?.image_url) {
            const oldImageDeleted = await deleteProductImage(currentProduct.image_url);
            MyLogger.info('Old image deletion result', { 
                productId: id, 
                oldImageUrl: currentProduct.image_url, 
                deleted: oldImageDeleted 
            });
        }
        
        MyLogger.success(action, { productId: id, productName: product.name, productSku: product.sku, hasImage: !!req.file })
        serializeSuccessResponse(res, product, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { productId: req.params.id, updateFields: Object.keys(req.body.data || {}) })
        throw error;
    }
}));

// POST /api/products/:id/image - Update product image only
router.post('/:id/image', uploadProductImage, handleUploadError, expressAsyncHandler(async (req, res, next) => {
    let action = 'POST /api/products/:id/image'
    try {
        const id = parseInt(req.params.id);
        MyLogger.info(action, { productId: id, hasImage: !!req.file })
        
        if (!req.file) {
            res.status(400).json({
                error: {
                    message: 'No image file provided',
                    details: 'Please upload an image file'
                }
            });
            return;
        }
        
        // Get current product to check for existing image
        let currentProduct = null;
        try {
            currentProduct = await GetProductInfoMediator.getProductById(id);
        } catch (error) {
            MyLogger.warn('Could not fetch current product for image deletion', { productId: id, error });
        }
        
        const imageUrl = `/uploads/products/${req.file.filename}`;
        const product = await UpdateProductInfoMediator.updateProduct(id, { image_url: imageUrl });
        
        // Delete old image file if it exists
        if (currentProduct?.image_url) {
            const oldImageDeleted = await deleteProductImage(currentProduct.image_url);
            MyLogger.info('Old image deletion result', { 
                productId: id, 
                oldImageUrl: currentProduct.image_url, 
                deleted: oldImageDeleted 
            });
        }
        
        MyLogger.success(action, { productId: id, productName: product.name, imageUrl })
        serializeSuccessResponse(res, product, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { productId: req.params.id })
        throw error;
    }
}));

// PATCH /api/products/:id/toggle-status - Toggle product status
router.patch('/:id/toggle-status', expressAsyncHandler(async (req, res, next) => {
    let action = 'PATCH /api/products/:id/toggle-status'
    try {
        const id = parseInt(req.params.id);
        MyLogger.info(action, { productId: id })
        const product = await UpdateProductInfoMediator.toggleProductStatus(id);
        MyLogger.success(action, { productId: id, productName: product.name, newStatus: product.status })
        serializeSuccessResponse(res, product, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { productId: req.params.id })
        throw error;
    }
}));

// PATCH /api/products/:id/stock - Update product stock
router.patch('/:id/stock', validateRequest(stockAdjustmentSchema), expressAsyncHandler(async (req, res, next) => {
    let action = 'PATCH /api/products/:id/stock'
    try {
        const id = parseInt(req.params.id);
        const { adjustment_type, quantity, reason, reference, notes } = req.body;
        MyLogger.info(action, { productId: id, adjustmentType: adjustment_type, quantity, reason })
        
        const adjustmentData = {
            product_id: id,
            adjustment_type,
            quantity,
            reason,
            reference,
            notes
        };
        
        const adjustment = await StockAdjustmentMediator.createStockAdjustment(adjustmentData);
        
        // Get updated product data
        const product = await GetProductInfoMediator.getProductById(id);
        
        MyLogger.success(action, { 
            productId: id, 
            adjustmentId: adjustment.id,
            productName: product.name, 
            newStock: product.current_stock 
        })
        serializeSuccessResponse(res, product, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { productId: req.params.id, quantity: req.body.quantity })
        throw error;
    }
}));

// DELETE /api/products/:id - Soft delete product (mark as discontinued)
router.delete('/:id', 
  authenticate, 
  adminOnly, // Only admins can delete products
  expressAsyncHandler(async (req, res, next) => {
    let action = 'DELETE /api/products/:id'
    try {
        const id = parseInt(req.params.id);
        MyLogger.info(action, { productId: id })
        
        // Get current product to check for existing image before deletion
        let currentProduct = null;
        try {
            currentProduct = await GetProductInfoMediator.getProductById(id);
        } catch (error) {
            MyLogger.warn('Could not fetch current product for image deletion', { productId: id, error });
        }
        
        await DeleteProductMediator.deleteProduct(id);
        
        // Delete associated image file if it exists (for soft delete, we might want to keep the image)
        // Uncomment the following lines if you want to delete images on soft delete
        // if (currentProduct?.image_url) {
        //     const imageDeleted = await deleteProductImage(currentProduct.image_url);
        //     MyLogger.info('Image deletion result on soft delete', { 
        //         productId: id, 
        //         imageUrl: currentProduct.image_url, 
        //         deleted: imageDeleted 
        //     });
        // }
        
        MyLogger.success(action, { productId: id, message: 'Product marked as discontinued' })
        serializeSuccessResponse(res, { message: 'Product marked as discontinued' }, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { productId: req.params.id })
        throw error;
    }
}));

// DELETE /api/products/:id/hard - Hard delete product (permanent)
router.delete('/:id/hard', expressAsyncHandler(async (req, res, next) => {
    let action = 'DELETE /api/products/:id/hard'
    try {
        const id = parseInt(req.params.id);
        MyLogger.info(action, { productId: id })
        
        // Get current product to check for existing image before deletion
        let currentProduct = null;
        try {
            currentProduct = await GetProductInfoMediator.getProductById(id);
        } catch (error) {
            MyLogger.warn('Could not fetch current product for image deletion', { productId: id, error });
        }
        
        await DeleteProductMediator.hardDeleteProduct(id);
        
        // Delete associated image file if it exists (for hard delete, we definitely want to delete the image)
        if (currentProduct?.image_url) {
            const imageDeleted = await deleteProductImage(currentProduct.image_url);
            MyLogger.info('Image deletion result on hard delete', { 
                productId: id, 
                imageUrl: currentProduct.image_url, 
                deleted: imageDeleted 
            });
        }
        
        MyLogger.success(action, { productId: id, message: 'Product permanently deleted' })
        serializeSuccessResponse(res, { message: 'Product permanently deleted' }, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { productId: req.params.id })
        throw error;
    }
}));

// GET /api/products/:id/references - Check product references
router.get('/:id/references', expressAsyncHandler(async (req, res, next) => {
    let action = 'GET /api/products/:id/references'
    try {
        const id = parseInt(req.params.id);
        MyLogger.info(action, { productId: id })
        const references = await DeleteProductMediator.checkProductReferences(id);
        MyLogger.success(action, { productId: id, hasReferences: references.hasReferences })
        serializeSuccessResponse(res, references, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { productId: req.params.id })
        throw error;
    }
}));

export default router;
