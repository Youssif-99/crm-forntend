This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

[Production deployment and operations](../DEPLOYMENT.md)

## End-to-end tests

The `npm test` script runs the Playwright desktop and mobile suites. Run it only against isolated test services; see the backend testing instructions for `TEST_DATABASE_URL` and local S3 setup.

```powershell
npm run test:e2e:install
npm test
```

## Authentication deployment notes

Authentication uses the backend's HTTP-only JWT cookie; frontend code does not store bearer tokens in local storage. Deploy the API and frontend on compatible HTTPS origins, set backend `FRONTEND_ORIGIN` to the exact frontend origin, and set this app's `NEXT_PUBLIC_API_URL` to the absolute HTTPS API URL at build and runtime. The Express API validates `Origin` on every state-changing request and only allows credentialed CORS from that configured origin. Production responses enable HSTS and browser security headers.

The app's `proxy.ts` issues a fresh nonce-based Content Security Policy for each page response, and the root layout opts into dynamic rendering. Partial prerendering and cache-components are disabled because their static shells cannot receive per-request nonces; this increases server rendering work and disables default CDN caching for HTML pages.

Password recovery requires the backend's optional Resend integration. Set `RESEND_API_KEY` and a verified `EMAIL_FROM` sender in backend deployment secrets; without both, recovery requests are disabled. Verify the account email from Account Settings first; verification and password-reset links are short-lived and single-use. Registration responses intentionally do not disclose duplicate email/username conflicts and no longer create an authenticated session; users sign in after submitting the form. See the backend README for migration, rate limiting, and session revocation details.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Expense API contract

The expense workspace and dashboard use `NEXT_PUBLIC_API_URL` (fallback `http://localhost:4000`) with `credentials: "include"`. API responses and exports are authenticated; no storage URL is exposed to the browser.

- `GET /api/expenses` accepts `page`, `pageSize`, `search`, `categoryId`, `status`, `currency`, `from`, `to`, `sort`, and `direction`; it returns `{ expenses, pagination: { page, pageSize, total } }`. Supported sort values are date, amount, merchant, description, and createdAt.
- `GET /api/expenses/:id` returns `{ expense }`; `GET /api/expenses/:id/status-history` returns `{ history: [{ fromStatus, toStatus, changedAt }] }`.
- `POST /api/expenses` and `PUT /api/expenses/:id` use title, description, vendor, decimal-string `amount`, currency, categoryId, expenseDate, dueDate, paymentDate, paymentMethod, and notes. Payment method values are `cash`, `credit_card`, `debit_card`, `bank_transfer`, `check`, `digital_wallet`, and `other`. `PATCH /api/expenses/:id/status` accepts `{ status }`; `DELETE /api/expenses/:id` deletes drafts.
- Lifecycle statuses are `draft`, `pending`, `paid`, and `cancelled`. Overdue is derived for pending expenses using the backend `isOverdue` flag (or dueDate).
- `GET /api/expenses/categories` returns `{ categories }`; category create/update uses `{ name, color }`; delete uses `DELETE /api/expenses/categories/:id`. Category records may also expose an icon; seeded/default category inventory is backend-provided.
- `GET /api/expenses/recurring` returns `{ templates, recurringExpenses }`. Templates expose expense fields, cadence, nextRun, endsOn, and active. Create/update uses POST/PUT `/api/expenses/recurring`; PATCH `/api/expenses/recurring/:id` accepts `{ active }`; DELETE cancels a template. Supported cadence values are daily, weekly, biweekly, monthly, quarterly, and yearly.
- `GET /api/expenses/summary?from=&to=` returns `{ summary: [{ currency, status, count, amountCents, amount }] }`. `/api/expenses/analytics` may additionally return `byCurrency`; charts use the real summary/analytics results and selected date range. The dashboard reads this summary for paid and pending totals and the paginated pending-expense list to derive overdue totals, grouped by currency.
- CSV download uses `GET /api/expenses/export.csv` with the active expense filters (the backend also supports `/api/expenses/export`).
- Receipt upload uses multipart `PUT /api/expenses/:id/receipt` with form field `file` (PDF/JPEG/PNG/WebP, up to 10 MB). Download uses credentialed `GET /api/expenses/:id/receipt`, an authenticated proxy. No direct storage URL is exposed.
- Receipt deletion uses authenticated `DELETE /api/expenses/:id/receipt`.
- Expense overview cards use summary results for total, paid, pending, average, and count grouped by currency. Overdue amount is calculated from all pending expense pages in the selected date range using `isOverdue` or dueDate, also grouped by currency; average is each currency's summarized total divided by its summarized expense count.

## Task workspace API contract

The `/tasks`, `/tasks/board`, and `/tasks/calendar` workspaces use `NEXT_PUBLIC_API_URL` (fallback `http://localhost:4000`) with `credentials: "include"`. `GET /api/tasks` supports `q`, `status`, `priority`, `categoryId`, `tagId`, `customerId`, `invoiceId`, `dueFrom`, `dueTo`, `createdFrom`, `createdTo`, `overdue`, `recurring`, `completed`, `page`, `pageSize`, `sortBy`, and `sortOrder`, returning `{ tasks, pagination: { page, pageSize, total, totalPages } }`. Status values are `backlog`, `todo`, `in_progress`, `in_review`, `completed`, and `cancelled`; priority values are `low`, `medium`, `high`, and `urgent`.

Task create/update use `POST /api/tasks` and `PUT /api/tasks/:id`. The frontend sends `tagIds` containing IDs from `GET /api/tasks/tags` (never tag names), and sends selected start/due dates as ISO-8601 timestamps with timezone information. Backend-accepted task fields also include `assignedUserId`, `estimatedMinutes`, and `notes`; the task form does not currently edit those fields. Categories and tags are loaded from `/api/tasks/categories` and `/api/tasks/tags`. Related customer, invoice, and expense selectors are populated only from the existing `/api/customers`, `/api/invoices`, and `/api/expenses` endpoints.

The board loads `GET /api/tasks/kanban` and status changes use `PATCH /api/tasks/:id/status`; allowed state transitions are enforced by the API. Calendar uses `GET /api/tasks/calendar?from=&to=` with ISO timestamps. Analytics uses `GET /api/tasks/analytics?from=&to=` and returns `summary`, `byStatus`, `byPriority`, `byCategory`, `completedOverTime`, and `completedByCategory`. The dashboard uses status-filtered task lists for open-task totals/focus and `completedOverTime` plus the `overdue=true` list for task metrics. CSV export is `GET /api/tasks/export.csv`. Bulk actions are `status`, `archive`, `unarchive`, or `delete`.

Task subtasks use `POST /api/tasks/:id/subtasks`, `PATCH`/`DELETE /api/tasks/:id/subtasks/:subtaskId`, and `PUT /api/tasks/:id/subtasks/reorder`. Comments use `GET`/`POST /api/tasks/:id/comments`; create sends `{ body }`. Activity is included in the task detail response; the backend has no separate activity-list route. Timer controls use `/time/start`, `/time/pause`, `/time/resume`, and `/time/stop`. Manual time uses `POST /api/tasks/:id/time-entries` with timezone-bearing `startedAt` and `endedAt`; entries are listed at `GET` on the same path and edited/deleted at `PATCH`/`DELETE /api/tasks/:id/time-entries/:entryId`. Time entry records expose `durationSeconds`.
 
The Tasks workspace includes category/tag CRUD, recurrence creation/pause/resume/cancellation, custom task reminders and unread notification acknowledgment, and private attachment upload/download/deletion. Attachment operations require the backend S3-compatible storage configuration. Recurring schedules and reminders are materialized only when `npm run tasks:generate` is run by a deployment scheduler. The calendar currently provides a monthly grid; weekly, daily, and agenda views are not implemented.

## Customer 360 profile

Open a customer by selecting their name in `/customers`. The profile tabs show database-backed overview metrics, a paginated unified timeline, linked deals, invoices/quotes, tasks, appointments, and notes/files. Financial totals are kept grouped by currency; only invoices marked paid are presented as paid totals, and quotes are not treated as revenue.

The profile can edit customer details, qualify leads or convert prospects using the existing customer workflow, create a customer-linked task or deal, log a note/call/email/meeting, and upload verified private PNG/JPEG/GIF/WebP/PDF files (up to 10 MB). Customer file upload/download requires private S3-compatible storage configured for the backend. Run the additive `008_customer_360.sql` backend migration before deploying this page.

## Account settings

The `/settings` workspace loads the authenticated profile, persistent preferences, and onboarding status from the API. It supports name updates, private avatar upload/removal, saved language/theme/currency/date/time/time-zone preferences, password changes, session revocation, and logout. New invoices, expenses, and deals use the preferred currency as their initial value; changing it never converts existing records. Theme and RTL direction apply globally, while date/time formatting helpers are available for progressive adoption by the existing screens.

The persistent `/onboarding` flow resumes from backend progress on sign-in and after registration. The legacy `/authPages/userInfo-about` and `/authPages/userInfo-activity` routes redirect to it. Account APIs require the additive `009_account_saas.sql` migration and exact frontend `Origin` validation (`FRONTEND_ORIGIN`). Set `NEXT_PUBLIC_API_URL` to the backend URL and configure the backend's private S3-compatible `S3_*` variables to enable avatars. Account deletion is not available until durable external-file cleanup and retry handling exist. Existing screens are not fully translated into Arabic, and not all date/time displays yet honor saved formats/time zones.

## Appointment workspace API contract

The appointment overview (`/appointments`), calendar (`/appointments/calendar`), and dashboard appointment panels use `NEXT_PUBLIC_API_URL` (fallback `http://localhost:4000`) and send `credentials: "include"` on API requests. This frontend expects the authenticated backend appointment API; it does not include fixture or mock appointment data.

- `GET /api/appointments` accepts `search`, `status`, `typeId`, `customerId`, `from`, `to`, `locationType`, `recurring`, `completed`, `upcoming`, `page`, `pageSize`, `sortBy` (`startAt` or `createdAt`), and `sortOrder`; it returns `{ appointments, pagination: { page, pageSize, total, totalPages } }`.
- `GET /api/appointments/calendar?from=&to=` returns the appointments/events for the requested ISO date range. Calendar display modes are month, week, day, and agenda. Selecting a date opens a prefilled create form; event selection opens appointment details.
- `POST /api/appointments` and `PUT /api/appointments/:id` use `title`, `description`, `typeId`, `customerId`, `startAt`, `endAt`, `timezone`, `locationType` (`in_person`, `online`, `phone`, or `other`), `address`, `city`, `locationInstructions`, `meetingUrl`, `meetingPlatform`, `accessInstructions`, `phoneNumber`, `priority` (`low`, `medium`, `high`, or `urgent`), `relatedTaskId`, `relatedInvoiceId`, `notes`, `reminders`, and optional `recurrence`. Date/time inputs are sent as ISO timestamps. Reminders use `{ minutes }` or `{ at }`; recurrence uses `{ cadence, interval, endsOn? }` with daily, weekly, monthly, quarterly, and yearly cadence.
- `GET /api/appointments/:id` provides appointment details, including status history, customer/type, attachments, reminders, and recurrence. `GET /api/appointments/:id/activity` and `GET /api/appointments/customers/:customerId/history` supply activity and customer appointment history.
- `PATCH /api/appointments/:id/status` accepts `{ status, reason? }`; cancellation asks for a reason before submitting. `PATCH /api/appointments/:id/reschedule` accepts `{ startAt, endAt, reason? }`; the form validates that the end is after the start. `DELETE /api/appointments/:id` is confirmed before deletion. Duplicate creates a new appointment from the selected record rather than modifying the original.
- Appointment types are managed with `GET/POST /api/appointments/types`, `PUT/DELETE /api/appointments/types/:id`. The form uses `name`, `color`, `duration`, and `isDefault`; type values are loaded from the API and used in appointment selectors.
- Working availability is read/saved at `GET/PUT /api/appointments/availability` using `{ timezone, config: { week, breaks?, duration, bufferMinutes, minimumNoticeMinutes, maximumAdvanceDays } }`; `week` and `breaks` use weekday keys `0` through `6` and `HH:mm` intervals. Available times use `GET /api/appointments/availability/slots?from=&to=&duration=`.
- Analytics cards request `GET /api/appointments/analytics?from=&to=` and display returned counts/summary values. CSV export downloads the authenticated `GET /api/appointments/export.csv` response.
- Attachments use multipart `POST /api/appointments/:id/attachments` with form field `file`, credentialed `GET /api/appointments/:id/attachments/:attachmentId` for download, and `DELETE` on that same attachment route. Private storage configuration is managed by the backend.
- The dashboard independently loads today's and upcoming appointments from the list endpoint and reports appointment-load errors within those widgets so failures do not block other dashboard data.

Calendar drag-and-drop is intentionally not implemented: appointments are rescheduled only through the explicit reschedule form, which submits to the reschedule API and reports failures. The appointment backend is included in the companion API project; deploy its `006_appointments.sql` migration before enabling these screens, and configure the shared private object storage settings before using attachments.

## Sales workspace API contract

The `/sales` workspace uses `NEXT_PUBLIC_API_URL` (fallback `http://localhost:4000`) with credentialed requests. Apply the backend `007_sales.sql` migration before using it. The module uses the existing single-user workspace and customer records; there is no separate Lead table or customer duplication during qualification/conversion.

- Pipelines and stages: `/api/pipelines`, `/api/pipelines/:id`, `/api/pipelines/:id/stages`, and `/api/pipelines/:id/stages/reorder`.
- Deals: `/api/deals`, `/api/deals/:id`, `/api/deals/:id/stage`, and `/api/deals/:id/close`.
- Database-aggregated sales analytics: `/api/sales/analytics?pipelineId=`.
- Lead qualification/conversion update existing customer rows through `/api/customers/:id/qualify` and `/api/customers/:id/convert`.

Pipeline deal values are sent as decimal strings and stored as integer cents. Analytics are grouped by currency. Dragging a deal to a stage persists through the API and rolls back the optimistic board update if the request fails. Expected-close, priority, stage, value, and text filters are applied by the backend.
