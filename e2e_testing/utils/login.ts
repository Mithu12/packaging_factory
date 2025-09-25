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

  if (page.url().includes("/dashboard")) {
    return;
  }

  const usernameInput = page.getByPlaceholder("Enter your username");
  const passwordInput = page.getByPlaceholder("Enter your password");

  await usernameInput.waitFor({ state: "visible" });
  await usernameInput.fill(credentials.username);
  await passwordInput.fill(credentials.password);

  await Promise.all([
    page.waitForURL(/\/dashboard(?:$|\b)/),
    page.getByRole("button", { name: "Sign in" }).click(),
  ]);
}
