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
  const host = process.env.DB_HOST || 'localhost';
  const port = Number(process.env.DB_PORT || 5432);
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD || '123';
  const dbName = process.env.BACKEND_DB_NAME || 'erp_e2e';

  ensureSafeDatabaseName(dbName);

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
    await adminClient.query(`CREATE DATABASE "${dbName}"`);
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

  await runNpmScript('db:migrate', backendDir, backendEnv);

  await seedReferenceData({ host, port, user, password, database: dbName });
}

