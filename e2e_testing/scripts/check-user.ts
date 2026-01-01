
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcrypt';

// Load env from backend
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

const DB_NAME = process.env.DB_NAME || 'erp_test';

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: DB_NAME,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function checkUser() {
  try {
    await client.connect();
    console.log(`Connected to ${DB_NAME}`);

    const roles = await client.query("SELECT * FROM roles");
    console.log(`Roles count: ${roles.rowCount}`);
    if (roles.rowCount > 0) {
        console.log("Roles:", roles.rows.map(r => `${r.id}:${r.name}`));
    } else {
        console.log("❌ No roles found!");
    }

    const res = await client.query("SELECT * FROM users WHERE username = 'admin'");
    if (res.rows.length === 0) {
      console.error("❌ Admin user NOT found!");
    } else {
      console.log("✅ Admin user found.");
      const user = res.rows[0];
      const match = await bcrypt.compare('admin123', user.password_hash);
      if (match) {
        console.log("✅ Password 'admin123' is VALID.");
      } else {
        console.error("❌ Password 'admin123' is INVALID.");
      }
    }
  } catch (err) {
    console.error("❌ Error checking user:", err);
  } finally {
    await client.end();
  }
}

checkUser();
