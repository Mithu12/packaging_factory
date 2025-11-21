// app/api/rbac/health/route.ts

import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  // Mock health check data
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    system: {
      total_roles: 19,
      active_roles: 17,
      total_permissions: 173,
      unique_modules: 13,
    },
    user: {
      user_id: 1,
      username: 'admin',
      role: 'admin',
    },
  };

  return Response.json({
    success: true,
    data: healthData,
    message: 'RBAC system health check passed'
  });
}