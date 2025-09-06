import {Pool} from 'pg';
import dotenv from 'dotenv';
import {MyLogger} from "@/utils/new-logger";

dotenv.config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'erp_system',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: true,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 20000, // Return an error after 20 seconds if connection could not be established
});

// Test the connection
pool.on('connect', () => {
    MyLogger.info('📊 Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    MyLogger.error('❌ Unexpected error on idle client', err);
    process.exit(-1);
});

export default pool;
