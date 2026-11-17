import { randomUUID } from "node:crypto";
import {
  expect,
  request as playwrightRequest,
  test,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from "@playwright/test";

const apiUrl = process.env.E2E_API_URL ?? "http://127.0.0.1:4000";
const webUrl = process.env.E2E_WEB_URL ?? "http://127.0.0.1:3000";
const frontendOrigin = new URL(webUrl).origin;
const suffix = randomUUID().replaceAll("-", "").slice(0, 16);
const owner = {
  name: `E2E Owner ${suffix}`,
  username: `qa${suffix}`,
  email: `e2e-${suffix}@example.test`,
  password: `E2e!${randomUUID()}9a`,
};

let ownerApi: APIRequestContext;
let ownerStorage: Awaited<ReturnType<APIRequestContext["storageState"]>>;
let activeContext: BrowserContext;
let activePage: Page;
let pageErrors: string[];
let failedResponses: string[];

test.describe("account and workspace workflows", () => {
  test.beforeAll(async () => {
    ownerApi = await playwrightRequest.newContext({
      baseURL: apiUrl,
      extraHTTPHeaders: { Origin: frontendOrigin },
    });
    const registration = await ownerApi.post("/api/auth/register", {
      data: owner,
    });
    expect(registration.status()).toBe(202);

    const login = await ownerApi.post("/api/auth/login", {
      data: { email: owner.email, password: owner.password },
    });
    expect(login.ok()).toBeTruthy();
    ownerStorage = await ownerApi.storageState();
  });

  test.afterAll(async () => {
    await ownerApi?.dispose();
  });

  test.beforeEach(async ({ browser }) => {
    pageErrors = [];
    failedResponses = [];
    activeContext = await browser.newContext({ storageState: ownerStorage });
    activePage = await activeContext.newPage();
    activePage.on("pageerror", (error) => pageErrors.push(error.message));
    activePage.on("response", (response) => {
      if (response.status() >= 500) failedResponses.push(`${response.status()} ${response.url()}`);
    });
  });

  test.afterEach(async () => {
    expect(pageErrors, "Unexpected browser runtime errors").toEqual([]);
    expect(failedResponses, "Unexpected server errors").toEqual([]);
    await activeContext.close();
  });

  test("requires authentication and validates Origin and JSON input", async ({ request }) => {
    const unauthenticated = await request.get(`${apiUrl}/api/customers`);
    expect(unauthenticated.status()).toBe(401);

    const untrustedMutation = await request.post(`${apiUrl}/api/customers`, {
      data: {},
    });
    expect(untrustedMutation.status()).toBe(403);

    const malformedJson = await request.post(`${apiUrl}/api/customers`, {
      data: "{",
      headers: {
        "Content-Type": "application/json",
        Origin: frontendOrigin,
      },
    });
    expect(malformedJson.status()).toBe(400);
  });

  test("prevents a second user from reading another user's customer profile", async () => {
    const created = await ownerApi.post("/api/customers", {
      data: { name: `Private customer ${suffix}`, status: "customer" },
    });
    expect(created.ok()).toBeTruthy();
    const customer = (await created.json()).customer as { id: string };

    const otherSuffix = randomUUID().replaceAll("-", "").slice(0, 16);
    const otherPassword = `E2e!${randomUUID()}9a`;
    const other = await playwrightRequest.newContext({
      baseURL: apiUrl,
      extraHTTPHeaders: { Origin: frontendOrigin },
    });
    try {
      const registration = await other.post("/api/auth/register", {
        data: {
          name: `Other user ${otherSuffix}`,
          username: `qa${otherSuffix}`,
          email: `e2e-${otherSuffix}@example.test`,
          password: otherPassword,
        },
      });
      expect(registration.status()).toBe(202);
      const login = await other.post("/api/auth/login", {
        data: {
          email: `e2e-${otherSuffix}@example.test`,
          password: otherPassword,
        },
      });
      expect(login.ok()).toBeTruthy();

      const response = await other.get(`/api/customers/${customer.id}/profile`);
      expect(response.status()).toBe(404);
    } finally {
      await other.dispose();
    }
  });

  test("runs authenticated customer-to-revenue and operations API workflows", async () => {
    const customerResponse = await ownerApi.post("/api/customers", {
      data: { name: `Workflow customer ${suffix}`, status: "lead" },
    });
    expect(customerResponse.status()).toBe(201);
    const customer = (await customerResponse.json()).customer as { id: string };

    const qualified = await ownerApi.post(`/api/customers/${customer.id}/qualify`);
    expect(qualified.ok()).toBeTruthy();
    expect((await qualified.json()).customer.status).toBe("prospect");
    const converted = await ownerApi.post(`/api/customers/${customer.id}/convert`);
    expect(converted.ok()).toBeTruthy();
    expect((await converted.json()).customer.status).toBe("customer");

    const pipelineResponse = await ownerApi.get("/api/pipelines");
    expect(pipelineResponse.ok()).toBeTruthy();
    const pipelines = (await pipelineResponse.json()).pipelines as Array<{
      id: string;
      isDefault: boolean;
      stages: Array<{ id: string; isWon: boolean; isLost: boolean }>;
    }>;
    const pipeline = pipelines.find((item) => item.isDefault);
    expect(pipeline).toBeDefined();
    const activeStage = pipeline?.stages.find((stage) => !stage.isWon && !stage.isLost);
    const wonStage = pipeline?.stages.find((stage) => stage.isWon);
    expect(activeStage).toBeDefined();
    expect(wonStage).toBeDefined();
    const dealResponse = await ownerApi.post("/api/deals", {
      data: {
        pipelineId: pipeline?.id,
        stageId: activeStage?.id,
        customerId: customer.id,
        title: `Workflow deal ${suffix}`,
        amount: "1250.99",
        currency: "USD",
      },
    });
    expect(dealResponse.status()).toBe(201);
    const deal = (await dealResponse.json()).deal as { id: string };
    const wonDeal = await ownerApi.patch(`/api/deals/${deal.id}/stage`, {
      data: { stageId: wonStage?.id },
    });
    expect(wonDeal.ok(), await wonDeal.text()).toBeTruthy();
    expect((await wonDeal.json()).deal.status).toBe("won");

    const today = new Date().toISOString().slice(0, 10);
    const invoiceResponse = await ownerApi.post("/api/invoices", {
      data: {
        type: "invoice",
        customerId: customer.id,
        issueDate: today,
        dueDate: today,
        currency: "USD",
        taxRate: 7.5,
        items: [{ description: "Precision test item", quantity: 3, unitPrice: 0.1 }],
      },
    });
    expect(invoiceResponse.status()).toBe(201);
    const invoice = (await invoiceResponse.json()).invoice as {
      id: string;
      subtotal: string;
      taxAmount: string;
      total: string;
    };
    expect(invoice).toMatchObject({ subtotal: "0.30", taxAmount: "0.02", total: "0.32" });

    const paid = await ownerApi.patch(`/api/invoices/${invoice.id}/status`, {
      data: { status: "paid" },
    });
    expect(paid.ok()).toBeTruthy();
    const summaryResponse = await ownerApi.get("/api/invoices/summary");
    expect(summaryResponse.ok()).toBeTruthy();
    const summary = (await summaryResponse.json()).summary as Array<{
      currency: string;
      paidThisMonth: string;
    }>;
    expect(summary.find((item) => item.currency === "USD")?.paidThisMonth).toBe("0.32");

    const expenseResponse = await ownerApi.post("/api/expenses", {
      data: {
        title: `Workflow expense ${suffix}`,
        expenseDate: today,
        amount: "12.34",
        currency: "USD",
      },
    });
    expect(expenseResponse.status()).toBe(201);
    expect((await expenseResponse.json()).expense.amount).toBe("12.34");

    const taskResponse = await ownerApi.post("/api/tasks", {
      data: { title: `Workflow task ${suffix}`, customerId: customer.id },
    });
    expect(taskResponse.status()).toBe(201);
    const task = (await taskResponse.json()).task as { id: string; customerId: string };
    expect(task.customerId).toBe(customer.id);

    const start = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
    start.setUTCHours(13, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const appointmentResponse = await ownerApi.post("/api/appointments", {
      data: {
        title: `Workflow appointment ${suffix}`,
        customerId: customer.id,
        relatedTaskId: task.id,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        timezone: "UTC",
        overrideAvailability: true,
      },
    });
    expect(appointmentResponse.status()).toBe(201);
    const appointment = (await appointmentResponse.json()).appointment as {
      customerId: string;
      relatedTaskId: string;
    };
    expect(appointment).toMatchObject({ customerId: customer.id, relatedTaskId: task.id });

    for (const [path, key] of [
      ["/api/customers", "customers"],
      ["/api/invoices", "invoices"],
      ["/api/expenses", "expenses"],
      ["/api/tasks", "tasks"],
      ["/api/appointments", "appointments"],
    ] as const) {
      const response = await ownerApi.get(path);
      expect(response.ok(), `${path} should be available to the authenticated owner`).toBeTruthy();
      expect((await response.json())[key]).toBeDefined();
    }
  });

  test("registers, signs in automatically, and reaches onboarding", async () => {
    test.setTimeout(90_000);
    const account = {
      name: `Signup ${randomUUID().slice(0, 8)}`,
      username: `signup${randomUUID().replaceAll("-", "").slice(0, 12)}`,
      email: `signup-${randomUUID()}@example.test`,
      password: `E2e!${randomUUID()}9a`,
    };
    await activePage.goto("/authPages/sign-in");
    await expect(activePage.getByLabel("Email address")).toBeVisible();
    await activePage.goto("/authPages/sign-up");
    await activePage.getByLabel("Full name").fill(account.name);
    await activePage.getByLabel("Username").fill(account.username);
    await activePage.getByLabel("Email address").fill(account.email);
    await activePage.getByLabel("Password", { exact: true }).fill(account.password);
    await activePage.getByRole("checkbox").check();
    await activePage.getByRole("button", { name: "Create Account" }).click();
    await expect(activePage).toHaveURL(/\/onboarding$/);
    await expect(activePage.getByRole("heading", { name: "Welcome to your workspace" })).toBeVisible();
    await activePage.getByRole("button", { name: "Skip setup" }).click();
    await expect(activePage).toHaveURL(/\/dashboard$/);
    await expect(activePage.getByRole("heading").first()).toBeVisible();
  });

  test("creates a customer and records an interaction in Customer 360", async () => {
    const customerName = `UI Customer ${suffix}`;
    await activePage.goto("/customers");
    await expect(activePage.getByRole("heading", { name: "Customers", exact: true })).toBeVisible();
    await activePage.getByRole("button", { name: "Add customer" }).click();
    await activePage.getByPlaceholder("e.g. Maya Hassan").fill(customerName);
    await activePage.getByRole("button", { name: "Save customer" }).click();

    await activePage.getByRole("link", { name: new RegExp(customerName) }).click();
    await expect(activePage.getByRole("heading", { name: customerName })).toBeVisible();
    await activePage.getByRole("button", { name: "Notes & Files" }).click();
    await activePage.getByPlaceholder("e.g. Follow-up call").fill(`E2E activity ${suffix}`);
    await activePage.getByPlaceholder("Record the important details...").fill("Integration workflow activity.");
    await activePage.getByRole("button", { name: "Save activity" }).click();
    await expect(activePage.getByText(`E2E activity ${suffix}`)).toBeVisible();
    await activePage.goto("/dashboard");
    await expect(activePage.getByRole("link", { name: new RegExp(customerName) })).toBeVisible();
  });

  test("shows the account deletion danger zone and requires explicit confirmation", async () => {
    await activePage.goto("/settings");
    await activePage.getByRole("button", { name: "Account information" }).click();
    await expect(activePage.getByText("Danger zone")).toBeVisible();
    await activePage.getByRole("button", { name: "Delete account permanently" }).click();

    const dialog = activePage.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Confirm permanent deletion" })).toBeVisible();
    const submit = dialog.getByRole("button", { name: "Permanently delete my account" });
    await expect(submit).toBeDisabled();
    await dialog.getByLabel("Current password").fill(owner.password);
    await dialog.getByLabel(/Type DELETE to confirm/).fill("DELETE");
    await expect(submit).toBeEnabled();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toHaveCount(0);
  });
});
