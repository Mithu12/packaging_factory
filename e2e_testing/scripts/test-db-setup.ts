
import { Client } from 'pg';
import dotenv from 'dotenv';
import { execSync } from 'child_process';
import path from 'path';

// Load env from backend to get DB connection details if not set
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

async function setupTestDatabase() {
  const dbName = 'erp_test';
  const adminDbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: 'postgres', 
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  };

  const client = new Client(adminDbConfig);

  try {
    await client.connect();
    console.log(`🔌 Connected to admin database`);

    const checkRes = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (checkRes.rowCount === 0) {
      console.log(`📦 Database '${dbName}' does not exist. Creating...`);
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Database '${dbName}' created.`);
    } else {
      console.log(`ℹ️ Database '${dbName}' already exists.`);
    }
  } catch (error) {
    console.error('❌ Failed to setup test database:', error);
    process.exit(1);
  } finally {
    await client.end();
  }

  // Run migrations
  // We still need to run the backend's migration script because that's where the migration files are.
  // We execute it as a subprocess.
  console.log('🔄 Running migrations on test database...');
  try {
    const backendDir = path.resolve(__dirname, '../../backend');
    const migratorPath = path.join(backendDir, 'src/database/simple-migrator.ts');
    
    // We run this command inside the backend directory context so it finds its tsconfig/dependencies if needed,
    // although we are invoking it via npx tsx.
    // Actually, calling it from here is fine as long as we point to the file.
    execSync(`npx tsx ${migratorPath} migrate`, {
      cwd: backendDir, // Execute in backend dir to resolve relative paths in migrator correctly
      env: {
        ...process.env,
        DB_NAME: dbName,
      },
      stdio: 'inherit',
    });
    console.log('✅ Migrations completed successfully.');
  } catch (error) {
    console.error('❌ Failed to run migrations:', error);
    process.exit(1);
  }
}

setupTestDatabase();
