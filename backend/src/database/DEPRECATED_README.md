# DEPRECATED MIGRATION FILES

⚠️ **WARNING: These files are deprecated and should not be used for new projects.**

The following files have been replaced by the new Flyway-based migration system:

## Deprecated Files

### 1. Main Migration File
- `migrate.ts` - Monolithic migration file (replaced by versioned SQL migrations)

### 2. Individual Migration Modules
- `add-approval-system.ts` → V1.9.0__add_approval_system.sql
- `add-audit-system.ts` → V2.0.0__add_audit_system.sql
- `add-comprehensive-permissions.ts` → V2.2.0__add_comprehensive_permissions.sql
- `add-customer-credit-fields.ts` → V1.8.0__add_customer_credit_fields.sql
- `add-expense-tables.ts` → V1.7.0__create_expense_tables.sql
- `add-pos-tables.ts` → V1.4.0__create_pos_tables.sql
- `add-rbac-system.ts` → V2.1.0__add_rbac_system.sql
- `add-sequences.ts` → Integrated into V1.4.0__create_pos_tables.sql
- `add-supplier-categories-table.ts` → V1.5.0__add_supplier_enhancements.sql
- `add-warranty-service-time-to-products.ts` → V1.6.0__add_product_warranty_fields.sql
- `add-whatsapp-to-suppliers.ts` → V1.5.0__add_supplier_enhancements.sql

### 3. Configuration Files
- `flyway.conf` - Text-based config (replaced by flyway.config.js)

## Migration Path

All functionality from these files has been extracted and organized into the new migration system:

1. **Core Database Structure** (V1.0.0 - V1.3.0)
   - Basic tables (suppliers, products, categories, users)
   - Purchase orders and invoices
   - User management

2. **POS System** (V1.4.0)
   - Customer management
   - Sales orders and receipts
   - Pricing rules

3. **Enhancements** (V1.5.0 - V1.8.0)
   - Supplier enhancements
   - Product warranty fields
   - Expense management
   - Customer credit features

4. **Advanced Systems** (V1.9.0 - V2.2.0)
   - Approval workflows
   - Comprehensive audit system
   - Role-based access control (RBAC)
   - Permission assignments

## New System Benefits

✅ **Reliability**: No missed migrations due to ordered execution
✅ **Tracking**: Full history of applied migrations
✅ **Validation**: File and database validation
✅ **Maintainability**: SQL-based migrations are easier to review
✅ **Safety**: Transactional execution with proper error handling

## Usage

Use the new migration system instead:

```bash
# Apply migrations
npm run db:migrate

# Check status
npm run db:migrate:info

# Validate system
npm run db:validate
```

## Safe Removal

These files can be safely removed after confirming:

1. ✅ New migration system is working correctly
2. ✅ All migrations have been applied successfully
3. ✅ Team is trained on new system
4. ✅ Documentation has been updated

## Legacy Support

The legacy migration script is still available for reference:
```bash
npm run db:migrate:legacy
```

**Do not use this in production - it may conflict with the new system.**

---

**Next Steps**: After confirming the new system works correctly, these deprecated files should be removed to avoid confusion and maintain a clean codebase.
