import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '.env') });

type Numberish = string | number | undefined;

function parsePort(value: Numberish, fallback: number): number {
  const parsed = typeof value === 'string' ? parseInt(value, 10) : value;
  return Number.isFinite(parsed) && parsed ? Number(parsed) : fallback;
}

const FRONTEND_PORT = parsePort(process.env.FRONTEND_PORT, 5173);
const BACKEND_PORT = parsePort(process.env.BACKEND_PORT, 5100);
const DB_PORT = parsePort(process.env.DB_PORT, 5432);
const BACKEND_HOST = process.env.DB_HOST || 'localhost';
const DB_NAME = process.env.BACKEND_DB_NAME || 'erp_e2e';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || '123';

const FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}`;
const BACKEND_BASE_URL = `http://127.0.0.1:${BACKEND_PORT}`;

export default defineConfig({
  testDir: path.join(__dirname, 'tests'),
  fullyParallel: false,
  workers: 1,
  maxFailures: 1,
  timeout: 120_000,
  expect: {
    timeout: 5_000,
  },
  globalSetup: require.resolve('./global-setup'),
  globalTeardown: require.resolve('./global-teardown'),
  reporter: [['list'], ['html', { open: 'never', outputFolder: path.join(__dirname, 'playwright-report') }]],
  use: {
    baseURL: FRONTEND_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: `npm run dev -- --host 127.0.0.1 --port ${FRONTEND_PORT}`,
      cwd: path.resolve(__dirname, '../frontend'),
      env: {
        ...process.env,
        VITE_API_URL: `${BACKEND_BASE_URL}/api`,
        VITE_BACKEND_BASE_URL: BACKEND_BASE_URL,
        BROWSER: 'none',
      },
      port: FRONTEND_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'npm run dev',
      cwd: path.resolve(__dirname, '../backend'),
      env: {
        ...process.env,
        PORT: `${BACKEND_PORT}`,
        DB_HOST: BACKEND_HOST,
        DB_PORT: `${DB_PORT}`,
        DB_NAME: DB_NAME,
        DB_USER: DB_USER,
        DB_PASSWORD: DB_PASSWORD,
        NODE_ENV: 'test',
        CORS_ORIGIN: FRONTEND_URL,
      },
      port: BACKEND_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});

