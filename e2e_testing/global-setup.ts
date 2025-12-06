import path from 'path';
import { Client } from 'pg';
import dotenv from 'dotenv';
import { spawn } from 'child_process';
import type { FullConfig } from '@playwright/test';
import { seedReferenceData } from './scripts/seedTestData';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const isWin = process.platform === 'win32';

function resolveNpmCommand(script: string): { command: string; args: string[] } {
  const baseArgs = ['run', script];

  if (process.env.npm_execpath) {
    return {
      command: process.execPath,
      args: [process.env.npm_execpath, ...baseArgs],
    };
  }

  if (isWin) {
    return {
      command: 'cmd.exe',
      args: ['/c', 'npm', ...baseArgs],
    };
  }

  return {
    command: 'npm',
    args: baseArgs,
  };
}

function ensureSafeDatabaseName(dbName: string): void {
  if (!/(test|e2e)/i.test(dbName)) {
    throw new Error(`Refusing to prepare database "${dbName}" because it does not contain 'test' or 'e2e'.`);
  }
}

function runNpmScript(script: string, cwd: string, env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const { command, args } = resolveNpmCommand(script);
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command "npm run ${script}" exited with code ${code}`));
      }
    });
  });
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  console.log('[E2E Setup] Starting global setup...');
  
  // Skip database reset when using manually started servers (e.g., for debugging)
  if (process.env.SKIP_DB_RESET === 'true') {
    console.log('[E2E Setup] SKIP_DB_RESET=true - Skipping database setup');
    return;
  }
  
  const host = process.env.DB_HOST || 'localhost';
  const port = Number(process.env.DB_PORT || 5432);
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD || '123';
  const dbName = process.env.BACKEND_DB_NAME || 'erp_e2e';

  console.log(`[E2E Setup] Database config: host=${host}, port=${port}, user=${user}, dbName=${dbName}`);

  ensureSafeDatabaseName(dbName);

  const adminClient = new Client({
    host,
    port,
    user,
    password,
    database: 'postgres',
  });

  try {
    console.log('[E2E Setup] Connecting to PostgreSQL...');
    await adminClient.connect();
    console.log('[E2E Setup] Connected successfully');

    // Terminate existing connections to the database
    console.log(`[E2E Setup] Terminating connections to "${dbName}"...`);
    await adminClient.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [dbName]
    );

    // Drop database if exists
    console.log(`[E2E Setup] Dropping database "${dbName}" if exists...`);
    await adminClient.query(`DROP DATABASE IF EXISTS "${dbName}"`);

    // Create fresh database
    console.log(`[E2E Setup] Creating database "${dbName}"...`);
    await adminClient.query(`CREATE DATABASE "${dbName}"`);
    console.log(`[E2E Setup] Database "${dbName}" created successfully`);
  } catch (error) {
    console.error('[E2E Setup] Database setup failed:', error);
    throw error;
  } finally {
    await adminClient.end();
  }

  const backendDir = path.resolve(__dirname, '../backend');
  const backendEnv: NodeJS.ProcessEnv = {
    ...process.env,
    DB_HOST: host,
    DB_PORT: `${port}`,
    DB_USER: user,
    DB_PASSWORD: password,
    DB_NAME: dbName,
    NODE_ENV: 'test',
  };

  console.log('[E2E Setup] Running migrations...');
  await runNpmScript('db:migrate', backendDir, backendEnv);
  console.log('[E2E Setup] Migrations completed');

  console.log('[E2E Setup] Seeding reference data...');
  await seedReferenceData({ host, port, user, password, database: dbName });
  console.log('[E2E Setup] Setup completed successfully');
}

