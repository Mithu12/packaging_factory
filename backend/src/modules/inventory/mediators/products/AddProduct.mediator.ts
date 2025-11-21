import pool from "@/database/connection";
import { CreateProductRequest, Product } from "@/types/product";
import { MyLogger } from "@/utils/new-logger";

export class AddProductMediator {
  static async generateProductCode(): Promise<string> {
    let action = "AddProductMediator.generateProductCode";
    try {
      MyLogger.info(action);

      // Get next value from PostgreSQL sequence
      const query = "SELECT nextval('product_code_sequence') as next_number";
      const result = await pool.query(query);
      const nextNumber = result.rows[0].next_number;

      const productCode = `PRD-${nextNumber.toString().padStart(3, "0")}`;

      MyLogger.success(action, {
        generatedCode: productCode,
        sequenceNumber: nextNumber,
      });

      return productCode;
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    }
  }

  static async createProduct(
    productData: CreateProductRequest
  ): Promise<Product> {
    let action = "AddProductMediator.createProduct";
    const client = await pool.connect();
    try {
      MyLogger.info(action, {
        productName: productData.name,
        productSku: productData.sku,
        categoryId: productData.category_id,
        supplierId: productData.supplier_id,
      });

      await client.query("BEGIN");

      // Generate product code
      const productCode = await this.generateProductCode();

      // Validate foreign key references
      await this.validateReferences(productData);

      const query = `
                INSERT INTO products (
                    product_code, sku, name, description, category_id, subcategory_id, brand_id, origin_id,
                    unit_of_measure, cost_price, selling_price, current_stock, min_stock_level,
                    max_stock_level, supplier_id, status, barcode, weight, dimensions,
                    tax_rate, reorder_point, reorder_quantity, notes, image_url, warranty_period, service_time
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
                ) RETURNING *
            `;

      const values = [
        productCode,
        productData.sku,
        productData.name,
        productData.description || null,
        productData.category_id,
        productData.subcategory_id || null,
        productData.brand_id || null,
        productData.origin_id || null,
        productData.unit_of_measure,
        productData.cost_price,
        productData.selling_price,
        productData.current_stock,
        productData.min_stock_level,
        productData.max_stock_level || null,
        productData.supplier_id,
        productData.status || "active",
        productData.barcode || null,
        productData.weight || null,
        productData.dimensions || null,
        productData.tax_rate || null,
        productData.reorder_point || null,
        productData.reorder_quantity || null,
        productData.notes || null,
        productData.image_url || null,
        productData.warranty_period || null,
        productData.service_time || null,
      ];

      const result = await client.query(query, values);
      const newProduct = result.rows[0];

      // Link to Primary Distribution Center
      const primaryDcQuery = "SELECT id FROM distribution_centers WHERE is_primary = true LIMIT 1";
      const primaryDcResult = await client.query(primaryDcQuery);

      if (primaryDcResult.rows.length > 0) {
        const primaryDcId = primaryDcResult.rows[0].id;
        const locationQuery = `
          INSERT INTO product_locations (
            product_id, distribution_center_id, current_stock, 
            min_stock_level, max_stock_level, reorder_point
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (product_id, distribution_center_id) 
          DO UPDATE SET 
            current_stock = EXCLUDED.current_stock,
            min_stock_level = EXCLUDED.min_stock_level,
            max_stock_level = EXCLUDED.max_stock_level,
            reorder_point = EXCLUDED.reorder_point
        `;
        await client.query(locationQuery, [
          newProduct.id,
          primaryDcId,
          productData.current_stock || 0, // Use provided stock or 0
          productData.min_stock_level || 0,
          productData.max_stock_level || null,
          productData.reorder_point || null
        ]);

        MyLogger.info("Linked product to primary distribution center", {
          productId: newProduct.id,
          centerId: primaryDcId,
          initialStock: productData.current_stock || 0
        });
      } else {
        MyLogger.warn("No primary distribution center found. Product created without location linkage.", {
          productId: newProduct.id
        });
      }

      await client.query("COMMIT");

      MyLogger.success(action, {
        productId: newProduct.id,
        productCode: newProduct.product_code,
        productName: newProduct.name,
        productSku: newProduct.sku,
      });

      return newProduct;
    } catch (error: any) {
      await client.query("ROLLBACK");
      MyLogger.error(action, error, {
        productName: productData.name,
        productSku: productData.sku,
      });
      throw error;
    } finally {
      client.release();
    }
  }

  private static async validateReferences(
    productData: CreateProductRequest
  ): Promise<void> {
    let action = "AddProductMediator.validateReferences";
    try {
      MyLogger.info(action, {
        categoryId: productData.category_id,
        subcategoryId: productData.subcategory_id,
        brandId: productData.brand_id,
        originId: productData.origin_id,
        supplierId: productData.supplier_id,
      });

      // Validate category exists
      const categoryQuery = "SELECT id FROM categories WHERE id = $1";
      const categoryResult = await pool.query(categoryQuery, [
        productData.category_id,
      ]);

      if (categoryResult.rows.length === 0) {
        throw new Error("Category not found");
      }

      // Validate subcategory exists if provided
      if (productData.subcategory_id) {
        const subcategoryQuery =
          "SELECT id FROM subcategories WHERE id = $1 AND category_id = $2";
        const subcategoryResult = await pool.query(subcategoryQuery, [
          productData.subcategory_id,
          productData.category_id,
        ]);

        if (subcategoryResult.rows.length === 0) {
          throw new Error(
            "Subcategory not found or does not belong to the specified category"
          );
        }
      }

      // Validate brand exists if provided
      if (productData.brand_id) {
        const brandQuery =
          "SELECT id FROM brands WHERE id = $1 AND is_active = $2";
        const brandResult = await pool.query(brandQuery, [
          productData.brand_id,
          true,
        ]);

        if (brandResult.rows.length === 0) {
          throw new Error("Brand not found or is inactive");
        }
      }

      // Validate origin exists if provided
      if (productData.origin_id) {
        const originQuery =
          "SELECT id FROM origins WHERE id = $1 AND status = $2";
        const originResult = await pool.query(originQuery, [
          productData.origin_id,
          "active",
        ]);

        if (originResult.rows.length === 0) {
          throw new Error("Origin not found or is inactive");
        }
      }

      // Validate supplier exists
      const supplierQuery = "SELECT id FROM suppliers WHERE id = $1";
      const supplierResult = await pool.query(supplierQuery, [
        productData.supplier_id,
      ]);

      if (supplierResult.rows.length === 0) {
        throw new Error("Supplier not found");
      }

      MyLogger.success(action, {
        categoryId: productData.category_id,
        subcategoryId: productData.subcategory_id,
        brandId: productData.brand_id,
        originId: productData.origin_id,
        supplierId: productData.supplier_id,
        message: "All references validated successfully",
      });
    } catch (error: any) {
      MyLogger.error(action, error, {
        categoryId: productData.category_id,
        subcategoryId: productData.subcategory_id,
        brandId: productData.brand_id,
        originId: productData.origin_id,
        supplierId: productData.supplier_id,
      });
      throw error;
    }
  }

  static async checkSkuExists(
    sku: string,
    excludeId?: number
  ): Promise<boolean> {
    let action = "AddProductMediator.checkSkuExists";
    try {
      MyLogger.info(action, { sku, excludeId });

      let query = "SELECT id FROM products WHERE sku = $1";
      let params: any[] = [sku];

      if (excludeId) {
        query += " AND id != $2";
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

  static async checkBarcodeExists(
    barcode: string,
    excludeId?: number
  ): Promise<boolean> {
    let action = "AddProductMediator.checkBarcodeExists";
    try {
      MyLogger.info(action, { barcode, excludeId });

      if (!barcode) {
        return false; // Empty barcode is allowed
      }

      let query = "SELECT id FROM products WHERE barcode = $1";
      let params: any[] = [barcode];

      if (excludeId) {
        query += " AND id != $2";
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
