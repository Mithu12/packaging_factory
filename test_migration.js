const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "erp_db",
  user: "postgres",
  password: "password",
});

async function testMigration() {
  try {
    console.log("Testing database migration...");

    // Test if the new columns exist
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'sales_rep_order_items' 
      AND column_name IN ('assigned_factory_id', 'factory_assigned_by', 'factory_assigned_at')
      ORDER BY column_name
    `);

    console.log("New columns found:", result.rows);

    if (result.rows.length === 3) {
      console.log("✅ Migration successful! All required columns exist.");
    } else {
      console.log("❌ Migration failed! Missing columns.");
    }
  } catch (error) {
    console.error("Error testing migration:", error);
  } finally {
    await pool.end();
  }
}

testMigration();
