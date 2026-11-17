"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

type Customer = {
  id: string; name: string; email: string | null; phone: string | null; company: string | null;
  status: "lead" | "prospect" | "customer"; notes: string | null; createdAt: string; updatedAt: string;
};
type Pagination = { page: number; pageSize: number; total: number; totalPages: number };
type Activity = { id: string; category: string; eventType: string; title: string; body: string | null; happenedAt: string; recordId: string | null };
type Interaction = { id: string; kind: string; title: string; body: string; happenedAt: string; createdAt: string };
type Attachment = { id: string; fileName: string; mimeType: string; sizeBytes: number; createdAt: string };
type RecordRow = Record<string, string | number | null>;
type Profile = {
  customer: Customer;
  kpis: {
    activeDeals: number; wonDeals: number; lostDeals: number; openTasks: number; completedTasks: number;
    overdueTasks: number; upcomingAppointments: number; totalAppointments: number;
    dealValuesByCurrency: { currency: string; activeValueCents: string; wonValueCents: string; weightedValueCents: string }[];
    invoiceValuesByCurrency: { currency: string; paidInvoiceCount: number; paidInvoiceTotal: string; outstandingInvoiceCount: number; outstandingInvoiceTotal: string }[];
  };
};
type Tab = "Overview" | "Activity" | "Deals" | "Invoices & Quotes" | "Tasks" | "Appointments" | "Notes & Files";
type CustomerDraft = Pick<Customer, "name" | "email" | "phone" | "company" | "status" | "notes">;
type NoteDraft = { kind: "note" | "call" | "email" | "meeting"; title: string; body: string };
type PipelineStage = { id: string; name: string; defaultProbability: number; isWon: boolean; isLost: boolean };
type Pipeline = { id: string; name: string; stages: PipelineStage[] };
type DealDraft = { pipelineId: string; stageId: string; title: string; amount: string; currency: "EGP" | "USD" | "EUR"; probability: number; expectedCloseDate: string };

const API = "";
const tabs: Tab[] = ["Overview", "Activity", "Deals", "Invoices & Quotes", "Tasks", "Appointments", "Notes & Files"];
const input = "w-full rounded-lg border border-[#e5e9f0] bg-white px-3 py-2.5 text-sm text-[#35415a] outline-none focus:border-[#7585d4]";
const button = "rounded-lg border border-[#e5e9f0] px-3 py-2 text-xs font-semibold text-[#536078] transition hover:bg-[#f5f6fa] disabled:opacity-50";
const primary = "rounded-lg bg-[#172b55] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#243c70] disabled:opacity-50";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}/api${path}`, {
    ...init,
    credentials: "include",
    headers: { ...(init?.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}), ...init?.headers },
  });
  if (response.status === 401) throw Object.assign(new Error("Your session expired. Please sign in again."), { status: 401 });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed (${response.status}).`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function money(value: string | null | undefined, currency: string, cents = false) {
  let whole: string;
  let fraction: string;
  if (cents) {
    const amount = BigInt(value ?? "0");
    const hundred = BigInt(100);
    whole = (amount / hundred).toString();
    fraction = (amount % hundred).toString().padStart(2, "0");
  } else {
    const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value ?? "0");
    if (!match) return `${currency} ${value ?? "0"}`;
    whole = match[1];
    fraction = (match[2] ?? "").padEnd(2, "0");
  }
  return `${currency} ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${fraction}`;
}

function dateLabel(value: string | null | undefined, options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(undefined, options);
}

function statusLabel(value: string | number | null | undefined) {
  return String(value ?? "—").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-[#e9edf2] bg-white ${className}`}>{children}</section>;
}

function Metric({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return <article className="rounded-2xl border border-[#e9edf2] bg-white p-4 sm:p-5"><p className="text-[11px] font-medium text-[#8994a6]">{label}</p><p className="mt-2 text-xl font-semibold tracking-tight text-[#26344d]">{value}</p>{hint && <p className="mt-1 text-[10px] text-[#98a1af]">{hint}</p>}</article>;
}

function Pager({ pagination, onChange }: { pagination: Pagination | null; onChange: (page: number) => void }) {
  if (!pagination || pagination.totalPages < 2) return null;
  return <div className="flex items-center justify-between border-t border-[#f0f2f5] px-4 py-3 text-xs text-[#8792a3]"><span>{pagination.total} records · page {pagination.page} of {pagination.totalPages}</span><div className="flex gap-2"><button className={button} disabled={pagination.page <= 1} onClick={() => onChange(pagination.page - 1)}>Previous</button><button className={button} disabled={pagination.page >= pagination.totalPages} onClick={() => onChange(pagination.page + 1)}>Next</button></div></div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#566278]">{label}</span>{children}</label>;
}

function RecordTable({ tab, records }: { tab: Tab; records: RecordRow[] }) {
  if (records.length === 0) return <p className="px-5 py-12 text-center text-sm text-[#8993a3]">No {tab.toLowerCase()} are linked to this customer yet.</p>;
  const columns: Record<Tab, [string, string][]> = {
    Overview: [], Activity: [], "Notes & Files": [],
    Deals: [["title", "Deal"], ["status", "Status"], ["amountCents", "Value"], ["expectedCloseDate", "Expected close"], ["priority", "Priority"]],
    "Invoices & Quotes": [["invoiceNumber", "Document"], ["type", "Type"], ["status", "Status"], ["total", "Total"], ["issueDate", "Issued"]],
    Tasks: [["title", "Task"], ["status", "Status"], ["priority", "Priority"], ["dueDate", "Due date"]],
    Appointments: [["title", "Appointment"], ["status", "Status"], ["startAt", "Starts"], ["locationType", "Location"]],
  };
  return <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead><tr className="border-b border-[#f0f2f5] text-[10px] uppercase tracking-wide text-[#9ba4b1]">{columns[tab].map(([, label]) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead><tbody>{records.map((record, index) => <tr key={String(record.id ?? index)} className="border-b border-[#f3f4f6] last:border-0">{columns[tab].map(([key, label]) => {
    let value = record[key];
    if (key === "amountCents") value = money(String(value), String(record.currency ?? "EGP"), true);
    if (key === "total") value = money(String(value), String(record.currency ?? "EGP"));
    if (["issueDate", "expectedCloseDate", "dueDate", "startAt"].includes(key)) value = dateLabel(value == null ? null : String(value), key === "startAt" ? { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" } : undefined);
    if (key === "status" || key === "type" || key === "priority" || key === "locationType") value = statusLabel(value);
    return <td key={label} className="px-4 py-3.5 text-[#58657a]">{String(value ?? "—")}</td>;
  })}</tr>)}</tbody></table></div>;
}

export default function CustomerProfile({ id }: { id: string }) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tab, setTab] = useState<Tab>("Overview");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectionLoading, setSectionLoading] = useState(true);
  const [profileRefresh, setProfileRefresh] = useState(0);
  const [sectionRefresh, setSectionRefresh] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [dealOpen, setDealOpen] = useState(false);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [dealDraft, setDealDraft] = useState<DealDraft>({ pipelineId: "", stageId: "", title: "", amount: "", currency: "EGP", probability: 10, expectedCloseDate: "" });
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [appointmentTitle, setAppointmentTitle] = useState("");
  const [appointmentStart, setAppointmentStart] = useState("");
  const [appointmentEnd, setAppointmentEnd] = useState("");
  const [noteDraft, setNoteDraft] = useState<NoteDraft>({ kind: "note", title: "", body: "" });

  useEffect(() => {
    let active = true;
    async function fetchProfile() {
      try {
        const result = await request<Profile>(`/customers/${id}/profile`);
        if (active) setProfile(result);
      } catch (loadError) {
        if ((loadError as { status?: number }).status === 401) router.replace("/authPages/sign-in");
        else if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load this customer.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void fetchProfile();
    return () => { active = false; };
  }, [id, profileRefresh, router]);

  useEffect(() => {
    if (!profile) return;
    let active = true;
    async function fetchSection() {
      const params = new URLSearchParams({ page: String(tab === "Overview" ? 1 : page), pageSize: String(tab === "Overview" ? 6 : 20) });
      try {
        if (tab === "Overview" || tab === "Activity") {
          const result = await request<{ activity: Activity[]; pagination: Pagination }>(`/customers/${id}/activity?${params}`);
          if (active) { setActivity(result.activity); setPagination(result.pagination); }
        } else if (tab === "Notes & Files") {
          const [notes, files] = await Promise.all([
            request<{ interactions: Interaction[]; pagination: Pagination }>(`/customers/${id}/interactions?${params}`),
            request<{ attachments: Attachment[] }>(`/customers/${id}/attachments`),
          ]);
          if (active) { setInteractions(notes.interactions); setPagination(notes.pagination); setAttachments(files.attachments); }
        } else {
          const section = tab === "Invoices & Quotes" ? "invoices" : tab.toLowerCase();
          const result = await request<{ records: RecordRow[]; pagination: Pagination }>(`/customers/${id}/records/${encodeURIComponent(section)}?${params}`);
          if (active) { setRecords(result.records); setPagination(result.pagination); }
        }
      } catch (loadError) {
        if ((loadError as { status?: number }).status === 401) router.replace("/authPages/sign-in");
        else if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load customer activity.");
      } finally {
        if (active) setSectionLoading(false);
      }
    }
    void fetchSection();
    return () => { active = false; };
  }, [id, page, profile, profileRefresh, router, sectionRefresh, tab]);

  function refreshProfile() { setProfileRefresh((value) => value + 1); }
  function refreshSection() { setSectionLoading(true); setSectionRefresh((value) => value + 1); }

  async function saveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setSaving(true); setError("");
    const form = new FormData(event.currentTarget);
    const draft: CustomerDraft = {
      name: String(form.get("name") ?? "").trim(), email: String(form.get("email") ?? "").trim(),
      phone: String(form.get("phone") ?? "").trim(), company: String(form.get("company") ?? "").trim(),
      status: String(form.get("status") ?? "lead") as Customer["status"], notes: String(form.get("notes") ?? "").trim(),
    };
    try {
      await request(`/customers/${id}`, { method: "PUT", body: JSON.stringify(draft) });
      setEditOpen(false); refreshProfile();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to update customer."); }
    finally { setSaving(false); }
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError("");
    try {
      await request("/tasks", { method: "POST", body: JSON.stringify({ title: taskTitle.trim(), customerId: id, dueDate: taskDueDate || null }) });
      setTaskOpen(false); setTaskTitle(""); setTaskDueDate(""); refreshProfile(); refreshSection();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to create task."); }
    finally { setSaving(false); }
  }

  async function createAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError("");
    try {
      await request("/appointments", {
        method: "POST",
        body: JSON.stringify({
          title: appointmentTitle.trim(), customerId: id,
          startAt: new Date(appointmentStart).toISOString(), endAt: new Date(appointmentEnd).toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          locationType: "phone", priority: "medium", reminders: [],
        }),
      });
      setAppointmentOpen(false); setAppointmentTitle(""); setAppointmentStart(""); setAppointmentEnd("");
      refreshProfile(); refreshSection();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to schedule this appointment."); }
    finally { setSaving(false); }
  }

  async function addInteraction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError("");
    try {
      await request(`/customers/${id}/interactions`, { method: "POST", body: JSON.stringify(noteDraft) });
      setNoteDraft({ kind: "note", title: "", body: "" }); refreshSection(); refreshProfile();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to save this activity."); }
    finally { setSaving(false); }
  }

  async function uploadFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    if (!form.get("file")) return;
    setSaving(true); setError("");
    try {
      await request(`/customers/${id}/attachments`, { method: "POST", body: form });
      formElement.reset(); refreshSection();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to upload this file."); }
    finally { setSaving(false); }
  }

  async function deleteAttachment(attachment: Attachment) {
    if (!window.confirm(`Delete ${attachment.fileName}?`)) return;
    setError("");
    try {
      await request(`/customers/${id}/attachments/${attachment.id}`, { method: "DELETE" });
      refreshSection();
    } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Unable to delete this file."); }
  }

  async function openDealDialog() {
    setError("");
    try {
      const result = await request<{ pipelines: Pipeline[] }>("/pipelines");
      const available = result.pipelines.map((pipeline) => ({ ...pipeline, stages: pipeline.stages.filter((stage) => !stage.isWon && !stage.isLost) }));
      if (!available.some((pipeline) => pipeline.stages.length)) throw new Error("Create an active pipeline stage before adding a deal.");
      const pipeline = available.find((item) => item.stages.length)!;
      const stage = pipeline.stages[0];
      setPipelines(available);
      setDealDraft({ pipelineId: pipeline.id, stageId: stage.id, title: "", amount: "", currency: "EGP", probability: stage.defaultProbability, expectedCloseDate: "" });
      setDealOpen(true);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Unable to load sales pipelines."); }
  }

  async function createDeal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError("");
    try {
      await request("/deals", {
        method: "POST",
        body: JSON.stringify({
          pipelineId: dealDraft.pipelineId, stageId: dealDraft.stageId, customerId: id,
          title: dealDraft.title.trim(), amount: dealDraft.amount, currency: dealDraft.currency,
          probability: dealDraft.probability, expectedCloseDate: dealDraft.expectedCloseDate || null,
        }),
      });
      setDealOpen(false); refreshProfile(); refreshSection();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to create deal."); }
    finally { setSaving(false); }
  }

  async function changeStatus(action: "qualify" | "convert") {
    const label = action === "qualify" ? "qualify this lead" : "convert this prospect to a customer";
    if (!window.confirm(`Are you sure you want to ${label}?`)) return;
    setSaving(true); setError("");
    try { await request(`/customers/${id}/${action}`, { method: "POST" }); refreshProfile(); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to update customer status."); }
    finally { setSaving(false); }
  }

  function changeTab(next: Tab) { setSectionLoading(true); setTab(next); setPage(1); setPagination(null); }
  function changePage(next: number) { setSectionLoading(true); setPage(next); }

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-[#f7f8fa]"><p role="status" className="text-sm text-[#738097]">Loading customer profile...</p></main>;
  if (!profile) return <main className="flex min-h-screen items-center justify-center bg-[#f7f8fa] p-5"><section className="max-w-md rounded-2xl border border-[#e8ebf0] bg-white p-8 text-center"><h1 className="text-xl font-semibold text-[#25324a]">Customer profile unavailable</h1><p role="alert" className="mt-3 text-sm text-[#788397]">{error || "This customer could not be found."}</p><Link className="mt-5 inline-block text-sm font-semibold text-[#566bbd]" href="/customers">Back to customers</Link></section></main>;

  const customer = profile.customer;
  const dealValue = profile.kpis.dealValuesByCurrency;
  const invoiceValue = profile.kpis.invoiceValuesByCurrency;
  const mainContent = tab === "Overview" ? (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Active deals" value={profile.kpis.activeDeals} hint={dealValue.map((item) => `${money(item.activeValueCents, item.currency, true)} active · ${money(item.weightedValueCents, item.currency, true)} weighted`).join(" · ") || "No active deal value"} />
        <Metric label="Won deals" value={profile.kpis.wonDeals} hint={dealValue.map((item) => money(item.wonValueCents, item.currency, true)).join(" · ") || "No won deal value"} />
        <Metric label="Open tasks" value={profile.kpis.openTasks} hint={`${profile.kpis.overdueTasks} overdue · ${profile.kpis.completedTasks} completed`} />
        <Metric label="Upcoming appointments" value={profile.kpis.upcomingAppointments} hint={`${profile.kpis.totalAppointments} total appointments`} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <Card><div className="border-b border-[#f0f2f5] px-5 py-4"><h2 className="text-sm font-semibold text-[#35415a]">Recent activity</h2></div>
          {activity.length ? <div className="divide-y divide-[#f3f4f6]">{activity.slice(0, 6).map((item) => <ActivityRow key={`${item.category}-${item.id}`} item={item} />)}</div> : <p className="p-5 text-sm text-[#8993a3]">No activity recorded yet.</p>}
          <button onClick={() => changeTab("Activity")} className="border-t border-[#f0f2f5] px-5 py-3 text-xs font-semibold text-[#566bbd]">View all activity →</button>
        </Card>
        <Card className="p-5"><h2 className="text-sm font-semibold text-[#35415a]">Financial summary</h2>
          <div className="mt-4 space-y-4">{invoiceValue.length ? invoiceValue.map((item) => <div key={item.currency} className="rounded-xl bg-[#f8f9fb] p-3.5"><p className="text-xs font-semibold text-[#536078]">{item.currency}</p><p className="mt-2 text-xs text-[#788397]">Paid invoices: <strong className="text-[#344159]">{money(item.paidInvoiceTotal, item.currency)}</strong></p><p className="mt-1 text-xs text-[#788397]">Outstanding invoices: <strong className="text-[#344159]">{money(item.outstandingInvoiceTotal, item.currency)}</strong></p></div>) : <p className="text-xs text-[#8993a3]">No invoices recorded.</p>}</div>
          <p className="mt-4 text-[10px] leading-5 text-[#98a1af]">Paid totals reflect invoices marked paid in the billing module. Quotes are not counted as revenue.</p>
        </Card>
      </div>
      <Card><div className="flex items-center justify-between border-b border-[#f0f2f5] px-5 py-4"><h2 className="text-sm font-semibold text-[#35415a]">Contact details</h2><button className={button} onClick={() => setEditOpen(true)}>Edit profile</button></div>
        <div className="grid gap-4 p-5 text-sm sm:grid-cols-2"><Detail label="Email">{customer?.email ? <a className="text-[#566bbd]" href={`mailto:${customer.email}`}>{customer.email}</a> : "—"}</Detail><Detail label="Phone">{customer?.phone ? <a className="text-[#566bbd]" href={`tel:${customer.phone}`}>{customer.phone}</a> : "—"}</Detail><Detail label="Company">{customer?.company || "—"}</Detail><Detail label="Customer since">{dateLabel(customer?.createdAt)}</Detail><Detail label="Notes">{customer?.notes || "No profile notes yet."}</Detail></div>
      </Card>
    </div>
  ) : tab === "Activity" ? (
    <Card>{sectionLoading ? <Loading /> : activity.length ? <div className="divide-y divide-[#f3f4f6]">{activity.map((item) => <ActivityRow key={`${item.category}-${item.id}`} item={item} />)}</div> : <Empty text="No customer activity yet. Log a note or an interaction to start the timeline." />}<Pager pagination={pagination} onChange={changePage} /></Card>
  ) : tab === "Notes & Files" ? (
    <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
      <Card className="p-5"><h2 className="text-sm font-semibold text-[#35415a]">Log an interaction</h2><form onSubmit={addInteraction} className="mt-4 space-y-3">
        <Field label="Type"><select className={input} value={noteDraft.kind} onChange={(event) => setNoteDraft({ ...noteDraft, kind: event.target.value as NoteDraft["kind"] })}><option value="note">Note</option><option value="call">Call</option><option value="email">Email</option><option value="meeting">Meeting</option></select></Field>
        <Field label="Title"><input className={input} required maxLength={160} value={noteDraft.title} onChange={(event) => setNoteDraft({ ...noteDraft, title: event.target.value })} placeholder="e.g. Follow-up call" /></Field>
        <Field label="Details"><textarea className={`${input} min-h-28`} required maxLength={10000} value={noteDraft.body} onChange={(event) => setNoteDraft({ ...noteDraft, body: event.target.value })} placeholder="Record the important details..." /></Field>
        <button className={primary} disabled={saving}>{saving ? "Saving..." : "Save activity"}</button>
      </form>
      <div className="mt-7 border-t border-[#f0f2f5] pt-5"><h3 className="text-sm font-semibold text-[#35415a]">Customer files</h3><form onSubmit={uploadFile} className="mt-3 flex flex-wrap items-center gap-2"><input className="min-w-0 flex-1 text-xs text-[#69758a] file:mr-3 file:rounded-md file:border-0 file:bg-[#eff1fa] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#566bbd]" type="file" name="file" accept=".png,.jpg,.jpeg,.gif,.webp,.pdf" required /><button className={button} disabled={saving}>{saving ? "Uploading..." : "Upload"}</button></form><p className="mt-2 text-[10px] text-[#98a1af]">PNG, JPEG, GIF, WebP, or PDF · maximum 4 MB</p>
        {attachments.length ? <div className="mt-4 divide-y divide-[#f3f4f6]">{attachments.map((file) => <div key={file.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><a className="block truncate text-xs font-semibold text-[#566bbd] hover:underline" href={`${API}/api/customers/${id}/attachments/${file.id}`} target="_blank" rel="noreferrer">{file.fileName}</a><p className="mt-1 text-[10px] text-[#98a1af]">{(file.sizeBytes / 1024).toFixed(0)} KB · {dateLabel(file.createdAt)}</p></div><button className="text-[10px] font-semibold text-rose-600" onClick={() => void deleteAttachment(file)}>Delete</button></div>)}</div> : <p className="mt-4 text-xs text-[#8993a3]">No files uploaded.</p>}
      </div></Card>
      <Card><div className="border-b border-[#f0f2f5] px-5 py-4"><h2 className="text-sm font-semibold text-[#35415a]">Notes and interactions</h2><p className="mt-1 text-[11px] text-[#8993a3]">Customer profile notes and logged conversations</p></div>
        {customer?.notes && <article className="border-b border-[#f3f4f6] bg-[#fbfcfd] px-5 py-4"><p className="text-[10px] font-semibold uppercase tracking-wide text-[#9ba4b1]">Profile note</p><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[#58657a]">{customer.notes}</p></article>}
        {sectionLoading ? <Loading /> : interactions.length ? <div className="divide-y divide-[#f3f4f6]">{interactions.map((item) => <article key={item.id} className="px-5 py-4"><div className="flex justify-between gap-3"><div><p className="text-xs font-semibold text-[#46536a]">{item.title}</p><p className="mt-1 text-[10px] text-[#98a1af]">{statusLabel(item.kind)} · {dateLabel(item.happenedAt, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</p></div><button className="text-[10px] font-semibold text-rose-600" onClick={() => void removeInteraction(item)}>Delete</button></div><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[#68758a]">{item.body}</p></article>)}</div> : <Empty text="No logged notes or interactions yet." />}
        <Pager pagination={pagination} onChange={changePage} />
      </Card>
    </div>
  ) : (
    <Card>{sectionLoading ? <Loading /> : <RecordTable tab={tab} records={records} />}<Pager pagination={pagination} onChange={changePage} /></Card>
  );

  async function removeInteraction(item: Interaction) {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    try { await request(`/customers/${id}/interactions/${item.id}`, { method: "DELETE" }); refreshSection(); }
    catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Unable to delete this interaction."); }
  }

  return <main className="min-h-screen bg-[#f7f8fa] text-[#26334b]">
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-7 sm:py-8 lg:px-9">
      <Link href="/customers" className="text-xs font-semibold text-[#66748b] hover:text-[#566bbd]">← All customers</Link>
      {error && <p role="alert" className="mt-4 rounded-xl border border-[#f0d7d4] bg-[#fff7f6] px-4 py-3 text-xs text-[#9b514b]">{error}</p>}
      <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex items-start gap-4"><span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#e8ebf8] text-lg font-semibold text-[#596cb9]">{customer.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span><div><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#929bab]">Customer profile</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#202d45] sm:text-3xl">{customer.name}</h1><p className="mt-1 text-sm text-[#8490a2]">{customer.company || "Independent contact"} · <span className="capitalize">{customer.status}</span></p></div></div>
        <div className="flex flex-wrap gap-2"><button className={button} onClick={() => setEditOpen(true)}>Edit profile</button>{customer.status === "lead" && <button className={button} disabled={saving} onClick={() => void changeStatus("qualify")}>Qualify lead</button>}{customer.status === "prospect" && <button className={button} disabled={saving} onClick={() => void changeStatus("convert")}>Convert to customer</button>}<button className={button} onClick={() => setTaskOpen(true)}>Create task</button><button className={button} onClick={() => void openDealDialog()}>Create deal</button><button className={button} onClick={() => setAppointmentOpen(true)}>Schedule appointment</button><Link className={button} href="/invoices">Create invoice</Link><a className={button} href={customer.email ? `mailto:${customer.email}` : undefined} aria-disabled={!customer.email}>Email</a><a className={button} href={customer.phone ? `tel:${customer.phone}` : undefined} aria-disabled={!customer.phone}>Call</a><Link className={primary} href="/sales">Open Sales</Link></div>
      </div>
      <nav className="mt-7 flex gap-1 overflow-x-auto border-b border-[#e4e8ef]" aria-label="Customer profile sections">{tabs.map((item) => <button key={item} onClick={() => changeTab(item)} aria-current={tab === item ? "page" : undefined} className={`shrink-0 border-b-2 px-3 py-3 text-xs font-semibold transition ${tab === item ? "border-[#566bbd] text-[#566bbd]" : "border-transparent text-[#8490a2] hover:text-[#4f5d74]"}`}>{item}</button>)}</nav>
      <div className="mt-5">{mainContent}</div>
      {editOpen && <Modal title="Edit customer" onClose={() => !saving && setEditOpen(false)}><form className="space-y-4" onSubmit={saveCustomer}><div className="grid gap-3 sm:grid-cols-2"><Field label="Name"><input className={input} name="name" required maxLength={120} defaultValue={customer.name} /></Field><Field label="Company"><input className={input} name="company" maxLength={120} defaultValue={customer.company ?? ""} /></Field><Field label="Email"><input className={input} type="email" name="email" maxLength={254} defaultValue={customer.email ?? ""} /></Field><Field label="Phone"><input className={input} name="phone" maxLength={40} defaultValue={customer.phone ?? ""} /></Field><Field label="Status"><select className={input} name="status" defaultValue={customer.status}><option value="lead">Lead</option><option value="prospect">Prospect</option><option value="customer">Customer</option></select></Field><div className="sm:col-span-2"><Field label="Profile notes"><textarea className={`${input} min-h-24`} name="notes" maxLength={2000} defaultValue={customer.notes ?? ""} /></Field></div></div><div className="flex justify-end gap-2 border-t border-[#f0f2f5] pt-4"><button type="button" className={button} onClick={() => setEditOpen(false)}>Cancel</button><button className={primary} disabled={saving}>{saving ? "Saving..." : "Save changes"}</button></div></form></Modal>}
      {taskOpen && <Modal title="Create a customer task" onClose={() => !saving && setTaskOpen(false)}><form className="space-y-4" onSubmit={createTask}><Field label="Task title"><input className={input} required maxLength={200} value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="e.g. Follow up with customer" /></Field><Field label="Due date"><input className={input} type="date" value={taskDueDate} onChange={(event) => setTaskDueDate(event.target.value)} /></Field><p className="text-[11px] text-[#8993a3]">This task will be linked to {customer.name}.</p><div className="flex justify-end gap-2"><button type="button" className={button} onClick={() => setTaskOpen(false)}>Cancel</button><button className={primary} disabled={saving}>{saving ? "Creating..." : "Create task"}</button></div></form></Modal>}
      {dealOpen && <Modal title="Create a customer deal" onClose={() => !saving && setDealOpen(false)}><form className="space-y-4" onSubmit={createDeal}>
        <Field label="Deal title"><input className={input} required maxLength={200} value={dealDraft.title} onChange={(event) => setDealDraft({ ...dealDraft, title: event.target.value })} /></Field>
        <div className="grid gap-3 sm:grid-cols-2"><Field label="Pipeline"><select className={input} value={dealDraft.pipelineId} onChange={(event) => { const pipeline = pipelines.find((item) => item.id === event.target.value); const stage = pipeline?.stages[0]; setDealDraft({ ...dealDraft, pipelineId: event.target.value, stageId: stage?.id ?? "", probability: stage?.defaultProbability ?? 10 }); }}>{pipelines.filter((pipeline) => pipeline.stages.length).map((pipeline) => <option key={pipeline.id} value={pipeline.id}>{pipeline.name}</option>)}</select></Field>
        <Field label="Stage"><select className={input} value={dealDraft.stageId} onChange={(event) => { const stage = pipelines.flatMap((item) => item.stages).find((item) => item.id === event.target.value); setDealDraft({ ...dealDraft, stageId: event.target.value, probability: stage?.defaultProbability ?? dealDraft.probability }); }}>{pipelines.find((pipeline) => pipeline.id === dealDraft.pipelineId)?.stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name} · {stage.defaultProbability}%</option>)}</select></Field>
        <Field label="Value"><input className={input} required type="number" min="0" max="9999999999" step="0.01" value={dealDraft.amount} onChange={(event) => setDealDraft({ ...dealDraft, amount: event.target.value })} /></Field>
        <Field label="Currency"><select className={input} value={dealDraft.currency} onChange={(event) => setDealDraft({ ...dealDraft, currency: event.target.value as DealDraft["currency"] })}><option>EGP</option><option>USD</option><option>EUR</option></select></Field>
        <Field label="Probability (%)"><input className={input} type="number" min="0" max="100" value={dealDraft.probability} onChange={(event) => setDealDraft({ ...dealDraft, probability: Number(event.target.value) })} /></Field>
        <Field label="Expected close date"><input className={input} type="date" value={dealDraft.expectedCloseDate} onChange={(event) => setDealDraft({ ...dealDraft, expectedCloseDate: event.target.value })} /></Field></div>
        <p className="text-[11px] text-[#8993a3]">This deal will be linked to {customer.name}.</p>
        <div className="flex justify-end gap-2"><button type="button" className={button} onClick={() => setDealOpen(false)}>Cancel</button><button className={primary} disabled={saving}>{saving ? "Creating..." : "Create deal"}</button></div>
      </form></Modal>}
      {appointmentOpen && <Modal title="Schedule a customer appointment" onClose={() => !saving && setAppointmentOpen(false)}><form className="space-y-4" onSubmit={createAppointment}>
        <Field label="Appointment title"><input className={input} required maxLength={200} value={appointmentTitle} onChange={(event) => setAppointmentTitle(event.target.value)} placeholder="e.g. Customer follow-up" /></Field>
        <div className="grid gap-3 sm:grid-cols-2"><Field label="Starts"><input className={input} type="datetime-local" required value={appointmentStart} onChange={(event) => setAppointmentStart(event.target.value)} /></Field><Field label="Ends"><input className={input} type="datetime-local" required value={appointmentEnd} onChange={(event) => setAppointmentEnd(event.target.value)} /></Field></div>
        <p className="text-[11px] text-[#8993a3]">This appointment will be linked to {customer.name} and checked against your availability.</p>
        <div className="flex justify-end gap-2"><button type="button" className={button} onClick={() => setAppointmentOpen(false)}>Cancel</button><button className={primary} disabled={saving}>{saving ? "Scheduling..." : "Schedule"}</button></div>
      </form></Modal>}
    </div>
  </main>;
}

function ActivityRow({ item }: { item: Activity }) {
  return <article className="relative px-5 py-4 pl-10 before:absolute before:left-[19px] before:top-6 before:h-2 before:w-2 before:rounded-full before:bg-[#7888d0]"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className="text-xs font-semibold text-[#46536a]">{item.title || statusLabel(item.eventType)}</span><span className="rounded-full bg-[#f1f3f8] px-2 py-0.5 text-[9px] font-medium text-[#69758a]">{statusLabel(item.category)} · {statusLabel(item.eventType)}</span><time className="ml-auto text-[10px] text-[#98a1af]">{dateLabel(item.happenedAt, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</time></div>{item.body && <p className="mt-1.5 whitespace-pre-wrap text-xs leading-5 text-[#778397]">{item.body}</p>}</article>;
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return <div><p className="text-[10px] font-semibold uppercase tracking-wide text-[#9ba4b1]">{label}</p><div className="mt-1.5 whitespace-pre-wrap text-xs leading-5 text-[#566278]">{children}</div></div>;
}

function Loading() {
  return <div role="status" className="px-5 py-10 text-center text-xs text-[#8993a3]">Loading...</div>;
}

function Empty({ text }: { text: string }) {
  return <p className="px-5 py-12 text-center text-sm text-[#8993a3]">{text}</p>;
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101827]/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-label={title} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-7"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-semibold text-[#26344d]">{title}</h2><button type="button" className={button} onClick={onClose}>Close</button></div>{children}</section></div>;
}
