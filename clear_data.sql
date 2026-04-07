-- =============================================================================
-- Clear All Data Script
-- Preserves: role_permissions, users, permissions, chart_of_accounts,
--            cost_centers, flyway_schema_history, settings, system_settings,
--            expense_categories, roles, account_groups, role_hierarchy,
--            user_permissions
-- =============================================================================

BEGIN;

DO $$
DECLARE
    preserved_tables TEXT[] := ARRAY[
        'role_permissions',
        'users',
        'permissions',
        'chart_of_accounts',
        'cost_centers',
        'flyway_schema_history',
        'settings',
        'system_settings',
        'expense_categories',
        'roles',
        'account_groups',
        'role_hierarchy',
        'user_permissions'
    ];
    rec RECORD;
    tbl_count INT := 0;
BEGIN
    RAISE NOTICE '=== Starting data cleanup ===';

    FOR rec IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
          AND table_name != ALL(preserved_tables)
        ORDER BY table_name
    LOOP
        RAISE NOTICE 'Truncating: %', rec.table_name;
        EXECUTE format('TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE', rec.table_name);
        tbl_count := tbl_count + 1;
    END LOOP;

    RAISE NOTICE '=== Cleanup complete. % tables truncated. ===', tbl_count;
    RAISE NOTICE 'Preserved tables: role_permissions, users, permissions, chart_of_accounts, cost_centers, flyway_schema_history, settings, system_settings, expense_categories, roles, account_groups, role_hierarchy, user_permissions';
END $$;

COMMIT;
