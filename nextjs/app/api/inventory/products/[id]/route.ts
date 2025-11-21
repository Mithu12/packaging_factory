import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import pool from '@/lib/db';
import { UpdateProductRequest } from '@/types/inventory';

// GET /api/inventory/products/[id] - Get product by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
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

    const { id } = resolvedParams;

    const result = await pool.query(
      `SELECT 
        p.*,
        c.name as category_name,
        sc.name as subcategory_name,
        s.name as supplier_name,
        s.supplier_code,
        b.name as brand_name,
        o.name as origin_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN origins o ON p.origin_id = o.id
      WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/inventory/products/[id] - Update product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
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

    const { id } = resolvedParams;
    const body: UpdateProductRequest = await request.json();

    // If updating SKU, check for duplicates
    if (body.sku) {
      const skuCheck = await pool.query(
        'SELECT id FROM products WHERE sku = $1 AND id != $2',
        [body.sku, id]
      );

      if (skuCheck.rows.length > 0) {
        return NextResponse.json({ error: 'SKU already exists' }, { status: 400 });
      }
    }

    // Build update query dynamically
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(body).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const query = `
      UPDATE products
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Product updated successfully'
    });

  } catch (error) {
    console.error('Update product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/inventory/products/[id] - Delete product (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
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

    // Check admin permission
    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = resolvedParams;

    // Soft delete - mark as discontinued
    const result = await pool.query(
      `UPDATE products 
       SET status = 'discontinued', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Product marked as discontinued'
    });

  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
