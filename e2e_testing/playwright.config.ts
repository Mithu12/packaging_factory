import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load local .env if it exists (for standalone e2e runs)
dotenv.config({ path: path.resolve(__dirname, '.env') });

const PORT_FRONTEND = process.env.PORT_FRONTEND || 3003;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.BASE_URL || `http://localhost:${PORT_FRONTEND}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // verification: webServer config is removed to decouple dependencies
});
