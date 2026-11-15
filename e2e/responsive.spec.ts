import { randomUUID } from "node:crypto";
import { expect, request as playwrightRequest, test } from "@playwright/test";

const apiUrl = process.env.E2E_API_URL ?? "http://127.0.0.1:4000";
const webUrl = process.env.E2E_WEB_URL ?? "http://127.0.0.1:3000";

test("workspace navigation and customer page fit a mobile viewport", async ({ browser }) => {
  const origin = new URL(webUrl).origin;
  const suffix = randomUUID().replaceAll("-", "").slice(0, 16);
  const password = `E2e!${randomUUID()}9a`;
  const api = await playwrightRequest.newContext({
    baseURL: apiUrl,
    extraHTTPHeaders: { Origin: origin },
  });
  let context: Awaited<ReturnType<typeof browser.newContext>> | undefined;
  try {
    const registration = await api.post("/api/auth/register", {
      data: {
        name: `Mobile test ${suffix}`,
        username: `mobile${suffix}`,
        email: `mobile-${suffix}@example.test`,
        password,
      },
    });
    expect(registration.status()).toBe(202);
    const login = await api.post("/api/auth/login", {
      data: { email: `mobile-${suffix}@example.test`, password },
    });
    expect(login.ok()).toBeTruthy();

    context = await browser.newContext({
      storageState: await api.storageState(),
      viewport: { width: 393, height: 852 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => {
      if (response.status() >= 500) errors.push(`${response.status()} ${response.url()}`);
    });
    await page.goto(`${webUrl}/customers`);
    await expect(page.getByRole("heading", { name: "Customers", exact: true })).toBeVisible();
    const navigation = page.locator('nav[aria-label="Workspace navigation"]').last();
    await expect(navigation.getByRole("link", { name: "Invoices" })).toBeVisible();
    await expect(navigation.getByRole("link", { name: "Appointments" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  } finally {
    await context?.close();
    await api.dispose();
  }
});
