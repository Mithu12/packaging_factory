# Database Migration System - Migration to Flyway

This document describes the new Flyway-based migration system that replaces the old monolithic migration approach.

## Overview

The previous migration system used a single large TypeScript file (`migrate.ts`) that created all tables at once and imported various migration modules. This approach had several issues:

- **Missing Files**: Some migration files could be missed during execution
- **No Version Control**: No proper tracking of which migrations have been applied
- **Monolithic**: All migrations were bundled together making it hard to track individual changes
- **No Rollback**: No way to undo specific migrations
- **Manual Dependency Management**: Required manual importing of migration modules

The new system uses Flyway principles with versioned SQL files and proper tracking.

## New Migration System Features

### ✅ **Versioned Migrations**
- Each migration has a clear version number (V1.0.0, V1.1.0, etc.)
- Migrations are applied in order based on version
- No migration can be missed or applied out of order

### ✅ **State Tracking**
- `flyway_schema_history` table tracks which migrations have been applied
- Includes execution time, checksum, and success status
- Prevents re-running of applied migrations

### ✅ **SQL-Based**
- Pure SQL migrations are easier to review and understand
- No complex TypeScript import dependencies
- Can be executed by any PostgreSQL client

### ✅ **Comprehensive Coverage**
All existing functionality has been extracted into versioned migrations:
- V1.0.0: Core tables (suppliers, products, categories, etc.)
- V1.1.0: Purchase order management
- V1.2.0: Invoice and payment management
- V1.3.0: User management and authentication
- V1.4.0: Point of Sale (POS) system
- V1.5.0: Supplier enhancements (WhatsApp, categories)
- V1.6.0: Product warranty fields
- V1.7.0: Expense management
- V1.8.0: Customer credit and gift features
- V1.9.0: Approval system
- V2.0.0: Comprehensive audit system
- V2.1.0: Role-Based Access Control (RBAC)
- V2.2.0: Comprehensive permissions assignment

## Usage

### Running Migrations

```bash
# Apply all pending migrations
npm run db:migrate

# Check migration status
npm run db:migrate:info

# Validate migration files and database connection
npm run db:validate
```

### Migration File Structure

```
backend/migrations/
├── V1.0.0__create_core_tables.sql
├── V1.1.0__create_purchase_order_tables.sql
├── V1.2.0__create_invoice_payment_tables.sql
└── ... (other migrations)
```

### Migration File Naming Convention

```
V{version}__{description}.sql
```

- **V**: Prefix indicating versioned migration
- **version**: Semantic version (1.0.0, 1.1.0, 2.0.0, etc.)
- **__**: Double underscore separator
- **description**: Snake_case description of the migration
- **.sql**: SQL file extension

## Creating New Migrations

### 1. Determine Next Version
Check the latest migration version:
```bash
npm run db:migrate:info
```

### 2. Create Migration File
Create a new file following the naming convention:
```bash
# Example: V2.3.0__add_notification_system.sql
touch migrations/V2.3.0__add_notification_system.sql
```

### 3. Write Migration SQL
```sql
-- Notification System
-- Version: 2.3.0
-- Description: Creates notification tables and triggers

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
```

### 4. Test Migration
```bash
# Validate the migration file
npm run db:validate

# Apply the migration
npm run db:migrate
```

## Migration Commands

### Primary Commands
- `npm run db:migrate` - Apply all pending migrations
- `npm run db:migrate:info` - Show migration status and history
- `npm run db:validate` - Validate migration files and database connection

### Legacy Commands (for reference)
- `npm run db:migrate:legacy` - Run old migration system (deprecated)
- `npm run db:migrate:flyway` - Use official Flyway CLI (if configured)

## Rollback Strategy

Currently, the system does not support automatic rollbacks. For rollback scenarios:

1. **Create a new migration** with the inverse operations
2. **Manual rollback** using direct SQL commands
3. **Restore from backup** for major issues

Example rollback migration:
```sql
-- V2.3.1__rollback_notification_system.sql
DROP TABLE IF EXISTS notifications;
```

## Best Practices

### 1. Always Use Transactions
Most DDL operations in PostgreSQL are transactional. If a migration fails, changes are automatically rolled back.

### 2. Idempotent Operations
Use `IF NOT EXISTS` and `IF EXISTS` clauses:
```sql
CREATE TABLE IF NOT EXISTS my_table (...);
ALTER TABLE my_table ADD COLUMN IF NOT EXISTS my_column VARCHAR(50);
DROP INDEX IF EXISTS idx_my_index;
```

### 3. Data Migration Safety
For data migrations:
```sql
-- Update with WHERE clause to prevent accidental full table updates
UPDATE users SET status = 'active' WHERE status IS NULL;

-- Use transactions for complex data changes
BEGIN;
-- ... your data migration
COMMIT;
```

### 4. Index Creation
Create indexes concurrently when possible:
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);
```

### 5. Documentation
Always include comments in migration files:
```sql
-- User Management Enhancement
-- Version: 2.3.0
-- Description: Adds user preferences and notification settings
-- Author: Development Team
-- Date: 2024-01-15
```

## Migration Validation

The system includes comprehensive validation:

### File Validation
- Checks that all migration files follow naming convention
- Validates that files are readable and contain SQL
- Sorts migrations by version to ensure proper order

### Database Validation
- Tests database connectivity
- Checks schema history table status
- Reports on applied migrations

### Content Validation
- Calculates checksums to detect file changes
- Tracks execution time and success status
- Prevents duplicate application of migrations

## Troubleshooting

### Migration Fails
1. Check the error message in the logs
2. Review the failing SQL in the migration file
3. Fix the issue and create a new migration
4. Never modify an already-applied migration file

### Schema History Issues
If the schema history table is corrupted:
```sql
-- Check current state
SELECT * FROM flyway_schema_history ORDER BY installed_rank;

-- If needed, you can manually update the history table
-- (Use with extreme caution)
```

### Starting Fresh
To reset the entire database:
1. Drop the database
2. Create a new database
3. Run `npm run db:migrate`

## Monitoring and Maintenance

### Regular Checks
- Monitor migration execution times
- Review failed migrations promptly
- Keep migration files in version control
- Document complex migrations

### Performance Considerations
- Large data migrations should be done in batches
- Consider maintenance windows for heavy migrations
- Monitor database performance during migrations
- Use `EXPLAIN` to optimize complex operations

## Comparison: Old vs New System

| Aspect | Old System | New System |
|--------|------------|------------|
| File Structure | Single monolithic file | Multiple versioned SQL files |
| Tracking | No tracking | Schema history table |
| Dependencies | Manual TypeScript imports | Automatic SQL execution |
| Missing Files | Possible | Impossible (ordered execution) |
| Rollback | Not supported | Manual rollback migrations |
| Validation | None | Comprehensive validation |
| Idempotency | Manual | Built-in with proper SQL |
| Documentation | Scattered in code | Centralized in migration files |

## Migration Path from Old System

If you have an existing database created with the old system:

1. **Backup your database** before proceeding
2. **Run validation** to ensure the new system is working:
   ```bash
   npm run db:validate
   ```
3. **Check current state**:
   ```bash
   npm run db:migrate:info
   ```
4. **If no migrations have been applied**, the system will detect this and create the schema history table
5. **Baseline the database** (if needed) to mark all current migrations as applied

The new system is designed to work alongside existing databases and will not re-apply changes that are already in place due to the `IF NOT EXISTS` clauses in the migration files.

## Conclusion

The new Flyway-based migration system provides:
- **Reliability**: No missed migrations
- **Visibility**: Clear tracking of what has been applied
- **Maintainability**: Easy to understand SQL files
- **Safety**: Transactional execution with validation
- **Scalability**: Supports growing database schemas

This system ensures that database migrations are predictable, trackable, and maintainable as the ERP system evolves.
