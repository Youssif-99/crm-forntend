"use client";

import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUserPreferences } from "../components/PreferencesProvider";

type Currency = "EGP" | "USD" | "EUR";
type ExpenseStatus = "draft" | "pending" | "paid" | "cancelled";
type Frequency = "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
type Category = { id: string; name: string; color: string; icon?: string | null };
type ExpenseHistory = { fromStatus: ExpenseStatus | null; toStatus: ExpenseStatus; changedAt: string };
type Expense = {
  id: string;
  title: string;
  description: string;
  vendor: string | null;
  merchant?: string | null;
  amount: string | number;
  amountCents?: string;
  currency: Currency;
  categoryId: string | null;
  categoryName: string | null;
  expenseDate: string;
  dueDate: string | null;
  paymentDate: string | null;
  paymentMethod: string | null;
  notes: string | null;
  status: ExpenseStatus;
  recurring: boolean;
  recurringId: string | null;
  recurringTemplateId?: string | null;
  recurringOccurrence?: string | null;
  createdAt: string;
  hasReceipt?: boolean;
  isOverdue?: boolean;
  statusHistory?: ExpenseHistory[];
};
type RecurringExpense = {
  id: string;
  title: string;
  description: string;
  vendor: string | null;
  amount?: string | number;
  amountCents?: string;
  currency: Currency;
  categoryId: string | null;
  categoryName: string | null;
  cadence: Frequency;
  nextRun: string;
  endsOn: string | null;
  active: boolean;
  notes: string | null;
  merchant?: string | null;
};
type Analytics = {
  summary?: { currency: Currency; status: ExpenseStatus; count: number; amountCents?: string; amount: number | string }[];
  byCurrency?: { currency: Currency; total: number | string; count?: number }[];
};
type ExpenseMetrics = { total: number; paid: number; pending: number; overdue: number; count: number };
type ExpenseDraft = {
  title: string;
  description: string;
  vendor: string;
  amount: string;
  currency: Currency;
  categoryId: string;
  expenseDate: string;
  dueDate: string;
  paymentDate: string;
  paymentMethod: string;
  notes: string;
  active: boolean;
  frequency: Frequency;
  nextRun: string;
  endsOn: string;
};
type SortKey = "date" | "createdAt" | "description" | "merchant" | "amount";

const API = "";
const inputClass = "h-10 w-full rounded-lg border border-[#e5e9f0] bg-white px-3 text-xs text-[#435069] outline-none transition placeholder:text-[#a0a8b5] focus:border-[#bbc5e8] focus:ring-2 focus:ring-[#6478ce]/10";
const paymentMethods = [
  ["cash", "Cash"],
  ["credit_card", "Credit card"],
  ["debit_card", "Debit card"],
  ["bank_transfer", "Bank transfer"],
  ["check", "Check"],
  ["digital_wallet", "Digital wallet"],
  ["other", "Other"],
] as const;
const navigation = [
  ["Dashboard", "/dashboard"], ["Customers", "/customers"], ["Sales", "/sales"], ["Invoices", "/invoices"],
  ["Expenses", "/expenses"], ["Tasks", "/tasks"], ["Appointments", "/appointments"], ["Settings", "/settings"],
];
const emptyDraft = (currency: Currency = "EGP"): ExpenseDraft => ({
  title: "", description: "", vendor: "", amount: "", currency, categoryId: "",
  expenseDate: "", dueDate: "", paymentDate: "", paymentMethod: "", notes: "",
  active: true, frequency: "monthly", nextRun: "", endsOn: "",
});

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, { credentials: "include", ...init });
  if (response.status === 401) {
    window.dispatchEvent(new Event("expense:unauthorized"));
    throw new Error("Your session has expired. Please sign in again.");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string; message?: string } | null;
    throw new Error(body?.error ?? body?.message ?? "The request could not be completed. Please try again.");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function money(value: number | string, currency: Currency = "EGP") {
  return new Intl.NumberFormat("en-EG", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value) || 0);
}

function amountValue(row: { amount?: number | string; amountCents?: string }) {
  if (row.amount !== undefined && row.amount !== null) return Number(row.amount) || 0;
  const cents = Number(row.amountCents);
  return Number.isSafeInteger(cents) ? cents / 100 : 0;
}

function decimalFromCents(value?: string) {
  if (!value || !/^\d+$/.test(value)) return "0.00";
  const cents = Number(value);
  if (!Number.isSafeInteger(cents)) return "0.00";
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

function readableDate(value: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value.slice(0, 10)}T00:00:00`));
}

function dateInputValue(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function isOverdue(expense: Expense) {
  return expense.isOverdue ?? (expense.status === "pending" && Boolean(expense.dueDate?.slice(0, 10) && expense.dueDate.slice(0, 10) < dateInputValue(new Date())));
}

function allowedStatuses(status: ExpenseStatus): ExpenseStatus[] {
  if (status === "draft") return ["draft", "pending", "cancelled"];
  if (status === "pending") return ["pending", "paid", "cancelled"];
  return [status];
}

function Icon({ children }: { children: ReactNode }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">{children}</svg>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-[#566278]">{label}</span>{children}</label>;
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#17233c]/45 p-3 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="expense-dialog-title" className="my-auto w-full max-w-[650px] rounded-2xl border border-[#e9edf2] bg-white p-5 shadow-[0_24px_70px_rgba(27,39,62,0.2)] sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div><h2 id="expense-dialog-title" className="text-[17px] font-semibold tracking-[-0.03em] text-[#27344c]">{title}</h2><p className="mt-1 text-[11px] text-[#8b95a5]">Keep your business spending up to date.</p></div>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-lg p-1.5 text-[#8b95a5] hover:bg-[#f4f5f8]">✕</button>
        </div>
        {children}
      </section>
    </div>
  );
}

function ExpenseForm({ initial, categories, busy, error, recurringOnly = false, onCancel, onSubmit }: {
  initial: ExpenseDraft;
  categories: Category[];
  busy: boolean;
  error: string;
  recurringOnly?: boolean;
  onCancel: () => void;
  onSubmit: (draft: ExpenseDraft) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const set = (key: keyof ExpenseDraft, value: string | boolean) => setDraft((old) => ({ ...old, [key]: value }));
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(draft);
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <p role="alert" className="rounded-lg border border-[#f0d7d4] bg-[#fff7f6] px-3 py-2.5 text-xs text-[#9b514b]">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title *"><input required maxLength={120} autoFocus value={draft.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Office supplies" className={inputClass} /></Field>
        <Field label="Vendor"><input maxLength={120} value={draft.vendor} onChange={(e) => set("vendor", e.target.value)} placeholder="Vendor or payee" className={inputClass} /></Field>
        <div className="sm:col-span-2"><Field label="Description *"><textarea required maxLength={200} rows={2} value={draft.description} onChange={(e) => set("description", e.target.value)} placeholder="What was this expense for?" className="w-full resize-y rounded-lg border border-[#e5e9f0] bg-white px-3 py-2.5 text-xs text-[#435069] outline-none focus:border-[#bbc5e8] focus:ring-2 focus:ring-[#6478ce]/10" /></Field></div>
        <Field label="Amount *"><input required min="0.01" step="0.01" type="number" value={draft.amount} onChange={(e) => set("amount", e.target.value)} placeholder="0.00" className={inputClass} /></Field>
        <Field label="Expense date *"><input required type="date" value={draft.expenseDate} onChange={(e) => set("expenseDate", e.target.value)} className={inputClass} /></Field>
        {!recurringOnly && <Field label="Due date"><input type="date" value={draft.dueDate} onChange={(e) => set("dueDate", e.target.value)} className={inputClass} /></Field>}
        {!recurringOnly && <Field label="Planned payment date"><input type="date" value={draft.paymentDate} onChange={(e) => set("paymentDate", e.target.value)} className={inputClass} /></Field>}
        <Field label="Category"><select value={draft.categoryId} onChange={(e) => set("categoryId", e.target.value)} className={inputClass}><option value="">Uncategorized</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field>
        <Field label="Currency"><select value={draft.currency} onChange={(e) => set("currency", e.target.value)} className={inputClass}><option>EGP</option><option>USD</option><option>EUR</option></select></Field>
        {!recurringOnly && <Field label="Payment method"><select value={draft.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)} className={inputClass}><option value="">Not specified</option>{draft.paymentMethod && !paymentMethods.some(([value]) => value === draft.paymentMethod) && <option value={draft.paymentMethod}>{draft.paymentMethod}</option>}{paymentMethods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>}
        <div className="sm:col-span-2"><Field label="Notes"><textarea maxLength={2000} rows={3} value={draft.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Additional details…" className="w-full resize-y rounded-lg border border-[#e5e9f0] bg-white px-3 py-2.5 text-xs text-[#435069] outline-none focus:border-[#bbc5e8] focus:ring-2 focus:ring-[#6478ce]/10" /></Field></div>
        {recurringOnly && <>
          <Field label="Cadence"><select value={draft.frequency} onChange={(e) => set("frequency", e.target.value)} className={inputClass}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="biweekly">Every two weeks</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option></select></Field>
          <Field label="Next run *"><input required type="date" value={draft.nextRun} onChange={(e) => set("nextRun", e.target.value)} className={inputClass} /></Field>
          <Field label="Ends on"><input type="date" value={draft.endsOn} onChange={(e) => set("endsOn", e.target.value)} className={inputClass} /></Field>
        </>}
      </div>
      <div className="flex justify-end gap-2 border-t border-[#edf0f4] pt-4"><button type="button" onClick={onCancel} className="rounded-lg border border-[#e5e9f0] px-4 py-2 text-xs font-medium text-[#68758a] hover:bg-[#f7f8fa]">Cancel</button><button disabled={busy} className="rounded-lg bg-[#172b55] px-4 py-2 text-xs font-semibold text-white hover:bg-[#243f76] disabled:opacity-60">{busy ? "Saving…" : "Save expense"}</button></div>
    </form>
  );
}

function CategoryForm({ initial, busy, onCancel, onSubmit }: {
  initial: Category | null;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (draft: { name: string; color: string }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? "#6478ce");
  return <form onSubmit={(event) => { event.preventDefault(); onSubmit({ name: name.trim(), color }); }} className="space-y-4">
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Category name *"><input required maxLength={80} autoFocus value={name} onChange={(event) => setName(event.target.value)} className={inputClass} /></Field>
      <Field label="Color"><div className="flex h-10 items-center gap-3 rounded-lg border border-[#e5e9f0] px-3"><input type="color" aria-label="Category color" value={color} onChange={(event) => setColor(event.target.value)} className="h-7 w-9 cursor-pointer border-0 bg-transparent p-0" /><span className="text-xs text-[#68758a]">{color}</span></div></Field>
    </div>
    <div className="flex justify-end gap-2 border-t border-[#edf0f4] pt-4"><button type="button" onClick={onCancel} className="rounded-lg border border-[#e5e9f0] px-4 py-2 text-xs text-[#68758a]">Cancel</button><button disabled={busy} className="rounded-lg bg-[#172b55] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : initial ? "Save category" : "Create category"}</button></div>
  </form>;
}

function AnalyticsPanel({ analytics, loading, error }: { analytics: Analytics | null; loading: boolean; error: string }) {
  const statuses: ExpenseStatus[] = ["draft", "pending", "paid", "cancelled"];
  const currencies = Array.from(new Set([
    ...(analytics?.summary?.map((item) => item.currency) ?? []),
    ...(analytics?.byCurrency?.map((item) => item.currency) ?? []),
  ]));
  const maxTotal = Math.max(1, ...(analytics?.byCurrency?.map((item) => Number(item.total)) ?? []));
  const totalsByCurrency = new Map(currencies.map((currency) => [
    currency,
    analytics?.byCurrency?.find((item) => item.currency === currency)?.total
      ?? analytics?.summary?.filter((item) => item.currency === currency).reduce((sum, item) => sum + Number(item.amount), 0)
      ?? 0,
  ]));
  const statusColor: Record<ExpenseStatus, string> = {
    draft: "bg-slate-400", pending: "bg-amber-400", paid: "bg-emerald-500", cancelled: "bg-rose-400",
  };
  return (
    <section aria-labelledby="analytics-heading" className="rounded-2xl border border-[#e9edf2] bg-white p-5 shadow-[0_1px_2px_rgba(27,39,62,0.02)]">
      <div className="mb-5"><h2 id="analytics-heading" className="text-sm font-semibold text-[#29364e]">Expense summary</h2><p className="mt-1 text-[11px] text-[#929bab]">Totals by currency and lifecycle status for the selected date range.</p></div>
      {loading ? <p role="status" className="py-12 text-center text-xs text-[#8b95a5]">Loading summary…</p> : error ? <p role="alert" className="py-8 text-center text-xs text-[#9b514b]">{error}</p> : !(analytics?.summary?.length || analytics?.byCurrency?.length) ? <p className="py-10 text-center text-xs text-[#8b95a5]">No spending data for this date range yet.</p> : <div className="space-y-6">
        {currencies.map((currency) => {
          const currencyRows = analytics.summary?.filter((item) => item.currency === currency) ?? [];
          const total = totalsByCurrency.get(currency) ?? 0;
          const bucket = analytics.byCurrency?.find((item) => item.currency === currency);
          return <section key={currency} aria-label={`${currency} expense breakdown`}>
            <div className="mb-2 flex justify-between text-xs"><h3 className="font-semibold text-[#435069]">{currency}</h3><span className="font-semibold text-[#344159]">{money(total, currency)}</span></div>
            <div className="mb-3 h-2 overflow-hidden rounded-full bg-[#eef1f6]"><div className="h-full rounded-full bg-[#6478ce]" style={{ width: `${Number(total) / maxTotal * 100}%` }} /></div>
            {bucket?.count !== undefined && <p className="mb-2 text-[10px] text-[#929bab]">{bucket.count} expense{bucket.count === 1 ? "" : "s"}</p>}
            <div className="flex h-3 overflow-hidden rounded-full bg-[#eef1f6]" role="img" aria-label={`${currency} spending segmented by status`}>
              {statuses.map((status) => {
                const row = currencyRows.find((item) => item.status === status);
                const amount = Number(row?.amount ?? 0);
                return amount ? <div key={status} title={`${status}: ${money(amount, currency)} (${row?.count ?? 0})`} className={statusColor[status]} style={{ width: `${amount / Number(total) * 100}%` }} /> : null;
              })}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{statuses.map((status) => {
              const row = currencyRows.find((item) => item.status === status);
              return <div key={status} className="flex items-center gap-2 rounded-lg bg-[#f8f9fc] px-3 py-2"><span className={`h-2.5 w-2.5 rounded-full ${statusColor[status]}`} /><span className="min-w-0 flex-1 text-[10px] capitalize text-[#68758a]">{status}</span><span className="text-[10px] font-semibold text-[#435069]">{money(row?.amount ?? 0, currency)}</span><span className="text-[9px] text-[#929bab]">{row?.count ?? 0}</span></div>;
            })}</div>
          </section>;
        })}
      </div>}
    </section>
  );
}

export default function ExpensesPage() {
  const router = useRouter();
  const { preferences } = useUserPreferences();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recurring, setRecurring] = useState<RecurringExpense[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [overdueMetrics, setOverdueMetrics] = useState<Partial<Record<Currency, { amount: number; count: number }>>>({});
  const [overdueMetricsLoading, setOverdueMetricsLoading] = useState(false);
  const [overdueMetricsError, setOverdueMetricsError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<SortKey>("date");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const [tab, setTab] = useState<"expenses" | "analytics" | "recurring" | "categories">("expenses");
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [error, setError] = useState("");
  const [analyticsError, setAnalyticsError] = useState("");
  const [actionError, setActionError] = useState("");
  const [dialog, setDialog] = useState<"create" | "edit" | "detail" | "category" | "recurring" | null>(null);
  const [selected, setSelected] = useState<Expense | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedRecurring, setSelectedRecurring] = useState<RecurringExpense | null>(null);
  const [creationDate, setCreationDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailHistory, setDetailHistory] = useState<ExpenseHistory[]>([]);
  const [historyError, setHistoryError] = useState("");
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [receiptError, setReceiptError] = useState("");
  const [receiptUploading, setReceiptUploading] = useState(false);
  const [receiptDeleting, setReceiptDeleting] = useState(false);
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), sort, direction });
    if (search.trim()) params.set("search", search.trim());
    if (categoryFilter) params.set("categoryId", categoryFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (currencyFilter) params.set("currency", currencyFilter);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return params.toString();
  }, [page, pageSize, sort, direction, search, categoryFilter, statusFilter, currencyFilter, from, to]);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await request<{ expenses: Expense[]; pagination?: { page: number; pageSize: number; total: number } }>(`/api/expenses?${query}`);
      if (!Array.isArray(result.expenses)) throw new Error("The expenses response was not in the expected format.");
      setExpenses(result.expenses);
      setTotal(result.pagination?.total ?? result.expenses.length);
      setTotalPages(Math.max(1, Math.ceil((result.pagination?.total ?? result.expenses.length) / (result.pagination?.pageSize ?? pageSize))));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load expenses."); }
    finally { setLoading(false); }
  }, [pageSize, query]);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    setAnalyticsError("");
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    try {
      const suffix = params.size ? `?${params}` : "";
      const [analyticsResult, summaryResult] = await Promise.all([
        request<{ analytics?: Analytics; byCurrency?: Analytics["byCurrency"] }>(`/api/expenses/analytics${suffix}`).catch(() => null),
        request<{ summary?: NonNullable<Analytics["summary"]> }>(`/api/expenses/summary${suffix}`).catch(() => null),
      ]);
      if (!analyticsResult && !summaryResult) throw new Error("Unable to load expense analytics or summary.");
      const analyticsData: Analytics | undefined = analyticsResult?.analytics
        ?? (analyticsResult && "byCurrency" in analyticsResult ? analyticsResult as Analytics : undefined);
      setAnalytics({
        byCurrency: analyticsData?.byCurrency,
        summary: summaryResult?.summary ?? analyticsData?.summary ?? [],
      });
    } catch (reason) { setAnalyticsError(reason instanceof Error ? reason.message : "Unable to load expense summary."); }
    finally { setAnalyticsLoading(false); }
  }, [from, to]);

  const loadOverdueMetrics = useCallback(async () => {
    setOverdueMetricsLoading(true);
    setOverdueMetricsError("");
    try {
      const params = new URLSearchParams({ page: "1", pageSize: "100", status: "pending" });
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const first = await request<{ expenses: Expense[]; pagination?: { pageSize?: number; total?: number } }>(`/api/expenses?${params}`);
      if (!Array.isArray(first.expenses)) throw new Error("The overdue-expense response was not in the expected format.");
      const pageSize = first.pagination?.pageSize ?? 100;
      const pageCount = Math.ceil((first.pagination?.total ?? first.expenses.length) / pageSize);
      const otherPages = await Promise.all(Array.from({ length: Math.max(0, pageCount - 1) }, async (_, index) => {
        const pageParams = new URLSearchParams(params);
        pageParams.set("page", String(index + 2));
        const result = await request<{ expenses: Expense[] }>(`/api/expenses?${pageParams}`);
        if (!Array.isArray(result.expenses)) throw new Error("The overdue-expense response was not in the expected format.");
        return result.expenses;
      }));
      const totals: Partial<Record<Currency, { amount: number; count: number }>> = {};
      for (const expense of [...first.expenses, ...otherPages.flat()]) {
        if (!isOverdue(expense)) continue;
        const current = totals[expense.currency] ?? { amount: 0, count: 0 };
        current.amount += amountValue(expense);
        current.count += 1;
        totals[expense.currency] = current;
      }
      setOverdueMetrics(totals);
    } catch (reason) {
      setOverdueMetrics({});
      setOverdueMetricsError(reason instanceof Error ? reason.message : "Unable to load overdue expenses.");
    } finally {
      setOverdueMetricsLoading(false);
    }
  }, [from, to]);

  const loadExtras = useCallback(async () => {
    try {
      const [categoryResult, recurringResult] = await Promise.all([
        request<{ categories: Category[] }>("/api/expenses/categories"),
        request<{ templates: RecurringExpense[] }>("/api/expenses/recurring"),
      ]);
      setCategories(Array.isArray(categoryResult.categories) ? categoryResult.categories : []);
      setRecurring(Array.isArray(recurringResult.templates) ? recurringResult.templates.map((template) => ({
        ...template,
        amount: template.amount ?? decimalFromCents(template.amountCents),
      })) : []);
    } catch (reason) { setActionError(reason instanceof Error ? reason.message : "Unable to load expense settings."); }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const handleUnauthorized = () => router.replace("/authPages/sign-in");
    window.addEventListener("expense:unauthorized", handleUnauthorized);
    void request<{ user?: { name: string; email: string } }>("/api/auth/me", { signal: controller.signal })
      .then((result) => { if (result.user) setUser(result.user); })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Unable to load your account."); });
    const extrasTimer = window.setTimeout(() => { void loadExtras(); }, 0);
    return () => { controller.abort(); window.clearTimeout(extrasTimer); window.removeEventListener("expense:unauthorized", handleUnauthorized); };
  }, [loadExtras, router]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void loadExpenses(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadExpenses]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void loadAnalytics(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadAnalytics]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void loadOverdueMetrics(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadOverdueMetrics]);

  function openCreate(duplicate?: Expense) {
    setSelected(duplicate ?? null);
    setFormError("");
    if (!duplicate) {
      const today = new Date();
      setCreationDate(dateInputValue(today));
    }
    setDialog("create");
  }

  function toDraft(expense?: Expense): ExpenseDraft {
    if (!expense) return emptyDraft();
    return {
      title: expense.title, description: expense.description, vendor: expense.vendor ?? expense.merchant ?? "", amount: String(expense.amount),
      currency: expense.currency, categoryId: expense.categoryId ?? "",
      expenseDate: expense.expenseDate.slice(0, 10), dueDate: expense.dueDate?.slice(0, 10) ?? "",
      paymentDate: expense.paymentDate?.slice(0, 10) ?? "", paymentMethod: expense.paymentMethod ?? "", notes: expense.notes ?? "",
      active: true, frequency: "monthly", nextRun: "", endsOn: "",
    };
  }

  function toRecurringDraft(item?: RecurringExpense): ExpenseDraft {
    if (!item) return { ...emptyDraft(preferences.currency), expenseDate: creationDate, nextRun: creationDate };
    return {
      ...emptyDraft(), title: item.title ?? item.description, description: item.description, vendor: item.vendor ?? item.merchant ?? "",
      amount: String(item.amount ?? decimalFromCents(item.amountCents)), currency: item.currency, categoryId: item.categoryId ?? "",
      expenseDate: item.nextRun.slice(0, 10), nextRun: item.nextRun.slice(0, 10),
      endsOn: item.endsOn?.slice(0, 10) ?? "", notes: item.notes ?? "",
      active: item.active, frequency: item.cadence,
    };
  }

  const draftInitial = dialog === "edit" ? toDraft(selected ?? undefined) : dialog === "create" ? selected ? toDraft(selected) : { ...emptyDraft(preferences.currency), expenseDate: creationDate } : dialog === "recurring" ? toRecurringDraft(selectedRecurring ?? undefined) : emptyDraft(preferences.currency);

  async function saveExpense(draft: ExpenseDraft, recurringOnly = false) {
    setSaving(true); setFormError("");
    try {
      const payload = {
        title: draft.title.trim(), description: draft.description.trim(),
        vendor: draft.vendor.trim() || undefined,
        amount: draft.amount, currency: draft.currency, categoryId: draft.categoryId || null,
        expenseDate: draft.expenseDate, dueDate: draft.dueDate || null,
        paymentDate: draft.paymentDate || null, paymentMethod: draft.paymentMethod.trim() || undefined,
        notes: draft.notes.trim() || undefined,
        ...(recurringOnly ? { cadence: draft.frequency, nextRun: draft.nextRun, endsOn: draft.endsOn || null } : {}),
      };
      const path = recurringOnly ? `/api/expenses/recurring${selectedRecurring ? `/${selectedRecurring.id}` : ""}` : `/api/expenses${dialog === "edit" && selected ? `/${selected.id}` : ""}`;
      await request(path, {
        method: recurringOnly ? selectedRecurring ? "PUT" : "POST" : dialog === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (recurringOnly && selectedRecurring && !selectedRecurring.active) {
        await request(`/api/expenses/recurring/${selectedRecurring.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active: false }),
        });
      }
      setDialog(null); setSelected(null); setSelectedRecurring(null); await Promise.all([loadExpenses(), loadAnalytics(), loadExtras()]);
    } catch (reason) { setFormError(reason instanceof Error ? reason.message : "Unable to save expense."); }
    finally { setSaving(false); }
  }

  async function deleteExpense(expense: Expense) {
    if (!window.confirm(`Delete “${expense.description}”? This cannot be undone.`)) return;
    setActionError("");
    try { await request(`/api/expenses/${expense.id}`, { method: "DELETE" }); await Promise.all([loadExpenses(), loadAnalytics(), loadExtras()]); setDialog(null); }
    catch (reason) { setActionError(reason instanceof Error ? reason.message : "Unable to delete expense."); }
  }

  async function viewExpense(expense: Expense) {
    setSelected(expense);
    setDetailError("");
    setDetailLoading(true);
    setDetailHistory([]);
    setHistoryError("");
    setDialog("detail");
    try {
      const result = await request<{ expense: Expense }>(`/api/expenses/${expense.id}`);
      if (result.expense) {
        setSelected(result.expense);
        setDetailHistory(result.expense.statusHistory ?? []);
      }
      else throw new Error("The expense detail response was not in the expected format.");
    } catch (reason) {
      setDetailError(reason instanceof Error ? reason.message : "Unable to load expense details.");
    } finally { setDetailLoading(false); }
    try {
      const history = await request<{ history: ExpenseHistory[] }>(`/api/expenses/${expense.id}/status-history`);
      setDetailHistory(history.history ?? []);
    } catch (reason) {
      setHistoryError(reason instanceof Error ? reason.message : "Expense status history is unavailable.");
    }
  }

  async function saveCategory(draft: { name: string; color: string }) {
    setCategoryBusy(true); setActionError("");
    try {
      await request(`/api/expenses/categories${selectedCategory ? `/${selectedCategory.id}` : ""}`, {
        method: selectedCategory ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      setDialog(null); setSelectedCategory(null); await loadExtras();
    } catch (reason) { setActionError(reason instanceof Error ? reason.message : "Unable to create category."); }
    finally { setCategoryBusy(false); }
  }

  async function deleteCategory(category: Category) {
    if (!window.confirm(`Delete category “${category.name}”?`)) return;
    try { await request(`/api/expenses/categories/${category.id}`, { method: "DELETE" }); await Promise.all([loadExtras(), loadExpenses()]); }
    catch (reason) { setActionError(reason instanceof Error ? reason.message : "Unable to delete category."); }
  }

  async function toggleRecurring(item: RecurringExpense) {
    try {
      await request(`/api/expenses/recurring/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !item.active }) });
      await loadExtras();
    } catch (reason) { setActionError(reason instanceof Error ? reason.message : "Unable to update recurring expense."); }
  }

  async function cancelRecurring(item: RecurringExpense) {
    if (!window.confirm(`Cancel the recurring schedule “${item.description}”? Existing expenses will remain.`)) return;
    try {
      await request(`/api/expenses/recurring/${item.id}`, { method: "DELETE" });
      await loadExtras();
    } catch (reason) { setActionError(reason instanceof Error ? reason.message : "Unable to cancel recurring expense."); }
  }

  async function downloadReceipt(expense: Expense) {
    setReceiptBusy(true);
    setActionError("");
    try {
      const response = await fetch(`${API}/api/expenses/${expense.id}/receipt`, { credentials: "include" });
      if (response.status === 401) { router.replace("/authPages/sign-in"); return; }
      if (!response.ok) throw new Error("The receipt could not be downloaded.");
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const filename = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename ? decodeURIComponent(filename) : "expense-receipt";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (reason) { setActionError(reason instanceof Error ? reason.message : "Unable to download receipt."); }
    finally { setReceiptBusy(false); }
  }

  async function uploadReceipt(expense: Expense, file: File) {
    setReceiptUploading(true);
    setReceiptError("");
    try {
      if (file.size > 4 * 1024 * 1024) throw new Error("Receipt files must be 4 MB or smaller.");
      if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        throw new Error("Choose a PDF, JPEG, PNG, or WebP receipt.");
      }
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(`${API}/api/expenses/${expense.id}/receipt`, {
        method: "PUT", credentials: "include", body,
      });
      if (response.status === 401) { router.replace("/authPages/sign-in"); return; }
      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(result?.error ?? "The receipt could not be uploaded.");
      }
      setSelected((current) => current?.id === expense.id ? { ...current, hasReceipt: true } : current);
      await loadExpenses();
    } catch (reason) {
      setReceiptError(reason instanceof Error ? reason.message : "Unable to upload receipt.");
    } finally { setReceiptUploading(false); }
  }

  async function deleteReceipt(expense: Expense) {
    if (!window.confirm("Delete this receipt? This cannot be undone.")) return;
    setReceiptDeleting(true);
    setReceiptError("");
    try {
      await request(`/api/expenses/${expense.id}/receipt`, { method: "DELETE" });
      setSelected((current) => current?.id === expense.id ? { ...current, hasReceipt: false } : current);
      await loadExpenses();
    } catch (reason) {
      setReceiptError(reason instanceof Error ? reason.message : "Unable to delete receipt.");
    } finally { setReceiptDeleting(false); }
  }

  async function updateExpenseStatus(expense: Expense, status: ExpenseStatus) {
    setActionError("");
    try {
      const result = await request<{ expense: Expense }>(`/api/expenses/${expense.id}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (selected?.id === expense.id) setSelected(result.expense);
      await Promise.all([loadExpenses(), loadAnalytics()]);
    } catch (reason) { setActionError(reason instanceof Error ? reason.message : "Unable to update expense status."); }
  }

  async function exportCsv() {
    setActionError("");
    try {
      const params = new URLSearchParams(query);
      params.delete("page");
      params.delete("pageSize");
      const response = await fetch(`${API}/api/expenses/export.csv?${params}`, { credentials: "include" });
      if (response.status === 401) { router.replace("/authPages/sign-in"); return; }
      if (!response.ok) throw new Error("CSV export could not be downloaded.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = "expenses.csv"; anchor.click(); URL.revokeObjectURL(url);
    } catch (reason) { setActionError(reason instanceof Error ? reason.message : "Unable to export expenses."); }
  }

  async function signOut() {
    setLogoutBusy(true);
    try { await request("/api/auth/logout", { method: "POST" }); router.replace("/authPages/sign-in"); }
    catch (reason) { setActionError(reason instanceof Error ? reason.message : "Unable to sign out."); }
    finally { setLogoutBusy(false); }
  }

  function updateSort(key: SortKey) {
    if (sort === key) setDirection((old) => old === "asc" ? "desc" : "asc");
    else { setSort(key); setDirection("asc"); }
    setPage(1);
  }

  const pageNumbers = useMemo(() => {
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    return Array.from({ length: Math.min(5, totalPages) }, (_, index) => start + index);
  }, [page, totalPages]);
  const expenseMetrics = useMemo(() => {
    const summary = analytics?.summary ?? [];
    const currencies = Array.from(new Set([
      ...summary.map((row) => row.currency),
      ...Object.keys(overdueMetrics) as Currency[],
    ]));
    return currencies.map((currency) => {
      const rows = summary.filter((row) => row.currency === currency);
      const total = rows.reduce((sum, row) => sum + amountValue(row), 0);
      const count = rows.reduce((sum, row) => sum + (Number(row.count) || 0), 0);
      const paid = rows.filter((row) => row.status === "paid").reduce((sum, row) => sum + amountValue(row), 0);
      const pending = rows.filter((row) => row.status === "pending").reduce((sum, row) => sum + amountValue(row), 0);
      const overdue = overdueMetrics[currency]?.amount ?? 0;
      const metrics: ExpenseMetrics = { total, paid, pending, overdue, count };
      return { currency, metrics, average: count ? total / count : 0 };
    });
  }, [analytics, overdueMetrics]);

  return (
    <div className="crm-workspace min-h-screen text-[#26344d]">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-[238px] shrink-0 border-r border-[#e9ecf1] bg-white/80 px-4 py-5 lg:block">
          <Link href="/dashboard" className="mb-9 flex items-center gap-3 px-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#172b55] text-sm font-bold text-white">B</span><span><span className="block text-sm font-semibold text-[#26344d]">Business OS</span><span className="block text-[10px] text-[#98a1af]">Workspace</span></span></Link>
          <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.12em] text-[#a2aab8]">WORKSPACE</p>
          <nav aria-label="Workspace navigation" className="space-y-1">{navigation.map(([name, href]) => <Link key={name} href={href} aria-current={name === "Expenses" ? "page" : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition ${name === "Expenses" ? "bg-[#eff1fa] text-[#566bbd]" : "text-[#737f92] hover:bg-[#f7f8fa] hover:text-[#36435b]"}`}><span aria-hidden="true" className="w-[18px] text-center">{name === "Expenses" ? "₱" : name === "Invoices" ? "▤" : name === "Customers" ? "♙" : "▦"}</span>{name}</Link>)}</nav>
          <div className="mt-8 rounded-xl border border-[#edf0f4] bg-[#f8f9fc] p-3"><p className="text-[11px] font-semibold text-[#55627a]">Expense center</p><p className="mt-1 text-[10px] leading-4 text-[#8994a6]">Track spending, categories, and recurring costs.</p></div>
        </aside>
        <main className="min-w-0 flex-1">
          <header className="flex min-h-[68px] items-center justify-between border-b border-[#e9ecf1] bg-white/80 px-4 sm:px-7">
            <div className="min-w-0"><p className="text-[10px] font-medium text-[#98a1af]">Workspace / Finance</p><h1 className="truncate text-sm font-semibold text-[#29364e]">Expenses</h1></div>
            <div className="flex items-center gap-3"><span className="hidden text-right sm:block"><span className="block text-[11px] font-semibold text-[#46536a]">{user?.name ?? "Your workspace"}</span><span className="block text-[10px] text-[#98a1af]">{user?.email ?? ""}</span></span><button type="button" onClick={signOut} disabled={logoutBusy} className="rounded-lg border border-[#e9edf2] px-3 py-2 text-[10px] font-medium text-[#68758a] hover:bg-[#f7f8fa] disabled:opacity-50">{logoutBusy ? "Signing out…" : "Sign out"}</button></div>
          </header>
          <nav aria-label="Workspace navigation" className="flex gap-1 overflow-x-auto border-b border-[#e9ecf1] bg-white px-3 py-2 lg:hidden">{navigation.map(([name, href]) => <Link key={name} href={href} aria-current={name === "Expenses" ? "page" : undefined} className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-medium ${name === "Expenses" ? "bg-[#eff1fa] text-[#566bbd]" : "text-[#737f92] hover:bg-[#f7f8fa]"}`}>{name}</Link>)}</nav>
          <div className="mx-auto max-w-[1300px] space-y-5 px-4 py-6 sm:px-7 sm:py-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7d8ba1]">Finance</p><h2 className="mt-1 text-[25px] font-semibold tracking-[-0.055em] text-[#202d45]">Expense management</h2><p className="mt-1 text-xs text-[#8b95a5]">Monitor every outgoing, on schedule or one-time.</p></div><div className="flex flex-wrap gap-2"><button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg border border-[#e5e9f0] bg-white px-3.5 py-2.5 text-xs font-medium text-[#566278] hover:bg-[#f7f8fa]"><Icon><path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4" /></Icon>Export CSV</button><button onClick={() => openCreate()} className="inline-flex items-center gap-2 rounded-lg bg-[#172b55] px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#243f76]"><Icon><path d="M12 5v14M5 12h14" /></Icon>New expense</button></div></div>
            {actionError && <p role="alert" className="rounded-xl border border-[#f0d7d4] bg-[#fff7f6] px-4 py-3 text-xs text-[#9b514b]">{actionError}<button onClick={() => setActionError("")} className="ml-3 underline">Dismiss</button></p>}
            <section aria-label="Expense overview metrics" aria-live="polite" className="space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-sm font-semibold text-[#29364e]">Expense overview</h2>
                <p className="text-[10px] text-[#929bab]">{from || to ? `Filtered by ${from ? readableDate(from) : "all dates"} – ${to ? readableDate(to) : "today"}` : "All time"} · amounts stay grouped by currency</p>
              </div>
              {analyticsLoading || overdueMetricsLoading ? <p role="status" className="rounded-xl border border-[#e9edf2] bg-white px-4 py-5 text-center text-xs text-[#8b95a5]">Loading expense overview…</p>
                : analyticsError ? <p role="alert" className="rounded-xl border border-[#f0d7d4] bg-[#fff7f6] px-4 py-5 text-center text-xs text-[#9b514b]">{analyticsError}</p>
                : overdueMetricsError ? <p role="alert" className="rounded-xl border border-[#f0d7d4] bg-[#fff7f6] px-4 py-5 text-center text-xs text-[#9b514b]">{overdueMetricsError}</p>
                : expenseMetrics.length === 0 ? <p className="rounded-xl border border-[#e9edf2] bg-white px-4 py-5 text-center text-xs text-[#8b95a5]">No expenses in this date range.</p>
                : expenseMetrics.map(({ currency, metrics, average }) => <div key={currency} className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6" aria-label={`${currency} expense metrics`}>
                  {[
                    ["Total", money(metrics.total, currency)],
                    ["Paid", money(metrics.paid, currency)],
                    ["Pending", money(metrics.pending, currency)],
                    ["Overdue", money(metrics.overdue, currency)],
                    ["Average", money(average, currency)],
                    ["Count", String(metrics.count)],
                  ].map(([label, value]) => <article key={label} className="rounded-xl border border-[#e9edf2] bg-white p-3.5 shadow-[0_1px_2px_rgba(27,39,62,0.02)]"><p className="text-[10px] font-medium text-[#8792a4]">{label} <span className="text-[#b0b7c3]">· {currency}</span></p><p className="mt-2 break-words text-base font-semibold tracking-tight text-[#26344d]">{value}</p></article>)}
                </div>)}
            </section>
            <section aria-label="Expense filters" className="rounded-2xl border border-[#e9edf2] bg-white p-4 shadow-[0_1px_2px_rgba(27,39,62,0.02)]">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Field label="Search"><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search expenses…" className={inputClass} /></Field>
                <Field label="Category"><select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} className={inputClass}><option value="">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field>
                <Field label="Status"><select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className={inputClass}><option value="">All statuses</option><option value="draft">Draft</option><option value="pending">Pending</option><option value="paid">Paid</option><option value="cancelled">Cancelled</option></select></Field>
                <Field label="Currency"><select value={currencyFilter} onChange={(e) => { setCurrencyFilter(e.target.value); setPage(1); }} className={inputClass}><option value="">All currencies</option><option value="EGP">EGP</option><option value="USD">USD</option><option value="EUR">EUR</option></select></Field>
                <Field label="From"><input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className={inputClass} /></Field>
                <Field label="To"><input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className={inputClass} /></Field>
                <Field label="Sort by"><select value={`${sort}:${direction}`} onChange={(e) => { const [key, order] = e.target.value.split(":") as [SortKey, "asc" | "desc"]; setSort(key); setDirection(order); setPage(1); }} className={inputClass}><option value="date:desc">Newest first</option><option value="date:asc">Oldest first</option><option value="amount:desc">Amount: high to low</option><option value="amount:asc">Amount: low to high</option><option value="description:asc">Description: A–Z</option><option value="merchant:asc">Merchant: A–Z</option><option value="createdAt:desc">Recently created</option></select></Field>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px]"><span className="mr-1 text-[#929bab]">Date range:</span>{[["30 days", 30], ["90 days", 90], ["12 months", 365]].map(([label, days]) => <button key={label} onClick={() => { const end = new Date(); const start = new Date(); start.setDate(start.getDate() - Number(days)); setFrom(dateInputValue(start)); setTo(dateInputValue(end)); setPage(1); }} className="rounded-md border border-[#e9edf2] px-2.5 py-1.5 text-[#68758a] hover:bg-[#f7f8fa]">{label}</button>)}<button onClick={() => { setFrom(""); setTo(""); setPage(1); }} className="rounded-md px-2.5 py-1.5 text-[#6478ce] hover:bg-[#f7f8fa]">All time</button></div>
            </section>
            <div role="tablist" aria-label="Expense sections" className="flex w-full gap-1 overflow-x-auto rounded-xl border border-[#e9edf2] bg-white p-1 sm:w-fit">{(["expenses", "analytics", "recurring", "categories"] as const).map((value) => <button key={value} role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-semibold capitalize ${tab === value ? "bg-[#eff1fa] text-[#566bbd]" : "text-[#79869a] hover:bg-[#f7f8fa]"}`}>{value}</button>)}</div>
            {tab === "expenses" && <section aria-label="Expense list" className="overflow-hidden rounded-2xl border border-[#e9edf2] bg-white shadow-[0_1px_2px_rgba(27,39,62,0.02)]">
              <div className="flex items-center justify-between gap-3 border-b border-[#edf0f4] px-4 py-4 sm:px-5"><div><h3 className="text-sm font-semibold text-[#29364e]">All expenses</h3><p className="mt-1 text-[10px] text-[#929bab]">{total} record{total === 1 ? "" : "s"} found</p></div><button onClick={() => { setSearch(""); setCategoryFilter(""); setStatusFilter(""); setCurrencyFilter(""); setFrom(""); setTo(""); setPage(1); }} className="text-[10px] font-medium text-[#6478ce] hover:underline">Clear filters</button></div>
              {loading ? <div role="status" className="px-5 py-16 text-center text-xs text-[#8b95a5]">Loading expenses…</div> : error ? <div className="px-5 py-12 text-center"><p role="alert" className="text-xs text-[#9b514b]">{error}</p><button onClick={() => void loadExpenses()} className="mt-3 text-xs font-semibold text-[#6478ce]">Try again</button></div> : expenses.length === 0 ? <div className="px-5 py-16 text-center"><p className="text-sm font-semibold text-[#46536a]">No expenses found</p><p className="mt-1 text-xs text-[#929bab]">{search || categoryFilter || statusFilter || currencyFilter || from || to ? "Try changing the filters, or add a new expense." : "Add your first expense to start tracking spend."}</p><button onClick={() => openCreate()} className="mt-4 rounded-lg bg-[#172b55] px-4 py-2 text-xs font-semibold text-white">Add expense</button></div> : <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1050px] border-collapse text-left">
                    <thead><tr className="border-b border-[#edf0f4] bg-[#fafbfc] text-[10px] font-semibold uppercase tracking-wide text-[#929bab]">
                      {([["description", "Title / description"], ["merchant", "Vendor"], ["date", "Date"], ["amount", "Amount"], ["createdAt", "Created"]] as [SortKey, string][]).map(([key, label]) => <th key={key} scope="col" className="px-5 py-3"><button onClick={() => updateSort(key)} className="inline-flex items-center gap-1 hover:text-[#566bbd]">{label}{sort === key && <span aria-label={direction === "asc" ? "ascending" : "descending"}>{direction === "asc" ? "↑" : "↓"}</span>}</button></th>)}
                      <th scope="col" className="px-5 py-3">Due / paid</th><th scope="col" className="px-5 py-3">Category</th><th scope="col" className="px-5 py-3">Status</th><th scope="col" className="px-5 py-3">Actions</th>
                    </tr></thead>
                    <tbody>{expenses.map((expense) => <tr key={expense.id} className="border-b border-[#f0f2f5] last:border-0 hover:bg-[#fafbfc]">
                      <td className="px-5 py-3.5"><button onClick={() => void viewExpense(expense)} className="text-left text-xs font-semibold text-[#344159] hover:text-[#566bbd]">{expense.title}</button><p className="mt-1 max-w-[260px] truncate text-[10px] text-[#98a1af]">{expense.description}</p></td>
                      <td className="px-5 py-3.5 text-xs text-[#68758a]">{expense.vendor || expense.merchant || "—"}</td>
                      <td className="px-5 py-3.5 text-xs text-[#68758a]">{readableDate(expense.expenseDate)}{isOverdue(expense) && <span className="ml-2 rounded-full bg-[#fff0ee] px-2 py-1 text-[9px] text-[#ae554c]">Overdue</span>}</td>
                      <td className="px-5 py-3.5 text-xs font-semibold text-[#344159]">{money(expense.amount, expense.currency)}</td>
                      <td className="px-5 py-3.5 text-xs text-[#68758a]">{readableDate(expense.createdAt)}</td>
                      <td className="px-5 py-3.5 text-[10px] text-[#68758a]">Due {readableDate(expense.dueDate ?? "")}<p className="mt-1">Paid {readableDate(expense.paymentDate ?? "")}</p></td>
                      <td className="px-5 py-3.5"><span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] text-[#65718a]" style={{ backgroundColor: (categories.find((category) => category.id === expense.categoryId)?.color ?? "#6478ce") + "20" }}>{categories.find((category) => category.id === expense.categoryId)?.icon && <span aria-hidden="true">{categories.find((category) => category.id === expense.categoryId)?.icon}</span>}{expense.categoryName || "Uncategorized"}</span></td>
                      <td className="px-5 py-3.5"><select aria-label="Change expense status" value={expense.status} onChange={(event) => void updateExpenseStatus(expense, event.target.value as ExpenseStatus)} className="h-8 rounded-md border border-[#e5e9f0] px-2 text-[10px]">{allowedStatuses(expense.status).map((status) => <option key={status} value={status}>{status}</option>)}</select></td>
                      <td className="px-5 py-3.5"><div className="flex gap-1"><button onClick={() => { setSelected(expense); setDialog("edit"); setFormError(""); }} disabled={expense.status !== "draft"} aria-label="Edit expense" className="rounded-md px-2 py-1 text-[10px] text-[#6478ce] hover:bg-[#eff1fa] disabled:opacity-40">Edit</button><button onClick={() => openCreate(expense)} aria-label="Duplicate expense" className="rounded-md px-2 py-1 text-[10px] text-[#6478ce] hover:bg-[#eff1fa]">Duplicate</button><button onClick={() => void deleteExpense(expense)} disabled={expense.status !== "draft"} aria-label="Delete expense" className="rounded-md px-2 py-1 text-[10px] text-[#ae554c] hover:bg-[#fff0ee] disabled:opacity-40">Delete</button></div></td>
                    </tr>)}</tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0f4] px-4 py-3 text-[10px] text-[#8b95a5] sm:px-5"><span>Page {page} of {totalPages}</span><nav aria-label="Expense pages" className="flex items-center gap-1"><button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-md border border-[#e9edf2] px-2.5 py-1.5 disabled:opacity-40">Previous</button>{pageNumbers.map((number) => <button key={number} aria-current={page === number ? "page" : undefined} onClick={() => setPage(number)} className={`rounded-md px-2.5 py-1.5 ${page === number ? "bg-[#eff1fa] font-semibold text-[#566bbd]" : "hover:bg-[#f7f8fa]"}`}>{number}</button>)}<button disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="rounded-md border border-[#e9edf2] px-2.5 py-1.5 disabled:opacity-40">Next</button></nav></div>
              </>}
            </section>}
            {tab === "analytics" && <AnalyticsPanel analytics={analytics} loading={analyticsLoading} error={analyticsError} />}
            {tab === "recurring" && <section className="rounded-2xl border border-[#e9edf2] bg-white p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-semibold text-[#29364e]">Recurring expenses</h3><p className="mt-1 text-[11px] text-[#929bab]">Manage schedules and pause or cancel future runs.</p></div><button onClick={() => { const today = dateInputValue(new Date()); setCreationDate(today); setSelectedRecurring(null); setFormError(""); setDialog("recurring"); }} className="rounded-lg bg-[#172b55] px-3 py-2 text-[10px] font-semibold text-white">New schedule</button></div>
              {recurring.length === 0 ? <p className="py-10 text-center text-xs text-[#8b95a5]">No recurring expenses set up yet.</p> : <div className="divide-y divide-[#edf0f4]">{recurring.map((item) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-xs font-semibold text-[#344159]">{item.description}</p><p className="mt-1 text-[10px] text-[#929bab]">{item.merchant || "No merchant"} · {item.categoryName || "Uncategorized"} · {item.cadence} · next {readableDate(item.nextRun)}{item.endsOn ? " · ends " + readableDate(item.endsOn) : ""}</p><span className={item.active ? "mt-1 inline-flex rounded-full bg-[#edf5f0] px-2 py-0.5 text-[9px] text-[#39775c]" : "mt-1 inline-flex rounded-full bg-[#f1f3f8] px-2 py-0.5 text-[9px] text-[#65718a]"}>{item.active ? "Active" : "Paused"}</span></div><div className="flex flex-wrap items-center gap-2"><span className="mr-2 text-xs font-semibold text-[#344159]">{money(item.amount ?? decimalFromCents(item.amountCents), item.currency)}</span><button aria-pressed={item.active} onClick={() => void toggleRecurring(item)} className="rounded-lg border border-[#e5e9f0] px-3 py-1.5 text-[10px] font-semibold text-[#6478ce]">{item.active ? "Pause" : "Resume"}</button><button onClick={() => { setSelectedRecurring(item); setFormError(""); setDialog("recurring"); }} className="rounded-lg border border-[#e5e9f0] px-3 py-1.5 text-[10px] font-semibold text-[#6478ce]">Edit</button><button onClick={() => void cancelRecurring(item)} className="rounded-lg border border-[#f0d7d4] px-3 py-1.5 text-[10px] text-[#ae554c]">Cancel</button></div></article>)}</div>}
            </section>}
            {tab === "categories" && <section className="rounded-2xl border border-[#e9edf2] bg-white p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-semibold text-[#29364e]">Expense categories</h3><p className="mt-1 text-[11px] text-[#929bab]">Create and customize category names and colors.</p></div><button onClick={() => { setSelectedCategory(null); setDialog("category"); }} className="rounded-lg bg-[#172b55] px-3 py-2 text-[10px] font-semibold text-white">Add category</button></div>{categories.length === 0 ? <p className="py-10 text-center text-xs text-[#8b95a5]">No categories yet. Add one above.</p> : <ul className="mt-4 divide-y divide-[#edf0f4]">{categories.map((category) => <li key={category.id} className="flex items-center justify-between gap-3 py-3"><span className="flex items-center gap-3 text-xs font-medium text-[#435069]"><span aria-hidden="true" className="h-5 w-5 rounded-full border border-black/10" style={{ backgroundColor: category.color }} />{category.name}</span><span className="flex gap-2"><button onClick={() => { setSelectedCategory(category); setDialog("category"); }} className="rounded-md px-2 py-1 text-[10px] text-[#6478ce] hover:bg-[#eff1fa]">Edit</button><button onClick={() => void deleteCategory(category)} className="rounded-md px-2 py-1 text-[10px] text-[#ae554c] hover:bg-[#fff0ee]">Delete</button></span></li>)}</ul>}</section>}
          </div>
        </main>
      </div>
      {(dialog === "create" || dialog === "edit") && <Dialog title={dialog === "edit" ? "Edit expense" : selected ? "Duplicate expense" : "New expense"} onClose={() => { setDialog(null); setSelected(null); }}><ExpenseForm key={`${dialog}-${selected?.id ?? "new"}`} initial={draftInitial} categories={categories} busy={saving} error={formError} onCancel={() => { setDialog(null); setSelected(null); }} onSubmit={(draft) => void saveExpense(draft)} /></Dialog>}
      {dialog === "recurring" && <Dialog title={selectedRecurring ? "Edit recurring schedule" : "New recurring schedule"} onClose={() => { setDialog(null); setSelectedRecurring(null); }}><ExpenseForm key={`recurring-${selectedRecurring?.id ?? "new"}`} initial={draftInitial} categories={categories} busy={saving} error={formError} recurringOnly onCancel={() => { setDialog(null); setSelectedRecurring(null); }} onSubmit={(draft) => void saveExpense(draft, true)} /></Dialog>}
      {dialog === "category" && <Dialog title={selectedCategory ? "Edit category" : "Create category"} onClose={() => { setDialog(null); setSelectedCategory(null); }}><CategoryForm key={selectedCategory?.id ?? "new-category"} initial={selectedCategory} busy={categoryBusy} onCancel={() => { setDialog(null); setSelectedCategory(null); }} onSubmit={(draft) => void saveCategory(draft)} /></Dialog>}
      {dialog === "detail" && selected && <Dialog title={selected.description} onClose={() => { setDialog(null); setSelected(null); }}>
        <div className="max-h-[75vh] space-y-4 overflow-y-auto pr-1">
          {detailLoading ? <p role="status" className="py-12 text-center text-xs text-[#8b95a5]">Loading expense details?</p> : detailError ? <p role="alert" className="py-8 text-center text-xs text-[#9b514b]">{detailError}</p> : <>
            <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-2xl font-semibold tracking-tight text-[#202d45]">{money(selected.amount, selected.currency)}</p><span className={selected.status === "paid" ? "rounded-full bg-[#edf5f0] px-3 py-1 text-[10px] font-semibold text-[#39775c]" : selected.status === "cancelled" ? "rounded-full bg-[#fff0ee] px-3 py-1 text-[10px] font-semibold text-[#ae554c]" : "rounded-full bg-[#f8f2e7] px-3 py-1 text-[10px] font-semibold text-[#a47b3d]"}>{isOverdue(selected) ? "Overdue" : selected.status}</span></div>
            <dl className="grid grid-cols-2 gap-4 rounded-xl bg-[#f8f9fc] p-4 text-xs"><div><dt className="text-[#929bab]">Expense date</dt><dd className="mt-1 font-medium text-[#435069]">{readableDate(selected.expenseDate)}</dd></div><div><dt className="text-[#929bab]">Created</dt><dd className="mt-1 font-medium text-[#435069]">{readableDate(selected.createdAt)}</dd></div><div><dt className="text-[#929bab]">Category</dt><dd className="mt-1 font-medium text-[#435069]">{selected.categoryName || "Uncategorized"}</dd></div><div><dt className="text-[#929bab]">Merchant</dt><dd className="mt-1 font-medium text-[#435069]">{selected.merchant || "?"}</dd></div><div><dt className="text-[#929bab]">Currency</dt><dd className="mt-1 font-medium text-[#435069]">{selected.currency}</dd></div><div><dt className="text-[#929bab]">Status</dt><dd className="mt-1 font-medium capitalize text-[#435069]">{selected.status}</dd></div></dl>
            <div><p className="text-[10px] font-semibold uppercase text-[#929bab]">Notes</p><p className="mt-1 whitespace-pre-wrap text-xs text-[#566278]">{selected.notes || "No notes provided."}</p></div>
            <section className="rounded-xl border border-[#edf0f4] p-4">
              <h3 className="text-[10px] font-semibold uppercase text-[#929bab]">Receipt</h3>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {selected.hasReceipt && <>
                  <button type="button" disabled={receiptBusy || receiptDeleting} onClick={() => void downloadReceipt(selected)} className="rounded-lg border border-[#e5e9f0] px-3 py-2 text-xs font-medium text-[#566278] disabled:opacity-50">{receiptBusy ? "Downloading…" : "Download receipt"}</button>
                  <button type="button" disabled={receiptBusy || receiptDeleting || receiptUploading} onClick={() => void deleteReceipt(selected)} className="rounded-lg border border-[#f0d7d4] px-3 py-2 text-xs font-medium text-[#ae554c] disabled:opacity-50">{receiptDeleting ? "Deleting…" : "Delete receipt"}</button>
                </>}
                <label className="inline-flex cursor-pointer items-center rounded-lg border border-[#e5e9f0] px-3 py-2 text-xs font-medium text-[#566278] hover:bg-[#f7f8fa] has-[:disabled]:cursor-wait has-[:disabled]:opacity-50">
                  {receiptUploading ? "Uploading…" : selected.hasReceipt ? "Replace receipt" : "Upload receipt"}
                  <input type="file" className="sr-only" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={receiptUploading} aria-label="Upload or replace receipt file" onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = "";
                    if (file) void uploadReceipt(selected, file);
                  }} />
                </label>
                <span className="text-[10px] text-[#929bab]">PDF, JPEG, PNG, or WebP · up to 4 MB</span>
              </div>
              {receiptError && <p role="alert" className="mt-2 text-[10px] text-[#9b514b]">{receiptError}</p>}
            </section>
            <section><h3 className="text-[10px] font-semibold uppercase text-[#929bab]">Status history</h3>{historyError ? <p role="status" className="mt-2 text-[10px] text-[#929bab]">{historyError}</p> : detailHistory.length ? <ol className="mt-2 space-y-3 border-l border-[#e5e9f0] pl-4">{detailHistory.map((entry, index) => <li key={entry.changedAt + index} className="relative"><span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-[#6478ce]" /><p className="text-[11px] font-medium capitalize text-[#435069]">{entry.fromStatus ? entry.fromStatus + " to " : "Created as "}{entry.toStatus}</p><p className="mt-0.5 text-[10px] text-[#929bab]">{readableDate(entry.changedAt)}</p></li>)}</ol> : <p className="mt-2 text-[10px] text-[#929bab]">No status history available.</p>}</section>
            <div className="flex justify-end gap-2 border-t border-[#edf0f4] pt-4"><button onClick={() => { setDialog(null); openCreate(selected); }} className="rounded-lg border border-[#e5e9f0] px-3 py-2 text-xs text-[#566278]">Duplicate</button><button disabled={selected.status !== "draft"} onClick={() => { setDialog("edit"); setFormError(""); }} className="rounded-lg bg-[#172b55] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">Edit</button><button disabled={selected.status !== "draft"} onClick={() => void deleteExpense(selected)} className="rounded-lg border border-[#f0d7d4] px-3 py-2 text-xs text-[#ae554c] disabled:opacity-40">Delete</button></div>
          </>}
        </div>
      </Dialog>}
    </div>
  );
}
