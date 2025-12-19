import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '.env') });

type Numberish = string | number | undefined;

function parsePort(value: Numberish, fallback: number): number {
  const parsed = typeof value === 'string' ? parseInt(value, 10) : value;
  return Number.isFinite(parsed) && parsed ? Number(parsed) : fallback;
}

// Fixed ports for e2e testing - avoid conflicts with dev servers
const FRONTEND_PORT = 3500;
const BACKEND_PORT = 5500;
const DB_PORT = parsePort(process.env.DB_PORT, 5432);
const BACKEND_HOST = process.env.DB_HOST || 'localhost';
const DB_NAME = process.env.BACKEND_DB_NAME || 'erp_e2e';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'sa';

const FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}`;
const BACKEND_BASE_URL = `http://127.0.0.1:${BACKEND_PORT}`;

// Expose base URLs to tests for API helpers (login, seeding, etc.)
process.env.BACKEND_BASE_URL = BACKEND_BASE_URL;
process.env.API_BASE_URL = `${BACKEND_BASE_URL}/api`;

console.log('DB_PASSWORD', DB_PASSWORD);
console.log('DB_USER', DB_USER);
console.log('DB_NAME', DB_NAME);
console.log('BACKEND_HOST', BACKEND_HOST);
console.log('DB_PORT', DB_PORT);
console.log('BACKEND_PORT', BACKEND_PORT);
console.log('FRONTEND_PORT', FRONTEND_PORT);
console.log('BACKEND_BASE_URL', BACKEND_BASE_URL);
console.log('FRONTEND_URL', FRONTEND_URL);

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
      use: { 
        ...devices['Desktop Chrome'],
        // Disable sandbox and other security restrictions for local testing
        launchOptions: {
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
        },
      },
    },
  ],
  webServer: [
    {
      command: `npm run dev -- --hostname 127.0.0.1 --port ${FRONTEND_PORT}`,
      cwd: path.resolve(__dirname, '../frontend'),
      env: {
        ...process.env,
        VITE_API_URL: `${BACKEND_BASE_URL}/api`,
        VITE_BACKEND_BASE_URL: BACKEND_BASE_URL,
        NEXT_PUBLIC_API_URL: `${BACKEND_BASE_URL}/api`,
        NEXT_PUBLIC_BACKEND_BASE_URL: BACKEND_BASE_URL,
        BROWSER: 'none',
      },
      port: FRONTEND_PORT,
      // Set to true to use manually started servers (for debugging)
      // Set to false (or use CI env) to auto-start servers
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `PORT=${BACKEND_PORT} CORS_ORIGIN=${FRONTEND_URL} npm run dev`,
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
      // Use URL instead of port to ensure backend is fully ready (not just port bound)
      url: `http://127.0.0.1:${BACKEND_PORT}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});

