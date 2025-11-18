import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import pool from '@/lib/db';

// GET /api/inventory/products/stats - Get product statistics
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
        COUNT(*) as total_products,
        COUNT(*) FILTER (WHERE status = 'active') as active_products,
        COUNT(*) FILTER (WHERE status = 'inactive') as inactive_products,
        COUNT(*) FILTER (WHERE status = 'discontinued') as discontinued_products,
        COUNT(*) FILTER (WHERE status = 'out_of_stock' OR current_stock = 0) as out_of_stock_products,
        COUNT(*) FILTER (WHERE current_stock <= min_stock_level AND current_stock > 0) as low_stock_products,
        COALESCE(SUM(current_stock * cost_price), 0) as total_inventory_value,
        COALESCE(AVG(cost_price), 0) as average_cost_price,
        COALESCE(AVG(selling_price), 0) as average_selling_price,
        COUNT(DISTINCT category_id) as categories_count,
        COUNT(DISTINCT supplier_id) as suppliers_count
      FROM products
    `;

    const result = await pool.query(statsQuery);

    return NextResponse.json({
      success: true,
      data: {
        total_products: parseInt(result.rows[0].total_products),
        active_products: parseInt(result.rows[0].active_products),
        inactive_products: parseInt(result.rows[0].inactive_products),
        discontinued_products: parseInt(result.rows[0].discontinued_products),
        out_of_stock_products: parseInt(result.rows[0].out_of_stock_products),
        low_stock_products: parseInt(result.rows[0].low_stock_products),
        total_inventory_value: parseFloat(result.rows[0].total_inventory_value),
        average_cost_price: parseFloat(result.rows[0].average_cost_price),
        average_selling_price: parseFloat(result.rows[0].average_selling_price),
        categories_count: parseInt(result.rows[0].categories_count),
        suppliers_count: parseInt(result.rows[0].suppliers_count)
      }
    });

  } catch (error) {
    console.error('Get product stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
