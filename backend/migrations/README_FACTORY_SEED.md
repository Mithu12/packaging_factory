# Factory Seed Script

This directory contains a comprehensive seed script for populating the database with factory-specific users, roles, and facilities.

## File: `seed_factory_data.sql`

### Overview
This script creates a complete factory setup including:
- **Factory Roles** - Manager and Worker roles with appropriate permissions
- **4 Users** - 2 managers and 2 workers assigned to specific factories  
- **2 Factories** - Factory A and Factory B with complete details
- **User-Factory Assignments** - Proper role-based factory access
- **Operators** - Factory workers registered as production operators
- **Sample Orders** - Factory customer orders for each facility

### Key Features
- ✅ All data follows the **BIGSERIAL primary key pattern** as required by project rules
- ✅ Proper RBAC (Role-Based Access Control) implementation
- ✅ Factory-specific user assignments and permissions
- ✅ Complete user profiles with realistic contact information
- ✅ Production operators linked to factory workers
- ✅ Sample customer orders for testing factory workflows
- ✅ Built-in data validation and comprehensive reporting

## Prerequisites

Before running this script, ensure the following migrations have been applied:
1. **V17** - `add_factories_and_multi_factory_support.sql` (factories and user_factories tables)
2. **V19** - `add_factory_rbac_roles.sql` (factory-specific roles)
3. **V21** - `add_work_orders_system.sql` (operators table)

## Usage

### Running the Script

```bash
# Navigate to the migrations directory
cd backend/migrations

# Run the factory seed script
psql -d your_database_name -f seed_factory_data.sql

# Or if using environment variables:
psql -d $DATABASE_NAME -f seed_factory_data.sql
```

### Created Data Structure

#### Factories
| Code | Name | Location | Manager |
|------|------|----------|---------|
| FAC_A | Factory A | Manufacturing City, CA | Alice Johnson |
| FAC_B | Factory B | Industrial Town, TX | Carol Davis |

#### Users Created
| Username | Full Name | Role | Factory | Email |
|----------|-----------|------|---------|-------|
| fac_a_manager | Alice Johnson | Factory Manager | Factory A | manager.a@factory-a.company.com |
| fac_a_worker | Bob Smith | Factory Worker | Factory A | worker.a@factory-a.company.com |
| fac_b_manager | Carol Davis | Factory Manager | Factory B | manager.b@factory-b.company.com |
| fac_b_worker | David Wilson | Factory Worker | Factory B | worker.b@factory-b.company.com |

#### Login Credentials
- **Password for all users**: `password123`
- **Email verification**: All users are pre-verified
- **Account status**: All accounts are active

### Role Permissions

#### Factory Manager Role
- ✅ Read, Create, Update, Delete factory customer orders
- ✅ Approve orders and manage factory operations
- ✅ Manage factory staff and assignments
- ✅ Full access to assigned factory data

#### Factory Worker Role  
- ✅ Read and Update factory customer orders
- ✅ View production data and work orders
- ✅ Update work progress and material consumption
- ❌ Cannot approve orders or manage other users

### Data Relationships

```
Factories (1) → (N) User Factory Assignments
Users (1) → (N) Factory Assignments (via user_factories)
Factory Workers → Operators (1:1 relationship)
Factories (1) → (N) Factory Customer Orders
Users (1) → (N) Work Order Assignments
```

### Post-Execution Reports

The script provides detailed reports including:

1. **Data Summary** - Record counts for all created entities
2. **Factory Details** - Factory information with manager assignments
3. **User Assignments** - User-to-factory role mappings
4. **Validation Checks** - Data integrity verification
5. **Login Credentials** - Username and access information

### Sample Factory Customer Orders

The script creates sample orders for each factory:
- **Factory A**: $15,000 order from ABC Manufacturing Ltd
- **Factory B**: $22,000 order from XYZ Industries

## Testing Factory Access

### Login Testing
```bash
# Test factory manager login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "fac_a_manager", "password": "password123"}'

# Test factory worker login  
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "fac_a_worker", "password": "password123"}'
```

### Access Control Testing
1. **Factory Isolation**: Users should only see data from their assigned factory
2. **Role Permissions**: Managers have broader permissions than workers
3. **Cross-Factory Access**: Users cannot access other factories' data

## Extending the Data

### Adding More Users
```sql
-- Add additional factory worker
INSERT INTO users (username, email, password_hash, full_name, role, role_id) VALUES
('fac_a_worker_2', 'worker2.a@factory-a.company.com', 
 '$2b$12$LQv3c1yqBw2fnc.eALlgPO.Kg3FRlvbuxEGPhAhGsOBHwPfpg7I3O',
 'Jane Doe', 'employee', (SELECT id FROM roles WHERE name = 'factory_worker'));

-- Assign to factory
INSERT INTO user_factories (user_id, factory_id, role) VALUES
((SELECT id FROM users WHERE username = 'fac_a_worker_2'),
 (SELECT id FROM factories WHERE code = 'FAC_A'), 'worker');
```

### Adding More Factories
```sql
-- Create new factory
INSERT INTO factories (name, code, description, address, phone, email) VALUES
('Factory C', 'FAC_C', 'Specialized assembly facility',
 '{"street": "999 Assembly Lane", "city": "Assembly City", "state": "FL"}',
 '+1-555-FAC-CCCC', 'operations@factory-c.company.com');
```

### Production Integration
After running this script, you can:
1. **Create Work Orders** assigned to specific factories
2. **Assign Production Lines** to factories
3. **Generate Material Requirements** for factory-specific orders
4. **Track Production Progress** by factory and operator

## Troubleshooting

### Common Issues

**Migration Dependencies**
- Error: `relation "factories" does not exist` → Run V17 migration first
- Error: `role "factory_manager" not found` → Run V19 migration first  
- Error: `relation "operators" does not exist` → Run V21 migration first

**User Creation Issues**
- Error: `duplicate key value violates unique constraint` → Users already exist, script handles this gracefully
- Error: `role_id not found` → Ensure factory roles were created successfully

**Factory Assignment Issues**  
- Warning: `Factories without managers` → Normal if managers aren't assigned yet
- Error: `foreign key violation` → Ensure users exist before creating assignments

### Data Validation

All validation checks should show "PASS" status:
- ✅ Users without factory assignments: PASS
- ⚠️ Factories without managers: May show WARNING initially (resolved by script)
- ✅ Users with invalid role assignments: PASS

### Support

For issues or questions:
1. Check the validation report output
2. Verify all prerequisite migrations are applied
3. Ensure database user has appropriate permissions
4. Review the transaction logs for specific error messages

## Integration with Other Seed Scripts

This script works in conjunction with:
- `seed_product_data.sql` - Product catalog and BOM data
- Future production/work order seed scripts
- RBAC permission seed scripts

Run them in this order:
1. `seed_product_data.sql` (products and suppliers)
2. `seed_factory_data.sql` (factories and users)  
3. Additional production/workflow seed scripts