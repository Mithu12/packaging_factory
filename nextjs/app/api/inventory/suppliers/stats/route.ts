import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import pool from '@/lib/db';

// GET /api/inventory/suppliers/stats - Get supplier statistics
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

    const statsQuery = `
      SELECT
        COUNT(*) as total_suppliers,
        COUNT(*) FILTER (WHERE status = 'active') as active_suppliers,
        COUNT(*) FILTER (WHERE status = 'inactive') as inactive_suppliers,
        COUNT(DISTINCT category) as categories_count,
        COALESCE(AVG(rating), 0) as average_rating
      FROM suppliers
    `;

    const result = await pool.query(statsQuery);

    return NextResponse.json({
      success: true,
      data: {
        total_suppliers: parseInt(result.rows[0].total_suppliers),
        active_suppliers: parseInt(result.rows[0].active_suppliers),
        inactive_suppliers: parseInt(result.rows[0].inactive_suppliers),
        categories_count: parseInt(result.rows[0].categories_count),
        average_rating: parseFloat(result.rows[0].average_rating)
      }
    });

  } catch (error) {
    console.error('Get supplier stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
