import { Page, expect } from "@playwright/test";

interface Credentials {
  username: string;
  password: string;
}

const DEFAULT_USERNAME = process.env.ADMIN_USERNAME || "admin";
const DEFAULT_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

export async function loginAsAdmin(page: Page, credentials: Credentials = {
  username: DEFAULT_USERNAME,
  password: DEFAULT_PASSWORD,
}): Promise<void> {
  await page.goto("/login", { waitUntil: "networkidle" });

  // Already logged in
  if (page.url().includes("/dashboard")) {
    return;
  }

  const usernameInput = page.getByPlaceholder("Enter your username");
  const passwordInput = page.getByPlaceholder("Enter your password");

  await usernameInput.waitFor({ state: "visible", timeout: 30000 });
  await usernameInput.fill(credentials.username);
  await passwordInput.fill(credentials.password);

  // Click sign in
  const signInButton = page.getByRole("button", { name: "Sign in" });
  await signInButton.click();
  
  // Wait for URL to change from /login
  await page.waitForURL(url => !url.pathname.endsWith('/login'), { timeout: 30000 });
  
  // Wait for dashboard if not there yet
  if (!page.url().includes('/dashboard')) {
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });
  }
}
