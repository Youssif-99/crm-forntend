"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type DashboardUser = {
  id: string;
  name: string;
  username: string;
  email: string;
};

type DashboardWorkspace = { name: string; businessName: string | null; industry: string | null; country: string | null };
type DashboardCustomer = { id: string; name: string; company?: string | null; status: string };
type CustomerList = { customers?: DashboardCustomer[] };
type InvoiceSummary = { currency: "EGP" | "USD" | "EUR"; paidThisMonth: string; outstanding: string };
type ExpenseSummaryRow = { currency: "EGP" | "USD" | "EUR"; status: "draft" | "pending" | "paid" | "cancelled"; amount?: number | string; amountCents?: string; count?: number };
type PendingExpense = { currency: "EGP" | "USD" | "EUR"; amount?: number | string; amountCents?: string; dueDate?: string | null; isOverdue?: boolean };
type DashboardTask = { id: string; title: string; status: string; priority?: string; dueDate?: string | null };
type DashboardAppointment = { id: string; title: string; startAt: string; endAt?: string; status?: string; customer?: { name?: string } | null; customerName?: string; type?: { name?: string } | null };
type AppointmentList = { appointments?: DashboardAppointment[]; pagination?: { total?: number } };
type TaskMetrics = { open: number; completed: number | null; overdue: number | null };

type IconName = "dashboard" | "customers" | "invoices" | "expenses" | "tasks" | "appointments" | "settings" | "search" | "bell" | "arrow" | "plus" | "logout" | "refresh";

const navigation: { name: string; icon: IconName; href?: string; current?: boolean }[] = [
  { name: "Dashboard", icon: "dashboard", href: "/dashboard", current: true },
  { name: "Customers", icon: "customers", href: "/customers" },
  { name: "Sales", icon: "invoices", href: "/sales" },
  { name: "Invoices", icon: "invoices", href: "/invoices" },
  { name: "Expenses", icon: "expenses", href: "/expenses" },
  { name: "Tasks", href: "/tasks", icon: "tasks" },
  { name: "Appointments", icon: "appointments", href: "/appointments" },
  { name: "Settings", icon: "settings", href: "/settings" },
];

function Icon({ name, className = "h-[18px] w-[18px]" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    dashboard: <><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="5" rx="1.5" /><rect x="13" y="10" width="8" height="11" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /></>,
    customers: <><circle cx="9" cy="8" r="3.5" /><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5.5a3.5 3.5 0 0 1 0 6.8M18 14a5 5 0 0 1 3 4.5V20" /></>,
    invoices: <><path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>,
    expenses: <><path d="M12 2v20M17 6.5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>,
    tasks: <><path d="m4 7 1.5 1.5L8 6M11 7h9M4 13l1.5 1.5L8 12M11 13h9M4 19l1.5 1.5L8 18M11 19h9" /></>,
    appointments: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18M8 14h3M8 17h6" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.8l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.5-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.5.9l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1-.1 1.7Z" /></>,
    search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.6 9a7 7 0 0 1 11.6-2L20 12M4 12l2.8 5a7 7 0 0 0 11.6-2" /></>,
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {paths[name]}
    </svg>
  );
}

function BrandMark({ small = false }: { small?: boolean }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-xl bg-[#172b55] font-bold text-white ${small ? "h-8 w-8 text-xs" : "h-9 w-9 text-sm"}`}>
      B
    </span>
  );
}

function MetricCard({ label, value = "—", icon, tint, detail }: { label: string; value?: string; icon: IconName; tint: string; detail: string }) {
  return (
    <article className="workspace-metric-card rounded-2xl border border-[#e9edf2] bg-white p-5 shadow-[0_1px_2px_rgba(27,39,62,0.02)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-[#788397]">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tint}`}>
          <Icon name={icon} className="h-[17px] w-[17px]" />
        </span>
      </div>
      <p className="mt-5 text-[30px] font-semibold leading-none tracking-[-0.06em] text-[#202d45]">{value}</p>
      <p className="mt-2 text-[11px] text-[#98a1af]">{detail}</p>
    </article>
  );
}

function EmptyPanel({ icon, title, description }: { icon: IconName; title: string; description: string }) {
  return (
    <div className="flex min-h-[205px] flex-col items-center justify-center px-5 py-8 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f2f4fa] text-[#7182c7]">
        <Icon name={icon} className="h-[18px] w-[18px]" />
      </span>
      <h3 className="mt-3 text-[13px] font-semibold text-[#46536a]">{title}</h3>
      <p className="mt-1.5 max-w-xs text-[11px] leading-5 text-[#929bab]">{description}</p>
    </div>
  );
}

function expenseAmount(row: { amount?: number | string; amountCents?: string }) {
  if (row.amount !== undefined && row.amount !== null) return Number(row.amount) || 0;
  const cents = Number(row.amountCents);
  return Number.isSafeInteger(cents) ? cents / 100 : 0;
}

function groupedCurrencyAmounts(rows: { currency: "EGP" | "USD" | "EUR"; amount?: number | string; amountCents?: string }[]) {
  const totals = new Map<string, number>();
  for (const row of rows) totals.set(row.currency, (totals.get(row.currency) ?? 0) + expenseAmount(row));
  if (!totals.size) return "EGP 0";
  return Array.from(totals, ([currency, amount]) =>
    new Intl.NumberFormat("en-EG", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount),
  ).join(" · ");
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [workspace, setWorkspace] = useState<DashboardWorkspace | null>(null);
  const [customerCount, setCustomerCount] = useState<number | null>(null);
  const [recentCustomers, setRecentCustomers] = useState<DashboardCustomer[]>([]);
  const [invoiceSummary, setInvoiceSummary] = useState<InvoiceSummary[]>([]);
  const [expenseSummary, setExpenseSummary] = useState<ExpenseSummaryRow[] | null>(null);
  const [overdueExpenses, setOverdueExpenses] = useState<PendingExpense[] | null>(null);
  const [expenseError, setExpenseError] = useState("");
  const [taskMetrics, setTaskMetrics] = useState<TaskMetrics | null>(null);
  const [focusTasks, setFocusTasks] = useState<DashboardTask[]>([]);
  const [taskError, setTaskError] = useState("");
  const [taskAnalyticsError, setTaskAnalyticsError] = useState("");
  const [appointmentsToday, setAppointmentsToday] = useState<DashboardAppointment[]>([]);
  const [appointmentsTodayCount, setAppointmentsTodayCount] = useState<number | null>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<DashboardAppointment[]>([]);
  const [upcomingAppointmentCount, setUpcomingAppointmentCount] = useState<number | null>(null);
  const [appointmentError, setAppointmentError] = useState("");
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const apiUrl = "";
    const now = new Date();
    const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999);
    const query = (values: Record<string, string>) => new URLSearchParams(values).toString();
    const loadAppointmentList = async (params: string) => {
      const response = await fetch(`${apiUrl}/api/appointments?${params}`, { credentials: "include", signal: controller.signal });
      if (!response.ok) throw new Error(response.status === 401 ? "Your session has expired." : "Appointment schedule is unavailable.");
      const result: AppointmentList = await response.json();
      if (!Array.isArray(result.appointments)) throw new Error("Appointment schedule response is invalid.");
      return result;
    };
    async function loadAppointments() {
      setAppointmentsLoading(true);
      setAppointmentError("");
      const [todayResult, upcomingResult] = await Promise.allSettled([
        loadAppointmentList(query({ from: dayStart.toISOString(), to: dayEnd.toISOString(), page: "1", pageSize: "100", sortBy: "startAt", sortOrder: "asc" })),
        loadAppointmentList(query({ from: now.toISOString(), upcoming: "true", page: "1", pageSize: "5", sortBy: "startAt", sortOrder: "asc" })),
      ]);
      if (controller.signal.aborted) return;
      const errors: string[] = [];
      if (todayResult.status === "fulfilled") {
        setAppointmentsToday(todayResult.value.appointments ?? []);
        setAppointmentsTodayCount(Number(todayResult.value.pagination?.total ?? todayResult.value.appointments?.length ?? 0));
      } else { setAppointmentsToday([]); setAppointmentsTodayCount(null); errors.push(todayResult.reason instanceof Error ? todayResult.reason.message : "Today's appointments are unavailable."); }
      if (upcomingResult.status === "fulfilled") {
        setUpcomingAppointments(upcomingResult.value.appointments ?? []);
        setUpcomingAppointmentCount(Number(upcomingResult.value.pagination?.total ?? upcomingResult.value.appointments?.length ?? 0));
      } else {
        setUpcomingAppointments([]); setUpcomingAppointmentCount(null);
        errors.push(upcomingResult.reason instanceof Error ? upcomingResult.reason.message : "Upcoming appointments are unavailable.");
      }
      setAppointmentError(errors.join(" "));
      setAppointmentsLoading(false);
    }
    void loadAppointments();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadUser() {
      setLoading(true);
      setLoadError("");
      try {
        const response = await fetch(
          `/api/auth/me`,
          { credentials: "include", signal: controller.signal },
        );
        if (response.status === 401) {
          router.replace("/authPages/sign-in");
          return;
        }
        if (!response.ok) {
          throw new Error("We couldn't load your account. Please try again.");
        }

        const result: { user?: DashboardUser } = await response.json();
        if (!result.user?.name || !result.user.email) {
          throw new Error("Your account details couldn't be loaded. Please sign in again.");
        }
        const workspaceResponse = await fetch(
          `/api/account/workspace`,
          { credentials: "include", signal: controller.signal },
        );
        if (workspaceResponse.status === 401) {
          router.replace("/authPages/sign-in");
          return;
        }
        if (!workspaceResponse.ok) {
          throw new Error("We couldn't load your workspace profile. Please try again.");
        }
        const workspaceResult: { workspace?: DashboardWorkspace } = await workspaceResponse.json();
        if (!workspaceResult.workspace?.name) {
          throw new Error("Your workspace profile couldn't be loaded. Please try again.");
        }
        const customersResponse = await fetch(
          `/api/customers`,
          { credentials: "include", signal: controller.signal },
        );
        if (customersResponse.status === 401) {
          router.replace("/authPages/sign-in");
          return;
        }
        if (!customersResponse.ok) {
          throw new Error("We couldn't load your customer summary. Please try again.");
        }
        const customerResult: CustomerList = await customersResponse.json();
        if (!Array.isArray(customerResult.customers)) {
          throw new Error("Your customer summary couldn't be loaded. Please try again.");
        }
        const invoiceResponse = await fetch(
          `/api/invoices/summary`,
          { credentials: "include", signal: controller.signal },
        );
        if (invoiceResponse.status === 401) {
          router.replace("/authPages/sign-in");
          return;
        }
        if (!invoiceResponse.ok) {
          throw new Error("We couldn't load your sales summary. Please try again.");
        }
        const invoiceResult: { summary?: InvoiceSummary[] } = await invoiceResponse.json();
        if (!Array.isArray(invoiceResult.summary)) {
          throw new Error("Your sales summary couldn't be loaded. Please try again.");
        }
        try {
          setTaskError("");
          const apiUrl = "";
          const statuses = ["backlog", "todo", "in_progress", "in_review"];
          const taskResults = await Promise.all(statuses.map(async (status) => {
            const params = new URLSearchParams({ status, page: "1", pageSize: "100", sortBy: "dueDate", sortOrder: "asc" });
            const response = await fetch(`${apiUrl}/api/tasks?${params}`, { credentials: "include", signal: controller.signal });
            if (response.status === 401) {
              router.replace("/authPages/sign-in");
              throw new Error("Your session has expired.");
            }
            if (!response.ok) throw new Error("Task list is unavailable.");
            return response.json() as Promise<{ tasks?: DashboardTask[]; pagination?: { total?: number } }>;
          }));
          const allFocusTasks = taskResults.flatMap((result) => Array.isArray(result.tasks) ? result.tasks : []);
          const openTotal = taskResults.reduce((sum, result) => sum + Number(result.pagination?.total ?? result.tasks?.length ?? 0), 0);
          setTaskMetrics({ open: openTotal, completed: null, overdue: null });
          setFocusTasks(allFocusTasks.filter((task) => task.status !== "cancelled").sort((left, right) => {
            if (!left.dueDate) return right.dueDate ? 1 : 0;
            if (!right.dueDate) return -1;
            return left.dueDate.localeCompare(right.dueDate);
          }).slice(0, 5));
          try {
            setTaskAnalyticsError("");
            const today = new Date();
            const analyticsParams = new URLSearchParams({
              from: `${today.getFullYear()}-01-01`,
              to: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`,
            });
            const analyticsResponse = await fetch(`${apiUrl}/api/tasks/analytics?${analyticsParams}`, { credentials: "include", signal: controller.signal });
            if (analyticsResponse.status === 401) {
              router.replace("/authPages/sign-in");
              throw new Error("Your session has expired.");
            }
            if (!analyticsResponse.ok) throw new Error("Task analytics are unavailable.");
            const analytics: { completedOverTime?: { count?: number }[] } = await analyticsResponse.json();
            const overdueParams = new URLSearchParams({ overdue: "true", page: "1", pageSize: "1" });
            const overdueResponse = await fetch(`${apiUrl}/api/tasks?${overdueParams}`, { credentials: "include", signal: controller.signal });
            if (overdueResponse.status === 401) {
              router.replace("/authPages/sign-in");
              throw new Error("Your session has expired.");
            }
            if (!overdueResponse.ok) throw new Error("Overdue task totals are unavailable.");
            const overdueResult: { pagination?: { total?: number }; tasks?: DashboardTask[] } = await overdueResponse.json();
            const completedYearToDate = (analytics.completedOverTime ?? []).reduce((sum, item) => sum + Number(item.count ?? 0), 0);
            setTaskMetrics({
              open: openTotal,
              completed: completedYearToDate,
              overdue: Number(overdueResult.pagination?.total ?? overdueResult.tasks?.length ?? 0),
            });
          } catch (error) {
            if (controller.signal.aborted) return;
            setTaskAnalyticsError(error instanceof Error ? error.message : "Task analytics are unavailable.");
          }
        } catch (error) {
          if (controller.signal.aborted) return;
          setTaskMetrics(null);
          setFocusTasks([]);
          setTaskError(error instanceof Error ? error.message : "Task information is unavailable.");
        }
        setExpenseError("");
        const apiUrl = "";
        try {
          const expenseSummaryResponse = await fetch(`${apiUrl}/api/expenses/summary`, {
            credentials: "include",
            signal: controller.signal,
          });
          if (expenseSummaryResponse.status === 401) {
            router.replace("/authPages/sign-in");
            return;
          }
          if (!expenseSummaryResponse.ok) throw new Error("Expense summary is unavailable.");
          const expenseSummaryResult: { summary?: ExpenseSummaryRow[] } = await expenseSummaryResponse.json();
          if (!Array.isArray(expenseSummaryResult.summary)) throw new Error("Expense summary response is invalid.");
          setExpenseSummary(expenseSummaryResult.summary);
        } catch (error) {
          if (controller.signal.aborted) return;
          setExpenseSummary(null);
          setExpenseError(error instanceof Error ? error.message : "Expense summary is unavailable.");
        }
        try {
          const pendingUrl = new URL("/api/expenses", window.location.origin);
          pendingUrl.searchParams.set("status", "pending");
          pendingUrl.searchParams.set("page", "1");
          pendingUrl.searchParams.set("pageSize", "100");
          const pendingResponse = await fetch(pendingUrl, { credentials: "include", signal: controller.signal });
          if (pendingResponse.status === 401) {
            router.replace("/authPages/sign-in");
            return;
          }
          if (!pendingResponse.ok) throw new Error("Overdue expense information is unavailable.");
          const firstPage: { expenses?: PendingExpense[]; pagination?: { total?: number; pageSize?: number } } = await pendingResponse.json();
          if (!Array.isArray(firstPage.expenses)) throw new Error("Expense list response is invalid.");
          const pageSize = firstPage.pagination?.pageSize ?? 100;
          const pageCount = Math.ceil((firstPage.pagination?.total ?? firstPage.expenses.length) / pageSize);
          const remainingPages = await Promise.all(Array.from({ length: Math.max(0, pageCount - 1) }, async (_, index) => {
            const pageUrl = new URL(pendingUrl);
            pageUrl.searchParams.set("page", String(index + 2));
            const response = await fetch(pageUrl, { credentials: "include", signal: controller.signal });
            if (!response.ok) throw new Error("Overdue expense information is unavailable.");
            const result: { expenses?: PendingExpense[] } = await response.json();
            if (!Array.isArray(result.expenses)) throw new Error("Expense list response is invalid.");
            return result.expenses;
          }));
          setOverdueExpenses([...firstPage.expenses, ...remainingPages.flat()].filter((expense) =>
            expense.isOverdue ?? Boolean(expense.dueDate && expense.dueDate.slice(0, 10) < new Date().toISOString().slice(0, 10)),
          ));
        } catch (error) {
          if (controller.signal.aborted) return;
          setOverdueExpenses(null);
          setExpenseError((current) => current || (error instanceof Error ? error.message : "Overdue expense information is unavailable."));
        }
        setUser(result.user);
        setWorkspace(workspaceResult.workspace);
        setCustomerCount(customerResult.customers.length);
        setRecentCustomers(customerResult.customers.slice(0, 5));
        setInvoiceSummary(invoiceResult.summary);
      } catch (error) {
        if (controller.signal.aborted) return;
        setLoadError(error instanceof Error ? error.message : "We couldn't connect to your account.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadUser();
    return () => controller.abort();
  }, [retryCount, router]);

  async function signOut() {
    setLoggingOut(true);
    setLogoutError("");
    try {
      const response = await fetch(
        `/api/auth/logout`,
        { method: "POST", credentials: "include" },
      );
      if (!response.ok) {
        throw new Error("We couldn't sign you out. Please try again.");
      }
      router.replace("/authPages/sign-in");
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "We couldn't connect to your account.");
      setLoggingOut(false);
    }
  }

  const initials = user?.name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase() ?? "";
  const firstName = user?.name.trim().split(/\s+/)[0] ?? "";
  const paidThisMonth = invoiceSummary.length === 0
    ? "EGP 0"
    : invoiceSummary.length === 1
      ? new Intl.NumberFormat("en-EG", { style: "currency", currency: invoiceSummary[0].currency, maximumFractionDigits: 2 }).format(Number(invoiceSummary[0].paidThisMonth))
      : "Multiple";
  const salesNote = invoiceSummary.length <= 1
    ? `Outstanding: ${new Intl.NumberFormat("en-EG", { style: "currency", currency: invoiceSummary[0]?.currency ?? "EGP", maximumFractionDigits: 2 }).format(Number(invoiceSummary[0]?.outstanding ?? 0))}`
    : invoiceSummary.map((summary) => `${summary.currency} ${Number(summary.paidThisMonth).toLocaleString("en-EG")} paid`).join(" · ");
  const paidExpenseRows = expenseSummary?.filter((row) => row.status === "paid") ?? [];
  const pendingExpenseRows = expenseSummary?.filter((row) => row.status === "pending") ?? [];
  const overdueExpenseValue = overdueExpenses?.length
    ? groupedCurrencyAmounts(overdueExpenses)
    : overdueExpenses ? "EGP 0" : "—";

  if (loading) {
    return (
      <main className="crm-workspace flex min-h-screen items-center justify-center bg-[#f7f8fa]">
        <div className="flex items-center gap-3 text-sm text-[#738097]" role="status">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#dce2f0] border-t-[#6278cf]" />
          Loading your workspace...
        </div>
      </main>
    );
  }

  if (loadError || !user || !workspace) {
    return (
      <main className="crm-workspace flex min-h-screen items-center justify-center bg-[#f7f8fa] px-5">
        <section className="w-full max-w-md rounded-2xl border border-[#e8ebf0] bg-white p-8 text-center shadow-sm">
          <BrandMark />
          <h1 className="mt-5 text-xl font-semibold text-[#25324a]">We couldn&apos;t open your workspace</h1>
          <p role="alert" className="mt-2 text-sm leading-6 text-[#788397]">{loadError || "Your account details couldn't be loaded."}</p>
          <button onClick={() => setRetryCount((count) => count + 1)} className="mt-6 rounded-lg bg-[#172b55] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#243c70]">
            Try again
          </button>
          <Link href="/authPages/sign-in" className="ml-3 text-sm font-semibold text-[#6377c8] hover:text-[#4057b1]">
            Sign in
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="crm-workspace min-h-screen bg-[#f7f8fa] text-[#26334b]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[242px] shrink-0 flex-col border-r border-[#e9ecf1] bg-white px-4 py-5 lg:flex">
          <Link href="/dashboard" className="mb-9 flex items-center gap-2.5 px-2" aria-label="BusinessOS dashboard">
            <BrandMark />
            <span className="text-[16px] font-semibold tracking-[-0.04em] text-[#24324b]">
              Business<span className="text-[#6278cf]">OS</span>
            </span>
          </Link>

          <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.12em] text-[#a2aab8]">WORKSPACE</p>
          <nav aria-label="Workspace navigation" className="space-y-1">
            {navigation.map((item) => item.href ? (
              <Link key={item.name} href={item.href} aria-current={item.current ? "page" : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition ${item.current ? "bg-[#eff1fa] text-[#566bbd]" : "text-[#737f92] hover:bg-[#f7f8fa] hover:text-[#36435b]"}`}>
                <Icon name={item.icon} className="h-[17px] w-[17px]" /><span>{item.name}</span>
              </Link>
            ) : (
              <span key={item.name} aria-disabled="true" title="Coming soon" className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-[#a6adba]">
                <Icon name={item.icon} className="h-[17px] w-[17px]" /><span className="flex-1">{item.name}</span><span className="text-[9px] font-medium text-[#b3bac5]">SOON</span>
              </span>
            ))}
          </nav>

          <div className="mt-auto">
            <div className="mb-4 rounded-xl border border-[#edf0f4] bg-[#fbfcfd] p-3.5">
              <p className="truncate text-xs font-semibold text-[#46536a]">{workspace.name}</p>
              <p className="mt-1 text-[11px] leading-5 text-[#8a95a6]">{workspace.industry || "Private to your account"} · Start adding your business records.</p>
              <Link href="/settings" className="mt-2 inline-flex text-[10px] font-semibold text-[#6478ce] hover:text-[#4057b1]">Manage workspace</Link>
            </div>
            <button onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} className="flex w-full items-center gap-3 rounded-xl border-t border-[#eef0f4] px-2 pt-4 text-left">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8ebf8] text-xs font-semibold text-[#596cb9]">{initials}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-[#344159]">{user.name}</span>
                <span className="block truncate text-[10px] text-[#929bab]">{user.email}</span>
              </span>
              <span className="text-[15px] text-[#8b95a5]" aria-hidden="true">···</span>
            </button>
            {menuOpen && (
              <button onClick={signOut} disabled={loggingOut} className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[#69758a] hover:bg-[#f6f7f9] disabled:opacity-50">
                <Icon name="logout" className="h-4 w-4" /> {loggingOut ? "Signing out..." : "Sign out"}
              </button>
            )}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-[#e9ecf1] bg-white/95 px-4 backdrop-blur sm:px-7 lg:px-9">
            <div className="flex items-center gap-3">
              <span className="lg:hidden"><BrandMark small /></span>
              <span className="hidden max-w-[220px] truncate text-[13px] font-medium text-[#99a2b0] sm:inline">{workspace.name}</span>
              <span className="hidden text-[#c0c6d0] sm:inline">/</span>
              <span className="text-[13px] font-semibold text-[#46536a]">Dashboard</span>
            </div>
            <div className="flex items-center gap-2.5 sm:gap-4">
              <span className="hidden items-center gap-2 text-[11px] text-[#929bab] md:flex">
                <Icon name="search" className="h-4 w-4" /> Search will be available with your records
              </span>
              <span aria-label="Notifications will be available soon" title="Notifications will be available soon" className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[#e9ecf1] text-[#a2aab7]">
                <Icon name="bell" className="h-[17px] w-[17px]" />
              </span>
              <button onClick={() => setMenuOpen((open) => !open)} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8ebf8] text-[10px] font-semibold text-[#596cb9] lg:hidden" aria-label="Account menu" aria-expanded={menuOpen}>
                {initials}
              </button>
              {menuOpen && (
                <button onClick={signOut} disabled={loggingOut} className="text-xs font-semibold text-[#69758a] hover:text-[#33415b] lg:hidden">
                  {loggingOut ? "Signing out..." : "Sign out"}
                </button>
              )}
            </div>
          </header>

          <nav aria-label="Workspace navigation" className="flex gap-1 overflow-x-auto border-b border-[#e9ecf1] bg-white px-3 py-2 lg:hidden">
            {navigation.map((item) => item.href ? (
              <Link key={item.name} href={item.href} aria-current={item.current ? "page" : undefined} className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-medium ${item.current ? "bg-[#eff1fa] text-[#566bbd]" : "text-[#737f92] hover:bg-[#f7f8fa]"}`}>
                {item.name}
              </Link>
            ) : (
              <span key={item.name} aria-disabled="true" title="Coming soon" className="shrink-0 cursor-not-allowed rounded-lg px-3 py-2 text-[11px] font-medium text-[#a6adba]">{item.name}</span>
            ))}
          </nav>

          <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-7 sm:py-9 lg:px-9">
            {logoutError && (
              <p role="alert" className="mb-4 rounded-xl border border-[#f0d7d4] bg-[#fff7f6] px-4 py-3 text-xs text-[#9b514b]">
                {logoutError}
              </p>
            )}
            <section className="workspace-hero mb-7 flex flex-col justify-between gap-5 rounded-2xl border border-[#e8ebf4] bg-white p-5 sm:flex-row sm:items-center sm:p-7">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#929bab]">YOUR PRIVATE WORKSPACE</p>
                <h1 className="mt-2 text-[25px] font-semibold tracking-[-0.055em] text-[#202d45] sm:text-[30px]">
                  {workspace.name} <span className="text-sky-500" aria-hidden="true">✦</span>
                </h1>
                <p className="mt-1.5 text-[13px] text-[#8490a2]">Good morning, {firstName}. {workspace.industry ? `${workspace.industry}${workspace.country ? ` · ${workspace.country}` : ""} · ` : ""}Your records are private to your account.</p>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200/70 bg-white/70 px-3 py-2 text-[11px] font-semibold text-[#527c69] shadow-sm backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.14)]" />
                Personal workspace
              </span>
            </section>

            <section aria-label="Business summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Total customers" value={customerCount?.toLocaleString() ?? "—"} icon="customers" tint="bg-[#eef1fb] text-[#6679cb]" detail="Saved in your customer list" />
              <MetricCard label="Sales collected this month" value={paidThisMonth} icon="invoices" tint="bg-[#edf5f0] text-[#5a9978]" detail={salesNote} />
              <MetricCard label="Paid expenses" value={expenseSummary ? groupedCurrencyAmounts(paidExpenseRows) : "—"} icon="expenses" tint="bg-[#f1edf9] text-[#8b70bc]" detail={expenseError || "All-time paid expenses, grouped by currency"} />
              <MetricCard label="Pending expenses" value={expenseSummary ? groupedCurrencyAmounts(pendingExpenseRows) : "—"} icon="expenses" tint="bg-[#fbf2e8] text-[#bd8b4e]" detail={expenseError || "All-time pending expenses, grouped by currency"} />
              <MetricCard label="Overdue expenses" value={overdueExpenseValue} icon="expenses" tint="bg-[#fff0ee] text-[#ae554c]" detail={expenseError || (overdueExpenses ? `${overdueExpenses.length} overdue · grouped by currency` : "Loading overdue expenses…")} />
              <MetricCard label="Appointments today" value={appointmentsTodayCount?.toLocaleString() ?? "—"} icon="appointments" tint="bg-[#f1edf9] text-[#8b70bc]" detail={appointmentError || (appointmentsLoading ? "Loading today's schedule…" : "Scheduled for today")} />
              <MetricCard label="Upcoming appointments" value={upcomingAppointmentCount?.toLocaleString() ?? "—"} icon="appointments" tint="bg-[#f1edf9] text-[#8b70bc]" detail={appointmentError || "All upcoming appointments"} />
              <MetricCard label="Open tasks" value={taskMetrics?.open.toLocaleString() ?? "—"} icon="tasks" tint="bg-[#fbf2e8] text-[#bd8b4e]" detail={taskError || "Backlog and active tasks"} />
              <MetricCard label="Tasks completed" value={taskMetrics?.completed?.toLocaleString() ?? "—"} icon="tasks" tint="bg-[#edf5f0] text-[#5b9275]" detail={taskAnalyticsError || "Completed year to date"} />
              <MetricCard label="Overdue tasks" value={taskMetrics?.overdue?.toLocaleString() ?? "—"} icon="tasks" tint="bg-[#fff0ee] text-[#ae554c]" detail={taskAnalyticsError || "Open tasks past their due date"} />
            </section>

            <section className="mt-4 rounded-2xl border border-[#e9edf2] bg-white">
              <div className="flex flex-col gap-3 border-b border-[#f0f2f5] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-[13px] font-semibold text-[#35415a]">Getting started</h2>
                  <p className="mt-1 text-[11px] text-[#98a1af]">A clear view of your business begins with your first records.</p>
                </div>
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#f4f5f8] px-2.5 py-1 text-[10px] font-medium text-[#7b8698]">
                  <Icon name="refresh" className="h-3.5 w-3.5" /> {workspace.businessName ? "Business profile set" : "Personal workspace"}
                </span>
              </div>
              <div className="grid md:grid-cols-3">
                {[
                  { icon: "customers" as const, title: "Build your customer list", description: "Keep names, contact details, and follow-ups together in one place." },
                  { icon: "invoices" as const, title: "Track your finances", description: "Create invoices and record expenses to understand your cash flow.", href: "/expenses" },
                  { icon: "appointments" as const, title: "Plan the work ahead", description: "Organize appointments and follow-ups so nothing slips through the cracks.", href: "/appointments" },
                ].map((step, index) => (
                  <article key={step.title} className={`p-5 ${index > 0 ? "border-t border-[#f0f2f5] md:border-l md:border-t-0" : ""}`}>
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f2f4fa] text-[#7182c7]">
                      <Icon name={step.icon} className="h-[17px] w-[17px]" />
                    </span>
                    <h3 className="mt-4 text-[12px] font-semibold text-[#46536a]">{step.title}</h3>
                    <p className="mt-1.5 text-[11px] leading-5 text-[#929bab]">{step.description}</p>
                    {step.href ? <Link href={step.href} className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-[#6478ce] hover:text-[#4057b1]">{step.href === "/tasks" ? "Open tasks" : step.href === "/appointments" ? "Open appointments" : "Open expenses"} <Icon name="arrow" className="h-3 w-3" /></Link> : <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-medium text-[#9ba4b1]">Coming soon</span>}
                  </article>
                ))}
              </div>
            </section>

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <section className="rounded-2xl border border-[#e9edf2] bg-white">
                <div className="border-b border-[#f0f2f5] px-5 py-4">
                  <h2 className="text-[13px] font-semibold text-[#35415a]">Upcoming appointments</h2>
                  <p className="mt-1 text-[11px] text-[#98a1af]">Your next meetings and bookings</p>
                </div>
                <div className="p-5">
                  {appointmentError && <p role="alert" className="mb-3 rounded-lg bg-[#fff7f6] p-3 text-xs text-[#9b514b]">{appointmentError} <Link href="/appointments" className="underline">Open appointments</Link></p>}
                  {appointmentsLoading ? <p role="status" className="py-5 text-center text-xs text-[#8993a3]">Loading your schedule…</p> : (
                    <>
                      <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#8993a3]">Today</h3>
                      {appointmentsToday.length ? <ul className="divide-y divide-[#f0f2f5]">{appointmentsToday.slice(0, 3).map((appointment) => <li key={`today-${appointment.id}`}><Link href="/appointments" className="flex items-center justify-between gap-3 py-2.5"><span className="min-w-0"><span className="block truncate text-xs font-semibold text-[#46536a]">{appointment.title}</span><span className="mt-1 block truncate text-[10px] text-[#929bab]">{appointment.customer?.name ?? appointment.customerName ?? appointment.type?.name ?? "Appointment"}</span></span><span className="shrink-0 text-[10px] text-[#7d899d]">{new Date(appointment.startAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span></Link></li>)}</ul> : <p className="py-3 text-xs text-[#8993a3]">No appointments scheduled for today.</p>}
                      <h3 className="mb-1 mt-4 border-t border-[#f0f2f5] pt-4 text-[11px] font-semibold uppercase tracking-wide text-[#8993a3]">Coming up</h3>
                      {upcomingAppointments.length ? <ul className="divide-y divide-[#f0f2f5]">{upcomingAppointments.slice(0, 4).map((appointment) => <li key={`upcoming-${appointment.id}`}><Link href="/appointments" className="flex items-center justify-between gap-3 py-2.5"><span className="min-w-0"><span className="block truncate text-xs font-semibold text-[#46536a]">{appointment.title}</span><span className="mt-1 block truncate text-[10px] text-[#929bab]">{appointment.customer?.name ?? appointment.customerName ?? appointment.type?.name ?? "Appointment"}</span></span><span className="shrink-0 text-[10px] text-[#7d899d]">{new Date(appointment.startAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {new Date(appointment.startAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span></Link></li>)}</ul> : <p className="py-3 text-xs text-[#8993a3]">No upcoming appointments.</p>}
                    </>
                  )}
                  <Link href="/appointments" className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-[#6478ce] hover:text-[#4057b1]">View calendar <Icon name="arrow" className="h-3 w-3" /></Link>
                </div>
              </section>
              <section className="rounded-2xl border border-[#e9edf2] bg-white">
                <div className="border-b border-[#f0f2f5] px-5 py-4">
                  <h2 className="text-[13px] font-semibold text-[#35415a]">Tasks to focus on</h2>
                  <p className="mt-1 text-[11px] text-[#98a1af]">Your priorities for today</p>
                </div>
                <div className="p-5">
                  {taskError ? <p role="alert" className="rounded-lg bg-[#fff7f6] p-3 text-xs text-[#9b514b]">{taskError}</p> : focusTasks.length ? <ul className="divide-y divide-[#f0f2f5]">{focusTasks.map((task) => <li key={task.id}><Link href="/tasks" className="flex items-center justify-between gap-3 py-3"><span className="min-w-0"><span className="block truncate text-xs font-semibold text-[#46536a]">{task.title}</span><span className="mt-1 block text-[10px] text-[#929bab]">{task.status.replace(/_/g, " ")} · {task.priority ?? "No priority"}</span></span><span className="shrink-0 text-[10px] text-[#7d899d]">{task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "No due date"}</span></Link></li>)}</ul> : <EmptyPanel icon="tasks" title="Nothing on your list" description="No open tasks to focus on. Create a task to get started." />}
                  <Link href="/tasks" className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-[#6478ce] hover:text-[#4057b1]">View all tasks <Icon name="arrow" className="h-3 w-3" /></Link>
                </div>
              </section>
            </div>

            <section className="mt-4 rounded-2xl border border-[#e9edf2] bg-white">
              <div className="flex items-center justify-between border-b border-[#f0f2f5] px-5 py-4">
                <div>
                  <h2 className="text-[13px] font-semibold text-[#35415a]">Recent customers</h2>
                  <p className="mt-1 text-[11px] text-[#98a1af]">Your latest customer relationships</p>
                </div>
                <Link href="/customers" className="text-[10px] font-semibold text-[#6478ce] hover:text-[#4057b1]">View all customers</Link>
              </div>
              {recentCustomers.length ? (
                <div className="p-5">
                  <ul className="divide-y divide-[#f0f2f5]">
                    {recentCustomers.map((customer) => (
                      <li key={customer.id}>
                        <Link href={`/customers/${customer.id}`} className="flex items-center justify-between gap-3 py-3">
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-semibold text-[#46536a]">{customer.name}</span>
                            <span className="mt-1 block truncate text-[10px] text-[#929bab]">{customer.company || customer.status}</span>
                          </span>
                          <Icon name="arrow" className="h-3 w-3 shrink-0 text-[#7d899d]" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <EmptyPanel icon="customers" title="Your customer list is ready to grow" description="Add your first customer to see your latest records here." />
              )}
            </section>

            <p className="mt-5 text-center text-[10px] text-[#a1a9b5]">BusinessOS workspace · Your account details are securely connected</p>
          </div>
        </div>
      </div>
    </main>
  );
}
