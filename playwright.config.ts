import { defineConfig, devices } from "@playwright/test";
import { assertSafeTestDatabaseEnvironment } from "../crm-backend/src/test-database-safety";

const databaseUrl = process.env.TEST_DATABASE_URL;
const jwtSecret = process.env.E2E_JWT_SECRET;
const apiUrl = process.env.E2E_API_URL ?? "http://127.0.0.1:4000";
const webUrl = process.env.E2E_WEB_URL ?? "http://127.0.0.1:3000";
const frontendOrigin = new URL(webUrl).origin;

if (!databaseUrl) throw new Error("Playwright requires TEST_DATABASE_URL for an isolated test database.");
assertSafeTestDatabaseEnvironment({
  ...process.env,
  TEST_DATABASE_URL: databaseUrl,
  DATABASE_URL: databaseUrl,
  DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED ?? databaseUrl,
});
if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error("Set E2E_JWT_SECRET to a test-only signing secret of at least 32 characters.");
}
if (!isLoopbackUrl(apiUrl) || !isLoopbackUrl(webUrl)) {
  throw new Error("Playwright E2E API and web URLs must use localhost or a loopback IP.");
}

const apiEnv = {
  DATABASE_URL: databaseUrl,
  DATABASE_URL_UNPOOLED: databaseUrl,
  JWT_SECRET: jwtSecret,
  NODE_ENV: "test",
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: webUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /responsive\.spec\.ts/,
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] },
      testMatch: /responsive\.spec\.ts/,
    },
  ],
  webServer: [
    {
      command: "npm run start",
      cwd: "../crm-backend",
      url: `${apiUrl}/api/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...apiEnv,
        TEST_DATABASE_URL: databaseUrl,
        TEST_DATABASE_BRANCH: process.env.TEST_DATABASE_BRANCH ?? "",
        TEST_DATABASE_HOST: process.env.TEST_DATABASE_HOST ?? "",
        DATABASE_SSL: process.env.DATABASE_SSL ?? "disable",
        PORT: new URL(apiUrl).port || "4000",
        FRONTEND_ORIGIN: frontendOrigin,
      },
    },
    {
      command: `npm run dev -- --hostname ${new URL(webUrl).hostname} --port ${new URL(webUrl).port || "3000"}`,
      cwd: ".",
      url: webUrl,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        NODE_ENV: "development",
        NEXT_PUBLIC_API_URL: apiUrl,
      },
    },
  ],
});

function isLoopbackUrl(value: string) {
  try {
    const url = new URL(value);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname.replace(/^\[|\]$/g, "").toLowerCase());
  } catch {
    return false;
  }
}
