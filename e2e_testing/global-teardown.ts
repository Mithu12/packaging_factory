import path from 'path';
import dotenv from 'dotenv';
import { Client } from 'pg';
import type { FullConfig } from '@playwright/test';

dotenv.config({ path: path.resolve(__dirname, '.env') });

export default async function globalTeardown(_config: FullConfig): Promise<void> {
  if (process.env.KEEP_E2E_DB === 'true') {
    return;
  }

  const host = process.env.DB_HOST || 'localhost';
  const port = Number(process.env.DB_PORT || 5432);
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD || '123';
  const dbName = process.env.BACKEND_DB_NAME || 'erp_e2e';

  if (!/(test|e2e)/i.test(dbName)) {
    console.warn(`Skipped dropping database "${dbName}" because it does not appear to be a test database.`);
    return;
  }

  const adminClient = new Client({
    host,
    port,
    user,
    password,
    database: 'postgres',
  });

  await adminClient.connect();
  try {
    await adminClient.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`, [dbName]);
    await adminClient.query(`DROP DATABASE IF EXISTS "${dbName}"`);
  } finally {
    await adminClient.end();
  }
}
