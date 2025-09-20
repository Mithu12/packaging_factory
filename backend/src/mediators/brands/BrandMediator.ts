import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';
import { createError } from '@/utils/responseHelper';
import { Brand, CreateBrandRequest, UpdateBrandRequest, BrandWithProductCount } from '@/types/brand';

export class BrandMediator {
  // Get all brands with product count
  static async getAllBrands(): Promise<BrandWithProductCount[]> {
    const action = 'Get All Brands';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action);
      
      const result = await client.query(`
        SELECT 
          b.*,
          COALESCE(p.product_count, 0) as product_count
        FROM brands b
        LEFT JOIN (
          SELECT brand_id, COUNT(*) as product_count
          FROM products
          WHERE status = 'active'
          GROUP BY brand_id
        ) p ON b.id = p.brand_id
        ORDER BY b.created_at DESC
      `);
      
      const brands = result.rows.map(row => ({
        ...row,
        product_count: parseInt(row.product_count) || 0
      }));
      
      MyLogger.success(action, { count: brands.length });
      return brands;
      
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get brand by ID
  static async getBrandById(id: number): Promise<BrandWithProductCount> {
    const action = 'Get Brand By ID';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { brand_id: id });
      
      const result = await client.query(`
        SELECT 
          b.*,
          
          COALESCE(p.product_count, 0) as product_count
        FROM brands b
        LEFT JOIN (
          SELECT brand_id, COUNT(*) as product_count
          FROM products
          WHERE status = 'active'
          GROUP BY brand_id
        ) p ON b.id = p.brand_id
        WHERE b.id = $1
      `, [id]);
      
      if (result.rows.length === 0) {
        throw createError('Brand not found', 404);
      }
      
      const brand = {
        ...result.rows[0],
        product_count: parseInt(result.rows[0].product_count) || 0
      };
      
      MyLogger.success(action, { brand_id: id });
      return brand;
      
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Create new brand
  static async createBrand(brandData: CreateBrandRequest): Promise<Brand> {
    const action = 'Create Brand';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { name: brandData.name });
      // Check if brand name already exists
      const existingBrand = await client.query(
        'SELECT id FROM brands WHERE LOWER(name) = LOWER($1)',
        [brandData.name]
      );
      
      if (existingBrand.rows.length > 0) {
        throw createError('Brand name already exists', 400);
      }
      
      const result = await client.query(`
        INSERT INTO brands (name, description, is_active)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [
        brandData.name,
        brandData.description || null,
        brandData.is_active
      ]);
      
      const brand = result.rows[0];
      MyLogger.success(action, { brand_id: brand.id, name: brand.name });
      
      return brand;
      
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Update brand
  static async updateBrand(id: number, updateData: UpdateBrandRequest): Promise<Brand> {
    const action = 'Update Brand';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { brand_id: id });
      
      // Check if brand exists
      const existingBrand = await client.query(
        'SELECT id FROM brands WHERE id = $1',
        [id]
      );
      
      if (existingBrand.rows.length === 0) {
        throw createError('Brand not found', 404);
      }
      
      // Check if new name already exists (if name is being updated)
      if (updateData.name) {
        const nameCheck = await client.query(
          'SELECT id FROM brands WHERE LOWER(name) = LOWER($1) AND id != $2',
          [updateData.name, id]
        );
        
        if (nameCheck.rows.length > 0) {
          throw createError('Brand name already exists', 400);
        }
      }
      
      // Build update query dynamically
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;
      
      if (updateData.name !== undefined) {
        updateFields.push(`name = $${paramCount++}`);
        updateValues.push(updateData.name);
      }
      
      if (updateData.description !== undefined) {
        updateFields.push(`description = $${paramCount++}`);
        updateValues.push(updateData.description || null);
      }
      
      if (updateData.is_active !== undefined) {
        updateFields.push(`is_active = $${paramCount++}`);
        updateValues.push(updateData.is_active);
      }
      
      if (updateFields.length === 0) {
        throw createError('No fields to update', 400);
      }
      
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(id);
      
      const result = await client.query(`
        UPDATE brands 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `, updateValues);
      
      const brand = result.rows[0];
      MyLogger.success(action, { brand_id: id });
      
      return brand;
      
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Delete brand (soft delete by setting status to inactive)
  static async deleteBrand(id: number): Promise<void> {
    const action = 'Delete Brand';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { brand_id: id });
      
      // Check if brand exists
      const existingBrand = await client.query(
        'SELECT id FROM brands WHERE id = $1',
        [id]
      );
      
      if (existingBrand.rows.length === 0) {
        throw createError('Brand not found', 404);
      }
      
      // Check if brand has active products
      const productCount = await client.query(
        `SELECT COUNT(*) as count FROM products WHERE brand_id = $1 AND status = 'active'`,
        [id]
      );
      
      if (parseInt(productCount.rows[0].count) > 0) {
        throw createError('Cannot delete brand with active products', 400);
      }
      
      // Soft delete by setting status to inactive
      await client.query(
        'DELETE FROM brands WHERE id = $1',
        [ id]
      );
      
      MyLogger.success(action, { brand_id: id });
      
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get brands by status
  static async getBrandsByStatus(is_active: boolean): Promise<BrandWithProductCount[]> {
    const action = 'Get Brands By Status';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { is_active });
      
      const result = await client.query(`
        SELECT 
          b.*,
          
            COALESCE(p.product_count, 0) as product_count
        FROM brands b
        LEFT JOIN (
          SELECT brand_id, COUNT(*) as product_count
          FROM products
          WHERE status = 'active'
          GROUP BY brand_id
        ) p ON b.id = p.brand_id
        WHERE b.is_active = $1
        ORDER BY b.created_at DESC
      `, [is_active]);
      
      const brands = result.rows.map(row => ({
        ...row,
        product_count: parseInt(row.product_count) || 0
      }));
      
      MyLogger.success(action, { count: brands.length, is_active });
      return brands;
      
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }
}
