"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useUserPreferences } from "../components/PreferencesProvider";

type Currency = "EGP" | "USD" | "EUR";
type DealStatus = "open" | "won" | "lost";
type Priority = "low" | "medium" | "high" | "urgent";
type Stage = {
  id: string; name: string; position: number; color: string; defaultProbability: number; isWon: boolean; isLost: boolean;
};
type Pipeline = { id: string; name: string; isDefault: boolean; stages: Stage[] };
type Deal = {
  id: string; pipelineId: string; pipelineName: string; stageId: string; stageName: string; stageColor: string;
  stagePosition: number; stageIsWon: boolean; stageIsLost: boolean; customerId: string | null;
  customerName: string | null; customerCompany: string | null; title: string; description: string | null;
  amount: string; amountCents: string; currency: Currency; probability: number; expectedCloseDate: string | null;
  priority: Priority; source: string | null; status: DealStatus; closedAt: string | null; lostReason: string | null;
  createdAt: string; updatedAt: string;
};
type Customer = { id: string; name: string; company: string | null; status: "lead" | "prospect" | "customer" };
type History = { id: number; fromStageName: string | null; toStageName: string; fromStatus: DealStatus | null; toStatus: DealStatus; reason: string | null; changedAt: string };
type Analytics = {
  kpis: { currency: Currency; openValueCents: string; weightedValueCents: string; wonValueCents: string; lostValueCents: string; activeDeals: number; wonDeals: number; lostDeals: number; avgDealValueCents: string; avgSalesCycleDays: string }[];
  byStage: { currency: Currency | null; stageId: string; stageName: string; color: string; count: number; amountCents: string; weightedAmountCents: string }[];
  monthly: { currency: Currency; month: string; won: number; lost: number; wonValueCents: string; lostValueCents: string }[];
  expectedClosings: { currency: Currency; date: string; count: number; amountCents: string; weightedAmountCents: string }[];
};
type DealListResponse = { deals: Deal[]; pagination?: { page: number; pageSize: number; total: number; totalPages: number } };
type Draft = {
  title: string; description: string; pipelineId: string; stageId: string; customerId: string; amount: string;
  currency: Currency; probability: string; expectedCloseDate: string; priority: Priority; source: string;
};
type StageDraft = { name: string; color: string; defaultProbability: string; isWon: boolean; isLost: boolean };
type Tab = "overview" | "pipeline" | "settings";

const API = "";
const priorities: Priority[] = ["low", "medium", "high", "urgent"];
const input = "w-full rounded-lg border border-[#e5e9f0] bg-white px-3 py-2 text-sm text-[#35415a] outline-none focus:border-[#7585d4]";
const button = "rounded-lg border border-[#e5e9f0] px-3 py-2 text-xs font-medium text-[#536078] transition hover:bg-[#f5f6fa] disabled:cursor-not-allowed disabled:opacity-50";
const primary = "rounded-lg bg-[#566bbd] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#465aa9] disabled:opacity-50";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}/api${path}`, {
    ...init,
    credentials: "include",
    headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
  });
  if (response.status === 401) throw Object.assign(new Error("Your session expired. Please sign in again."), { status: 401 });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed (${response.status}).`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function money(centsValue: string, currency: Currency) {
  const cents = (centsValue || "0").replace(/\D/g, "");
  const padded = cents.padStart(3, "0");
  const major = padded.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${currency} ${major}.${padded.slice(-2)}`;
}

function stageStatus(stage: Stage): DealStatus {
  return stage.isWon ? "won" : stage.isLost ? "lost" : "open";
}

function emptyDraft(pipelineId: string, stage?: Stage, currency: Currency = "EGP"): Draft {
  return {
    title: "", description: "", pipelineId, stageId: stage?.id ?? "",
    customerId: "", amount: "", currency, probability: String(stage?.defaultProbability ?? 10),
    expectedCloseDate: "", priority: "medium", source: "",
  };
}

function dateLabel(value: string | null) {
  if (!value) return "No close date";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function AppShell({ children, router }: { children: React.ReactNode; router: ReturnType<typeof useRouter> }) {
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  async function logout() {
    setLoggingOut(true); setLogoutError("");
    try { await request("/auth/logout", { method: "POST" }); router.replace("/authPages/sign-in"); }
    catch (error) { setLogoutError(error instanceof Error ? error.message : "Could not sign out."); }
    finally { setLoggingOut(false); }
  }
  const links = [["Dashboard", "/dashboard"], ["Customers", "/customers"], ["Sales", "/sales"], ["Invoices", "/invoices"], ["Expenses", "/expenses"], ["Tasks", "/tasks"], ["Appointments", "/appointments"], ["Settings", "/settings"]];
  return <div className="crm-workspace min-h-screen bg-[#f7f8fb] text-[#26334a]">
    <div className="mx-auto flex min-h-screen max-w-[1600px]">
      <aside className="hidden w-60 shrink-0 border-r border-[#e9edf2] bg-white p-5 lg:block">
        <Link href="/dashboard" className="mb-9 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#172b55] text-sm font-bold text-white">B</span><span className="text-sm font-bold text-[#27344c]">BusinessOS</span></Link>
        <nav className="space-y-1" aria-label="Workspace navigation">{links.map(([name, href]) => <Link key={name} href={href} aria-current={name === "Sales" ? "page" : undefined} className={`block rounded-lg px-3 py-2.5 text-[13px] font-medium ${name === "Sales" ? "bg-[#eff1fa] text-[#566bbd]" : "text-[#737f92] hover:bg-[#f7f8fa]"}`}>{name}</Link>)}</nav>
        <div className="mt-8 border-t border-[#edf0f4] pt-4"><button className={button} disabled={loggingOut} onClick={logout}>{loggingOut ? "Signing out…" : "Sign out"}</button>{logoutError && <p role="alert" className="mt-2 text-xs text-rose-600">{logoutError}</p>}</div>
      </aside>
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-[#e9edf2] bg-white/90 px-4 py-3 backdrop-blur md:px-8">
          <nav className="flex gap-1 overflow-x-auto lg:hidden" aria-label="Workspace navigation">{links.map(([name, href]) => <Link key={name} href={href} className={`shrink-0 rounded-lg px-3 py-2 text-xs ${name === "Sales" ? "bg-[#eff1fa] text-[#566bbd]" : "text-[#737f92]"}`}>{name}</Link>)}</nav>
          <div className="hidden items-center justify-between lg:flex"><div><p className="text-xs text-[#8b95a5]">BusinessOS / Workspace</p><p className="mt-0.5 text-sm font-semibold">Sales pipeline</p></div><button className={button} disabled={loggingOut} onClick={logout}>{loggingOut ? "Signing out…" : "Sign out"}</button></div>
        </header>
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  </div>;
}

function DealDialog({
  initial, pipelines, customers, saving, error, editing, onClose, onSave,
}: {
  initial: Draft; pipelines: Pipeline[]; customers: Customer[]; saving: boolean; error: string;
  editing: boolean; onClose: () => void; onSave: (draft: Draft) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const stages = pipelines.find((pipeline) => pipeline.id === draft.pipelineId)?.stages ?? [];
  function change<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => {
      const next = { ...current, [key]: value };
      if (key === "stageId") {
        const stage = stages.find((item) => item.id === value);
        if (stage) next.probability = String(stage.defaultProbability);
      }
      if (key === "pipelineId") {
        const stage = pipelines.find((pipeline) => pipeline.id === value)?.stages.find((item) => !item.isWon && !item.isLost);
        next.stageId = stage?.id ?? ""; next.probability = String(stage?.defaultProbability ?? 10);
      }
      return next;
    });
  }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); onSave(draft); }
  return <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/45 p-3" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="deal-dialog-title" className="my-auto max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#e9edf2] bg-white p-5 shadow-2xl sm:p-7">
      <div className="mb-5 flex items-start justify-between"><div><h2 id="deal-dialog-title" className="text-lg font-semibold">Deal details</h2><p className="mt-1 text-xs text-[#8b95a5]">Add the opportunity and expected value.</p></div><button className={button} type="button" onClick={onClose}>Close</button></div>
      <form className="space-y-4" onSubmit={submit}>
        {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <label className="block text-xs font-medium">Deal title<input required maxLength={200} className={`${input} mt-1.5`} value={draft.title} onChange={(e) => change("title", e.target.value)} /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-medium">Pipeline<select disabled={editing} className={`${input} mt-1.5`} value={draft.pipelineId} onChange={(e) => change("pipelineId", e.target.value)}>{pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label className="block text-xs font-medium">Stage<select disabled={editing} className={`${input} mt-1.5`} value={draft.stageId} onChange={(e) => change("stageId", e.target.value)}>{stages.filter((s) => !s.isWon && !s.isLost).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label className="block text-xs font-medium">Customer (optional)<select className={`${input} mt-1.5`} value={draft.customerId} onChange={(e) => change("customerId", e.target.value)}><option value="">Unassociated opportunity</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ""} ({c.status})</option>)}</select></label>
          <label className="block text-xs font-medium">Deal value<input required inputMode="decimal" pattern="(?:0|[1-9][0-9]{0,11})(?:\\.[0-9]{1,2})?" className={`${input} mt-1.5`} value={draft.amount} onChange={(e) => change("amount", e.target.value)} placeholder="0.00" /></label>
          <label className="block text-xs font-medium">Currency<select className={`${input} mt-1.5`} value={draft.currency} onChange={(e) => change("currency", e.target.value as Currency)}>{(["EGP", "USD", "EUR"] as Currency[]).map((currency) => <option key={currency}>{currency}</option>)}</select></label>
          <label className="block text-xs font-medium">Probability (%)<input required type="number" min={0} max={100} className={`${input} mt-1.5`} value={draft.probability} onChange={(e) => change("probability", e.target.value)} /></label>
          <label className="block text-xs font-medium">Expected close date<input type="date" className={`${input} mt-1.5`} value={draft.expectedCloseDate} onChange={(e) => change("expectedCloseDate", e.target.value)} /></label>
          <label className="block text-xs font-medium">Priority<select className={`${input} mt-1.5`} value={draft.priority} onChange={(e) => change("priority", e.target.value as Priority)}>{priorities.map((p) => <option key={p} value={p}>{p[0].toUpperCase()+p.slice(1)}</option>)}</select></label>
          <label className="block text-xs font-medium sm:col-span-2">Source<input maxLength={120} className={`${input} mt-1.5`} value={draft.source} onChange={(e) => change("source", e.target.value)} placeholder="Referral, website, event…" /></label>
          <label className="block text-xs font-medium sm:col-span-2">Description<textarea maxLength={10000} rows={3} className={`${input} mt-1.5`} value={draft.description} onChange={(e) => change("description", e.target.value)} /></label>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#edf0f4] pt-4"><button type="button" className={button} onClick={onClose} disabled={saving}>Cancel</button><button type="submit" className={primary} disabled={saving}>{saving ? "Saving…" : "Save deal"}</button></div>
      </form>
    </section>
  </div>;
}

function StageEditor({ stage, onSave, onDelete, disabled }: { stage: StageDraft; onSave: (stage: StageDraft) => void; onDelete?: () => void; disabled?: boolean }) {
  const [draft, setDraft] = useState(stage);
  return <div className="grid items-end gap-3 rounded-xl border border-[#edf0f4] bg-white p-3 sm:grid-cols-[minmax(120px,1fr)_90px_110px_auto_auto_auto]">
    <label className="text-[11px] font-medium">Stage name<input className={`${input} mt-1`} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
    <label className="text-[11px] font-medium">Color<input type="color" className={`${input} mt-1 h-9 p-1`} value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} /></label>
    <label className="text-[11px] font-medium">Probability %<input type="number" min={0} max={100} className={`${input} mt-1`} value={draft.defaultProbability} onChange={(e) => setDraft({ ...draft, defaultProbability: e.target.value })} /></label>
    <label className="flex items-center gap-1.5 pb-2 text-xs"><input type="checkbox" checked={draft.isWon} disabled={draft.isLost} onChange={(e) => setDraft({ ...draft, isWon: e.target.checked })} />Won</label>
    <label className="flex items-center gap-1.5 pb-2 text-xs"><input type="checkbox" checked={draft.isLost} disabled={draft.isWon} onChange={(e) => setDraft({ ...draft, isLost: e.target.checked })} />Lost</label>
    <div className="flex gap-2"><button className={button} disabled={disabled || !draft.name.trim()} onClick={() => onSave(draft)}>Save</button>{onDelete && <button className={`${button} text-rose-600`} disabled={disabled} onClick={onDelete}>Delete</button>}</div>
  </div>;
}

function metricMoney(kpis: Analytics["kpis"], key: "openValueCents" | "weightedValueCents" | "wonValueCents" | "lostValueCents") {
  return kpis.length ? kpis.map((row) => money(row[key], row.currency)).join(" · ") : "EGP 0.00";
}

export default function SalesPage() {
  const router = useRouter();
  const { preferences } = useUserPreferences();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [pipelineId, setPipelineId] = useState("");
  const [deals, setDeals] = useState<Deal[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({ kpis: [], byStage: [], monthly: [], expectedClosings: [] });
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState<{ id?: string; draft: Draft } | null>(null);
  const [detail, setDetail] = useState<{ deal: Deal; history: History[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [query, setQuery] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showClosed, setShowClosed] = useState(false);
  const [leadError, setLeadError] = useState("");
  const [busyCustomer, setBusyCustomer] = useState("");

  const activePipeline = useMemo(() => pipelines.find((pipeline) => pipeline.id === pipelineId) ?? null, [pipelines, pipelineId]);

  const reload = useCallback(async (selectedPipeline?: string) => {
    setLoading(true); setLoadError("");
    try {
      const [pipelineData, customerData] = await Promise.all([
        request<{ pipelines: Pipeline[] }>("/pipelines"),
        request<{ customers: Customer[] }>("/customers"),
      ]);
      const nextPipelines = pipelineData.pipelines ?? [];
      setPipelines(nextPipelines);
      const nextPipeline = selectedPipeline && nextPipelines.some((p) => p.id === selectedPipeline)
        ? selectedPipeline : pipelineId && nextPipelines.some((p) => p.id === pipelineId)
          ? pipelineId : nextPipelines[0]?.id ?? "";
      setPipelineId(nextPipeline);
      setCustomers(customerData.customers ?? []);
      if (!nextPipeline) { setDeals([]); setAnalytics({ kpis: [], byStage: [], monthly: [], expectedClosings: [] }); return; }
      const filters = new URLSearchParams({ pipelineId: nextPipeline, page: String(page), pageSize: "100", sortBy, sortOrder });
      if (query.trim()) filters.set("q", query.trim());
      if (filterStage) filters.set("stageId", filterStage);
      if (filterPriority) filters.set("priority", filterPriority);
      if (filterFrom) filters.set("closeFrom", filterFrom);
      if (filterTo) filters.set("closeTo", filterTo);
      if (minAmount) filters.set("minAmount", minAmount);
      if (maxAmount) filters.set("maxAmount", maxAmount);
      const [dealData, analyticsData] = await Promise.all([
        request<DealListResponse>(`/deals?${filters.toString()}`),
        request<Analytics>(`/sales/analytics?pipelineId=${encodeURIComponent(nextPipeline)}`),
      ]);
      setDeals(dealData.deals ?? []);
      setTotalPages(dealData.pagination?.totalPages ?? 1);
      setAnalytics({ kpis: analyticsData.kpis ?? [], byStage: analyticsData.byStage ?? [], monthly: analyticsData.monthly ?? [], expectedClosings: analyticsData.expectedClosings ?? [] });
    } catch (error) {
      if ((error as { status?: number }).status === 401) { router.replace("/authPages/sign-in"); return; }
      setLoadError(error instanceof Error ? error.message : "Could not load sales workspace.");
    } finally { setLoading(false); }
  }, [router, pipelineId, page, sortBy, sortOrder, query, filterStage, filterPriority, filterFrom, filterTo, minAmount, maxAmount]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void reload(); }, 0);
    return () => window.clearTimeout(timer);
  }, [reload]);

  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(""), 3500); }

  async function saveDeal(draft: Draft) {
    setSaving(true); setFormError("");
    try {
      const payload = {
        ...draft, amount: draft.amount.trim(), description: draft.description.trim() || null,
        customerId: draft.customerId || null, expectedCloseDate: draft.expectedCloseDate || null,
        source: draft.source.trim() || null, probability: Number(draft.probability),
      };
      if (modal?.id) {
        const updates = {
          customerId: payload.customerId, title: payload.title, description: payload.description,
          amount: payload.amount, currency: payload.currency, probability: payload.probability,
          expectedCloseDate: payload.expectedCloseDate, priority: payload.priority, source: payload.source,
        };
        await request(`/deals/${modal.id}`, { method: "PATCH", body: JSON.stringify(updates) });
      }
      else await request("/deals", { method: "POST", body: JSON.stringify(payload) });
      setModal(null); notify(modal?.id ? "Deal updated." : "Deal created."); await reload();
    } catch (error) { setFormError(error instanceof Error ? error.message : "Could not save this deal."); }
    finally { setSaving(false); }
  }

  async function openDetails(deal: Deal) {
    try { setDetail(await request(`/deals/${deal.id}`)); }
    catch (error) { notify(error instanceof Error ? error.message : "Could not load deal details."); }
  }

  async function moveDeal(deal: Deal, stage: Stage) {
    const nextStatus = stageStatus(stage);
    if (deal.status !== "open" && nextStatus !== "open" && deal.status !== nextStatus) {
      notify("Reopen the deal before switching its closed outcome."); return;
    }
    let lostReason: string | undefined;
    if (nextStatus === "lost") {
      lostReason = window.prompt("Why was this deal lost?")?.trim() || undefined;
      if (!lostReason) { notify("A lost reason is required."); return; }
    }
    const before = deals;
    setDeals((current) => current.map((item) => item.id === deal.id ? {
      ...item, stageId: stage.id, stageName: stage.name, stageColor: stage.color,
      stageIsWon: stage.isWon, stageIsLost: stage.isLost, status: nextStatus,
      closedAt: nextStatus === "open" ? null : new Date().toISOString(),
      lostReason: nextStatus === "lost" ? lostReason ?? null : null,
    } : item));
    try {
      await request(`/deals/${deal.id}/stage`, { method: "PATCH", body: JSON.stringify({ stageId: stage.id, ...(lostReason ? { lostReason } : {}) }) });
      notify(nextStatus === "won" ? "Deal marked won." : nextStatus === "lost" ? "Deal marked lost." : "Deal moved.");
      await reload();
    } catch (error) {
      setDeals(before);
      notify(error instanceof Error ? `${error.message} Changes were rolled back.` : "Could not move deal. Changes were rolled back.");
    }
  }

  async function closeDeal(deal: Deal, status: DealStatus) {
    let reason: string | undefined;
    if (status === "lost") {
      reason = window.prompt("Why was this deal lost?")?.trim() || undefined;
      if (!reason) { notify("A lost reason is required."); return; }
    }
    try {
      await request(`/deals/${deal.id}/close`, { method: "PATCH", body: JSON.stringify({ status, ...(reason ? { reason } : {}) }) });
      notify(status === "open" ? "Deal reopened." : status === "won" ? "Deal marked won." : "Deal marked lost.");
      await reload();
      if (detail?.deal.id === deal.id) await openDetails({ ...deal, status });
    } catch (error) { notify(error instanceof Error ? error.message : "Could not update deal status."); }
  }

  async function deleteDeal(deal: Deal) {
    if (!window.confirm(`Delete “${deal.title}”? This cannot be undone.`)) return;
    try {
      await request(`/deals/${deal.id}`, { method: "DELETE" });
      setDetail(null); notify("Deal deleted."); await reload();
    } catch (error) { notify(error instanceof Error ? error.message : "Could not delete deal."); }
  }

  async function updateCustomer(customer: Customer, action: "qualify" | "convert") {
    setBusyCustomer(customer.id); setLeadError("");
    try {
      await request(`/customers/${customer.id}/${action}`, { method: "POST" });
      notify(action === "qualify" ? `${customer.name} qualified as a prospect.` : `${customer.name} converted to a customer.`);
      await reload();
    } catch (error) { setLeadError(error instanceof Error ? error.message : "Customer status could not be updated."); }
    finally { setBusyCustomer(""); }
  }

  async function createPipeline() {
    const name = window.prompt("Name your new pipeline")?.trim();
    if (!name) return;
    try { const result = await request<{ pipeline: { id: string } }>("/pipelines", { method: "POST", body: JSON.stringify({ name }) }); await reload(result.pipeline.id); setTab("settings"); notify("Pipeline created with default stages."); }
    catch (error) { notify(error instanceof Error ? error.message : "Could not create pipeline."); }
  }

  async function renamePipeline(pipeline: Pipeline) {
    const name = window.prompt("Pipeline name", pipeline.name)?.trim();
    if (!name || name === pipeline.name) return;
    try { await request(`/pipelines/${pipeline.id}`, { method: "PATCH", body: JSON.stringify({ name }) }); await reload(); notify("Pipeline renamed."); }
    catch (error) { notify(error instanceof Error ? error.message : "Could not rename pipeline."); }
  }

  async function deletePipeline(pipeline: Pipeline) {
    if (pipeline.isDefault) { notify("The default pipeline cannot be deleted."); return; }
    if (!window.confirm(`Delete “${pipeline.name}”? It must not contain any deals.`)) return;
    try { await request(`/pipelines/${pipeline.id}`, { method: "DELETE" }); await reload(); notify("Pipeline deleted."); }
    catch (error) { notify(error instanceof Error ? error.message : "Could not delete pipeline."); }
  }

  async function saveStage(stage: Stage, draft: StageDraft) {
    try {
      await request(`/pipelines/${pipelineId}/stages/${stage.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...draft, defaultProbability: Number(draft.defaultProbability) }),
      });
      await reload(); notify("Stage saved.");
    } catch (error) { notify(error instanceof Error ? error.message : "Could not save stage."); }
  }

  async function addStage() {
    const name = window.prompt("New stage name")?.trim();
    if (!name || !pipelineId) return;
    try {
      await request(`/pipelines/${pipelineId}/stages`, { method: "POST", body: JSON.stringify({ name, color: "#64748B", defaultProbability: 50 }) });
      await reload(); notify("Stage added.");
    } catch (error) { notify(error instanceof Error ? error.message : "Could not add stage."); }
  }

  async function deleteStage(stage: Stage) {
    if (!window.confirm(`Delete stage “${stage.name}”? It must be empty.`)) return;
    try { await request(`/pipelines/${pipelineId}/stages/${stage.id}`, { method: "DELETE" }); await reload(); notify("Stage deleted."); }
    catch (error) { notify(error instanceof Error ? error.message : "Could not delete stage."); }
  }

  async function reorderStages(stage: Stage, direction: -1 | 1) {
    if (!activePipeline) return;
    const stages = [...activePipeline.stages].sort((a, b) => a.position - b.position);
    const index = stages.findIndex((s) => s.id === stage.id), next = index + direction;
    if (index < 0 || next < 0 || next >= stages.length) return;
    [stages[index], stages[next]] = [stages[next], stages[index]];
    try { await request(`/pipelines/${pipelineId}/stages/reorder`, { method: "PATCH", body: JSON.stringify({ stageIds: stages.map((s) => s.id) }) }); await reload(); }
    catch (error) { notify(error instanceof Error ? error.message : "Could not reorder stages."); }
  }

  const leads = customers.filter((customer) => customer.status !== "customer").slice(0, 8);
  const byCurrency = (key: keyof Analytics["kpis"][number]) => analytics.kpis.reduce((sum, item) => sum + Number(item[key] ?? 0), 0);
  const winTotal = analytics.kpis.reduce((sum, item) => sum + item.wonDeals, 0);
  const lostTotal = analytics.kpis.reduce((sum, item) => sum + item.lostDeals, 0);
  const winRate = winTotal + lostTotal ? Math.round(winTotal / (winTotal + lostTotal) * 100) : 0;
  const closedCount = analytics.kpis.reduce((sum, item) => sum + item.wonDeals + item.lostDeals, 0);
  const averageCycle = closedCount
    ? (analytics.kpis.reduce((sum, item) => sum + Number(item.avgSalesCycleDays) * (item.wonDeals + item.lostDeals), 0) / closedCount).toFixed(1)
    : "0";
  const avgDeals = analytics.kpis.length ? analytics.kpis.map((item) => money(item.avgDealValueCents, item.currency)).join(" · ") : "EGP 0.00";

  function board() {
    if (!activePipeline) return <EmptyState title="Create your first pipeline" text="Sales stages and deals will appear here once a pipeline is available." action={createPipeline} />;
    const stages = activePipeline.stages.slice().sort((a, b) => a.position - b.position);
    const visibleDeals = deals.filter((deal) => showClosed || deal.status === "open");
    const handleDrop = (event: React.DragEvent<HTMLDivElement>, stage: Stage) => {
      event.preventDefault();
      const id = event.dataTransfer.getData("text/deal-id");
      const deal = visibleDeals.find((item) => item.id === id);
      if (deal && deal.stageId !== stage.id) void moveDeal(deal, stage);
    };
    return <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Pipeline board</h2><p className="mt-1 text-xs text-[#8b95a5]">Drag deals between stages. Closed deals remain in your records and analytics.</p></div><div className="flex gap-2"><button className={button} aria-pressed={showClosed} onClick={() => setShowClosed((value) => !value)}>{showClosed ? "Hide closed deals" : "Show closed deals"}</button><button className={primary} onClick={() => { const stage = stages.find((s) => !s.isWon && !s.isLost); if (stage) { setFormError(""); setModal({ draft: emptyDraft(pipelineId, stage, preferences.currency) }); } }}>+ New deal</button></div></div>
      <FilterBar {...{query,setQuery,filterStage,setFilterStage,filterPriority,setFilterPriority,filterFrom,setFilterFrom,filterTo,setFilterTo,minAmount,setMinAmount,maxAmount,setMaxAmount,sortBy,setSortBy,sortOrder,setSortOrder}} stages={stages} />
      {filterStage && <p className="text-xs text-[#8b95a5]">Stage filter is active; clear the stage selector to see every column.</p>}
      <div className="flex gap-4 overflow-x-auto pb-3">{stages.filter((s) => !filterStage || s.id === filterStage).map((stage) => {
        const stageDeals = visibleDeals.filter((deal) => deal.stageId === stage.id);
        const total = analytics.byStage.filter((row) => row.stageId === stage.id);
        const totalLabel = total.length ? Array.from(new Map(total.filter((row) => row.currency).map((row) => [row.currency!, money(row.amountCents, row.currency!)])), ([, value]) => value).join(" · ") : "EGP 0.00";
        return <div key={stage.id} className="w-[290px] shrink-0 rounded-2xl border border-[#e6eaf0] bg-[#f9fafc] p-3" onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(event, stage)}>
          <div className="mb-3 flex items-start justify-between gap-2"><div><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} /><h3 className="text-sm font-semibold">{stage.name}</h3></div><p className="mt-1 text-[11px] text-[#8b95a5]">{total.reduce((sum, row) => sum + row.count, 0)} active · {totalLabel}</p></div><span className="rounded-full bg-white px-2 py-1 text-[10px] text-[#737f92]">{stage.defaultProbability}%</span></div>
          <div className="space-y-2.5">{stageDeals.map((deal) => <article key={deal.id} draggable onDragStart={(event) => { event.dataTransfer.setData("text/deal-id", deal.id); event.dataTransfer.effectAllowed = "move"; }} className="cursor-grab rounded-xl border border-[#e8ecf1] bg-white p-3 shadow-sm active:cursor-grabbing">
            <button className="w-full text-left" onClick={() => void openDetails(deal)}><span className="line-clamp-2 text-sm font-semibold text-[#29364d]">{deal.title}</span><span className="mt-2 block text-sm font-semibold text-[#566bbd]">{money(deal.amountCents, deal.currency)}</span><span className="mt-2 block truncate text-[11px] text-[#65718a]">{deal.customerName ?? "Unassociated opportunity"}</span><span className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-[#8791a0]"><span>{dateLabel(deal.expectedCloseDate)}</span><span>·</span><span>{deal.priority}</span><span>·</span><span>{deal.probability}%</span></span></button>
            <div className="mt-3 flex gap-1.5"><select aria-label={`Move ${deal.title} to stage`} className="min-w-0 flex-1 rounded-md border border-[#e9edf2] bg-white px-2 py-1.5 text-[10px]" value={deal.stageId} onChange={(event) => { const target = stages.find((s) => s.id === event.target.value); if (target) void moveDeal(deal, target); }}><option value={deal.stageId}>{stage.name}</option>{stages.filter((s) => s.id !== deal.stageId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select><button title="Edit deal" className={button} onClick={() => { setFormError(""); setModal({ id: deal.id, draft: { ...emptyDraft(deal.pipelineId), title: deal.title, description: deal.description ?? "", pipelineId: deal.pipelineId, stageId: deal.stageId, customerId: deal.customerId ?? "", amount: deal.amount, currency: deal.currency, probability: String(deal.probability), expectedCloseDate: deal.expectedCloseDate?.slice(0,10) ?? "", priority: deal.priority, source: deal.source ?? "" } }); }}>Edit</button></div>
          </article>)}</div>
          {!stageDeals.length && <p className="rounded-lg border border-dashed border-[#dfe4ec] p-4 text-center text-[11px] text-[#9aa3b0]">Drop an open deal here</p>}
        </div>;
      })}</div>
      {totalPages > 1 && <div className="flex justify-center gap-2"><button className={button} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous page</button><span className="px-3 py-2 text-xs text-[#737f92]">Page {page} of {totalPages}</span><button className={button} disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next page</button></div>}
    </div>;
  }

  return <AppShell router={router}>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7b88c9]">Revenue workspace</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Sales</h1><p className="mt-1 text-sm text-[#8791a0]">Manage opportunities from first conversation to close.</p></div>
      <div className="flex flex-wrap gap-2"><select aria-label="Select pipeline" className={`${input} min-w-44`} value={pipelineId} onChange={(e) => { setPipelineId(e.target.value); setPage(1); }}><option value="">No pipeline</option>{pipelines.map((pipeline) => <option key={pipeline.id} value={pipeline.id}>{pipeline.name}{pipeline.isDefault ? " · Default" : ""}</option>)}</select><button className={button} onClick={() => void createPipeline()}>+ Pipeline</button><button className={primary} onClick={() => { const stage = activePipeline?.stages.find((s) => !s.isWon && !s.isLost); if (stage) { setFormError(""); setModal({ draft: emptyDraft(pipelineId, stage, preferences.currency) }); } }}>+ New deal</button></div>
    </div>

    <div className="mb-6 flex gap-2 border-b border-[#e5e9f0]">{([["overview","Overview"],["pipeline","Pipeline board"],["settings","Pipeline settings"]] as [Tab,string][]).map(([id,label]) => <button key={id} onClick={() => setTab(id)} className={`border-b-2 px-3 py-2.5 text-xs font-semibold ${tab===id ? "border-[#566bbd] text-[#566bbd]" : "border-transparent text-[#8993a2]"}`}>{label}</button>)}</div>

    {toast && <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">{toast}</div>}
    {loadError && <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><div className="flex items-center justify-between gap-3"><span>{loadError}</span><button className={button} onClick={() => void reload()}>Retry</button></div></div>}
    {loading && <div aria-label="Loading sales" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl border border-[#e9edf2] bg-white" />)}</div>}
    {!loading && !loadError && tab === "overview" && <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Active pipeline value" value={metricMoney(analytics.kpis,"openValueCents")} detail="Open deals, grouped by currency" />
        <Metric label="Weighted pipeline" value={metricMoney(analytics.kpis,"weightedValueCents")} detail="Value × probability" />
        <Metric label="Won deal value" value={metricMoney(analytics.kpis,"wonValueCents")} detail="All-time closed won deals" />
        <Metric label="Lost deal value" value={metricMoney(analytics.kpis,"lostValueCents")} detail="All-time closed lost deals" />
        <Metric label="Active deals" value={String(analytics.kpis.reduce((sum, row) => sum + row.activeDeals, 0))} detail="Open opportunities" />
        <Metric label="Win rate" value={`${winRate}%`} detail={`${winTotal} won · ${lostTotal} lost`} />
        <Metric label="Average deal value" value={avgDeals} detail="Closed deals, grouped by currency" />
        <Metric label="Average sales cycle" value={`${averageCycle} days`} detail="From creation to close" />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-[#e9edf2] bg-white p-5"><SectionTitle title="Active pipeline by stage" subtitle="Open deal value and weighted value by stage" />
          <div className="mt-4 space-y-4">{activePipeline?.stages.slice().sort((a,b)=>a.position-b.position).filter((s)=>!s.isWon&&!s.isLost).map((stage) => {
            const rows = analytics.byStage.filter((row)=>row.stageId===stage.id&&row.currency);
            return <div key={stage.id}><div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="flex items-center gap-2 font-medium"><i className="h-2.5 w-2.5 rounded-full" style={{backgroundColor:stage.color}} />{stage.name} <span className="text-[#9aa3b0]">({rows.reduce((n,r)=>n+r.count,0)})</span></span><span className="text-right text-[#65718a]">{rows.length?rows.map((row)=>money(row.amountCents,row.currency!)).join(" · "):"EGP 0.00"}</span></div><div className="h-2 overflow-hidden rounded-full bg-[#edf0f5]"><div className="h-full rounded-full" style={{width:`${Math.min(100,Math.max(4,rows.reduce((n,r)=>n+Number(r.amountCents),0)/Math.max(1,Number(byCurrency("openValueCents")))*100))}%`,backgroundColor:stage.color}} /></div><p className="mt-1 text-[10px] text-[#9aa3b0]">Weighted: {rows.length?rows.map((row)=>money(row.weightedAmountCents,row.currency!)).join(" · "):"EGP 0.00"}</p></div>;
          })}{!activePipeline && <p className="text-xs text-[#8b95a5]">No stages available.</p>}</div>
        </section>
        <section className="rounded-2xl border border-[#e9edf2] bg-white p-5"><SectionTitle title="Won vs. lost" subtitle="Closed deals over the last 12 months" />
          <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">{analytics.monthly.map((row) => <div key={`${row.currency}-${row.month}`} className="grid grid-cols-[90px_1fr_auto] items-center gap-3 border-b border-[#f1f3f6] pb-2"><span className="text-xs text-[#667287]">{new Date(`${row.month}T00:00:00`).toLocaleDateString(undefined,{month:"short",year:"2-digit"})} · {row.currency}</span><div className="flex h-3 overflow-hidden rounded-full bg-[#f3f4f7]"><span className="bg-emerald-400" style={{width:`${row.won+row.lost?row.won/(row.won+row.lost)*100:0}%`}} /><span className="bg-rose-300" style={{width:`${row.won+row.lost?row.lost/(row.won+row.lost)*100:0}%`}} /></div><span className="text-[10px] text-[#7c8798]">{row.won}W / {row.lost}L</span></div>)}{!analytics.monthly.length && <p className="py-8 text-center text-xs text-[#9aa3b0]">Closed deals will appear here.</p>}</div>
          <div className="mt-3 flex gap-4 text-[10px] text-[#7c8798]"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-400" />Won</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-300" />Lost</span></div>
        </section>
        <section className="rounded-2xl border border-[#e9edf2] bg-white p-5"><SectionTitle title="Monthly sales performance" subtitle="Won and lost value by month and currency" />
          <div className="mt-4 max-h-80 space-y-3 overflow-y-auto">{analytics.monthly.map((row) => {
            const won = Number(row.wonValueCents), lost = Number(row.lostValueCents), total = Math.max(1, won + lost);
            return <div key={`value-${row.currency}-${row.month}`} className="grid grid-cols-[90px_1fr] items-center gap-3 border-b border-[#f1f3f6] pb-2"><span className="text-[11px] text-[#667287]">{new Date(`${row.month}T00:00:00`).toLocaleDateString(undefined,{month:"short",year:"2-digit"})} · {row.currency}</span><div><div className="flex h-2.5 overflow-hidden rounded-full bg-[#f3f4f7]"><span className="bg-emerald-400" style={{width:`${won/total*100}%`}} /><span className="bg-rose-300" style={{width:`${lost/total*100}%`}} /></div><p className="mt-1 text-[10px] text-[#7c8798]">Won {money(row.wonValueCents,row.currency)} · Lost {money(row.lostValueCents,row.currency)}</p></div></div>;
          })}{!analytics.monthly.length && <p className="py-8 text-center text-xs text-[#9aa3b0]">Monthly revenue will appear when deals are closed.</p>}</div>
        </section>
        <section className="rounded-2xl border border-[#e9edf2] bg-white p-5"><SectionTitle title="Expected revenue" subtitle="Open opportunities grouped by expected closing date" /><div className="mt-3 max-h-64 overflow-auto">
          {analytics.expectedClosings.map((row)=><div key={`${row.date}-${row.currency}`} className="flex items-center justify-between border-b border-[#f1f3f6] py-2.5 text-xs"><span>{dateLabel(row.date)} · {row.currency} <span className="text-[#9aa3b0]">({row.count})</span></span><span className="font-semibold">{money(row.weightedAmountCents,row.currency)}</span></div>)}{!analytics.expectedClosings.length&&<p className="py-8 text-center text-xs text-[#9aa3b0]">Add close dates to forecast revenue.</p>}
        </div></section>
        <section className="rounded-2xl border border-[#e9edf2] bg-white p-5"><SectionTitle title="Qualify customer leads" subtitle="Qualification updates existing customer records; it never creates duplicates." />
          {leadError&&<p role="alert" className="mt-3 text-xs text-rose-600">{leadError}</p>}<div className="mt-3 divide-y divide-[#f1f3f6]">{leads.map((customer)=><div key={customer.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-xs font-medium">{customer.name}</p><p className="mt-0.5 text-[10px] text-[#8b95a5]">{customer.company??"Individual"} · {customer.status}</p></div><div className="flex gap-1.5">{customer.status==="lead"&&<button className={button} disabled={busyCustomer===customer.id} onClick={()=>void updateCustomer(customer,"qualify")}>Qualify</button>}<button className={button} disabled={busyCustomer===customer.id} onClick={()=>void updateCustomer(customer,"convert")}>Convert</button></div></div>)}{!leads.length&&<p className="py-8 text-center text-xs text-[#9aa3b0]">No leads or prospects need conversion.</p>}</div>
        </section>
      </div>
    </>}
    {!loading && !loadError && tab === "pipeline" && board()}
    {!loading && !loadError && tab === "settings" && <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-semibold">Pipeline settings</h2><p className="mt-1 text-xs text-[#8b95a5]">Customize names, colors, probabilities, and stage order.</p></div><button className={button} onClick={()=>activePipeline&&void renamePipeline(activePipeline)}>Rename pipeline</button></div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e9edf2] bg-white p-4"><div><p className="text-sm font-semibold">{activePipeline?.name??"No pipeline selected"}</p><p className="mt-1 text-[11px] text-[#8b95a5]">{activePipeline?.isDefault?"Default pipeline":"Custom pipeline"} · {activePipeline?.stages.length??0} stages</p></div><div className="flex gap-2"><button className={button} onClick={()=>void createPipeline()}>+ Add pipeline</button><button className={`${button} text-rose-600`} disabled={!activePipeline||activePipeline.isDefault} onClick={()=>activePipeline&&void deletePipeline(activePipeline)}>Delete pipeline</button></div></div>
      <div className="space-y-2">{activePipeline?.stages.slice().sort((a,b)=>a.position-b.position).map((stage,index,array)=><div key={stage.id} className="flex items-center gap-2"><div className="flex flex-col gap-1"><button className={button} aria-label={`Move ${stage.name} up`} disabled={index===0} onClick={()=>void reorderStages(stage,-1)}>↑</button><button className={button} aria-label={`Move ${stage.name} down`} disabled={index===array.length-1} onClick={()=>void reorderStages(stage,1)}>↓</button></div><div className="min-w-0 flex-1"><StageEditor key={`${stage.id}-${stage.name}-${stage.defaultProbability}-${stage.color}-${stage.isWon}-${stage.isLost}`} stage={{name:stage.name,color:stage.color,defaultProbability:String(stage.defaultProbability),isWon:stage.isWon,isLost:stage.isLost}} onSave={(draft)=>void saveStage(stage,draft)} onDelete={!stage.isWon&&!stage.isLost?()=>void deleteStage(stage):undefined} /></div></div>)}</div>
      <div className="flex flex-wrap gap-2"><button className={primary} onClick={()=>void addStage()}>+ Add stage</button><p className="self-center text-[11px] text-[#8b95a5]">Keep at least one active stage and exactly one Won and Lost stage.</p></div>
    </section>}

    {modal && <DealDialog initial={modal.draft} pipelines={pipelines} customers={customers} saving={saving} error={formError} editing={Boolean(modal.id)} onClose={()=>setModal(null)} onSave={(draft)=>void saveDeal(draft)} />}
    {detail && <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/35" onMouseDown={(event)=>{if(event.target===event.currentTarget)setDetail(null);}}><aside role="dialog" aria-modal="true" aria-labelledby="deal-detail-title" className="h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl sm:p-7">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs text-[#8b95a5]">{detail.deal.pipelineName} / {detail.deal.stageName}</p><h2 id="deal-detail-title" className="mt-1 text-xl font-semibold">{detail.deal.title}</h2></div><button className={button} onClick={()=>setDetail(null)}>Close</button></div>
      <p className="mt-5 text-2xl font-semibold text-[#566bbd]">{money(detail.deal.amountCents,detail.deal.currency)}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs"><DetailField label="Customer" value={detail.deal.customerName??"Unassociated"} /><DetailField label="Status" value={detail.deal.status} /><DetailField label="Probability" value={`${detail.deal.probability}%`} /><DetailField label="Expected close" value={dateLabel(detail.deal.expectedCloseDate)} /><DetailField label="Priority" value={detail.deal.priority} /><DetailField label="Source" value={detail.deal.source??"—"} /></div>
      {detail.deal.description&&<p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-[#667287]">{detail.deal.description}</p>}{detail.deal.lostReason&&<p className="mt-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">Lost reason: {detail.deal.lostReason}</p>}
      <div className="mt-5 flex flex-wrap gap-2">{detail.deal.status==="open"?<><button className={button} onClick={()=>{setFormError("");setModal({id:detail.deal.id,draft:{...emptyDraft(detail.deal.pipelineId),title:detail.deal.title,description:detail.deal.description??"",pipelineId:detail.deal.pipelineId,stageId:detail.deal.stageId,customerId:detail.deal.customerId??"",amount:detail.deal.amount,currency:detail.deal.currency,probability:String(detail.deal.probability),expectedCloseDate:detail.deal.expectedCloseDate?.slice(0,10)??"",priority:detail.deal.priority,source:detail.deal.source??""}});}}>Edit</button><button className={button} onClick={()=>void closeDeal(detail.deal,"won")}>Mark won</button><button className={button} onClick={()=>void closeDeal(detail.deal,"lost")}>Mark lost</button></>:<button className={button} onClick={()=>void closeDeal(detail.deal,"open")}>Reopen deal</button>}<button className={`${button} text-rose-600`} onClick={()=>void deleteDeal(detail.deal)}>Delete</button></div>
      <section className="mt-8 border-t border-[#edf0f4] pt-5"><h3 className="text-sm font-semibold">Stage history</h3><div className="mt-3 space-y-3">{detail.history.map((item)=><div key={item.id} className="border-l-2 border-[#dfe4f2] pl-3"><p className="text-xs font-medium">{item.fromStageName??"Created"} → {item.toStageName}</p><p className="mt-1 text-[10px] text-[#8b95a5]">{new Date(item.changedAt).toLocaleString()} · {item.toStatus}{item.reason?` · ${item.reason}`:""}</p></div>)}</div></section>
    </aside></div>}
  </AppShell>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="rounded-2xl border border-[#e9edf2] bg-white p-4 shadow-sm"><p className="text-[11px] font-medium text-[#8791a0]">{label}</p><p className="mt-3 break-words text-xl font-semibold tracking-tight text-[#26334a]">{value}</p><p className="mt-1 text-[10px] text-[#9aa3b0]">{detail}</p></article>;
}
function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return <div><h2 className="text-sm font-semibold">{title}</h2><p className="mt-1 text-[11px] text-[#8b95a5]">{subtitle}</p></div>;
}
function DetailField({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-[#f8f9fb] p-3"><p className="text-[10px] text-[#8b95a5]">{label}</p><p className="mt-1 truncate font-medium capitalize">{value}</p></div>;
}
function EmptyState({ title, text, action }: { title: string; text: string; action?: () => void }) {
  return <div className="rounded-2xl border border-dashed border-[#dfe4ec] bg-white px-6 py-14 text-center"><h2 className="text-base font-semibold">{title}</h2><p className="mx-auto mt-2 max-w-md text-sm text-[#8b95a5]">{text}</p>{action&&<button className={`${primary} mt-4`} onClick={action}>Create pipeline</button>}</div>;
}
function FilterBar(props: {
  query: string; setQuery: (v:string)=>void; filterStage: string; setFilterStage:(v:string)=>void; filterPriority:string;setFilterPriority:(v:string)=>void;
  filterFrom:string;setFilterFrom:(v:string)=>void;filterTo:string;setFilterTo:(v:string)=>void;minAmount:string;setMinAmount:(v:string)=>void;
  maxAmount:string;setMaxAmount:(v:string)=>void;sortBy:string;setSortBy:(v:string)=>void;sortOrder:"asc"|"desc";setSortOrder:(v:"asc"|"desc")=>void;stages:Stage[];
}) {
  return <div className="grid gap-2 rounded-xl border border-[#e9edf2] bg-white p-3 sm:grid-cols-2 xl:grid-cols-4">
    <input aria-label="Search deals" className={input} value={props.query} onChange={(e)=>props.setQuery(e.target.value)} placeholder="Search deals or customers…" />
    <select aria-label="Filter by stage" className={input} value={props.filterStage} onChange={(e)=>props.setFilterStage(e.target.value)}><option value="">All stages</option>{props.stages.map((s)=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
    <select aria-label="Filter by priority" className={input} value={props.filterPriority} onChange={(e)=>props.setFilterPriority(e.target.value)}><option value="">All priorities</option>{priorities.map((p)=><option key={p} value={p}>{p}</option>)}</select>
    <div className="grid grid-cols-2 gap-2"><input aria-label="Expected close from" type="date" className={input} value={props.filterFrom} onChange={(e)=>props.setFilterFrom(e.target.value)} /><input aria-label="Expected close to" type="date" className={input} value={props.filterTo} onChange={(e)=>props.setFilterTo(e.target.value)} /></div>
    <input aria-label="Minimum value" inputMode="decimal" className={input} value={props.minAmount} onChange={(e)=>props.setMinAmount(e.target.value)} placeholder="Min value" />
    <input aria-label="Maximum value" inputMode="decimal" className={input} value={props.maxAmount} onChange={(e)=>props.setMaxAmount(e.target.value)} placeholder="Max value" />
    <select aria-label="Sort deals" className={input} value={props.sortBy} onChange={(e)=>props.setSortBy(e.target.value)}><option value="updatedAt">Recently updated</option><option value="createdAt">Created date</option><option value="title">Title</option><option value="amount">Deal value</option><option value="expectedCloseDate">Expected close</option><option value="priority">Priority</option><option value="probability">Probability</option></select>
    <button className={button} onClick={()=>props.setSortOrder(props.sortOrder==="asc"?"desc":"asc")}>Sort {props.sortOrder==="asc"?"↑":"↓"}</button>
  </div>;
}
