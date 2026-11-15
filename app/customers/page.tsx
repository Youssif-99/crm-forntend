"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type CustomerStatus = "lead" | "prospect" | "customer";
type StatusFilter = "all" | CustomerStatus;
const customerStatuses: CustomerStatus[] = ["lead", "prospect", "customer"];

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: CustomerStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type CustomerDraft = {
  name: string;
  email: string;
  phone: string;
  company: string;
  status: CustomerStatus;
  notes: string;
};

type WorkspaceUser = { name: string; email: string };
type IconName = "dashboard" | "customers" | "invoices" | "expenses" | "tasks" | "appointments" | "settings" | "search" | "plus" | "logout" | "close" | "edit" | "trash" | "arrow";

const navigation: { name: string; href?: string; icon: IconName; current?: boolean }[] = [
  { name: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { name: "Customers", href: "/customers", icon: "customers", current: true },
  { name: "Sales", href: "/sales", icon: "invoices" },
  { name: "Invoices", href: "/invoices", icon: "invoices" },
  { name: "Expenses", href: "/expenses", icon: "expenses" },
  { name: "Tasks", href: "/tasks", icon: "tasks" },
  { name: "Appointments", href: "/appointments", icon: "appointments" },
  { name: "Settings", href: "/settings", icon: "settings" },
];

const statusLabels: Record<CustomerStatus, string> = {
  lead: "Lead",
  prospect: "Prospect",
  customer: "Customer",
};

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
    plus: <><path d="M12 5v14M5 12h14" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    edit: <><path d="m15 5 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4Z" /></>,
    trash: <><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  };
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {paths[name]}
    </svg>
  );
}

function BrandMark() {
  return <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#172b55] text-sm font-bold text-white">B</span>;
}

function initials(name: string) {
  return name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}

function customerDraft(customer?: Customer): CustomerDraft {
  return {
    name: customer?.name ?? "",
    email: customer?.email ?? "",
    phone: customer?.phone ?? "",
    company: customer?.company ?? "",
    status: customer?.status ?? "lead",
    notes: customer?.notes ?? "",
  };
}

function isCustomerStatus(value: string): value is CustomerStatus {
  return value === "lead" || value === "prospect" || value === "customer";
}

function StatusBadge({ status }: { status: CustomerStatus }) {
  const styles: Record<CustomerStatus, string> = {
    lead: "bg-[#f1f3f8] text-[#65718a]",
    prospect: "bg-[#f8f2e7] text-[#a47b3d]",
    customer: "bg-[#edf5f0] text-[#5b9275]",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium ${styles[status]}`}>{statusLabels[status]}</span>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold text-[#566278]">{label}</span>
      {children}
    </label>
  );
}

function CustomerForm({
  initial,
  saving,
  error,
  onCancel,
  onSubmit,
}: {
  initial: CustomerDraft;
  saving: boolean;
  error: string;
  onCancel: () => void;
  onSubmit: (draft: CustomerDraft) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const inputClass = "h-10 w-full rounded-lg border border-[#e5e9f0] bg-white px-3 text-xs text-[#435069] outline-none transition placeholder:text-[#a0a8b5] focus:border-[#bbc5e8] focus:ring-2 focus:ring-[#6478ce]/10";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(draft);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <p role="alert" className="rounded-lg border border-[#f0d7d4] bg-[#fff7f6] px-3 py-2.5 text-xs text-[#9b514b]">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name *">
          <input required maxLength={120} autoFocus value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="e.g. Maya Hassan" className={inputClass} />
        </Field>
        <Field label="Company">
          <input maxLength={120} value={draft.company} onChange={(event) => setDraft({ ...draft, company: event.target.value })} placeholder="Company name" className={inputClass} />
        </Field>
        <Field label="Email">
          <input type="email" maxLength={254} value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} placeholder="name@example.com" className={inputClass} />
        </Field>
        <Field label="Phone">
          <input type="tel" maxLength={40} value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} placeholder="+20 100 000 0000" className={inputClass} />
        </Field>
        <Field label="Status">
          <select value={draft.status} onChange={(event) => { if (isCustomerStatus(event.target.value)) setDraft({ ...draft, status: event.target.value }); }} className={inputClass}>
            {customerStatuses.map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Notes">
            <textarea maxLength={2000} rows={3} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Add context, preferences, or follow-up notes..." className="w-full resize-y rounded-lg border border-[#e5e9f0] bg-white px-3 py-2.5 text-xs text-[#435069] outline-none transition placeholder:text-[#a0a8b5] focus:border-[#bbc5e8] focus:ring-2 focus:ring-[#6478ce]/10" />
          </Field>
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-[#f0f2f5] pt-4">
        <button type="button" onClick={onCancel} disabled={saving} className="rounded-lg border border-[#e5e9f0] px-4 py-2.5 text-xs font-semibold text-[#65718a] transition hover:bg-[#f8f9fb] disabled:opacity-50">Cancel</button>
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#172b55] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#243c70] disabled:opacity-60">
          {saving ? "Saving..." : "Save customer"}
        </button>
      </div>
    </form>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#17233c]/35 p-4 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="customer-modal-title" className="my-auto w-full max-w-[560px] rounded-2xl border border-[#e9edf2] bg-white p-5 shadow-[0_24px_70px_rgba(27,39,62,0.2)] sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="customer-modal-title" className="text-[17px] font-semibold tracking-[-0.03em] text-[#27344c]">{title}</h2>
            <p className="mt-1 text-[11px] text-[#8b95a5]">Keep important customer details and follow-ups together.</p>
          </div>
          <button onClick={onClose} aria-label="Close dialog" className="rounded-lg p-1.5 text-[#8b95a5] transition hover:bg-[#f4f5f8] hover:text-[#46536a]"><Icon name="close" className="h-4 w-4" /></button>
        </div>
        {children}
      </section>
    </div>
  );
}

export default function CustomersPage() {
  const router = useRouter();
  const [user, setUser] = useState<WorkspaceUser | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [editing, setEditing] = useState<Customer | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deletePending, setDeletePending] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function loadWorkspace() {
      try {
        const [customerResponse, userResponse] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/customers`, { credentials: "include", signal: controller.signal }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/auth/me`, { credentials: "include", signal: controller.signal }),
        ]);
        if (customerResponse.status === 401 || userResponse.status === 401) {
          router.replace("/authPages/sign-in");
          return;
        }
        if (!customerResponse.ok || !userResponse.ok) {
          throw new Error("We couldn't load your customers. Please try again.");
        }
        const [customerResult, userResult]: [{ customers?: Customer[] }, { user?: WorkspaceUser }] = await Promise.all([
          customerResponse.json(),
          userResponse.json(),
        ]);
        if (!Array.isArray(customerResult.customers) || !userResult.user?.name || !userResult.user.email) {
          throw new Error("Your customer records couldn't be loaded. Please try again.");
        }
        setCustomers(customerResult.customers);
        setUser(userResult.user);
      } catch (error) {
        if (controller.signal.aborted) return;
        setPageError(error instanceof Error ? error.message : "We couldn't connect to your workspace.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadWorkspace();
    return () => controller.abort();
  }, [loadAttempt, router]);

  const visibleCustomers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return customers.filter((customer) => {
      const matchesStatus = filter === "all" || customer.status === filter;
      const matchesQuery = !normalizedQuery || [customer.name, customer.email, customer.phone, customer.company, customer.status, customer.notes]
        .some((value) => value?.toLowerCase().includes(normalizedQuery));
      return matchesStatus && matchesQuery;
    });
  }, [customers, filter, query]);

  const counts = useMemo(() => ({
    all: customers.length,
    lead: customers.filter((customer) => customer.status === "lead").length,
    prospect: customers.filter((customer) => customer.status === "prospect").length,
    customer: customers.filter((customer) => customer.status === "customer").length,
  }), [customers]);

  async function responseError(response: Response) {
    try {
      const result: { error?: string } = await response.json();
      return result.error || "Something went wrong. Please try again.";
    } catch {
      return "Something went wrong. Please try again.";
    }
  }

  function openCreate() {
    setEditing(null);
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(customer: Customer) {
    setEditing(customer);
    setFormError("");
    setFormOpen(true);
  }

  async function saveCustomer(draft: CustomerDraft) {
    setSaving(true);
    setFormError("");
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/customers${editing ? `/${editing.id}` : ""}`,
        {
          method: editing ? "PUT" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        },
      );
      if (response.status === 401) {
        router.replace("/authPages/sign-in");
        return;
      }
      if (!response.ok) {
        setFormError(await responseError(response));
        return;
      }
      const result: { customer: Customer } = await response.json();
      setCustomers((current) => editing
        ? current.map((customer) => customer.id === editing.id ? result.customer : customer)
        : [result.customer, ...current]);
      setFormOpen(false);
      setEditing(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "We couldn't save this customer. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCustomer() {
    if (!deleting) return;
    setDeleteError("");
    setDeletePending(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/customers/${deleting.id}`,
        { method: "DELETE", credentials: "include" },
      );
      if (response.status === 401) {
        router.replace("/authPages/sign-in");
        return;
      }
      if (!response.ok) {
        setDeleteError(await responseError(response));
        return;
      }
      setCustomers((current) => current.filter((customer) => customer.id !== deleting.id));
      setDeleting(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "We couldn't delete this customer. Please try again.");
    } finally {
      setDeletePending(false);
    }
  }

  async function signOut() {
    setSigningOut(true);
    setPageError("");
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/auth/logout`, { method: "POST", credentials: "include" });
      if (!response.ok) throw new Error("We couldn't sign you out. Please try again.");
      router.replace("/authPages/sign-in");
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "We couldn't connect to your account.");
      setSigningOut(false);
    }
  }

  const navItems = navigation.map((item) => item.href ? (
    <Link key={item.name} href={item.href} aria-current={item.current ? "page" : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition ${item.current ? "bg-[#eff1fa] text-[#566bbd]" : "text-[#737f92] hover:bg-[#f7f8fa] hover:text-[#36435b]"}`}>
      <Icon name={item.icon} className="h-[17px] w-[17px]" />{item.name}
    </Link>
  ) : (
    <span key={item.name} aria-disabled="true" title="Coming soon" className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-[#a6adba]">
      <Icon name={item.icon} className="h-[17px] w-[17px]" /><span className="flex-1">{item.name}</span><span className="text-[9px] text-[#b3bac5]">SOON</span>
    </span>
  ));

  if (loading) {
    return <main className="crm-workspace flex min-h-screen items-center justify-center bg-[#f7f8fa]"><div role="status" className="flex items-center gap-3 text-sm text-[#738097]"><span className="h-5 w-5 animate-spin rounded-full border-2 border-[#dce2f0] border-t-[#6278cf]" />Loading your customers...</div></main>;
  }

  if (pageError && !user) {
    return <main className="crm-workspace flex min-h-screen items-center justify-center bg-[#f7f8fa] px-5"><section className="w-full max-w-md rounded-2xl border border-[#e8ebf0] bg-white p-8 text-center shadow-sm"><BrandMark /><h1 className="mt-5 text-xl font-semibold text-[#25324a]">We couldn&apos;t open your CRM</h1><p role="alert" className="mt-2 text-sm leading-6 text-[#788397]">{pageError}</p><button onClick={() => { setPageError(""); setLoading(true); setLoadAttempt((attempt) => attempt + 1); }} className="mt-6 rounded-lg bg-[#172b55] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#243c70]">Try again</button><Link href="/authPages/sign-in" className="ml-3 text-sm font-semibold text-[#6377c8] hover:text-[#4057b1]">Sign in</Link></section></main>;
  }

  return (
    <main className="crm-workspace min-h-screen bg-[#f7f8fa] text-[#26334b]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[242px] shrink-0 flex-col border-r border-[#e9ecf1] bg-white px-4 py-5 lg:flex">
          <Link href="/dashboard" className="mb-9 flex items-center gap-2.5 px-2" aria-label="BusinessOS dashboard"><BrandMark /><span className="text-[16px] font-semibold tracking-[-0.04em] text-[#24324b]">Business<span className="text-[#6278cf]">OS</span></span></Link>
          <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.12em] text-[#a2aab8]">WORKSPACE</p>
          <nav aria-label="Workspace navigation" className="space-y-1">{navItems}</nav>
          <div className="mt-auto">
            <div className="mb-4 rounded-xl border border-[#edf0f4] bg-[#fbfcfd] p-3.5"><p className="text-xs font-semibold text-[#46536a]">Customer relationships</p><p className="mt-1 text-[11px] leading-5 text-[#8a95a6]">Keep every customer detail and follow-up in one place.</p></div>
            <div className="flex items-center gap-3 border-t border-[#eef0f4] px-2 pt-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8ebf8] text-xs font-semibold text-[#596cb9]">{user ? initials(user.name) : "U"}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-[#344159]">{user?.name}</span><span className="block truncate text-[10px] text-[#929bab]">{user?.email}</span></span>
            </div>
            <button onClick={signOut} disabled={signingOut} className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[#69758a] hover:bg-[#f6f7f9] disabled:opacity-50"><Icon name="logout" className="h-4 w-4" />{signingOut ? "Signing out..." : "Sign out"}</button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex h-[68px] items-center justify-between border-b border-[#e9ecf1] bg-white px-4 sm:px-7 lg:px-9">
            <div className="flex items-center gap-3"><span className="lg:hidden"><BrandMark /></span><span className="hidden text-[13px] font-medium text-[#99a2b0] sm:inline">Workspace</span><span className="hidden text-[#c0c6d0] sm:inline">/</span><span className="text-[13px] font-semibold text-[#46536a]">Customers</span></div>
            <button onClick={signOut} disabled={signingOut} className="text-xs font-semibold text-[#69758a] hover:text-[#33415b] lg:hidden">{signingOut ? "Signing out..." : "Sign out"}</button>
          </header>
          <nav aria-label="Workspace navigation" className="flex gap-1 overflow-x-auto border-b border-[#e9ecf1] bg-white px-3 py-2 lg:hidden">{navItems}</nav>

          <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-7 sm:py-9 lg:px-9">
            {pageError && <p role="alert" className="mb-4 rounded-xl border border-[#f0d7d4] bg-[#fff7f6] px-4 py-3 text-xs text-[#9b514b]">{pageError}</p>}
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div><p className="text-[11px] font-medium text-[#929bab]">CUSTOMER RELATIONSHIPS</p><h1 className="mt-2 text-[28px] font-semibold tracking-[-0.055em] text-[#202d45] sm:text-[32px]">Customers</h1><p className="mt-1.5 text-[13px] text-[#8490a2]">Keep your contacts organized and every relationship moving forward.</p></div>
              <button onClick={openCreate} className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#172b55] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#243c70]"><Icon name="plus" className="h-4 w-4" />Add customer</button>
            </div>

            <section aria-label="Customer status summary" className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
              {[
                { label: "All contacts", value: counts.all, color: "text-[#4d5a70]" },
                { label: "Leads", value: counts.lead, color: "text-[#65718a]" },
                { label: "Prospects", value: counts.prospect, color: "text-[#a47b3d]" },
                { label: "Customers", value: counts.customer, color: "text-[#5b9275]" },
              ].map((item) => <article key={item.label} className="rounded-2xl border border-[#e9edf2] bg-white px-4 py-4 sm:px-5"><p className="text-[11px] font-medium text-[#8994a6]">{item.label}</p><p className={`mt-2 text-[25px] font-semibold leading-none tracking-[-0.05em] ${item.color}`}>{item.value}</p></article>)}
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#e9edf2] bg-white">
              <div className="flex flex-col gap-3 border-b border-[#f0f2f5] p-4 sm:px-5 sm:py-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div><h2 className="text-[13px] font-semibold text-[#35415a]">All customers <span className="ml-1 font-normal text-[#9aa3b1]">({visibleCustomers.length})</span></h2><p className="mt-1 text-[11px] text-[#98a1af]">Search and manage your customer records</p></div>
                  <label className="relative w-full sm:max-w-[270px]"><span className="sr-only">Search customers</span><Icon name="search" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a0a9b7]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, company, email..." className="h-9 w-full rounded-lg border border-[#e9ecf1] bg-[#fbfcfd] pl-9 pr-3 text-xs text-[#435069] outline-none placeholder:text-[#a0a8b5] focus:border-[#bbc5e8] focus:ring-2 focus:ring-[#6478ce]/10" /></label>
                </div>
                <div className="flex flex-wrap gap-1.5" aria-label="Filter customers by status">
                  {(["all", "lead", "prospect", "customer"] as const).map((status) => {
                    const label = status === "all" ? "All contacts" : statusLabels[status];
                    return <button key={status} onClick={() => setFilter(status)} aria-pressed={filter === status} className={`rounded-lg px-3 py-1.5 text-[10px] font-medium transition ${filter === status ? "bg-[#eff1fa] text-[#566bbd]" : "text-[#7e899b] hover:bg-[#f7f8fa]"}`}>{label}<span className="ml-1.5 opacity-70">{counts[status]}</span></button>;
                  })}
                </div>
              </div>

              {visibleCustomers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left">
                    <thead><tr className="border-b border-[#f0f2f5] text-[9px] font-semibold tracking-[0.06em] text-[#9ba4b1]"><th className="px-5 py-3">CUSTOMER</th><th className="px-3 py-3">COMPANY</th><th className="px-3 py-3">STATUS</th><th className="px-3 py-3">CONTACT</th><th className="px-3 py-3">ADDED</th><th className="px-4 py-3 text-right">ACTIONS</th></tr></thead>
                    <tbody>{visibleCustomers.map((customer) => <tr key={customer.id} className="border-b border-[#f3f4f6] last:border-0 hover:bg-[#fcfcfd]">
                      <td className="px-5 py-3.5"><Link href={`/customers/${customer.id}`} className="flex items-center gap-2.5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8ebf8] text-[10px] font-semibold text-[#596cb9]">{initials(customer.name)}</span><span className="min-w-0"><span className="block max-w-[180px] truncate text-[11px] font-semibold text-[#4a566c] hover:text-[#566bbd]">{customer.name}</span><span className="mt-0.5 block max-w-[180px] truncate text-[9px] text-[#a0a8b5]">{customer.email || "No email added"}</span></span></Link></td>
                      <td className="px-3 py-3.5 text-[10px] text-[#758196]">{customer.company || "—"}</td>
                      <td className="px-3 py-3.5"><StatusBadge status={customer.status} /></td>
                      <td className="px-3 py-3.5">{customer.phone ? <a href={`tel:${customer.phone}`} className="text-[10px] text-[#758196] hover:text-[#566bbd]">{customer.phone}</a> : <span className="text-[10px] text-[#a0a8b5]">—</span>}</td>
                      <td className="px-3 py-3.5 text-[10px] text-[#8792a3]">{new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(customer.createdAt))}</td>
                      <td className="px-4 py-3.5"><div className="flex justify-end gap-1"><button onClick={() => openEdit(customer)} aria-label={`Edit ${customer.name}`} className="rounded-lg p-2 text-[#8b95a5] transition hover:bg-[#f1f3fa] hover:text-[#566bbd]"><Icon name="edit" className="h-4 w-4" /></button><button onClick={() => { setDeleteError(""); setDeleting(customer); }} aria-label={`Delete ${customer.name}`} className="rounded-lg p-2 text-[#8b95a5] transition hover:bg-[#fff1ef] hover:text-[#b75a51]"><Icon name="trash" className="h-4 w-4" /></button></div></td>
                    </tr>)}</tbody>
                  </table>
                </div>
              ) : (
                <div className="flex min-h-[260px] flex-col items-center justify-center px-6 py-10 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f0f2fb] text-[#6879c6]"><Icon name={query || filter !== "all" ? "search" : "customers"} className="h-5 w-5" /></span>
                  <h3 className="mt-4 text-[14px] font-semibold text-[#35415a]">{query || filter !== "all" ? "No matching customers" : "Your customer list starts here"}</h3>
                  <p className="mt-1.5 max-w-sm text-[11px] leading-5 text-[#8b95a5]">{query || filter !== "all" ? "Try another search or choose a different status filter." : "Add your first customer to keep their contact details, status, and notes in one place."}</p>
                  {query || filter !== "all" ? <button onClick={() => { setQuery(""); setFilter("all"); }} className="mt-4 text-[11px] font-semibold text-[#6377c8] hover:text-[#4057b1]">Clear filters</button> : <button onClick={openCreate} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#172b55] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#243c70]"><Icon name="plus" className="h-4 w-4" />Add first customer</button>}
                </div>
              )}
            </section>
            <p className="mt-5 text-center text-[10px] text-[#a1a9b5]">Customer records are private to your account</p>
          </div>
        </div>
      </div>

      {formOpen && <Modal title={editing ? "Edit customer" : "Add a customer"} onClose={() => { if (!saving) setFormOpen(false); }}><CustomerForm key={editing?.id ?? "new"} initial={customerDraft(editing ?? undefined)} saving={saving} error={formError} onCancel={() => setFormOpen(false)} onSubmit={saveCustomer} /></Modal>}
      {deleting && <Modal title="Delete customer?" onClose={() => { if (!deletePending) setDeleting(null); }}><p className="text-xs leading-5 text-[#788397]">This will permanently remove <span className="font-semibold text-[#46536a]">{deleting.name}</span> and their saved details from your customer list.</p>{deleteError && <p role="alert" className="mt-3 rounded-lg border border-[#f0d7d4] bg-[#fff7f6] px-3 py-2.5 text-xs text-[#9b514b]">{deleteError}</p>}<div className="mt-5 flex justify-end gap-2 border-t border-[#f0f2f5] pt-4"><button onClick={() => setDeleting(null)} disabled={deletePending} className="rounded-lg border border-[#e5e9f0] px-4 py-2.5 text-xs font-semibold text-[#65718a] hover:bg-[#f8f9fb] disabled:opacity-50">Cancel</button><button onClick={deleteCustomer} disabled={deletePending} className="rounded-lg bg-[#a9413a] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#913a34] disabled:opacity-60">{deletePending ? "Deleting..." : "Delete customer"}</button></div></Modal>}
    </main>
  );
}
