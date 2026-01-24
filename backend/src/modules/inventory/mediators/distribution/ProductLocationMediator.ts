import pool from "@/database/connection";
import { MyLogger } from "@/utils/new-logger";
import {
  ProductLocation,
  CreateProductLocationRequest,
  UpdateProductLocationRequest,
  ProductLocationQueryParams,
  ProductAllocationView,
  AllocationRequest,
  AllocationResult,
} from "@/types/distribution";

export class ProductLocationMediator {
  static async getProductLocations(
    params: ProductLocationQueryParams = {}
  ): Promise<{
    locations: ProductLocation[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const action = "Get Product Locations";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { params });

      const {
        page = 1,
        limit = 20,
        search,
        distribution_center_id,
        product_id,
        status,
        stock_status,
        sortBy = "product_name",
        sortOrder = "asc",
      } = params;

      const offset = (page - 1) * limit;

      // Build the base query
      let query = `
        SELECT 
          pl.*,
          p.name as product_name,
          p.sku as product_sku,
          p.cost_price,
          p.wholesale_price,
          p.selling_price,
          dc.name as center_name,
          dc.type as center_type
        FROM product_locations pl
        JOIN products p ON pl.product_id = p.id
        JOIN distribution_centers dc ON pl.distribution_center_id = dc.id
        WHERE 1=1
      `;

      const queryParams: any[] = [];
      let paramIndex = 1;

      // Apply filters
      if (search) {
        query += ` AND (
          p.name ILIKE $${paramIndex} OR 
          p.sku ILIKE $${paramIndex} OR 
          dc.name ILIKE $${paramIndex}
        )`;
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      if (distribution_center_id) {
        query += ` AND pl.distribution_center_id = $${paramIndex}`;
        queryParams.push(distribution_center_id);
        paramIndex++;
      }

      if (product_id) {
        query += ` AND pl.product_id = $${paramIndex}`;
        queryParams.push(product_id);
        paramIndex++;
      }

      if (status) {
        query += ` AND pl.status = $${paramIndex}`;
        queryParams.push(status);
        paramIndex++;
      }

      if (stock_status) {
        switch (stock_status) {
          case "out_of_stock":
            query += ` AND pl.available_stock <= 0`;
            break;
          case "low_stock":
            query += ` AND pl.available_stock > 0 AND pl.current_stock <= pl.min_stock_level`;
            break;
          case "in_stock":
            query += ` AND pl.available_stock > pl.min_stock_level`;
            break;
        }
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM (${query}) as count_query`;
      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // Add sorting and pagination
      const validSortColumns = [
        "product_name",
        "center_name",
        "current_stock",
        "available_stock",
        "updated_at",
      ];
      const safeSortBy = validSortColumns.includes(sortBy)
        ? sortBy
        : "product_name";
      const safeSortOrder = sortOrder === "desc" ? "DESC" : "ASC";

      query += ` ORDER BY ${safeSortBy} ${safeSortOrder}`;
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(limit, offset);

      const result = await client.query(query, queryParams);
      const totalPages = Math.ceil(total / limit);

      MyLogger.success(action, {
        locationsCount: result.rows.length,
        total,
        page,
        totalPages,
      });

      return {
        locations: result.rows,
        total,
        page,
        totalPages,
      };
    } catch (error: any) {
      MyLogger.error(action, error, { params });
      throw error;
    } finally {
      client.release();
    }
  }

  static async getProductLocationById(
    id: number
  ): Promise<ProductLocation | null> {
    const action = "Get Product Location By ID";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { id });

      const query = `
        SELECT 
          pl.*,
          p.name as product_name,
          p.sku as product_sku,
          p.cost_price,
          p.selling_price,
          dc.name as center_name,
          dc.type as center_type
        FROM product_locations pl
        JOIN products p ON pl.product_id = p.id
        JOIN distribution_centers dc ON pl.distribution_center_id = dc.id
        WHERE pl.id = $1
      `;

      const result = await client.query(query, [id]);

      if (result.rows.length === 0) {
        MyLogger.warn(action, { id, message: "Product location not found" });
        return null;
      }

      MyLogger.success(action, {
        id,
        productName: result.rows[0].product_name,
      });
      return result.rows[0];
    } catch (error: any) {
      MyLogger.error(action, error, { id });
      throw error;
    } finally {
      client.release();
    }
  }

  static async getProductLocationsByProduct(
    productId: number
  ): Promise<ProductLocation[]> {
    const action = "Get Product Locations By Product";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { productId });

      const query = `
        SELECT 
          pl.*,
          p.name as product_name,
          p.sku as product_sku,
          p.cost_price,
          p.selling_price,
          dc.name as center_name,
          dc.type as center_type,
          dc.city,
          dc.state
        FROM product_locations pl
        JOIN products p ON pl.product_id = p.id
        JOIN distribution_centers dc ON pl.distribution_center_id = dc.id
        WHERE pl.product_id = $1 AND pl.status = 'active' AND dc.status = 'active'
        ORDER BY pl.available_stock DESC
      `;

      const result = await client.query(query, [productId]);

      MyLogger.success(action, {
        productId,
        locationsFound: result.rows.length,
      });

      return result.rows;
    } catch (error: any) {
      MyLogger.error(action, error, { productId });
      throw error;
    } finally {
      client.release();
    }
  }

  static async createProductLocation(
    data: CreateProductLocationRequest,
    createdBy: number
  ): Promise<ProductLocation> {
    const action = "Create Product Location";
    const client = await pool.connect();

    try {
      MyLogger.info(action, {
        productId: data.product_id,
        centerId: data.distribution_center_id,
      });

      await client.query("BEGIN");

      // Check if product exists
      const productQuery = "SELECT name FROM products WHERE id = $1";
      const productResult = await client.query(productQuery, [data.product_id]);

      if (productResult.rows.length === 0) {
        throw new Error("Product not found");
      }

      // Check if distribution center exists
      const centerQuery =
        "SELECT name FROM distribution_centers WHERE id = $1 AND status = $2";
      const centerResult = await client.query(centerQuery, [
        data.distribution_center_id,
        "active",
      ]);

      if (centerResult.rows.length === 0) {
        throw new Error("Distribution center not found or inactive");
      }

      // Check if location already exists
      const existingQuery = `
        SELECT id FROM product_locations 
        WHERE product_id = $1 AND distribution_center_id = $2
      `;
      const existingResult = await client.query(existingQuery, [
        data.product_id,
        data.distribution_center_id,
      ]);

      if (existingResult.rows.length > 0) {
        throw new Error(
          "Product location already exists for this distribution center"
        );
      }

      const insertQuery = `
        INSERT INTO product_locations (
          product_id, distribution_center_id, current_stock, 
          min_stock_level, max_stock_level, reorder_point, location_in_warehouse
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7
        ) RETURNING *
      `;

      const result = await client.query(insertQuery, [
        data.product_id,
        data.distribution_center_id,
        data.current_stock,
        data.min_stock_level || 0,
        data.max_stock_level,
        data.reorder_point,
        data.location_in_warehouse,
      ]);

      await client.query("COMMIT");

      const location = result.rows[0];
      MyLogger.success(action, {
        locationId: location.id,
        productName: productResult.rows[0].name,
        centerName: centerResult.rows[0].name,
      });

      return location;
    } catch (error: any) {
      await client.query("ROLLBACK");
      MyLogger.error(action, error, {
        productId: data.product_id,
        centerId: data.distribution_center_id,
      });
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateProductLocation(
    id: number,
    data: UpdateProductLocationRequest,
    updatedBy: number
  ): Promise<ProductLocation> {
    const action = "Update Product Location";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { id, updates: Object.keys(data) });

      await client.query("BEGIN");

      // Check if location exists
      const existingQuery = "SELECT * FROM product_locations WHERE id = $1";
      const existingResult = await client.query(existingQuery, [id]);

      if (existingResult.rows.length === 0) {
        throw new Error("Product location not found");
      }

      // Build dynamic update query
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      const fieldMap = {
        current_stock: "current_stock",
        min_stock_level: "min_stock_level",
        max_stock_level: "max_stock_level",
        reorder_point: "reorder_point",
        location_in_warehouse: "location_in_warehouse",
        status: "status",
      };

      Object.entries(fieldMap).forEach(([key, dbField]) => {
        if (data.hasOwnProperty(key)) {
          updateFields.push(`${dbField} = $${paramIndex}`);
          updateValues.push((data as any)[key]);
          paramIndex++;
        }
      });

      if (updateFields.length === 0) {
        throw new Error("No fields to update");
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateFields.push(`last_movement_date = CURRENT_TIMESTAMP`);

      const updateQuery = `
        UPDATE product_locations 
        SET ${updateFields.join(", ")}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      updateValues.push(id);

      const result = await client.query(updateQuery, updateValues);
      await client.query("COMMIT");

      const location = result.rows[0];
      MyLogger.success(action, {
        locationId: location.id,
        updatedFields: Object.keys(data),
      });

      return location;
    } catch (error: any) {
      await client.query("ROLLBACK");
      MyLogger.error(action, error, { id, updates: Object.keys(data) });
      throw error;
    } finally {
      client.release();
    }
  }

  static async adjustStock(
    id: number,
    adjustment: number,
    reason: string,
    adjustedBy: number
  ): Promise<ProductLocation> {
    const action = "Adjust Product Location Stock";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { id, adjustment, reason });

      await client.query("BEGIN");

      // Get current location data
      const locationQuery = "SELECT * FROM product_locations WHERE id = $1";
      const locationResult = await client.query(locationQuery, [id]);

      if (locationResult.rows.length === 0) {
        throw new Error("Product location not found");
      }

      const location = locationResult.rows[0];
      const newStock = parseFloat(location.current_stock) + adjustment;

      if (newStock < 0) {
        throw new Error("Adjustment would result in negative stock");
      }

      // Update stock
      const updateQuery = `
        UPDATE product_locations 
        SET current_stock = $1, updated_at = CURRENT_TIMESTAMP, last_movement_date = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      const updateResult = await client.query(updateQuery, [newStock, id]);

      // Record in stock adjustments (if table exists)
      try {
        const adjustmentQuery = `
          INSERT INTO stock_adjustments (
            product_id, adjustment_type, quantity, reason, adjusted_by, distribution_center_id
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `;
        await client.query(adjustmentQuery, [
          location.product_id,
          adjustment > 0 ? "increase" : "decrease",
          Math.abs(adjustment),
          reason,
          adjustedBy,
          location.distribution_center_id,
        ]);
      } catch (adjError) {
        // Stock adjustments table might not have distribution_center_id column yet
        MyLogger.warn("Stock adjustment logging failed", adjError);
      }

      await client.query("COMMIT");

      const updatedLocation = updateResult.rows[0];
      MyLogger.success(action, {
        locationId: id,
        oldStock: location.current_stock,
        newStock: updatedLocation.current_stock,
        adjustment,
      });

      return updatedLocation;
    } catch (error: any) {
      await client.query("ROLLBACK");
      MyLogger.error(action, error, { id, adjustment, reason });
      throw error;
    } finally {
      client.release();
    }
  }

  static async getProductAllocationView(): Promise<ProductAllocationView[]> {
    const action = "Get Product Allocation View";
    const client = await pool.connect();

    try {
      MyLogger.info(action);

      const query = `SELECT * FROM product_allocation_view ORDER BY product_name, center_name`;
      const result = await client.query(query);

      MyLogger.success(action, { allocationsCount: result.rows.length });
      return result.rows;
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async allocateProduct(
    request: AllocationRequest
  ): Promise<AllocationResult> {
    const action = "Allocate Product";
    const client = await pool.connect();

    try {
      MyLogger.info(action, {
        productId: request.product_id,
        quantity: request.quantity,
        priority: request.priority,
      });

      // Get all available locations for the product
      const query = `
        SELECT 
          pav.*,
          CASE 
            WHEN $3::numeric IS NOT NULL AND $4::numeric IS NOT NULL THEN
              ST_Distance(
                ST_Point(pav.longitude, pav.latitude),
                ST_Point($4, $3)
              )
            ELSE 0
          END as distance
        FROM product_allocation_view pav
        WHERE pav.product_id = $1 
        AND pav.available_stock > 0
        AND pav.stock_status != 'out_of_stock'
        ORDER BY 
          CASE WHEN $2 = 'urgent' THEN pav.available_stock END DESC,
          distance ASC,
          pav.available_stock DESC
      `;

      const result = await client.query(query, [
        request.product_id,
        request.priority || "normal",
        request.delivery_location?.latitude,
        request.delivery_location?.longitude,
      ]);

      const availableLocations = result.rows;
      const allocations: AllocationResult["allocations"] = [];
      let totalAllocated = 0;
      let remainingQuantity = request.quantity;
      const reasons: string[] = [];

      // Allocation algorithm
      for (const location of availableLocations) {
        if (remainingQuantity <= 0) break;

        // Check if this location is preferred
        const isPreferred = request.preferred_center_ids?.includes(
          location.distribution_center_id
        );

        // Skip non-preferred locations if preferences exist and there's remaining quantity
        if (
          request.preferred_center_ids &&
          !isPreferred &&
          totalAllocated === 0
        ) {
          continue;
        }

        const availableHere = parseFloat(location.available_stock);
        const quantityToAllocate = Math.min(remainingQuantity, availableHere);

        if (quantityToAllocate > 0) {
          allocations.push({
            distribution_center_id: location.distribution_center_id,
            center_name: location.center_name,
            quantity: quantityToAllocate,
            available_stock: availableHere,
            distance_score: location.distance || 0,
            confidence: isPreferred ? 1.0 : 0.8,
          });

          totalAllocated += quantityToAllocate;
          remainingQuantity -= quantityToAllocate;
        }
      }

      // Determine reasons
      if (totalAllocated === 0) {
        reasons.push("No stock available at any distribution center");
      } else if (totalAllocated < request.quantity) {
        reasons.push(
          `Insufficient total stock: only ${totalAllocated} of ${request.quantity} available`
        );
      }

      if (request.preferred_center_ids && allocations.length > 0) {
        const preferredAllocated = allocations
          .filter((a) =>
            request.preferred_center_ids?.includes(a.distribution_center_id)
          )
          .reduce((sum, a) => sum + a.quantity, 0);

        if (preferredAllocated < totalAllocated) {
          reasons.push(
            "Some allocation from non-preferred distribution centers"
          );
        }
      }

      const allocationResult: AllocationResult = {
        product_id: request.product_id,
        allocations,
        total_allocated: totalAllocated,
        total_requested: request.quantity,
        is_fully_allocated: totalAllocated >= request.quantity,
        reasons,
      };

      MyLogger.success(action, {
        productId: request.product_id,
        requested: request.quantity,
        allocated: totalAllocated,
        locationsUsed: allocations.length,
        fullyAllocated: allocationResult.is_fully_allocated,
      });

      return allocationResult;
    } catch (error: any) {
      MyLogger.error(action, error, {
        productId: request.product_id,
        quantity: request.quantity,
      });
      throw error;
    } finally {
      client.release();
    }
  }

  static async bulkCreateProductLocations(
    productId: number,
    centerIds: number[],
    initialStock: number = 0,
    createdBy: number
  ): Promise<ProductLocation[]> {
    const action = "Bulk Create Product Locations";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { productId, centerIds, initialStock });

      await client.query("BEGIN");

      // Verify product exists
      const productQuery = "SELECT name FROM products WHERE id = $1";
      const productResult = await client.query(productQuery, [productId]);

      if (productResult.rows.length === 0) {
        throw new Error("Product not found");
      }

      // Verify centers exist and are active
      const centersQuery = `
        SELECT id, name FROM distribution_centers 
        WHERE id = ANY($1) AND status = 'active'
      `;
      const centersResult = await client.query(centersQuery, [centerIds]);

      if (centersResult.rows.length !== centerIds.length) {
        throw new Error(
          "One or more distribution centers not found or inactive"
        );
      }

      // Check for existing locations
      const existingQuery = `
        SELECT distribution_center_id FROM product_locations 
        WHERE product_id = $1 AND distribution_center_id = ANY($2)
      `;
      const existingResult = await client.query(existingQuery, [
        productId,
        centerIds,
      ]);

      if (existingResult.rows.length > 0) {
        const existingCenterIds = existingResult.rows.map(
          (row) => row.distribution_center_id
        );
        throw new Error(
          `Product locations already exist for centers: ${existingCenterIds.join(
            ", "
          )}`
        );
      }

      // Create locations
      const insertQuery = `
        INSERT INTO product_locations (product_id, distribution_center_id, current_stock)
        SELECT $1, unnest($2::int[]), $3
        RETURNING *
      `;

      const result = await client.query(insertQuery, [
        productId,
        centerIds,
        initialStock,
      ]);

      await client.query("COMMIT");

      MyLogger.success(action, {
        productId,
        locationsCreated: result.rows.length,
        productName: productResult.rows[0].name,
      });

      return result.rows;
    } catch (error: any) {
      await client.query("ROLLBACK");
      MyLogger.error(action, error, { productId, centerIds, initialStock });
      throw error;
    } finally {
      client.release();
    }
  }
}
