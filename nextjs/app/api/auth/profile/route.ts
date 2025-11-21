import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Get token from cookies (middleware has already validated it)
    const tokenCookie = request.cookies.get('authToken');
    const token = tokenCookie?.value;

    // Even though middleware should handle this, we should still check
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Get user from token
    const result = await AuthService.getUserFromToken(token);
    const user = result.user;

    return NextResponse.json(user);

  } catch (error) {
    console.error('Profile error:', error);
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    );
  }
}
