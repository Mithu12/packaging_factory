import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // This would normally fetch from the database in a real implementation
    // For now, returning default system settings
    const systemSettings = {
      default_currency: 'USD',
      timezone: 'UTC',
      date_format: 'MM/DD/YYYY',
      number_format: 'standard'
    };

    return NextResponse.json({
      success: true,
      data: systemSettings,
    });
  } catch (error) {
    console.error('Error fetching system settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system settings' },
      { status: 500 }
    );
  }
}