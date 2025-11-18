import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import pool from '@/lib/db';
import { CreateProductRequest } from '@/types/inventory';

// GET /api/inventory/products - Get all products
export async function GET(request: NextRequest) {
  try {
    // Authenticate
    let token = request.cookies.get('authToken')?.value;
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await AuthService.getUserFromToken(token);

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const category_id = searchParams.get('category_id');
    const supplier_id = searchParams.get('supplier_id');
    const status = searchParams.get('status') || '';
    const low_stock = searchParams.get('low_stock') === 'true';
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    const offset = (page - 1) * limit;

    // Build query with joins
    let query = `
      SELECT 
        p.*,
        c.name as category_name,
        sc.name as subcategory_name,
        s.name as supplier_name,
        b.name as brand_name,
        o.name as origin_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN origins o ON p.origin_id = o.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (search) {
      query += ` AND (p.name ILIKE $${paramCount} OR p.sku ILIKE $${paramCount} OR p.product_code ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (category_id) {
      query += ` AND p.category_id = $${paramCount}`;
      params.push(category_id);
      paramCount++;
    }

    if (supplier_id) {
      query += ` AND p.supplier_id = $${paramCount}`;
      params.push(supplier_id);
      paramCount++;
    }

    if (status) {
      query += ` AND p.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (low_stock) {
      query += ` AND p.current_stock <= p.min_stock_level`;
    }

    // Get total count
    const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) FROM');
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Add sorting and pagination
    query += ` ORDER BY p.${sortBy} ${sortOrder.toUpperCase()}`;
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/inventory/products - Create product
export async function POST(request: NextRequest) {
  try {
    // Authenticate
    let token = request.cookies.get('authToken')?.value;
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { payload } = await AuthService.getUserFromToken(token);

    // Check permission
    if (payload.role !== 'admin' && payload.role !== 'manager') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body: CreateProductRequest = await request.json();

    // Validate required fields
    if (!body.name || !body.sku || !body.category_id || !body.supplier_id) {
      return NextResponse.json({
        error: 'Name, SKU, category, and supplier are required'
      }, { status: 400 });
    }

    // Check if SKU already exists
    const skuCheck = await pool.query(
      'SELECT id FROM products WHERE sku = $1',
      [body.sku]
    );

    if (skuCheck.rows.length > 0) {
      return NextResponse.json({ error: 'SKU already exists' }, { status: 400 });
    }

    // Generate product code
    const codeResult = await pool.query(
      'SELECT product_code FROM products ORDER BY id DESC LIMIT 1'
    );
    let productCode = 'PRD-0001';
    if (codeResult.rows.length > 0) {
      const lastCode = codeResult.rows[0].product_code;
      const lastNumber = parseInt(lastCode.split('-')[1]);
      productCode = `PRD-${String(lastNumber + 1).padStart(4, '0')}`;
    }

    // Insert product
    const result = await pool.query(
      `INSERT INTO products (
        product_code, sku, name, description, category_id, subcategory_id,
        brand_id, origin_id, unit_of_measure, cost_price, selling_price,
        current_stock, min_stock_level, max_stock_level, supplier_id,
        status, barcode, weight, dimensions, tax_rate, warranty_period,
        service_time, reorder_point, reorder_quantity, notes, image_url
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
      ) RETURNING *`,
      [
        productCode, body.sku, body.name, body.description, body.category_id,
        body.subcategory_id, body.brand_id, body.origin_id, body.unit_of_measure,
        body.cost_price, body.selling_price, body.current_stock, body.min_stock_level,
        body.max_stock_level, body.supplier_id, body.status || 'active', body.barcode,
        body.weight, body.dimensions, body.tax_rate, body.warranty_period,
        body.service_time, body.reorder_point, body.reorder_quantity, body.notes,
        body.image_url
      ]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Product created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
