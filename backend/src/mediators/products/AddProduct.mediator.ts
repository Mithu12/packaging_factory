import pool from '@/database/connection';
import { CreateProductRequest, Product } from '@/types/product';
import { MyLogger } from '@/utils/new-logger';

export class AddProductMediator {
    static async generateProductCode(): Promise<string> {
        let action = 'AddProductMediator.generateProductCode';
        try {
            MyLogger.info(action);

            // Get the latest product code
            const query = `
                SELECT product_code 
                FROM products 
                WHERE product_code LIKE 'PRD-%' 
                ORDER BY product_code DESC 
                LIMIT 1
            `;

            const result = await pool.query(query);

            let nextNumber = 1;
            if (result.rows.length > 0) {
                const lastCode = result.rows[0].product_code;
                const lastNumber = parseInt(lastCode.split('-')[1]);
                nextNumber = lastNumber + 1;
            }

            const productCode = `PRD-${nextNumber.toString().padStart(3, '0')}`;

            MyLogger.success(action, { generatedCode: productCode });

            return productCode;
        } catch (error: any) {
            MyLogger.error(action, error);
            throw error;
        }
    }

    static async createProduct(productData: CreateProductRequest): Promise<Product> {
        let action = 'AddProductMediator.createProduct';
        try {
            MyLogger.info(action, { 
                productName: productData.name, 
                productSku: productData.sku,
                categoryId: productData.category_id,
                supplierId: productData.supplier_id
            });

            // Generate product code
            const productCode = await this.generateProductCode();

            // Validate foreign key references
            await this.validateReferences(productData);

            const query = `
                INSERT INTO products (
                    product_code, sku, name, description, category_id, subcategory_id,
                    unit_of_measure, cost_price, selling_price, current_stock, min_stock_level,
                    max_stock_level, supplier_id, status, barcode, weight, dimensions,
                    tax_rate, reorder_point, reorder_quantity, notes
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
                ) RETURNING *
            `;

            const values = [
                productCode,
                productData.sku,
                productData.name,
                productData.description || null,
                productData.category_id,
                productData.subcategory_id || null,
                productData.unit_of_measure,
                productData.cost_price,
                productData.selling_price,
                productData.current_stock,
                productData.min_stock_level,
                productData.max_stock_level || null,
                productData.supplier_id,
                productData.status || 'active',
                productData.barcode || null,
                productData.weight || null,
                productData.dimensions || null,
                productData.tax_rate || null,
                productData.reorder_point || null,
                productData.reorder_quantity || null,
                productData.notes || null
            ];

            const result = await pool.query(query, values);
            const newProduct = result.rows[0];

            MyLogger.success(action, { 
                productId: newProduct.id,
                productCode: newProduct.product_code,
                productName: newProduct.name,
                productSku: newProduct.sku
            });

            return newProduct;
        } catch (error: any) {
            MyLogger.error(action, error, { 
                productName: productData.name, 
                productSku: productData.sku 
            });
            throw error;
        }
    }

    private static async validateReferences(productData: CreateProductRequest): Promise<void> {
        let action = 'AddProductMediator.validateReferences';
        try {
            MyLogger.info(action, { 
                categoryId: productData.category_id,
                subcategoryId: productData.subcategory_id,
                supplierId: productData.supplier_id
            });

            // Validate category exists
            const categoryQuery = 'SELECT id FROM categories WHERE id = $1';
            const categoryResult = await pool.query(categoryQuery, [productData.category_id]);
            
            if (categoryResult.rows.length === 0) {
                throw new Error('Category not found');
            }

            // Validate subcategory exists if provided
            if (productData.subcategory_id) {
                const subcategoryQuery = 'SELECT id FROM subcategories WHERE id = $1 AND category_id = $2';
                const subcategoryResult = await pool.query(subcategoryQuery, [
                    productData.subcategory_id, 
                    productData.category_id
                ]);
                
                if (subcategoryResult.rows.length === 0) {
                    throw new Error('Subcategory not found or does not belong to the specified category');
                }
            }

            // Validate supplier exists
            const supplierQuery = 'SELECT id FROM suppliers WHERE id = $1';
            const supplierResult = await pool.query(supplierQuery, [productData.supplier_id]);
            
            if (supplierResult.rows.length === 0) {
                throw new Error('Supplier not found');
            }

            MyLogger.success(action, { 
                categoryId: productData.category_id,
                subcategoryId: productData.subcategory_id,
                supplierId: productData.supplier_id,
                message: 'All references validated successfully'
            });
        } catch (error: any) {
            MyLogger.error(action, error, { 
                categoryId: productData.category_id,
                subcategoryId: productData.subcategory_id,
                supplierId: productData.supplier_id
            });
            throw error;
        }
    }

    static async checkSkuExists(sku: string, excludeId?: number): Promise<boolean> {
        let action = 'AddProductMediator.checkSkuExists';
        try {
            MyLogger.info(action, { sku, excludeId });

            let query = 'SELECT id FROM products WHERE sku = $1';
            let params: any[] = [sku];

            if (excludeId) {
                query += ' AND id != $2';
                params.push(excludeId);
            }

            const result = await pool.query(query, params);
            const exists = result.rows.length > 0;

            MyLogger.success(action, { sku, exists });

            return exists;
        } catch (error: any) {
            MyLogger.error(action, error, { sku, excludeId });
            throw error;
        }
    }

    static async checkBarcodeExists(barcode: string, excludeId?: number): Promise<boolean> {
        let action = 'AddProductMediator.checkBarcodeExists';
        try {
            MyLogger.info(action, { barcode, excludeId });

            if (!barcode) {
                return false; // Empty barcode is allowed
            }

            let query = 'SELECT id FROM products WHERE barcode = $1';
            let params: any[] = [barcode];

            if (excludeId) {
                query += ' AND id != $2';
                params.push(excludeId);
            }

            const result = await pool.query(query, params);
            const exists = result.rows.length > 0;

            MyLogger.success(action, { barcode, exists });

            return exists;
        } catch (error: any) {
            MyLogger.error(action, error, { barcode, excludeId });
            throw error;
        }
    }
}
