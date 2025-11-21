import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import pool from '@/lib/db';

// GET /api/settings/[category] - Get settings by category
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  const resolvedParams = await params;
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

    // Verify token
    await AuthService.getUserFromToken(token);

    const { category } = resolvedParams;

    // Get settings by category
    const result = await pool.query(
      'SELECT * FROM settings WHERE category = $1 ORDER BY key',
      [category]
    );

    return NextResponse.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get settings by category error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/settings/[category] - Update multiple settings in a category
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  const resolvedParams = await params;
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
    const { payload } = await AuthService.getUserFromToken(token);

    if (payload.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { category } = resolvedParams;
    const body = await request.json();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const updatedSettings = [];

      for (const [key, value] of Object.entries(body)) {
        const result = await client.query(
          `INSERT INTO settings (category, key, value)
           VALUES ($1, $2, $3)
           ON CONFLICT (category, key) 
           DO UPDATE SET value = $3, updated_at = CURRENT_TIMESTAMP
           RETURNING *`,
          [category, key, value]
        );
        updatedSettings.push(result.rows[0]);
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        data: updatedSettings,
        message: 'Settings updated successfully'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
