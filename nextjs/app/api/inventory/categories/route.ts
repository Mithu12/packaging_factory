import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import pool from '@/lib/db';
import { CreateCategoryRequest } from '@/types/inventory';

// GET /api/inventory/categories - Get all categories
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
    const includeSubcategories = searchParams.get('include_subcategories') === 'true';
    const search = searchParams.get('search') || '';

    let query = 'SELECT * FROM categories WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (search) {
      query += ` AND name ILIKE $${paramCount}`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ' ORDER BY name ASC';

    const result = await pool.query(query, params);

    // If include subcategories, fetch them for each category
    if (includeSubcategories) {
      const categoriesWithSubs = await Promise.all(
        result.rows.map(async (category) => {
          const subsResult = await pool.query(
            'SELECT * FROM subcategories WHERE category_id = $1 ORDER BY name ASC',
            [category.id]
          );
          return {
            ...category,
            subcategories: subsResult.rows
          };
        })
      );

      return NextResponse.json({
        success: true,
        data: categoriesWithSubs
      });
    }

    return NextResponse.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get categories error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/inventory/categories - Create category
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

    const body: CreateCategoryRequest = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    // Check if category already exists
    const existsCheck = await pool.query(
      'SELECT id FROM categories WHERE name = $1',
      [body.name]
    );

    if (existsCheck.rows.length > 0) {
      return NextResponse.json({ error: 'Category already exists' }, { status: 400 });
    }

    // Insert category
    const result = await pool.query(
      'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *',
      [body.name, body.description]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Category created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Create category error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
