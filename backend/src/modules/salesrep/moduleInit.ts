import pool from "../../database/connection";
import { MyLogger } from "../../utils/new-logger";
import { moduleRegistry, MODULE_NAMES } from "../../utils/moduleRegistry";

export const initializeSalesRepModule = async (): Promise<void> => {
  let action = "Sales Rep Module Initialization";

  try {
    MyLogger.info(action, { message: "Initializing Sales Rep module..." });

    const client = await pool.connect();

    try {
      // Verify Sales Rep tables exist
      const tables = [
        "sales_rep_customers",
        "sales_rep_orders",
        "sales_rep_order_items",
        "sales_rep_invoices",
        "sales_rep_payments",
        "sales_rep_deliveries",
        "sales_rep_notifications",
        "sales_rep_reports",
      ];

      const missingTables: string[] = [];
      for (const tableName of tables) {
        const tableExists = await client.query(
          `
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = $1
          );
        `,
          [tableName]
        );

        if (!tableExists.rows[0].exists) {
          missingTables.push(tableName);
        }
      }

      if (missingTables.length > 0) {
        MyLogger.warn(action, {
          message: `Sales Rep module tables not found: ${missingTables.join(", ")}. Module will not be initialized.`,
          missingTables,
        });
        return; // Gracefully skip initialization instead of throwing
      }

      // Verify Sales Rep permissions exist
      const permissionsQuery = await client.query(`
        SELECT COUNT(*) as count
        FROM permissions
        WHERE module = 'Sales Rep'
      `);

      const permissionCount = parseInt(permissionsQuery.rows[0].count);

      if (permissionCount === 0) {
        MyLogger.warn(action, {
          message: "Sales Rep permissions not found. Module will not be initialized.",
        });
        return; // Gracefully skip initialization
      }

      MyLogger.info(action, {
        message: "Sales Rep module tables verified",
        tables_count: tables.length,
        permissions_count: permissionCount,
      });

      // Verify Sales Rep role exists
      const roleQuery = await client.query(`
        SELECT COUNT(*) as count
        FROM roles
        WHERE name = 'sales_rep' AND is_active = true
      `);

      const roleCount = parseInt(roleQuery.rows[0].count);

      if (roleCount === 0) {
        MyLogger.warn(action, {
          message: "Sales Rep role not found. Module will not be initialized.",
        });
        return; // Gracefully skip initialization
      }

      // Register the sales-rep module with the module registry
      moduleRegistry.registerModule(MODULE_NAMES.SALESREP, {
        moduleName: "salesrep",
        features: [
          "customers",
          "orders",
          "invoices",
          "payments",
          "deliveries",
          "notifications",
          "reports",
        ],
      });

      MyLogger.success(action, {
        message: "Sales Rep module initialized successfully",
        features: [
          "Customer Management",
          "Order Management",
          "Invoice Management",
          "Payment Tracking",
          "Delivery Management",
          "Notifications",
          "Reports & Analytics",
          "RBAC Integration",
        ],
        api_base_url: "/api/salesrep",
        endpoints: [
          "GET /api/salesrep/dashboard/stats",
          "GET /api/salesrep/customers",
          "GET /api/salesrep/orders",
          "GET /api/salesrep/invoices",
          "GET /api/salesrep/payments",
          "GET /api/salesrep/deliveries",
          "GET /api/salesrep/notifications",
          "GET /api/salesrep/reports",
        ],
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    MyLogger.error(action, error, {
      message: "Sales Rep module initialization failed",
    });
    throw error;
  }
};
