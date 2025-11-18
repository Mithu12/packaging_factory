import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import pool from '@/lib/db';
import { CreateSupplierRequest } from '@/types/inventory';

// GET /api/inventory/suppliers - Get all suppliers
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
    const category = searchParams.get('category') || '';
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    const offset = (page - 1) * limit;

    // Build query
    let query = `
      SELECT * FROM suppliers
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (search) {
      query += ` AND (name ILIKE $${paramCount} OR supplier_code ILIKE $${paramCount} OR contact_person ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (category) {
      query += ` AND category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }

    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Add sorting and pagination
    query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
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
    console.error('Get suppliers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/inventory/suppliers - Create supplier
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

    // Check admin permission (simplified - you can add RBAC later)
    if (payload.role !== 'admin' && payload.role !== 'manager') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body: CreateSupplierRequest = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json({ error: 'Supplier name is required' }, { status: 400 });
    }

    // Generate supplier code
    const codeResult = await pool.query(
      'SELECT supplier_code FROM suppliers ORDER BY id DESC LIMIT 1'
    );
    let supplierCode = 'SUP-0001';
    if (codeResult.rows.length > 0) {
      const lastCode = codeResult.rows[0].supplier_code;
      const lastNumber = parseInt(lastCode.split('-')[1]);
      supplierCode = `SUP-${String(lastNumber + 1).padStart(4, '0')}`;
    }

    // Insert supplier
    const result = await pool.query(
      `INSERT INTO suppliers (
        supplier_code, name, contact_person, phone, email, whatsapp_number,
        website, address, city, state, zip_code, country, category,
        tax_id, vat_id, payment_terms, bank_name, bank_account,
        bank_routing, swift_code, iban, status, notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
      ) RETURNING *`,
      [
        supplierCode, body.name, body.contact_person, body.phone, body.email,
        body.whatsapp_number, body.website, body.address, body.city, body.state,
        body.zip_code, body.country, body.category, body.tax_id, body.vat_id,
        body.payment_terms, body.bank_name, body.bank_account, body.bank_routing,
        body.swift_code, body.iban, body.status || 'active', body.notes
      ]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Supplier created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Create supplier error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
