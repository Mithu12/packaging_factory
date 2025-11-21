import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Get token from cookies (middleware has already validated it)
    const token = request.cookies.get('authToken')?.value;

    // Get user from token
    const { user } = await AuthService.getUserFromToken(token);

    return NextResponse.json(user);

  } catch (error) {
    console.error('Profile error:', error);
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    );
  }
}
