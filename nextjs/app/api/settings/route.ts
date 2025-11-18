import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import pool from '@/lib/db';

// GET /api/settings - Get all settings
export async function GET(request: NextRequest) {
  try {
    // Get token from cookie or Authorization header
    let token = request.cookies.get('authToken')?.value;
    
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify token
    const { user } = await AuthService.getUserFromToken(token);

    // Get all settings
    const result = await pool.query(
      'SELECT * FROM settings ORDER BY category, key'
    );

    return NextResponse.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/settings - Create or update a setting
export async function POST(request: NextRequest) {
  try {
    // Get token
    let token = request.cookies.get('authToken')?.value;
    
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify token and check admin role
    const { user, payload } = await AuthService.getUserFromToken(token);
    
    if (payload.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { category, key, value, description } = body;

    if (!category || !key || value === undefined) {
      return NextResponse.json(
        { error: 'Category, key, and value are required' },
        { status: 400 }
      );
    }

    // Upsert setting
    const result = await pool.query(
      `INSERT INTO settings (category, key, value, description)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (category, key) 
       DO UPDATE SET value = $3, description = $4, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [category, key, value, description]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Setting saved successfully'
    });

  } catch (error) {
    console.error('Save setting error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
