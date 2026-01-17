import { NextFunction, Request, Response } from "express";
import { GetProductInfoMediator } from "@/mediators/products/GetProductInfo.mediator";
import { AddProductMediator } from "@/mediators/products/AddProduct.mediator";
import { UpdateProductInfoMediator } from "@/mediators/products/UpdateProductInfo.mediator";
import { DeleteProductMediator } from "@/mediators/products/DeleteProduct.mediator";
import { StockAdjustmentMediator } from "@/mediators/stockAdjustments/StockAdjustmentMediator";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { MyLogger } from "@/utils/new-logger";
import { deleteProductImage } from "@/utils/file-utils";

class ProductsController {
    async getAllProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/products';
        try {
            MyLogger.info(action, { query: req.query });
            const result = await GetProductInfoMediator.getAllProducts(req.query);
            MyLogger.success(action, { total: result.total, page: result.page, limit: result.limit });
            serializeSuccessResponse(res, result, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { query: req.query });
            throw error;
        }
    }

    async getProductStats(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/products/stats';
        try {
            MyLogger.info(action);
            const stats = await GetProductInfoMediator.getProductStats();
            MyLogger.success(action, stats);
            serializeSuccessResponse(res, stats, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error);
            throw error;
        }
    }

    async searchProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/products/search';
        try {
            const { q, limit, distribution_center_id } = req.query;
            MyLogger.info(action, { query: q, limit, distribution_center_id });
            const products = await GetProductInfoMediator.searchProducts(
                q as string,
                limit ? parseInt(limit as string) : 10,
                distribution_center_id ? parseInt(distribution_center_id as string) : undefined
            );
            MyLogger.success(action, { query: q, resultsCount: products.length });
            serializeSuccessResponse(res, products, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { query: req.query.q });
            throw error;
        }
    }

    async searchProductByBarcode(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/products/barcode/:barcode';
        try {
            const { barcode } = req.params;
            const { distribution_center_id } = req.query;
            MyLogger.info(action, { barcode, distribution_center_id });
            const product = await GetProductInfoMediator.searchProductByBarcode(
                barcode,
                distribution_center_id ? parseInt(distribution_center_id as string) : undefined
            );
            
            if (!product) {
                res.status(404).json({
                    error: {
                        message: 'Product not found',
                        details: 'No product found with the given barcode'
                    }
                });
                return;
            }
            
            MyLogger.success(action, { barcode, productName: product.name });
            serializeSuccessResponse(res, product, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { barcode: req.params.barcode });
            throw error;
        }
    }

    async getLowStockProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/products/low-stock';
        try {
            const { distribution_center_id } = req.query;
            MyLogger.info(action, { distribution_center_id });
            const products = await GetProductInfoMediator.getLowStockProducts(
                distribution_center_id ? parseInt(distribution_center_id as string) : undefined
            );
            MyLogger.success(action, { lowStockCount: products.length, distribution_center_id });
            serializeSuccessResponse(res, products, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error);
            throw error;
        }
    }

    async getProductsByCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/products/category/:categoryId';
        try {
            const categoryId = parseInt(req.params.categoryId);
            const { distribution_center_id } = req.query;
            MyLogger.info(action, { categoryId, distribution_center_id });
            const products = await GetProductInfoMediator.getProductsByCategory(
                categoryId,
                distribution_center_id ? parseInt(distribution_center_id as string) : undefined
            );
            MyLogger.success(action, { categoryId, productsCount: products.length, distribution_center_id });
            serializeSuccessResponse(res, products, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { categoryId: req.params.categoryId });
            throw error;
        }
    }

    async getProductsBySupplier(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/products/supplier/:supplierId';
        try {
            const supplierId = parseInt(req.params.supplierId);
            const { distribution_center_id } = req.query;
            MyLogger.info(action, { supplierId, distribution_center_id });
            const products = await GetProductInfoMediator.getProductsBySupplier(
                supplierId,
                distribution_center_id ? parseInt(distribution_center_id as string) : undefined
            );
            MyLogger.success(action, { supplierId, productsCount: products.length, distribution_center_id });
            serializeSuccessResponse(res, products, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { supplierId: req.params.supplierId });
            throw error;
        }
    }

    async getProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/products/:id';
        try {
            const id = parseInt(req.params.id);
            MyLogger.info(action, { productId: id });
            const product = await GetProductInfoMediator.getProductById(id);
            MyLogger.success(action, { productId: id, productName: product.name });
            serializeSuccessResponse(res, product, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { productId: req.params.id });
            throw error;
        }
    }

    async createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'POST /api/products';
        try {
            MyLogger.info(action, { productName: req.body.name });
            
            // Handle image upload if present
            if (req.file) {
                req.body.image = req.file.filename;
            }
            
            const product = await AddProductMediator.createProduct(req.body);
            MyLogger.success(action, { productId: product.id, productName: product.name });
            serializeSuccessResponse(res, product, 'SUCCESS');
        } catch (error: any) {
            // Clean up uploaded image if product creation failed
            if (req.file) {
                await deleteProductImage(req.file.filename);
            }
            MyLogger.error(action, error, { productName: req.body.name });
            throw error;
        }
    }

    async updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'PUT /api/products/:id';
        try {
            const id = parseInt(req.params.id);
            MyLogger.info(action, { productId: id, updateFields: Object.keys(req.body) });
            
            // Handle image upload if present
            if (req.file) {
                req.body.image = req.file.filename;
            }
            
            const product = await UpdateProductInfoMediator.updateProduct(id, req.body);
            MyLogger.success(action, { productId: id, productName: product.name });
            serializeSuccessResponse(res, product, 'SUCCESS');
        } catch (error: any) {
            // Clean up uploaded image if update failed
            if (req.file) {
                await deleteProductImage(req.file.filename);
            }
            MyLogger.error(action, error, { productId: req.params.id });
            throw error;
        }
    }

    async deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'DELETE /api/products/:id';
        try {
            const id = parseInt(req.params.id);
            MyLogger.info(action, { productId: id });
            await DeleteProductMediator.deleteProduct(id);
            MyLogger.success(action, { productId: id });
            serializeSuccessResponse(res, {}, 'Deleted Successfully');
        } catch (error: any) {
            MyLogger.error(action, error, { productId: req.params.id });
            throw error;
        }
    }

    // Additional methods can be added as needed when mediator methods are available
}

export default new ProductsController();
