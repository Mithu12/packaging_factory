
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load env from backend
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

// Force test DB Name if not properly passed, though we expect it from env
const DB_NAME = process.env.DB_NAME || 'erp_test';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: DB_NAME,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function resetDatabase() {
    // Double check we are not nuking prod
    if (DB_NAME !== 'erp_test') {
        console.error(`❌ DANGER: Attempted to reset database '${DB_NAME}'. This script only runs on 'erp_test'.`);
        process.exit(1);
    }

    const client = await pool.connect();
    try {
        console.log(`🧹 Resetting database '${DB_NAME}'...`);
        
        const res = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            AND table_name NOT IN ('flyway_schema_history', 'spatial_ref_sys')
        `);

        if (res.rows.length === 0) {
            console.log('ℹ️ No tables to truncate.');
            return;
        }

        const tables = res.rows.map(row => `"${row.table_name}"`).join(', ');
        
        await client.query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE;`);
        
        console.log('✅ Database reset complete (tables truncated).');
    } catch (error) {
        console.error('❌ Failed to reset database:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

resetDatabase();
