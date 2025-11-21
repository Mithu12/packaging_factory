import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { AuthService } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        // Authenticate user
        const user = await AuthService.authenticate(request);
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Get query parameters
        const searchParams = request.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '100');
        const search = searchParams.get('search') || '';
        const categoryId = searchParams.get('category_id');
        const offset = (page - 1) * limit;

        // Build WHERE clause
        const conditions: string[] = [];
        const params: any[] = [];
        let paramCount = 1;

        if (categoryId) {
            conditions.push(`category_id = $${paramCount}`);
            params.push(parseInt(categoryId));
            paramCount++;
        }

        if (search) {
            conditions.push(`(name ILIKE $${paramCount} OR description ILIKE $${paramCount})`);
            params.push(`%${search}%`);
            paramCount++;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Get total count
        const countResult = await query(
            `SELECT COUNT(*) as total FROM subcategories ${whereClause}`,
            params
        );
        const total = parseInt(countResult.rows[0].total);

        // Get subcategories with category name
        params.push(limit, offset);
        const subcategoriesResult = await query(
            `SELECT 
        s.id,
        s.name,
        s.description,
        s.category_id,
        c.name as category_name,
        s.created_at,
        s.updated_at
      FROM subcategories s
      LEFT JOIN categories c ON s.category_id = c.id
      ${whereClause}
      ORDER BY s.name ASC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
            params
        );

        return NextResponse.json({
            success: true,
            data: subcategoriesResult.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching subcategories:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch subcategories' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        // Authenticate user
        const user = await AuthService.authenticate(request);
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { name, description, category_id } = body;

        // Validation
        if (!name || name.trim() === '') {
            return NextResponse.json(
                { success: false, error: 'Subcategory name is required' },
                { status: 400 }
            );
        }

        if (!category_id) {
            return NextResponse.json(
                { success: false, error: 'Category ID is required' },
                { status: 400 }
            );
        }

        // Check if category exists
        const categoryExists = await query(
            'SELECT id FROM categories WHERE id = $1',
            [category_id]
        );

        if (categoryExists.rows.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Category not found' },
                { status: 404 }
            );
        }

        // Check if subcategory with same name already exists in this category
        const existingSubcategory = await query(
            'SELECT id FROM subcategories WHERE LOWER(name) = LOWER($1) AND category_id = $2',
            [name.trim(), category_id]
        );

        if (existingSubcategory.rows.length > 0) {
            return NextResponse.json(
                { success: false, error: 'A subcategory with this name already exists in this category' },
                { status: 400 }
            );
        }

        // Insert new subcategory
        const result = await query(
            `INSERT INTO subcategories (name, description, category_id, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING *`,
            [name.trim(), description?.trim() || null, category_id]
        );

        return NextResponse.json({
            success: true,
            data: result.rows[0]
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating subcategory:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create subcategory' },
            { status: 500 }
        );
    }
}
