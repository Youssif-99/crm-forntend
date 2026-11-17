"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUserPreferences } from "../components/PreferencesProvider";

type DocumentType = "invoice" | "quote";
type DocumentStatus = "draft" | "sent" | "paid" | "accepted" | "rejected";
type Currency = "EGP" | "USD" | "EUR";
type TypeFilter = "all" | DocumentType;

type Customer = {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
};

type InvoiceItem = {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  type: DocumentType;
  status: DocumentStatus;
  customerId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerCompany: string | null;
  issueDate: string;
  dueDate: string | null;
  currency: Currency;
  subtotal: string;
  taxRate: string;
  taxAmount: string;
  total: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: InvoiceItem[];
};

type DraftItem = { description: string; quantity: string; unitPrice: string };
type InvoiceDraft = {
  type: DocumentType;
  customerId: string;
  issueDate: string;
  dueDate: string;
  currency: Currency;
  taxRate: string;
  notes: string;
  items: DraftItem[];
};

type WorkspaceUser = { name: string; email: string };
type IconName = "dashboard" | "customers" | "invoices" | "expenses" | "tasks" | "appointments" | "settings" | "search" | "plus" | "logout" | "close" | "edit" | "trash" | "print" | "download";

const navigation: { name: string; href?: string; icon: IconName; current?: boolean }[] = [
  { name: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { name: "Customers", href: "/customers", icon: "customers" },
  { name: "Sales", href: "/sales", icon: "invoices" },
  { name: "Invoices", href: "/invoices", icon: "invoices", current: true },
  { name: "Expenses", href: "/expenses", icon: "expenses" },
  { name: "Tasks", href: "/tasks", icon: "tasks" },
  { name: "Appointments", href: "/appointments", icon: "appointments" },
  { name: "Settings", href: "/settings", icon: "settings" },
];

const statusLabels: Record<DocumentStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  accepted: "Accepted",
  rejected: "Rejected",
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
    print: <><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v7H6zM18 12h.01" /></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4" /></>,
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

function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatCurrency(value: string | number, currency: Currency) {
  return new Intl.NumberFormat("en-EG", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value));
}

function lineTotal(item: DraftItem) {
  return Math.round((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) * 100) / 100;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = value.slice(0, 10);
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${date}T00:00:00`));
}

function getDocumentDraft(invoice?: Invoice, defaultType: DocumentType = "invoice"): InvoiceDraft {
  const today = localDate();
  const due = new Date();
  due.setDate(due.getDate() + 14);
  return {
    type: invoice?.type ?? defaultType,
    customerId: invoice?.customerId ?? "",
    issueDate: invoice?.issueDate.slice(0, 10) ?? today,
    dueDate: invoice?.dueDate?.slice(0, 10) ?? localDate(due),
    currency: invoice?.currency ?? "EGP",
    taxRate: invoice?.taxRate ?? "0",
    notes: invoice?.notes ?? "",
    items: invoice?.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })) ?? [{ description: "", quantity: "1", unitPrice: "" }],
  };
}

function StatusBadge({ invoice }: { invoice: Invoice }) {
  const isOverdue = invoice.type === "invoice" && invoice.status === "sent" && invoice.dueDate && invoice.dueDate.slice(0, 10) < localDate();
  const label = isOverdue ? "Overdue" : statusLabels[invoice.status];
  const style = isOverdue
    ? "bg-[#fff0ee] text-[#ae554c]"
    : invoice.status === "paid" || invoice.status === "accepted"
      ? "bg-[#edf5f0] text-[#5b9275]"
      : invoice.status === "sent"
        ? "bg-[#eef1fb] text-[#6679cb]"
        : invoice.status === "rejected"
          ? "bg-[#fff0ee] text-[#ae554c]"
          : "bg-[#f1f3f8] text-[#65718a]";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium ${style}`}>{label}</span>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-[#566278]">{label}</span>{children}</label>;
}

function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#17233c]/35 p-3 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="invoice-modal-title" className={`my-auto w-full ${wide ? "max-w-[850px]" : "max-w-[680px]"} rounded-2xl border border-[#e9edf2] bg-white p-5 shadow-[0_24px_70px_rgba(27,39,62,0.2)] sm:p-6`}>
        <div className="invoice-print-hidden mb-5 flex items-start justify-between gap-4">
          <div><h2 id="invoice-modal-title" className="text-[17px] font-semibold tracking-[-0.03em] text-[#27344c]">{title}</h2><p className="mt-1 text-[11px] text-[#8b95a5]">Create, manage, and share your business documents.</p></div>
          <button onClick={onClose} aria-label="Close dialog" className="rounded-lg p-1.5 text-[#8b95a5] transition hover:bg-[#f4f5f8] hover:text-[#46536a]"><Icon name="close" className="h-4 w-4" /></button>
        </div>
        {children}
      </section>
    </div>
  );
}

function InvoiceForm({
  initial,
  customers,
  editing,
  saving,
  error,
  onCancel,
  onSubmit,
}: {
  initial: InvoiceDraft;
  customers: Customer[];
  editing: boolean;
  saving: boolean;
  error: string;
  onCancel: () => void;
  onSubmit: (draft: InvoiceDraft) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const inputClass = "h-10 w-full rounded-lg border border-[#e5e9f0] bg-white px-3 text-xs text-[#435069] outline-none transition placeholder:text-[#a0a8b5] focus:border-[#bbc5e8] focus:ring-2 focus:ring-[#6478ce]/10";
  const subtotal = draft.items.reduce((sum, item) => sum + lineTotal(item), 0);
  const taxRate = Math.max(0, Number(draft.taxRate) || 0);
  const taxAmount = Math.round(subtotal * taxRate) / 100;
  const total = subtotal + taxAmount;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(draft);
  }

  function updateItem(index: number, field: keyof DraftItem, value: string) {
    setDraft((current) => ({ ...current, items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item) }));
  }

  return (
    <form onSubmit={submit} className="max-h-[calc(100vh-125px)] space-y-5 overflow-y-auto pr-1">
      {error && <p role="alert" className="rounded-lg border border-[#f0d7d4] bg-[#fff7f6] px-3 py-2.5 text-xs text-[#9b514b]">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Document type">
          <select disabled={editing} value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value === "quote" ? "quote" : "invoice" })} className={`${inputClass} disabled:bg-[#f7f8fa] disabled:text-[#8b95a5]`}>
            <option value="invoice">Invoice</option><option value="quote">Quote / estimate</option>
          </select>
        </Field>
        <Field label="Customer">
          <select value={draft.customerId} onChange={(event) => setDraft({ ...draft, customerId: event.target.value })} className={inputClass}>
            <option value="">No customer selected</option>
            {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.company ? ` · ${customer.company}` : ""}</option>)}
          </select>
        </Field>
        <Field label="Issue date *"><input required type="date" value={draft.issueDate} onChange={(event) => setDraft({ ...draft, issueDate: event.target.value })} className={inputClass} /></Field>
        <Field label="Due date"><input type="date" min={draft.issueDate} value={draft.dueDate} onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })} className={inputClass} /></Field>
        <Field label="Currency">
          <select value={draft.currency} onChange={(event) => { if (event.target.value === "EGP" || event.target.value === "USD" || event.target.value === "EUR") setDraft({ ...draft, currency: event.target.value }); }} className={inputClass}>
            <option value="EGP">EGP · Egyptian pound</option><option value="USD">USD · US dollar</option><option value="EUR">EUR · Euro</option>
          </select>
        </Field>
        <Field label="Tax rate (%)"><input type="number" min="0" max="100" step="0.01" value={draft.taxRate} onChange={(event) => setDraft({ ...draft, taxRate: event.target.value })} className={inputClass} /></Field>
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between"><div><h3 className="text-[12px] font-semibold text-[#46536a]">Line items</h3><p className="mt-0.5 text-[10px] text-[#9aa3b1]">Describe the products or services included.</p></div></div>
        <div className="space-y-2">
          {draft.items.map((item, index) => (
            <div key={index} className="grid gap-2 rounded-xl border border-[#edf0f4] p-3 sm:grid-cols-[minmax(0,1fr)_100px_130px_105px_34px] sm:items-end sm:border-0 sm:p-0">
              <Field label={index === 0 ? "Description *" : `Item ${index + 1} *`}><input required maxLength={200} value={item.description} onChange={(event) => updateItem(index, "description", event.target.value)} placeholder="Product or service" className={inputClass} /></Field>
              <Field label={index === 0 ? "Qty *" : "Quantity"}><input required type="number" min="0.001" max="1000000" step="0.001" value={item.quantity} onChange={(event) => updateItem(index, "quantity", event.target.value)} className={inputClass} /></Field>
              <Field label={index === 0 ? `Unit price (${draft.currency}) *` : `Price (${draft.currency})`}><input required type="number" min="0" max="9999999999" step="0.01" value={item.unitPrice} onChange={(event) => updateItem(index, "unitPrice", event.target.value)} className={inputClass} /></Field>
              <div className="hidden pb-2 text-right text-[11px] font-semibold text-[#46536a] sm:block">{formatCurrency(lineTotal(item), draft.currency)}</div>
              <button type="button" disabled={draft.items.length === 1} onClick={() => setDraft({ ...draft, items: draft.items.filter((_, itemIndex) => itemIndex !== index) })} aria-label={`Remove item ${index + 1}`} className="flex h-9 w-9 items-center justify-center rounded-lg text-[#9aa3b1] hover:bg-[#fff1ef] hover:text-[#b75a51] disabled:cursor-not-allowed disabled:opacity-30 sm:mb-0.5"><Icon name="trash" className="h-4 w-4" /></button>
              <div className="text-right text-[11px] font-semibold text-[#46536a] sm:hidden">Line total: {formatCurrency(lineTotal(item), draft.currency)}</div>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setDraft({ ...draft, items: [...draft.items, { description: "", quantity: "1", unitPrice: "" }] })} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[#dfe4ec] px-3 py-2 text-[10px] font-semibold text-[#7180b9] transition hover:border-[#bdc8e8] hover:bg-[#fafbfe]"><Icon name="plus" className="h-3.5 w-3.5" />Add line item</button>
      </section>

      <div className="grid gap-5 border-t border-[#f0f2f5] pt-4 sm:grid-cols-[1fr_260px]">
        <Field label="Notes / terms"><textarea maxLength={2000} rows={3} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Payment terms or a note for your customer..." className="w-full resize-y rounded-lg border border-[#e5e9f0] bg-white px-3 py-2.5 text-xs text-[#435069] outline-none placeholder:text-[#a0a8b5] focus:border-[#bbc5e8] focus:ring-2 focus:ring-[#6478ce]/10" /></Field>
        <div className="space-y-2.5 text-xs">
          <div className="flex justify-between text-[#788397]"><span>Subtotal</span><span>{formatCurrency(subtotal, draft.currency)}</span></div>
          <div className="flex justify-between text-[#788397]"><span>Tax ({taxRate}%)</span><span>{formatCurrency(taxAmount, draft.currency)}</span></div>
          <div className="flex justify-between border-t border-[#edf0f4] pt-2.5 font-semibold text-[#27344c]"><span>Total</span><span>{formatCurrency(total, draft.currency)}</span></div>
        </div>
      </div>
      <div className="invoice-print-hidden flex justify-end gap-2 border-t border-[#f0f2f5] pt-4">
        <button type="button" onClick={onCancel} disabled={saving} className="rounded-lg border border-[#e5e9f0] px-4 py-2.5 text-xs font-semibold text-[#65718a] transition hover:bg-[#f8f9fb] disabled:opacity-50">Cancel</button>
        <button type="submit" disabled={saving} className="rounded-lg bg-[#172b55] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#243c70] disabled:opacity-60">{saving ? "Saving..." : `Save ${draft.type === "invoice" ? "invoice" : "quote"}`}</button>
      </div>
    </form>
  );
}

function InvoicePreview({ invoice, user, onPrint }: { invoice: Invoice; user: WorkspaceUser; onPrint: () => void }) {
  return (
    <div>
      <div className="invoice-print-hidden mb-4 flex flex-wrap items-center justify-between gap-2">
        <StatusBadge invoice={invoice} />
        <button onClick={onPrint} className="inline-flex items-center gap-2 rounded-lg bg-[#172b55] px-3.5 py-2 text-[11px] font-semibold text-white transition hover:bg-[#243c70]"><Icon name="print" className="h-4 w-4" />Print / Save PDF</button>
      </div>
      <article id="invoice-print" className="mx-auto max-w-[740px] rounded-xl border border-[#e9edf2] bg-white p-6 text-[#26334b] sm:p-10">
        <div className="flex flex-col justify-between gap-6 border-b border-[#e9edf2] pb-6 sm:flex-row">
          <div><p className="text-lg font-bold tracking-[-0.04em] text-[#172b55]">BusinessOS</p><p className="mt-2 text-xs font-semibold text-[#35415a]">{user.name}</p><p className="mt-1 text-[11px] text-[#8792a3]">{user.email}</p></div>
          <div className="sm:text-right"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7b87a0]">{invoice.type === "invoice" ? "Invoice" : "Quote / estimate"}</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[#202d45]">{invoice.invoiceNumber}</h2><div className="mt-2 flex gap-2 text-[10px] text-[#8792a3] sm:justify-end"><span>Issued {formatDate(invoice.issueDate)}</span>{invoice.dueDate && <span>· Due {formatDate(invoice.dueDate)}</span>}</div></div>
        </div>
        <div className="grid gap-5 py-6 sm:grid-cols-2">
          <div><p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9aa3b1]">Prepared for</p><p className="mt-2 text-sm font-semibold text-[#35415a]">{invoice.customerName || "Customer"}</p>{invoice.customerCompany && <p className="mt-1 text-xs text-[#788397]">{invoice.customerCompany}</p>}{invoice.customerEmail && <p className="mt-1 text-xs text-[#788397]">{invoice.customerEmail}</p>}</div>
          <div className="sm:text-right"><p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9aa3b1]">Document status</p><div className="mt-2 sm:flex sm:justify-end"><StatusBadge invoice={invoice} /></div><p className="mt-2 text-[10px] text-[#8792a3]">All amounts in {invoice.currency}</p></div>
        </div>
        <div className="overflow-hidden rounded-lg border border-[#edf0f4]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8f9fb] text-[9px] font-semibold uppercase tracking-[0.08em] text-[#8490a2]"><tr><th className="px-3 py-3 sm:px-4">Description</th><th className="px-2 py-3 text-right">Qty</th><th className="px-2 py-3 text-right">Unit price</th><th className="px-3 py-3 text-right sm:px-4">Amount</th></tr></thead>
            <tbody>{invoice.items.map((item) => <tr key={item.id} className="border-t border-[#edf0f4]"><td className="px-3 py-3 font-medium text-[#46536a] sm:px-4">{item.description}</td><td className="px-2 py-3 text-right text-[#788397]">{Number(item.quantity).toLocaleString("en-EG")}</td><td className="px-2 py-3 text-right text-[#788397]">{formatCurrency(item.unitPrice, invoice.currency)}</td><td className="px-3 py-3 text-right font-medium text-[#46536a] sm:px-4">{formatCurrency(item.lineTotal, invoice.currency)}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="ml-auto mt-5 w-full max-w-[260px] space-y-2.5 text-xs">
          <div className="flex justify-between text-[#788397]"><span>Subtotal</span><span>{formatCurrency(invoice.subtotal, invoice.currency)}</span></div>
          <div className="flex justify-between text-[#788397]"><span>Tax ({Number(invoice.taxRate)}%)</span><span>{formatCurrency(invoice.taxAmount, invoice.currency)}</span></div>
          <div className="flex justify-between border-t border-[#e9edf2] pt-3 text-sm font-semibold text-[#202d45]"><span>{invoice.type === "invoice" ? "Total due" : "Estimated total"}</span><span>{formatCurrency(invoice.total, invoice.currency)}</span></div>
        </div>
        {invoice.notes && <div className="mt-7 border-t border-[#edf0f4] pt-5"><p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9aa3b1]">Notes / terms</p><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[#65718a]">{invoice.notes}</p></div>}
        <div className="mt-10 border-t border-[#edf0f4] pt-4 text-[9px] text-[#a0a8b5]">Thank you for your business.</div>
      </article>
    </div>
  );
}

export default function InvoicesPage() {
  const router = useRouter();
  const { preferences } = useUserPreferences();
  const [user, setUser] = useState<WorkspaceUser | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [newDocumentType, setNewDocumentType] = useState<DocumentType>("invoice");
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [viewing, setViewing] = useState<Invoice | null>(null);
  const [deleting, setDeleting] = useState<Invoice | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [statusPending, setStatusPending] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function loadWorkspace() {
      try {
        const [invoiceResponse, customerResponse, userResponse] = await Promise.all([
          fetch(`/api/invoices`, { credentials: "include", signal: controller.signal }),
          fetch(`/api/customers`, { credentials: "include", signal: controller.signal }),
          fetch(`/api/auth/me`, { credentials: "include", signal: controller.signal }),
        ]);
        if ([invoiceResponse, customerResponse, userResponse].some((response) => response.status === 401)) {
          router.replace("/authPages/sign-in");
          return;
        }
        if (!invoiceResponse.ok || !customerResponse.ok || !userResponse.ok) throw new Error("We couldn't load your billing workspace. Please try again.");
        const [invoiceResult, customerResult, userResult]: [
          { invoices?: Invoice[] },
          { customers?: Customer[] },
          { user?: WorkspaceUser },
        ] = await Promise.all([invoiceResponse.json(), customerResponse.json(), userResponse.json()]);
        if (!Array.isArray(invoiceResult.invoices) || !Array.isArray(customerResult.customers) || !userResult.user?.name || !userResult.user.email) {
          throw new Error("Your billing workspace couldn't be loaded. Please try again.");
        }
        setInvoices(invoiceResult.invoices);
        setCustomers(customerResult.customers);
        setUser(userResult.user);
      } catch (error) {
        if (controller.signal.aborted) return;
        setLoadError(error instanceof Error ? error.message : "We couldn't connect to your workspace.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadWorkspace();
    return () => controller.abort();
  }, [loadAttempt, router]);

  const visibleInvoices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const matchesType = typeFilter === "all" || invoice.type === typeFilter;
      const matchesQuery = !normalizedQuery || [invoice.invoiceNumber, invoice.customerName, invoice.customerCompany, invoice.status, invoice.type]
        .some((value) => value?.toLowerCase().includes(normalizedQuery));
      return matchesType && matchesQuery;
    });
  }, [invoices, query, typeFilter]);

  const counts = useMemo(() => ({
    invoices: invoices.filter((invoice) => invoice.type === "invoice").length,
    quotes: invoices.filter((invoice) => invoice.type === "quote").length,
    paid: invoices.filter((invoice) => invoice.type === "invoice" && invoice.status === "paid"),
  }), [invoices]);

  const outstanding = useMemo(() => {
    const amounts = new Map<Currency, number>();
    for (const invoice of invoices) {
      if (invoice.type === "invoice" && invoice.status === "sent") amounts.set(invoice.currency, (amounts.get(invoice.currency) ?? 0) + Number(invoice.total));
    }
    return [...amounts.entries()];
  }, [invoices]);

  async function responseError(response: Response) {
    try {
      const result: { error?: string } = await response.json();
      return result.error || "Something went wrong. Please try again.";
    } catch {
      return "Something went wrong. Please try again.";
    }
  }

  function openCreate(type: DocumentType = "invoice") {
    setEditing(null);
    setFormError("");
    setFormOpen(true);
    setNewDocumentType(type);
  }

  function openEdit(invoice: Invoice) {
    setEditing(invoice);
    setFormError("");
    setFormOpen(true);
  }

  async function saveInvoice(draft: InvoiceDraft) {
    setSaving(true);
    setFormError("");
    const payload = {
      ...draft,
      customerId: draft.customerId || null,
      dueDate: draft.dueDate || null,
      taxRate: Number(draft.taxRate),
      items: draft.items.map((item) => ({ description: item.description, quantity: Number(item.quantity), unitPrice: Number(item.unitPrice) })),
    };
    try {
      const response = await fetch(
        `/api/invoices${editing ? `/${editing.id}` : ""}`,
        { method: editing ? "PUT" : "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
      );
      if (response.status === 401) {
        router.replace("/authPages/sign-in");
        return;
      }
      if (!response.ok) {
        setFormError(await responseError(response));
        return;
      }
      const result: { invoice: Invoice } = await response.json();
      setInvoices((current) => editing
        ? current.map((invoice) => invoice.id === editing.id ? result.invoice : invoice)
        : [result.invoice, ...current]);
      setFormOpen(false);
      setEditing(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "We couldn't save this document. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(invoice: Invoice, status: DocumentStatus) {
    setStatusPending(true);
    setStatusError("");
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (response.status === 401) {
        router.replace("/authPages/sign-in");
        return;
      }
      if (!response.ok) {
        setStatusError(await responseError(response));
        return;
      }
      const result: { invoice: Invoice } = await response.json();
      setInvoices((current) => current.map((item) => item.id === invoice.id ? result.invoice : item));
      setViewing(result.invoice);
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "We couldn't update the document status.");
    } finally {
      setStatusPending(false);
    }
  }

  async function deleteInvoice() {
    if (!deleting) return;
    setDeletePending(true);
    setDeleteError("");
    try {
      const response = await fetch(`/api/invoices/${deleting.id}`, { method: "DELETE", credentials: "include" });
      if (response.status === 401) {
        router.replace("/authPages/sign-in");
        return;
      }
      if (!response.ok) {
        setDeleteError(await responseError(response));
        return;
      }
      setInvoices((current) => current.filter((invoice) => invoice.id !== deleting.id));
      setDeleting(null);
      if (viewing?.id === deleting.id) setViewing(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "We couldn't delete this document.");
    } finally {
      setDeletePending(false);
    }
  }

  async function signOut() {
    setSigningOut(true);
    setLoadError("");
    try {
      const response = await fetch(`/api/auth/logout`, { method: "POST", credentials: "include" });
      if (!response.ok) throw new Error("We couldn't sign you out. Please try again.");
      router.replace("/authPages/sign-in");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "We couldn't connect to your account.");
      setSigningOut(false);
    }
  }

  const navItems = navigation.map((item) => item.href ? (
    <Link key={item.name} href={item.href} aria-current={item.current ? "page" : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition ${item.current ? "bg-[#eff1fa] text-[#566bbd]" : "text-[#737f92] hover:bg-[#f7f8fa] hover:text-[#36435b]"}`}><Icon name={item.icon} className="h-[17px] w-[17px]" />{item.name}</Link>
  ) : (
    <span key={item.name} aria-disabled="true" title="Coming soon" className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-[#a6adba]"><Icon name={item.icon} className="h-[17px] w-[17px]" /><span className="flex-1">{item.name}</span><span className="text-[9px] text-[#b3bac5]">SOON</span></span>
  ));

  if (loading) return <main className="crm-workspace flex min-h-screen items-center justify-center bg-[#f7f8fa]"><div role="status" className="flex items-center gap-3 text-sm text-[#738097]"><span className="h-5 w-5 animate-spin rounded-full border-2 border-[#dce2f0] border-t-[#6278cf]" />Loading your billing workspace...</div></main>;
  if (loadError && !user) return <main className="crm-workspace flex min-h-screen items-center justify-center bg-[#f7f8fa] px-5"><section className="w-full max-w-md rounded-2xl border border-[#e8ebf0] bg-white p-8 text-center shadow-sm"><BrandMark /><h1 className="mt-5 text-xl font-semibold text-[#25324a]">We couldn&apos;t open billing</h1><p role="alert" className="mt-2 text-sm leading-6 text-[#788397]">{loadError}</p><button onClick={() => { setLoadError(""); setLoading(true); setLoadAttempt((attempt) => attempt + 1); }} className="mt-6 rounded-lg bg-[#172b55] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#243c70]">Try again</button><Link href="/authPages/sign-in" className="ml-3 text-sm font-semibold text-[#6377c8] hover:text-[#4057b1]">Sign in</Link></section></main>;

  return (
    <main className="crm-workspace min-h-screen bg-[#f7f8fa] text-[#26334b]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[242px] shrink-0 flex-col border-r border-[#e9ecf1] bg-white px-4 py-5 lg:flex">
          <Link href="/dashboard" className="mb-9 flex items-center gap-2.5 px-2" aria-label="BusinessOS dashboard"><BrandMark /><span className="text-[16px] font-semibold tracking-[-0.04em] text-[#24324b]">Business<span className="text-[#6278cf]">OS</span></span></Link>
          <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.12em] text-[#a2aab8]">WORKSPACE</p>
          <nav aria-label="Workspace navigation" className="space-y-1">{navItems}</nav>
          <div className="mt-auto">
            <div className="mb-4 rounded-xl border border-[#edf0f4] bg-[#fbfcfd] p-3.5"><p className="text-xs font-semibold text-[#46536a]">Invoices & quotes</p><p className="mt-1 text-[11px] leading-5 text-[#8a95a6]">Keep estimates and payments organized in one place.</p></div>
            <div className="flex items-center gap-3 border-t border-[#eef0f4] px-2 pt-4"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8ebf8] text-xs font-semibold text-[#596cb9]">{user ? user.name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase() : "U"}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-[#344159]">{user?.name}</span><span className="block truncate text-[10px] text-[#929bab]">{user?.email}</span></span></div>
            <button onClick={signOut} disabled={signingOut} className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[#69758a] hover:bg-[#f6f7f9] disabled:opacity-50"><Icon name="logout" className="h-4 w-4" />{signingOut ? "Signing out..." : "Sign out"}</button>
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="flex h-[68px] items-center justify-between border-b border-[#e9ecf1] bg-white px-4 sm:px-7 lg:px-9"><div className="flex items-center gap-3"><span className="lg:hidden"><BrandMark /></span><span className="hidden text-[13px] font-medium text-[#99a2b0] sm:inline">Workspace</span><span className="hidden text-[#c0c6d0] sm:inline">/</span><span className="text-[13px] font-semibold text-[#46536a]">Invoices</span></div><button onClick={signOut} disabled={signingOut} className="text-xs font-semibold text-[#69758a] hover:text-[#33415b] lg:hidden">{signingOut ? "Signing out..." : "Sign out"}</button></header>
          <nav aria-label="Workspace navigation" className="flex gap-1 overflow-x-auto border-b border-[#e9ecf1] bg-white px-3 py-2 lg:hidden">{navItems}</nav>
          <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-7 sm:py-9 lg:px-9">
            {loadError && <p role="alert" className="mb-4 rounded-xl border border-[#f0d7d4] bg-[#fff7f6] px-4 py-3 text-xs text-[#9b514b]">{loadError}</p>}
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div><p className="text-[11px] font-medium text-[#929bab]">BILLING & ESTIMATES</p><h1 className="mt-2 text-[28px] font-semibold tracking-[-0.055em] text-[#202d45] sm:text-[32px]">Invoices & quotes</h1><p className="mt-1.5 text-[13px] text-[#8490a2]">Create professional billing documents and keep track of their status.</p></div>
              <div className="flex w-fit flex-wrap gap-2"><button onClick={() => openCreate("quote")} className="inline-flex items-center gap-2 rounded-lg border border-[#e2e6ee] bg-white px-3.5 py-2.5 text-xs font-semibold text-[#53617a] transition hover:bg-[#f8f9fb]"><Icon name="plus" className="h-4 w-4" />New quote</button><button onClick={() => openCreate("invoice")} className="inline-flex items-center gap-2 rounded-lg bg-[#172b55] px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#243c70]"><Icon name="plus" className="h-4 w-4" />New invoice</button></div>
            </div>

            <section aria-label="Billing summary" className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
              <article className="rounded-2xl border border-[#e9edf2] bg-white px-4 py-4 sm:px-5"><p className="text-[11px] font-medium text-[#8994a6]">Invoices</p><p className="mt-2 text-[25px] font-semibold leading-none tracking-[-0.05em] text-[#4d5a70]">{counts.invoices}</p></article>
              <article className="rounded-2xl border border-[#e9edf2] bg-white px-4 py-4 sm:px-5"><p className="text-[11px] font-medium text-[#8994a6]">Quotes</p><p className="mt-2 text-[25px] font-semibold leading-none tracking-[-0.05em] text-[#6679cb]">{counts.quotes}</p></article>
              <article className="rounded-2xl border border-[#e9edf2] bg-white px-4 py-4 sm:px-5"><p className="text-[11px] font-medium text-[#8994a6]">Paid invoices</p><p className="mt-2 text-[25px] font-semibold leading-none tracking-[-0.05em] text-[#5b9275]">{counts.paid.length}</p></article>
              <article className="rounded-2xl border border-[#e9edf2] bg-white px-4 py-4 sm:px-5"><p className="text-[11px] font-medium text-[#8994a6]">Outstanding</p>{outstanding.length ? <div className="mt-2 space-y-1">{outstanding.map(([currency, amount]) => <p key={currency} className="text-[13px] font-semibold text-[#a47b3d]">{formatCurrency(amount, currency)}</p>)}</div> : <p className="mt-2 text-[25px] font-semibold leading-none tracking-[-0.05em] text-[#a47b3d]">—</p>}</article>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#e9edf2] bg-white">
              <div className="flex flex-col gap-3 border-b border-[#f0f2f5] p-4 sm:px-5 sm:py-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-[13px] font-semibold text-[#35415a]">All documents <span className="ml-1 font-normal text-[#9aa3b1]">({visibleInvoices.length})</span></h2><p className="mt-1 text-[11px] text-[#98a1af]">Invoices and quotes saved to your account</p></div><label className="relative w-full sm:max-w-[270px]"><span className="sr-only">Search documents</span><Icon name="search" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a0a9b7]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search number or customer..." className="h-9 w-full rounded-lg border border-[#e9ecf1] bg-[#fbfcfd] pl-9 pr-3 text-xs text-[#435069] outline-none placeholder:text-[#a0a8b5] focus:border-[#bbc5e8] focus:ring-2 focus:ring-[#6478ce]/10" /></label></div>
                <div className="flex flex-wrap gap-1.5">{([{ key: "all", label: "All documents" }, { key: "invoice", label: "Invoices" }, { key: "quote", label: "Quotes" }] as const).map((filter) => <button key={filter.key} onClick={() => setTypeFilter(filter.key)} aria-pressed={typeFilter === filter.key} className={`rounded-lg px-3 py-1.5 text-[10px] font-medium transition ${typeFilter === filter.key ? "bg-[#eff1fa] text-[#566bbd]" : "text-[#7e899b] hover:bg-[#f7f8fa]"}`}>{filter.label}<span className="ml-1.5 opacity-70">{filter.key === "all" ? invoices.length : filter.key === "invoice" ? counts.invoices : counts.quotes}</span></button>)}</div>
              </div>
              {visibleInvoices.length > 0 ? <div className="overflow-x-auto"><table className="w-full min-w-[790px] text-left"><thead><tr className="border-b border-[#f0f2f5] text-[9px] font-semibold tracking-[0.06em] text-[#9ba4b1]"><th className="px-5 py-3">DOCUMENT</th><th className="px-3 py-3">CUSTOMER</th><th className="px-3 py-3">ISSUED</th><th className="px-3 py-3">DUE</th><th className="px-3 py-3">TOTAL</th><th className="px-3 py-3">STATUS</th><th className="px-4 py-3 text-right">ACTIONS</th></tr></thead><tbody>{visibleInvoices.map((invoice) => <tr key={invoice.id} className="border-b border-[#f3f4f6] last:border-0 hover:bg-[#fcfcfd]"><td className="px-5 py-3.5"><button onClick={() => { setStatusError(""); setViewing(invoice); }} className="text-left"><span className="block text-[11px] font-semibold text-[#4a566c] hover:text-[#566bbd]">{invoice.invoiceNumber}</span><span className="mt-0.5 block text-[9px] text-[#a0a8b5]">{invoice.type === "invoice" ? "Invoice" : "Quote"}</span></button></td><td className="px-3 py-3.5"><span className="block max-w-[150px] truncate text-[10px] font-medium text-[#65718a]">{invoice.customerName || "No customer"}</span>{invoice.customerCompany && <span className="mt-0.5 block max-w-[150px] truncate text-[9px] text-[#a0a8b5]">{invoice.customerCompany}</span>}</td><td className="px-3 py-3.5 text-[10px] text-[#8792a3]">{formatDate(invoice.issueDate)}</td><td className="px-3 py-3.5 text-[10px] text-[#8792a3]">{formatDate(invoice.dueDate)}</td><td className="px-3 py-3.5 text-[10px] font-semibold text-[#48556c]">{formatCurrency(invoice.total, invoice.currency)}</td><td className="px-3 py-3.5"><StatusBadge invoice={invoice} /></td><td className="px-4 py-3.5"><div className="flex justify-end gap-1"><button onClick={() => { setStatusError(""); setViewing(invoice); }} aria-label={`Preview ${invoice.invoiceNumber}`} title="Preview / print" className="rounded-lg p-2 text-[#8b95a5] transition hover:bg-[#f1f3fa] hover:text-[#566bbd]"><Icon name="print" className="h-4 w-4" /></button><button onClick={() => openEdit(invoice)} aria-label={`Edit ${invoice.invoiceNumber}`} title="Edit" className="rounded-lg p-2 text-[#8b95a5] transition hover:bg-[#f1f3fa] hover:text-[#566bbd]"><Icon name="edit" className="h-4 w-4" /></button><button onClick={() => { setDeleteError(""); setDeleting(invoice); }} aria-label={`Delete ${invoice.invoiceNumber}`} title="Delete" className="rounded-lg p-2 text-[#8b95a5] transition hover:bg-[#fff1ef] hover:text-[#b75a51]"><Icon name="trash" className="h-4 w-4" /></button></div></td></tr>)}</tbody></table></div> : <div className="flex min-h-[260px] flex-col items-center justify-center px-6 py-10 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f0f2fb] text-[#6879c6]"><Icon name={query || typeFilter !== "all" ? "search" : "invoices"} className="h-5 w-5" /></span><h3 className="mt-4 text-[14px] font-semibold text-[#35415a]">{query || typeFilter !== "all" ? "No matching documents" : "Create your first invoice or quote"}</h3><p className="mt-1.5 max-w-sm text-[11px] leading-5 text-[#8b95a5]">{query || typeFilter !== "all" ? "Try another search or choose a different document filter." : "Add line items, set your terms, and print or save a professional PDF for your customer."}</p>{query || typeFilter !== "all" ? <button onClick={() => { setQuery(""); setTypeFilter("all"); }} className="mt-4 text-[11px] font-semibold text-[#6377c8] hover:text-[#4057b1]">Clear filters</button> : <button onClick={() => openCreate("invoice")} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#172b55] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#243c70]"><Icon name="plus" className="h-4 w-4" />Create invoice</button>}</div>}
            </section>
            <p className="mt-5 text-center text-[10px] text-[#a1a9b5]">Invoice and quote records are private to your account</p>
          </div>
        </div>
      </div>

      {formOpen && <Modal title={editing ? `Edit ${editing.type === "invoice" ? "invoice" : "quote"}` : "Create a document"} onClose={() => { if (!saving) setFormOpen(false); }} wide><InvoiceForm key={editing?.id ?? "new"} initial={{ ...getDocumentDraft(editing ?? undefined, newDocumentType), currency: editing?.currency ?? preferences.currency }} customers={customers} editing={Boolean(editing)} saving={saving} error={formError} onCancel={() => setFormOpen(false)} onSubmit={saveInvoice} /></Modal>}
      {viewing && user && <Modal title={viewing.type === "invoice" ? "Invoice preview" : "Quote preview"} onClose={() => setViewing(null)} wide><div className="max-h-[calc(100vh-130px)] overflow-y-auto"><InvoicePreview invoice={viewing} user={user} onPrint={() => window.print()} />{statusError && <p role="alert" className="invoice-print-hidden mt-3 rounded-lg border border-[#f0d7d4] bg-[#fff7f6] px-3 py-2.5 text-xs text-[#9b514b]">{statusError}</p>}<div className="invoice-print-hidden mt-4 flex flex-wrap justify-end gap-2 border-t border-[#f0f2f5] pt-4">{viewing.status === "draft" && <button onClick={() => updateStatus(viewing, "sent")} disabled={statusPending} className="rounded-lg bg-[#172b55] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#243c70] disabled:opacity-60">{statusPending ? "Updating..." : "Mark as sent"}</button>}{viewing.status === "sent" && viewing.type === "invoice" && <button onClick={() => updateStatus(viewing, "paid")} disabled={statusPending} className="rounded-lg bg-[#328061] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#28694f] disabled:opacity-60">{statusPending ? "Updating..." : "Mark as paid"}</button>}{viewing.status === "sent" && viewing.type === "quote" && <><button onClick={() => updateStatus(viewing, "rejected")} disabled={statusPending} className="rounded-lg border border-[#e5e9f0] px-4 py-2.5 text-xs font-semibold text-[#65718a] hover:bg-[#f8f9fb] disabled:opacity-60">Mark rejected</button><button onClick={() => updateStatus(viewing, "accepted")} disabled={statusPending} className="rounded-lg bg-[#328061] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#28694f] disabled:opacity-60">{statusPending ? "Updating..." : "Mark accepted"}</button></>}</div></div></Modal>}
      {deleting && <Modal title={`Delete ${deleting.type}?`} onClose={() => { if (!deletePending) setDeleting(null); }}><p className="text-xs leading-5 text-[#788397]">This will permanently remove <span className="font-semibold text-[#46536a]">{deleting.invoiceNumber}</span> and its line items.</p>{deleteError && <p role="alert" className="mt-3 rounded-lg border border-[#f0d7d4] bg-[#fff7f6] px-3 py-2.5 text-xs text-[#9b514b]">{deleteError}</p>}<div className="mt-5 flex justify-end gap-2 border-t border-[#f0f2f5] pt-4"><button onClick={() => setDeleting(null)} disabled={deletePending} className="rounded-lg border border-[#e5e9f0] px-4 py-2.5 text-xs font-semibold text-[#65718a] hover:bg-[#f8f9fb] disabled:opacity-50">Cancel</button><button onClick={deleteInvoice} disabled={deletePending} className="rounded-lg bg-[#a9413a] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#913a34] disabled:opacity-60">{deletePending ? "Deleting..." : "Delete document"}</button></div></Modal>}
    </main>
  );
}
