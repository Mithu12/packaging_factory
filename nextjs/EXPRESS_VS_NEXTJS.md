# Express vs Next.js - Migration Guide

## Architecture Comparison

### Express (Old)
```
Frontend (Vite + React) → Port 8080
    ↓ HTTP Requests
Backend (Express) → Port 3001
    ↓ Database Queries
PostgreSQL
```

### Next.js (New)
```
Next.js App → Port 3000
├── Pages (Client Components)
├── API Routes (Server-side)
└── Database Queries
    ↓
PostgreSQL
```

## Code Comparison

### 1. Route Handlers

#### Express
```typescript
// backend/src/routes/auth.routes.ts
import express from 'express';
const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const result = await AuthMediator.login({ username, password });
  res.json(result);
});

export default router;
```

#### Next.js
```typescript
// nextjs/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { username, password } = await request.json();
  const result = await AuthMediator.login({ username, password });
  return NextResponse.json(result);
}
```

### 2. Middleware

#### Express
```typescript
// backend/src/middleware/auth.ts
export const authenticate = async (req, res, next) => {
  const token = req.cookies.authToken;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.user = await verifyToken(token);
  next();
};

// Usage
router.get('/profile', authenticate, async (req, res) => {
  res.json(req.user);
});
```

#### Next.js
```typescript
// nextjs/middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get('authToken')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

// API Route
export async function GET(request: NextRequest) {
  const token = request.cookies.get('authToken')?.value;
  const user = await verifyToken(token);
  return NextResponse.json(user);
}
```

### 3. Error Handling

#### Express
```typescript
// backend/src/middleware/errorHandler.ts
export const errorHandler = (err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
};

// Usage
app.use(errorHandler);
```

#### Next.js
```typescript
// nextjs/app/api/[route]/route.ts
export async function GET(request: NextRequest) {
  try {
    const data = await fetchData();
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
```

### 4. Request/Response

#### Express
```typescript
// Request
const { id } = req.params;
const { name } = req.query;
const { data } = req.body;
const token = req.cookies.authToken;
const header = req.headers.authorization;

// Response
res.json({ data });
res.status(201).json({ created: true });
res.cookie('token', value, { httpOnly: true });
```

#### Next.js
```typescript
// Request
const { id } = params; // From function parameter
const name = request.nextUrl.searchParams.get('name');
const { data } = await request.json();
const token = request.cookies.get('authToken')?.value;
const header = request.headers.get('authorization');

// Response
return NextResponse.json({ data });
return NextResponse.json({ created: true }, { status: 201 });
const response = NextResponse.json({ data });
response.cookies.set('token', value, { httpOnly: true });
return response;
```

### 5. Database Queries

#### Express
```typescript
// backend/src/mediators/auth/AuthMediator.ts
import pool from '@/database/connection';

export class AuthMediator {
  static async login(data: LoginRequest) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM users WHERE username = $1',
        [data.username]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }
}
```

#### Next.js
```typescript
// nextjs/lib/auth.ts (or in route handler)
import pool from '@/lib/db';

export class AuthService {
  static async login(data: LoginRequest) {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [data.username]
    );
    return result.rows[0];
  }
}
```

### 6. Frontend Pages

#### React + Vite
```typescript
// frontend/src/pages/Dashboard.tsx
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  return <div>Welcome {user.name}</div>;
}
```

#### Next.js
```typescript
// nextjs/app/dashboard/page.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  return <div>Welcome {user.name}</div>;
}
```

### 7. API Calls

#### React + Vite
```typescript
// frontend/src/services/auth-api.ts
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

export const AuthApi = {
  login: async (credentials) => {
    const response = await axios.post(
      `${API_URL}/auth/login`,
      credentials,
      { withCredentials: true }
    );
    return response.data;
  }
};
```

#### Next.js
```typescript
// nextjs/contexts/AuthContext.tsx
export const AuthProvider = ({ children }) => {
  const login = async (credentials) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
      credentials: 'include'
    });
    return response.json();
  };
};
```

## Key Differences

### 1. File Structure

| Express | Next.js |
|---------|---------|
| `routes/` | `app/api/` |
| `controllers/` | Route handlers in `route.ts` |
| `middleware/` | `middleware.ts` + inline checks |
| `frontend/src/pages/` | `app/[page]/page.tsx` |

### 2. Routing

| Express | Next.js |
|---------|---------|
| `router.get('/users/:id')` | `app/api/users/[id]/route.ts` |
| `router.post('/users')` | `export async function POST()` |
| Manual route registration | File-based routing |

### 3. Request Handling

| Express | Next.js |
|---------|---------|
| `req.params` | Function parameter `params` |
| `req.query` | `request.nextUrl.searchParams` |
| `req.body` | `await request.json()` |
| `req.cookies` | `request.cookies.get()` |

### 4. Response Handling

| Express | Next.js |
|---------|---------|
| `res.json()` | `NextResponse.json()` |
| `res.status()` | Second parameter `{ status }` |
| `res.cookie()` | `response.cookies.set()` |
| `res.redirect()` | `NextResponse.redirect()` |

### 5. Middleware

| Express | Next.js |
|---------|---------|
| Chain with `next()` | Return `NextResponse` |
| Applied per route | Applied via `middleware.ts` |
| Multiple middleware | Single middleware function |

### 6. Error Handling

| Express | Next.js |
|---------|---------|
| Global error handler | Try-catch in each route |
| `next(error)` | Return error response |
| Error middleware | No built-in error middleware |

### 7. Static Files

| Express | Next.js |
|---------|---------|
| `express.static('public')` | `public/` folder |
| Manual configuration | Automatic serving |

### 8. Environment Variables

| Express | Next.js |
|---------|---------|
| `process.env.VAR` | `process.env.VAR` (server) |
| Available everywhere | `NEXT_PUBLIC_` prefix for client |

## Migration Checklist

### For Each Express Route

- [ ] Identify the route path
- [ ] Create corresponding file in `app/api/`
- [ ] Convert route handler to Next.js format
- [ ] Update request/response handling
- [ ] Add authentication checks
- [ ] Test the endpoint

### For Each Frontend Page

- [ ] Create file in `app/[page]/`
- [ ] Add `'use client'` directive
- [ ] Update imports (React Router → Next.js)
- [ ] Update API calls (axios → fetch)
- [ ] Test the page

### For Each Middleware

- [ ] Determine if it's global or route-specific
- [ ] Add to `middleware.ts` or inline in routes
- [ ] Update request/response handling
- [ ] Test functionality

## Common Patterns

### Pattern 1: Protected API Route

#### Express
```typescript
router.get('/data', authenticate, authorize('admin'), async (req, res) => {
  const data = await getData();
  res.json(data);
});
```

#### Next.js
```typescript
export async function GET(request: NextRequest) {
  const token = request.cookies.get('authToken')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const user = await verifyToken(token);
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  const data = await getData();
  return NextResponse.json(data);
}
```

### Pattern 2: CRUD Operations

#### Express
```typescript
router.get('/items', async (req, res) => { /* GET all */ });
router.get('/items/:id', async (req, res) => { /* GET one */ });
router.post('/items', async (req, res) => { /* CREATE */ });
router.put('/items/:id', async (req, res) => { /* UPDATE */ });
router.delete('/items/:id', async (req, res) => { /* DELETE */ });
```

#### Next.js
```typescript
// app/api/items/route.ts
export async function GET() { /* GET all */ }
export async function POST() { /* CREATE */ }

// app/api/items/[id]/route.ts
export async function GET(req, { params }) { /* GET one */ }
export async function PUT(req, { params }) { /* UPDATE */ }
export async function DELETE(req, { params }) { /* DELETE */ }
```

### Pattern 3: File Upload

#### Express
```typescript
import multer from 'multer';
const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.single('file'), async (req, res) => {
  const file = req.file;
  res.json({ filename: file.filename });
});
```

#### Next.js
```typescript
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  
  // Save file
  await writeFile(`uploads/${file.name}`, buffer);
  
  return NextResponse.json({ filename: file.name });
}
```

## Benefits of Next.js

1. **Unified Codebase**: Frontend and backend in one project
2. **File-based Routing**: Intuitive structure
3. **TypeScript First**: Better type safety
4. **Modern React**: Latest features and patterns
5. **Built-in Optimization**: Automatic code splitting
6. **Simplified Deployment**: Single application
7. **Better DX**: Hot reload for both frontend and backend

## Challenges

1. **Learning Curve**: New patterns and conventions
2. **Middleware**: Different approach than Express
3. **Error Handling**: No global error handler
4. **File Uploads**: Different API
5. **WebSockets**: Requires additional setup
6. **Testing**: Different testing approach

## Best Practices

### 1. Keep Business Logic Separate
```typescript
// ❌ Bad: Logic in route handler
export async function POST(request: NextRequest) {
  const data = await request.json();
  const result = await pool.query('INSERT INTO ...');
  return NextResponse.json(result);
}

// ✅ Good: Logic in service/mediator
export async function POST(request: NextRequest) {
  const data = await request.json();
  const result = await UserService.create(data);
  return NextResponse.json(result);
}
```

### 2. Reuse Existing Services
```typescript
// Reuse backend mediators/services
import { AuthMediator } from '@/lib/mediators/AuthMediator';

export async function POST(request: NextRequest) {
  const data = await request.json();
  const result = await AuthMediator.login(data);
  return NextResponse.json(result);
}
```

### 3. Consistent Error Handling
```typescript
// Create helper function
function handleError(error: any) {
  console.error(error);
  return NextResponse.json(
    { error: error.message || 'Internal Server Error' },
    { status: error.status || 500 }
  );
}

// Use in routes
export async function GET(request: NextRequest) {
  try {
    const data = await fetchData();
    return NextResponse.json(data);
  } catch (error) {
    return handleError(error);
  }
}
```

### 4. Type Safety
```typescript
// Define types
interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
}

// Use in route
export async function POST(request: NextRequest) {
  const data: CreateUserRequest = await request.json();
  // TypeScript will check types
}
```

## Conclusion

The migration from Express to Next.js involves:
- Converting route handlers to Next.js format
- Updating request/response handling
- Adapting middleware approach
- Updating frontend pages
- Maintaining business logic

The result is a more modern, unified application with better developer experience and performance.
