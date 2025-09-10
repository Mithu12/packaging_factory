import pool from '@/database/connection';
import { UpdateProductRequest, Product } from '@/types/product';
import { AddProductMediator } from './AddProduct.mediator';
import { MyLogger } from '@/utils/new-logger';

export class UpdateProductInfoMediator {
    static async updateProduct(id: number, productData: UpdateProductRequest): Promise<Product> {
        let action = 'UpdateProductInfoMediator.updateProduct';
        try {
            MyLogger.info(action, { 
                productId: id, 
                updateFields: Object.keys(productData)
            });

            // Check if product exists
            const existingProduct = await this.getProductById(id);
            if (!existingProduct) {
                throw new Error('Product not found');
            }

            // Validate SKU uniqueness if being updated
            if (productData.sku && productData.sku !== existingProduct.sku) {
                const skuExists = await AddProductMediator.checkSkuExists(productData.sku, id);
                if (skuExists) {
                    throw new Error('SKU already exists');
                }
            }

            // Validate barcode uniqueness if being updated
            if (productData.barcode && productData.barcode !== existingProduct.barcode) {
                const barcodeExists = await AddProductMediator.checkBarcodeExists(productData.barcode, id);
                if (barcodeExists) {
                    throw new Error('Barcode already exists');
                }
            }

            // Validate foreign key references if being updated
            if (productData.category_id || productData.subcategory_id || productData.supplier_id) {
                await this.validateReferences(id, productData);
            }

            // Build dynamic update query
            const updateFields: string[] = [];
            const values: any[] = [];
            let paramIndex = 1;

            Object.entries(productData).forEach(([key, value]) => {
                if (value !== undefined) {
                    updateFields.push(`${key} = $${paramIndex}`);
                    values.push(value);
                    paramIndex++;
                }
            });

            if (updateFields.length === 0) {
                throw new Error('No fields to update');
            }

            // Add updated_at
            updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

            const query = `
                UPDATE products 
                SET ${updateFields.join(', ')}
                WHERE id = $${paramIndex}
                RETURNING *
            `;

            values.push(id);

            const result = await pool.query(query, values);
            const updatedProduct = result.rows[0];

            MyLogger.success(action, { 
                productId: id,
                productName: updatedProduct.name,
                productSku: updatedProduct.sku,
                updatedFields: Object.keys(productData)
            });

            return updatedProduct;
        } catch (error: any) {
            MyLogger.error(action, error, { 
                productId: id, 
                updateFields: Object.keys(productData)
            });
            throw error;
        }
    }

    static async toggleProductStatus(id: number): Promise<Product> {
        let action = 'UpdateProductInfoMediator.toggleProductStatus';
        try {
            MyLogger.info(action, { productId: id });

            const product = await this.getProductById(id);
            if (!product) {
                throw new Error('Product not found');
            }

            const newStatus = product.status === 'active' ? 'inactive' : 'active';

            const query = `
                UPDATE products 
                SET status = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING *
            `;

            const result = await pool.query(query, [newStatus, id]);
            const updatedProduct = result.rows[0];

            MyLogger.success(action, { 
                productId: id,
                productName: updatedProduct.name,
                oldStatus: product.status,
                newStatus: newStatus
            });

            return updatedProduct;
        } catch (error: any) {
            MyLogger.error(action, error, { productId: id });
            throw error;
        }
    }

    static async updateStock(id: number, newStock: number, reason?: string): Promise<Product> {
        let action = 'UpdateProductInfoMediator.updateStock';
        try {
            MyLogger.info(action, { productId: id, newStock, reason });

            const product = await this.getProductById(id);
            if (!product) {
                throw new Error('Product not found');
            }

            if (newStock < 0) {
                throw new Error('Stock cannot be negative');
            }

            const query = `
                UPDATE products 
                SET current_stock = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING *
            `;

            const result = await pool.query(query, [newStock, id]);
            const updatedProduct = result.rows[0];

            MyLogger.success(action, { 
                productId: id,
                productName: updatedProduct.name,
                oldStock: product.current_stock,
                newStock: newStock,
                reason: reason
            });

            return updatedProduct;
        } catch (error: any) {
            MyLogger.error(action, error, { productId: id, newStock, reason });
            throw error;
        }
    }

    private static async getProductById(id: number): Promise<Product | null> {
        let action = 'UpdateProductInfoMediator.getProductById';
        try {
            MyLogger.info(action, { productId: id });

            const query = 'SELECT * FROM products WHERE id = $1';
            const result = await pool.query(query, [id]);

            if (result.rows.length === 0) {
                MyLogger.warn(action, { productId: id, message: 'Product not found' });
                return null;
            }

            const product = result.rows[0];

            MyLogger.success(action, { 
                productId: id, 
                productName: product.name 
            });

            return product;
        } catch (error: any) {
            MyLogger.error(action, error, { productId: id });
            throw error;
        }
    }

    private static async validateReferences(id: number, productData: UpdateProductRequest): Promise<void> {
        let action = 'UpdateProductInfoMediator.validateReferences';
        try {
            MyLogger.info(action, { 
                productId: id,
                categoryId: productData.category_id,
                subcategoryId: productData.subcategory_id,
                supplierId: productData.supplier_id
            });

            // Get current product data to merge with updates
            const currentProduct = await this.getProductById(id);
            if (!currentProduct) {
                throw new Error('Product not found');
            }

            const categoryId = productData.category_id || currentProduct.category_id;
            const subcategoryId = productData.subcategory_id !== undefined ? productData.subcategory_id : currentProduct.subcategory_id;
            const supplierId = productData.supplier_id || currentProduct.supplier_id;

            // Validate category exists
            const categoryQuery = 'SELECT id FROM categories WHERE id = $1';
            const categoryResult = await pool.query(categoryQuery, [categoryId]);
            
            if (categoryResult.rows.length === 0) {
                throw new Error('Category not found');
            }

            // Validate subcategory exists if provided
            if (subcategoryId) {
                const subcategoryQuery = 'SELECT id FROM subcategories WHERE id = $1 AND category_id = $2';
                const subcategoryResult = await pool.query(subcategoryQuery, [subcategoryId, categoryId]);
                
                if (subcategoryResult.rows.length === 0) {
                    throw new Error('Subcategory not found or does not belong to the specified category');
                }
            }

            // Validate supplier exists
            const supplierQuery = 'SELECT id FROM suppliers WHERE id = $1';
            const supplierResult = await pool.query(supplierQuery, [supplierId]);
            
            if (supplierResult.rows.length === 0) {
                throw new Error('Supplier not found');
            }

            MyLogger.success(action, { 
                productId: id,
                categoryId,
                subcategoryId,
                supplierId,
                message: 'All references validated successfully'
            });
        } catch (error: any) {
            MyLogger.error(action, error, { 
                productId: id,
                categoryId: productData.category_id,
                subcategoryId: productData.subcategory_id,
                supplierId: productData.supplier_id
            });
            throw error;
        }
    }
}
