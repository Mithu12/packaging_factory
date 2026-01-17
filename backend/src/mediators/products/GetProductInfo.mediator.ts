import pool from '@/database/connection';
import { Product, ProductQueryParams, ProductStats, ProductWithDetails } from '@/types/product';
import { MyLogger } from '@/utils/new-logger';

export class GetProductInfoMediator {
    static async getAllProducts(params: ProductQueryParams): Promise<{
        products: Product[];
        total: number;
        page: number;
        limit: number;
    }> {
        let action = 'GetProductInfoMediator.getAllProducts';
        try {
            MyLogger.info(action, { params });

            const {
                page = 1,
                limit = 10,
                search,
                category_id,
                subcategory_id,
                brand_id,
                origin_id,
                supplier_id,
                status,
                low_stock,
                distribution_center_id,
                sortBy = 'created_at',
                sortOrder = 'desc'
            } = params;

            const offset = (page - 1) * limit;
            let whereConditions = ['1=1'];
            let queryParams: any[] = [];
            let paramIndex = 1;

            // Build WHERE conditions
            if (search) {
                whereConditions.push(`(p.name ILIKE $${paramIndex} OR p.sku ILIKE $${paramIndex} OR p.product_code ILIKE $${paramIndex})`);
                queryParams.push(`%${search}%`);
                paramIndex++;
            }

            if (category_id) {
                whereConditions.push(`p.category_id = $${paramIndex}`);
                queryParams.push(category_id);
                paramIndex++;
            }

            if (subcategory_id) {
                whereConditions.push(`p.subcategory_id = $${paramIndex}`);
                queryParams.push(subcategory_id);
                paramIndex++;
            }

            if (brand_id) {
                whereConditions.push(`p.brand_id = $${paramIndex}`);
                queryParams.push(brand_id);
                paramIndex++;
            }

            if (origin_id) {
                whereConditions.push(`p.origin_id = $${paramIndex}`);
                queryParams.push(origin_id);
                paramIndex++;
            }

            if (supplier_id) {
                whereConditions.push(`p.supplier_id = $${paramIndex}`);
                queryParams.push(supplier_id);
                paramIndex++;
            }

            if (status) {
                whereConditions.push(`p.status = $${paramIndex}`);
                queryParams.push(status);
                paramIndex++;
            }

            if (low_stock) {
                if (distribution_center_id) {
                    whereConditions.push(`COALESCE(pl.current_stock, 0) <= COALESCE(pl.min_stock_level, p.min_stock_level)`);
                } else {
                    whereConditions.push(`p.current_stock <= p.min_stock_level`);
                }
            }

            const whereClause = whereConditions.join(' AND ');

            // Count query
            const countQuery = `
                SELECT COUNT(*) as total
                FROM products p
                WHERE ${whereClause}
            `;

            const countResult = await pool.query(countQuery, queryParams);
            const total = parseInt(countResult.rows[0].total);

            // Main query with joins
            const mainQuery = `
                SELECT 
                    p.*,
                    ${distribution_center_id ? 'COALESCE(pl.current_stock, 0) as current_stock, pl.min_stock_level as dc_min_stock,' : ''}
                    c.name as category_name,
                    sc.name as subcategory_name,
                    b.name as brand_name,
                    o.name as origin_name,
                    s.name as supplier_name,
                    s.supplier_code
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
                LEFT JOIN brands b ON p.brand_id = b.id
                LEFT JOIN origins o ON p.origin_id = o.id
                LEFT JOIN suppliers s ON p.supplier_id = s.id
                ${distribution_center_id ? `LEFT JOIN product_locations pl ON p.id = pl.product_id AND pl.distribution_center_id = $${paramIndex + 2}` : ''}
                WHERE ${whereClause}
                ORDER BY p.${sortBy} ${sortOrder.toUpperCase()}
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;

            queryParams.push(limit, offset);
            if (distribution_center_id) {
                queryParams.push(distribution_center_id);
            }

            const result = await pool.query(mainQuery, queryParams);
            const products = result.rows;

            MyLogger.success(action, { 
                totalProducts: total, 
                returnedProducts: products.length, 
                page, 
                limit 
            });

            return {
                products,
                total,
                page,
                limit
            };
        } catch (error: any) {
            MyLogger.error(action, error, { params });
            throw error;
        }
    }

    static async getProductById(id: number): Promise<ProductWithDetails> {
        let action = 'GetProductInfoMediator.getProductById';
        try {
            MyLogger.info(action, { productId: id });

            const query = `
                SELECT 
                    p.*,
                    c.name as category_name,
                    sc.name as subcategory_name,
                    b.name as brand_name,
                    o.name as origin_name,
                    s.name as supplier_name,
                    s.supplier_code
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
                LEFT JOIN brands b ON p.brand_id = b.id
                LEFT JOIN origins o ON p.origin_id = o.id
                LEFT JOIN suppliers s ON p.supplier_id = s.id
                WHERE p.id = $1
            `;

            const result = await pool.query(query, [id]);

            if (result.rows.length === 0) {
                MyLogger.warn(action, { productId: id, message: 'Product not found' });
                throw new Error('Product not found');
            }

            const product = result.rows[0];

            // Structure the response with nested objects
            const productWithDetails: ProductWithDetails = {
                ...product,
                category: {
                    id: product.category_id,
                    name: product.category_name
                },
                subcategory: product.subcategory_id ? {
                    id: product.subcategory_id,
                    name: product.subcategory_name
                } : undefined,
                brand: product.brand_id ? {
                    id: product.brand_id,
                    name: product.brand_name
                } : undefined,
                supplier: {
                    id: product.supplier_id,
                    name: product.supplier_name,
                    supplier_code: product.supplier_code
                }
            };

            MyLogger.success(action, { 
                productId: id, 
                productName: product.name,
                productSku: product.sku 
            });

            return productWithDetails;
        } catch (error: any) {
            MyLogger.error(action, error, { productId: id });
            throw error;
        }
    }

    static async getProductStats(): Promise<ProductStats> {
        let action = 'GetProductInfoMediator.getProductStats';
        try {
            MyLogger.info(action);

            const query = `
                SELECT 
                    COUNT(*) as total_products,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_products,
                    COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_products,
                    COUNT(CASE WHEN status = 'discontinued' THEN 1 END) as discontinued_products,
                    COUNT(CASE WHEN status = 'out_of_stock' THEN 1 END) as out_of_stock_products,
                    COUNT(CASE WHEN current_stock <= min_stock_level THEN 1 END) as low_stock_products,
                    COALESCE(SUM(current_stock * cost_price), 0) as total_inventory_value,
                    COALESCE(AVG(cost_price), 0) as average_cost_price,
                    COALESCE(AVG(selling_price), 0) as average_selling_price,
                    COUNT(DISTINCT category_id) as categories_count,
                    COUNT(DISTINCT supplier_id) as suppliers_count
                FROM products
            `;

            const result = await pool.query(query);
            const stats = result.rows[0];

            // Convert string values to numbers
            const productStats: ProductStats = {
                total_products: parseInt(stats.total_products),
                active_products: parseInt(stats.active_products),
                inactive_products: parseInt(stats.inactive_products),
                discontinued_products: parseInt(stats.discontinued_products),
                out_of_stock_products: parseInt(stats.out_of_stock_products),
                low_stock_products: parseInt(stats.low_stock_products),
                total_inventory_value: parseFloat(stats.total_inventory_value),
                average_cost_price: parseFloat(stats.average_cost_price),
                average_selling_price: parseFloat(stats.average_selling_price),
                categories_count: parseInt(stats.categories_count),
                suppliers_count: parseInt(stats.suppliers_count)
            };

            MyLogger.success(action, { stats: productStats });

            return productStats;
        } catch (error: any) {
            MyLogger.error(action, error);
            throw error;
        }
    }

    static async searchProducts(query: string, limit: number = 10, distribution_center_id?: number): Promise<Product[]> {
        let action = 'GetProductInfoMediator.searchProducts';
        try {
            MyLogger.info(action, { query, limit });

            const searchQuery = `
                SELECT 
                    p.*,
                    ${distribution_center_id ? 'COALESCE(pl.current_stock, 0) as current_stock, pl.min_stock_level as dc_min_stock,' : ''}
                    c.name as category_name,
                    sc.name as subcategory_name,
                    b.name as brand_name,
                    o.name as origin_name,
                    s.name as supplier_name
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
                LEFT JOIN brands b ON p.brand_id = b.id
                LEFT JOIN origins o ON p.origin_id = o.id
                LEFT JOIN suppliers s ON p.supplier_id = s.id
                ${distribution_center_id ? `LEFT JOIN product_locations pl ON p.id = pl.product_id AND pl.distribution_center_id = $3` : ''}
                WHERE p.name ILIKE $1 OR p.sku ILIKE $1 OR p.product_code ILIKE $1 OR p.barcode ILIKE $1
                ORDER BY p.name
                LIMIT $2
            `;

            const queryParams: any[] = [`%${query}%`, limit];
            if (distribution_center_id) {
                queryParams.push(distribution_center_id);
            }

            const result = await pool.query(searchQuery, queryParams);
            const products = result.rows;

            MyLogger.success(action, { 
                query, 
                resultsCount: products.length 
            });

            return products;
        } catch (error: any) {
            MyLogger.error(action, error, { query, limit });
            throw error;
        }
    }

    static async searchProductByBarcode(barcode: string, distribution_center_id?: number): Promise<Product | null> {
        let action = 'GetProductInfoMediator.searchProductByBarcode';
        try {
            MyLogger.info(action, { barcode });

            const searchQuery = `
                SELECT 
                    p.*,
                    ${distribution_center_id ? 'COALESCE(pl.current_stock, 0) as current_stock, pl.min_stock_level as dc_min_stock,' : ''}
                    c.name as category_name,
                    sc.name as subcategory_name,
                    b.name as brand_name,
                    o.name as origin_name,
                    s.name as supplier_name
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
                LEFT JOIN brands b ON p.brand_id = b.id
                LEFT JOIN origins o ON p.origin_id = o.id
                LEFT JOIN suppliers s ON p.supplier_id = s.id
                ${distribution_center_id ? `LEFT JOIN product_locations pl ON p.id = pl.product_id AND pl.distribution_center_id = $2` : ''}
                WHERE p.barcode = $1
                LIMIT 1
            `;

            const queryParams: any[] = [barcode];
            if (distribution_center_id) {
                queryParams.push(distribution_center_id);
            }

            const result = await pool.query(searchQuery, queryParams);
            const product = result.rows[0] || null;

            MyLogger.success(action, { 
                barcode, 
                found: !!product,
                productName: product?.name 
            });

            return product;
        } catch (error: any) {
            MyLogger.error(action, error, { barcode });
            throw error;
        }
    }

    static async getLowStockProducts(distribution_center_id?: number): Promise<Product[]> {
        let action = 'GetProductInfoMediator.getLowStockProducts';
        try {
            MyLogger.info(action);

            const query = `
                SELECT 
                    p.*,
                    ${distribution_center_id ? 'COALESCE(pl.current_stock, 0) as current_stock, pl.min_stock_level as dc_min_stock,' : ''}
                    c.name as category_name,
                    sc.name as subcategory_name,
                    b.name as brand_name,
                    o.name as origin_name,
                    s.name as supplier_name
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
                LEFT JOIN brands b ON p.brand_id = b.id
                LEFT JOIN origins o ON p.origin_id = o.id
                LEFT JOIN suppliers s ON p.supplier_id = s.id
                ${distribution_center_id ? `LEFT JOIN product_locations pl ON p.id = pl.product_id AND pl.distribution_center_id = $1` : ''}
                WHERE ${distribution_center_id ? 'COALESCE(pl.current_stock, 0) <= COALESCE(pl.min_stock_level, p.min_stock_level)' : 'p.current_stock <= p.min_stock_level'}
                ORDER BY (${distribution_center_id ? 'COALESCE(pl.current_stock, 0) - COALESCE(pl.min_stock_level, p.min_stock_level)' : 'p.current_stock - p.min_stock_level'}) ASC
            `;

            const result = await pool.query(query, distribution_center_id ? [distribution_center_id] : []);
            const products = result.rows;

            MyLogger.success(action, { 
                lowStockProductsCount: products.length 
            });

            return products;
        } catch (error: any) {
            MyLogger.error(action, error);
            throw error;
        }
    }

    static async getProductsByCategory(categoryId: number, distribution_center_id?: number): Promise<Product[]> {
        let action = 'GetProductInfoMediator.getProductsByCategory';
        try {
            MyLogger.info(action, { categoryId });

            const query = `
                SELECT 
                    p.*,
                    ${distribution_center_id ? 'COALESCE(pl.current_stock, 0) as current_stock, pl.min_stock_level as dc_min_stock,' : ''}
                    c.name as category_name,
                    sc.name as subcategory_name,
                    b.name as brand_name,
                    o.name as origin_name,
                    s.name as supplier_name
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
                LEFT JOIN brands b ON p.brand_id = b.id
                LEFT JOIN origins o ON p.origin_id = o.id
                LEFT JOIN suppliers s ON p.supplier_id = s.id
                ${distribution_center_id ? `LEFT JOIN product_locations pl ON p.id = pl.product_id AND pl.distribution_center_id = $2` : ''}
                WHERE p.category_id = $1
                ORDER BY p.name
            `;

            const queryParams = [categoryId];
            if (distribution_center_id) {
                queryParams.push(distribution_center_id);
            }

            const result = await pool.query(query, queryParams);
            const products = result.rows;

            MyLogger.success(action, { 
                categoryId, 
                productsCount: products.length 
            });

            return products;
        } catch (error: any) {
            MyLogger.error(action, error, { categoryId });
            throw error;
        }
    }

    static async getProductsBySupplier(supplierId: number, distribution_center_id?: number): Promise<Product[]> {
        let action = 'GetProductInfoMediator.getProductsBySupplier';
        try {
            MyLogger.info(action, { supplierId });

            const query = `
                SELECT 
                    p.*,
                    ${distribution_center_id ? 'COALESCE(pl.current_stock, 0) as current_stock, pl.min_stock_level as dc_min_stock,' : ''}
                    c.name as category_name,
                    sc.name as subcategory_name,
                    b.name as brand_name,
                    o.name as origin_name,
                    s.name as supplier_name
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
                LEFT JOIN brands b ON p.brand_id = b.id
                LEFT JOIN origins o ON p.origin_id = o.id
                LEFT JOIN suppliers s ON p.supplier_id = s.id
                ${distribution_center_id ? `LEFT JOIN product_locations pl ON p.id = pl.product_id AND pl.distribution_center_id = $2` : ''}
                WHERE p.supplier_id = $1
                ORDER BY p.name
            `;

            const queryParams = [supplierId];
            if (distribution_center_id) {
                queryParams.push(distribution_center_id);
            }

            const result = await pool.query(query, queryParams);
            const products = result.rows;

            MyLogger.success(action, { 
                supplierId, 
                productsCount: products.length 
            });

            return products;
        } catch (error: any) {
            MyLogger.error(action, error, { supplierId });
            throw error;
        }
    }
}
