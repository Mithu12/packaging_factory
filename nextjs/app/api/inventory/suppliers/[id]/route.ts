import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import pool from '@/lib/db';
import { UpdateSupplierRequest } from '@/types/inventory';

// GET /api/inventory/suppliers/[id] - Get supplier by ID
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
      'SELECT * FROM suppliers WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get supplier error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/inventory/suppliers/[id] - Update supplier
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
    const body: UpdateSupplierRequest = await request.json();

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
      UPDATE suppliers
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Supplier updated successfully'
    });

  } catch (error) {
    console.error('Update supplier error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/inventory/suppliers/[id] - Delete supplier
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

    // Check if supplier has products
    const productsCheck = await pool.query(
      'SELECT COUNT(*) FROM products WHERE supplier_id = $1',
      [id]
    );

    if (parseInt(productsCheck.rows[0].count) > 0) {
      return NextResponse.json({
        error: 'Cannot delete supplier with associated products'
      }, { status: 400 });
    }

    const result = await pool.query(
      'DELETE FROM suppliers WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Supplier deleted successfully'
    });

  } catch (error) {
    console.error('Delete supplier error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
