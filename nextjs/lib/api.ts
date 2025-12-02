// /home/m22/projects/slf/er/erp-system/nextjs/lib/api.ts

export function getBackendUrl(): string {
  // Use the environment variable for backend URL, defaulting to localhost:3001
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
  return backendUrl;
}

export async function apiRequest(
  endpoint: string,
  options: RequestInit = {},
  request?: Request
): Promise<Response> {
  const backendUrl = getBackendUrl();
  const authToken = request?.headers.get('cookie')?.match(/authToken=([^;]+)/)?.[1];

  const headers: any = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken) {
    headers['Cookie'] = `authToken=${authToken}`;
  }

  const response = await fetch(`${backendUrl}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  return response;
}