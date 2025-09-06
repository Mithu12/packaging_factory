# ERP System Backend

A robust Express.js backend API for the ERP system built with TypeScript and PostgreSQL.

## Features

- **Supplier Management**: Complete CRUD operations for supplier management
- **Database Integration**: PostgreSQL with connection pooling
- **Validation**: Joi-based request validation
- **Error Handling**: Comprehensive error handling middleware
- **Security**: Helmet, CORS, and rate limiting
- **TypeScript**: Full TypeScript support with strict type checking

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp env.example .env
   ```
   
   Update the `.env` file with your database credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=erp_system
   DB_USER=postgres
   DB_PASSWORD=your_password
   PORT=3001
   NODE_ENV=development
   JWT_SECRET=your_jwt_secret_key_here
   CORS_ORIGIN=http://localhost:5173
   ```

3. **Set up the database**:
   ```bash
   # Create the database
   createdb erp_system
   
   # Run migrations
   npm run db:migrate
   
   # Seed with sample data
   npm run db:seed
   ```

## Running the Application

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

## API Endpoints

### Suppliers

- `GET /api/suppliers` - Get all suppliers (with pagination and filtering)
- `GET /api/suppliers/stats` - Get supplier statistics
- `GET /api/suppliers/categories` - Get all supplier categories
- `GET /api/suppliers/search` - Search suppliers
- `GET /api/suppliers/:id` - Get supplier by ID
- `POST /api/suppliers` - Create new supplier
- `PUT /api/suppliers/:id` - Update supplier
- `PATCH /api/suppliers/:id/toggle-status` - Toggle supplier status
- `DELETE /api/suppliers/:id` - Delete supplier

### Health Check
- `GET /health` - Health check endpoint

## Database Schema

### Suppliers Table
- Complete supplier information including contact details, banking info, and performance metrics
- Automatic supplier code generation (SUP-001, SUP-002, etc.)
- Status tracking (active/inactive)
- Performance ratings and order history

### Supplier Performance Table
- Track delivery times, quality ratings, and communication scores
- Issue tracking and on-time delivery rates
- Historical performance data

## Project Structure

```
src/
├── database/
│   ├── connection.ts      # Database connection pool
│   ├── migrate.ts         # Database migrations
│   └── seed.ts           # Sample data seeding
├── middleware/
│   └── errorHandler.ts   # Error handling middleware
├── routes/
│   └── suppliers.routes.ts      # Supplier API routes
├── services/
│   └── supplierService.ts # Supplier business logic
├── types/
│   └── supplier.ts       # TypeScript type definitions
├── validation/
│   └── supplierValidation.ts # Request validation schemas
└── index.ts              # Application entry point
```

## Development

### Adding New Features

1. Create types in `src/types/`
2. Add validation schemas in `src/validation/`
3. Implement business logic in `src/services/`
4. Create API routes in `src/routes/`
5. Update database schema in `src/database/migrate.ts`

### Database Migrations

To add new tables or modify existing ones:

1. Update the migration file in `src/database/migrate.ts`
2. Run `npm run db:migrate` to apply changes
3. Update seed data if needed in `src/database/seed.ts`

## Testing

The API can be tested using tools like:
- Postman
- curl
- Thunder Client (VS Code extension)

Example API calls:

```bash
# Get all suppliers
curl http://localhost:3001/api/suppliers

# Create a new supplier
curl -X POST http://localhost:3001/api/suppliers \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Supplier", "contact_person": "John Doe", "email": "john@test.com"}'

# Get supplier statistics
curl http://localhost:3001/api/suppliers/stats
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | Database host | localhost |
| `DB_PORT` | Database port | 5432 |
| `DB_NAME` | Database name | erp_system |
| `DB_USER` | Database user | postgres |
| `DB_PASSWORD` | Database password | - |
| `PORT` | Server port | 3001 |
| `NODE_ENV` | Environment | development |
| `JWT_SECRET` | JWT secret key | - |
| `CORS_ORIGIN` | CORS origin | http://localhost:5173 |

## Contributing

1. Follow TypeScript best practices
2. Add proper error handling
3. Include input validation
4. Write clear commit messages
5. Test your changes thoroughly
