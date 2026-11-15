"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type TaskStatus = string;
type TaskPriority = string;
type Task = {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority?: TaskPriority | null;
  startDate?: string | null;
  dueDate?: string | null;
  customerId?: string | null;
  invoiceId?: string | null;
  expenseId?: string | null;
  categoryId?: string | null;
  tagIds?: string[];
  tags?: (string | { id: string; name: string })[];
  attachments?: TaskAttachment[];
  activity?: Activity[];
  customer?: Related;
  createdAt?: string;
  archived?: boolean;
  [key: string]: unknown;
};
type Option = { id: string; name: string; color?: string; icon?: string | null };
type Related = { id: string; name: string };
type Subtask = { id: string; title: string; completed?: boolean; status?: string };
type Comment = { id: string; content?: string; body?: string; createdAt?: string; user?: { name?: string }; author?: string };
type Activity = { id: string; eventType?: string; details?: Record<string, unknown>; action?: string; description?: string; createdAt?: string };
type TimeEntry = { id: string; durationSeconds: number | null; startedAt: string; endedAt: string | null };
type TaskAttachment = { id: string; name: string; contentType: string; byteSize: number; createdAt?: string };
type Recurrence = { id: string; title: string; description?: string | null; priority: string; cadence: string; intervalCount: number; startsOn: string; nextRun: string; endsOn?: string | null; active: boolean };
type TaskNotification = { id: string; taskId?: string | null; title: string; body: string; readAt?: string | null; createdAt: string };
type TaskReminder = { id: string; taskId: string; taskTitle?: string; remindAt: string; sentAt?: string | null };
type Mode = "list" | "board" | "calendar";
type Draft = {
  title: string; description: string; status: string; priority: string; startDate: string; dueDate: string;
  customerId: string; invoiceId: string; expenseId: string; categoryId: string; tagIds: string[];
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const STATUSES = ["backlog", "todo", "in_progress", "in_review", "completed", "cancelled"];
const STATUS_TRANSITIONS: Record<string, string[]> = {
  backlog: ["todo", "in_progress", "completed", "cancelled"],
  todo: ["backlog", "in_progress", "completed", "cancelled"],
  in_progress: ["todo", "in_review", "completed", "cancelled"],
  in_review: ["todo", "in_progress", "completed", "cancelled"],
  completed: ["todo", "cancelled"],
  cancelled: ["backlog", "todo"],
};
const PRIORITIES = ["low", "medium", "high", "urgent"];
const PAGE_SIZE = 20;
const fieldClass = "w-full rounded-lg border border-[#e5e9f0] bg-white px-3 py-2 text-sm text-[#35415a] outline-none focus:border-[#7585d4]";
const buttonClass = "rounded-lg border border-[#e5e9f0] px-3 py-2 text-xs font-medium text-[#536078] transition hover:bg-[#f5f6fa] disabled:opacity-50";

function apiUrl(path: string) { return `${API}/api/tasks${path}`; }
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    credentials: "include",
    headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
  });
  if (response.status === 401) throw Object.assign(new Error("Your session has expired. Please sign in again."), { status: 401 });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? body?.error ?? `Request failed (${response.status}).`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
async function relatedRequest<T>(path: string): Promise<T> {
  const response = await fetch(`${API}${path}`, { credentials: "include" });
  if (!response.ok) throw new Error(`Request failed (${response.status}).`);
  return response.json() as Promise<T>;
}
function arrayValue<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}
function dateInput(value?: string | null) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : dateKey(date);
}
function dateToIso(value: string) {
  return value ? new Date(`${value}T00:00:00`).toISOString() : null;
}
function datetimeLocalToIso(value: string) {
  return value ? new Date(value).toISOString() : null;
}
function toDatetimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}
function dateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
function asDraft(task?: Task): Draft {
  return {
    title: task?.title ?? "", description: task?.description ?? "", status: task?.status ?? STATUSES[0],
    priority: task?.priority ?? "medium", startDate: dateInput(task?.startDate), dueDate: dateInput(task?.dueDate),
    customerId: task?.customerId ?? "", invoiceId: task?.invoiceId ?? "",
    expenseId: task?.expenseId ?? "", categoryId: task?.categoryId ?? "",
    tagIds: task?.tagIds ?? (task?.tags ?? []).flatMap((tag) => typeof tag === "string" ? [] : [tag.id]),
  };
}
function taskPayload(draft: Draft) {
  return {
    title: draft.title.trim(), description: draft.description.trim() || null, status: draft.status,
    priority: draft.priority, startDate: dateToIso(draft.startDate), dueDate: dateToIso(draft.dueDate),
    customerId: draft.customerId || null,
    invoiceId: draft.invoiceId || null, expenseId: draft.expenseId || null, categoryId: draft.categoryId || null,
    tagIds: draft.tagIds,
  };
}
function label(value?: string | null) {
  return value ? value.replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Unassigned";
}
function taskStatusOptions(status: string) {
  return [status, ...(STATUS_TRANSITIONS[status] ?? STATUSES)].filter((value, index, list) => list.indexOf(value) === index);
}
function dateLabel(value?: string | null) {
  if (!value) return "No due date";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function getTaskArray(value: unknown): Task[] {
  if (Array.isArray(value)) return value as Task[];
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    if (Array.isArray(object.tasks)) return object.tasks as Task[];
    if (Array.isArray(object.items)) return object.items as Task[];
    if (Array.isArray(object.events)) return object.events.map((event) => {
      if (event && typeof event === "object" && (event as Record<string, unknown>).task) return (event as { task: Task }).task;
      return event as Task;
    });
    if (Array.isArray(object.calendar)) return getTaskArray(object.calendar);
    if (object.data) return getTaskArray(object.data);
  }
  return [];
}
function getKanbanTasks(value: unknown): Task[] {
  const rows = getTaskArray(value);
  if (rows.length) return rows;
  if (!value || typeof value !== "object") return [];
  const object = value as Record<string, unknown>;
  const columns = Array.isArray(object.columns) || (object.columns && typeof object.columns === "object")
    ? object.columns
    : object.kanban && typeof object.kanban === "object" ? (object.kanban as Record<string, unknown>).columns : [];
  if (Array.isArray(columns)) return columns.flatMap((column) => {
    if (!column || typeof column !== "object") return [];
    const record = column as Record<string, unknown>;
    const status = String(record.status ?? record.id ?? "");
    return getTaskArray(record.tasks).map((task) => ({ ...task, status: task.status ?? status }));
  });
  if (columns && typeof columns === "object") return Object.entries(columns).flatMap(([status, value]) => getTaskArray(value).map((task) => ({ ...task, status: task.status ?? status })));
  return [];
}
function TaskFields({ draft, setDraft, categories, tags, customers, invoices, expenses, editing }: {
  draft: Draft; setDraft: (draft: Draft) => void; categories: Option[]; tags: Option[]; customers: Related[]; invoices: Related[]; expenses: Related[]; editing: boolean;
}) {
  const update = (key: keyof Draft, value: string | string[]) => setDraft({ ...draft, [key]: value });
  return <div className="grid gap-4 sm:grid-cols-2">
    <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-[#566278]">Title *</span><input autoFocus required maxLength={200} className={fieldClass} value={draft.title} onChange={(event) => update("title", event.target.value)} placeholder="What needs to get done?" /></label>
    <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-[#566278]">Description</span><textarea rows={3} maxLength={10000} className={fieldClass} value={draft.description} onChange={(event) => update("description", event.target.value)} /></label>
    <label><span className="mb-1.5 block text-xs font-semibold text-[#566278]">Status</span><select className={fieldClass} value={draft.status} onChange={(event) => update("status", event.target.value)}>{(editing ? taskStatusOptions(draft.status) : STATUSES).map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></label>
    <label><span className="mb-1.5 block text-xs font-semibold text-[#566278]">Priority</span><select className={fieldClass} value={draft.priority} onChange={(event) => update("priority", event.target.value)}>{PRIORITIES.map((priority) => <option key={priority} value={priority}>{label(priority)}</option>)}</select></label>
    <label><span className="mb-1.5 block text-xs font-semibold text-[#566278]">Start date</span><input type="date" max={draft.dueDate || undefined} className={fieldClass} value={draft.startDate} onChange={(event) => update("startDate", event.target.value)} /></label>
    <label><span className="mb-1.5 block text-xs font-semibold text-[#566278]">Due date</span><input type="date" min={draft.startDate || undefined} className={fieldClass} value={draft.dueDate} onChange={(event) => update("dueDate", event.target.value)} /></label>
    <label><span className="mb-1.5 block text-xs font-semibold text-[#566278]">Category</span><select className={fieldClass} value={draft.categoryId} onChange={(event) => update("categoryId", event.target.value)}><option value="">No category</option>{categories.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
    <label><span className="mb-1.5 block text-xs font-semibold text-[#566278]">Customer</span><select className={fieldClass} value={draft.customerId} onChange={(event) => update("customerId", event.target.value)}><option value="">No customer</option>{customers.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
    <label><span className="mb-1.5 block text-xs font-semibold text-[#566278]">Invoice</span><select className={fieldClass} value={draft.invoiceId} onChange={(event) => update("invoiceId", event.target.value)}><option value="">No invoice</option>{invoices.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
    {expenses.length > 0 && <label><span className="mb-1.5 block text-xs font-semibold text-[#566278]">Expense</span><select className={fieldClass} value={draft.expenseId} onChange={(event) => update("expenseId", event.target.value)}><option value="">No expense</option>{expenses.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>}
    <fieldset className="sm:col-span-2"><legend className="mb-1.5 text-xs font-semibold text-[#566278]">Tags</legend>{tags.length ? <div className="flex flex-wrap gap-2">{tags.map((tag) => <label key={tag.id} className="flex items-center gap-2 rounded-lg border border-[#e5e9f0] px-3 py-2 text-xs text-[#536078]"><input type="checkbox" checked={draft.tagIds.includes(tag.id)} onChange={(event) => update("tagIds", event.target.checked ? [...draft.tagIds, tag.id] : draft.tagIds.filter((id) => id !== tag.id))} />{tag.name}</label>)}</div> : <p className="text-xs text-[#8993a3]">No task tags are available.</p>}</fieldset>
  </div>;
}

export default function TasksWorkspace({ mode = "list" }: { mode?: Mode }) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tagId, setTagId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [expenseId, setExpenseId] = useState("");
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [overdue, setOverdue] = useState(false);
  const [recurring, setRecurring] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [sortBy, setSortBy] = useState("dueDate");
  const [sortOrder, setSortOrder] = useState("asc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<Option[]>([]);
  const [tags, setTags] = useState<Option[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [categoryColor, setCategoryColor] = useState("#64748b");
  const [categoryIcon, setCategoryIcon] = useState("tag");
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState("#64748b");
  const [recurrences, setRecurrences] = useState<Recurrence[]>([]);
  const [recurrenceTitle, setRecurrenceTitle] = useState("");
  const [recurrenceCadence, setRecurrenceCadence] = useState("weekly");
  const [recurrenceInterval, setRecurrenceInterval] = useState("1");
  const [recurrenceStartsOn, setRecurrenceStartsOn] = useState("");
  const [recurrenceEndsOn, setRecurrenceEndsOn] = useState("");
  const [notifications, setNotifications] = useState<TaskNotification[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [customers, setCustomers] = useState<Related[]>([]);
  const [invoices, setInvoices] = useState<Related[]>([]);
  const [expenses, setExpenses] = useState<Related[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [draft, setDraft] = useState<Draft>(asDraft());
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState(STATUSES[0]);
  const [detail, setDetail] = useState<Task | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [activity, setActivity] = useState<Activity[]>([]);
  const [timeRunning, setTimeRunning] = useState(false);
  const [manualStartedAt, setManualStartedAt] = useState("");
  const [manualEndedAt, setManualEndedAt] = useState("");
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const [reminders, setReminders] = useState<TaskReminder[]>([]);
  const [reminderAt, setReminderAt] = useState("");
  const [editingTimeEntry, setEditingTimeEntry] = useState<string | null>(null);
  const [timeEntryStartedAt, setTimeEntryStartedAt] = useState("");
  const [timeEntryEndedAt, setTimeEntryEndedAt] = useState("");
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);
  const [month, setMonth] = useState(() => new Date(2000, 0, 1));
  const [calendarView, setCalendarView] = useState<"month" | "week" | "day" | "agenda">("month");
  const [selectedCalendarDate, setSelectedCalendarDate] = useState("");
  const [calendarReady, setCalendarReady] = useState(false);
  const [calendarTasks, setCalendarTasks] = useState<Task[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);

  const createCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const result = await request<{ category: Option }>("/categories", {
        method: "POST",
        body: JSON.stringify({ name: categoryName, color: categoryColor, icon: categoryIcon }),
      });
      setCategories((current) => [...current, result.category].sort((a, b) => a.name.localeCompare(b.name)));
      setCategoryName("");
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to create category."); }
  };
  const editCategory = async (category: Option) => {
    const name = window.prompt("Category name", category.name)?.trim();
    if (!name) return;
    const color = window.prompt("Hex color (for example #64748b)", category.color ?? "#64748b")?.trim();
    if (!color) return;
    const icon = window.prompt("Icon key", category.icon ?? "tag")?.trim();
    if (!icon) return;
    try {
      const result = await request<{ category: Option }>(`/categories/${category.id}`, {
        method: "PUT", body: JSON.stringify({ name, color, icon }),
      });
      setCategories((current) => current.map((item) => item.id === category.id ? result.category : item).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to update category."); }
  };
  const deleteCategory = async (category: Option) => {
    if (!window.confirm(`Delete category “${category.name}”? Tasks will be kept without a category.`)) return;
    try {
      await request(`/categories/${category.id}`, { method: "DELETE" });
      setCategories((current) => current.filter((item) => item.id !== category.id));
      if (categoryId === category.id) setCategoryId("");
    } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Unable to delete category."); }
  };
  const createTag = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const result = await request<{ tag: Option }>("/tags", {
        method: "POST", body: JSON.stringify({ name: tagName, color: tagColor }),
      });
      setTags((current) => [...current, result.tag].sort((a, b) => a.name.localeCompare(b.name)));
      setTagName("");
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to create tag."); }
  };
  const editTag = async (tag: Option) => {
    const name = window.prompt("Tag name", tag.name)?.trim();
    if (!name) return;
    const color = window.prompt("Hex color (for example #64748b)", tag.color ?? "#64748b")?.trim();
    if (!color) return;
    try {
      const result = await request<{ tag: Option }>(`/tags/${tag.id}`, {
        method: "PUT", body: JSON.stringify({ name, color }),
      });
      setTags((current) => current.map((item) => item.id === tag.id ? result.tag : item).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to update tag."); }
  };
  const deleteTag = async (tag: Option) => {
    if (!window.confirm(`Delete tag “${tag.name}”?`)) return;
    try {
      await request(`/tags/${tag.id}`, { method: "DELETE" });
      setTags((current) => current.filter((item) => item.id !== tag.id));
      if (tagId === tag.id) setTagId("");
    } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Unable to delete tag."); }
  };
  const createRecurrence = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const result = await request<{ recurrence: Recurrence }>("/recurrences", {
        method: "POST",
        body: JSON.stringify({
          title: recurrenceTitle.trim(),
          cadence: recurrenceCadence,
          intervalCount: Number(recurrenceInterval),
          startsOn: recurrenceStartsOn,
          endsOn: recurrenceEndsOn || null,
        }),
      });
      setRecurrences((current) => [...current, result.recurrence]);
      setRecurrenceTitle("");
      setRecurrenceEndsOn("");
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to create recurrence."); }
  };
  const toggleRecurrence = async (recurrence: Recurrence) => {
    try {
      const result = await request<{ recurrence: Recurrence }>(`/recurrences/${recurrence.id}`, {
        method: "PATCH", body: JSON.stringify({ active: !recurrence.active }),
      });
      setRecurrences((current) => current.map((item) => item.id === recurrence.id ? result.recurrence : item));
    } catch (updateError) { setError(updateError instanceof Error ? updateError.message : "Unable to update recurrence."); }
  };
  const cancelRecurrence = async (recurrence: Recurrence) => {
    if (!window.confirm(`Cancel the recurring schedule “${recurrence.title}”? Existing tasks will remain.`)) return;
    try {
      await request(`/recurrences/${recurrence.id}`, { method: "DELETE" });
      setRecurrences((current) => current.filter((item) => item.id !== recurrence.id));
    } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Unable to cancel recurrence."); }
  };

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (mode === "calendar") return;
      if (mode === "board") {
        const result = await request<unknown>("/kanban");
        const rows = getKanbanTasks(result);
        setTasks(rows);
        setTotal(rows.length);
        return;
      }
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), sortBy, sortOrder });
      if (query.trim()) params.set("q", query.trim());
      if (status) params.set("status", status);
      if (priority) params.set("priority", priority);
      if (categoryId) params.set("categoryId", categoryId);
      if (tagId) params.set("tagId", tagId);
      if (customerId) params.set("customerId", customerId);
      if (invoiceId) params.set("invoiceId", invoiceId);
      if (expenseId) params.set("expenseId", expenseId);
      if (dueFrom) params.set("dueFrom", dueFrom);
      if (dueTo) params.set("dueTo", dueTo);
      if (createdFrom) params.set("createdFrom", createdFrom);
      if (createdTo) params.set("createdTo", createdTo);
      if (overdue) params.set("overdue", "true");
      if (recurring) params.set("recurring", "true");
      if (completed) params.set("completed", "true");
      const result = await request<{ tasks?: Task[]; pagination?: { total?: number } }>(`?${params}`);
      setTasks(arrayValue(result.tasks));
      setTotal(Number(result.pagination?.total ?? result.tasks?.length ?? 0));
    } catch (loadError) {
      if ((loadError as { status?: number }).status === 401) router.replace("/authPages/sign-in");
      else setError(loadError instanceof Error ? loadError.message : "Unable to load tasks.");
    } finally { setLoading(false); }
  }, [mode, page, query, status, priority, categoryId, tagId, customerId, invoiceId, expenseId, dueFrom, dueTo, createdFrom, createdTo, overdue, recurring, completed, sortBy, sortOrder, router]);

  useEffect(() => { void Promise.resolve().then(loadTasks); }, [loadTasks]);
  useEffect(() => {
    void Promise.all([
      request<{ categories?: Option[] }>("/categories").then((result) => setCategories(arrayValue(result.categories))).catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load categories.")),
      request<{ tags?: Option[] }>("/tags").then((result) => setTags(arrayValue(result.tags))).catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load tags.")),
      relatedRequest<{ customers?: { id: string; name: string; company?: string }[] }>("/api/customers").then((result) => setCustomers(arrayValue<{ id: string; name: string; company?: string }>(result.customers).map((row) => ({ id: row.id, name: row.company ? `${row.name} · ${row.company}` : row.name })))).catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load customers.")),
      relatedRequest<{ invoices?: { id: string; invoiceNumber?: string; customerName?: string; type?: string }[] }>("/api/invoices?page=1&pageSize=100").then((result) => setInvoices(arrayValue<{ id: string; invoiceNumber?: string; customerName?: string; type?: string }>(result.invoices).map((row) => ({ id: row.id, name: `${row.invoiceNumber ?? row.id}${row.customerName ? ` · ${row.customerName}` : ""}` })))).catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load invoices.")),
      relatedRequest<{ expenses?: { id: string; title?: string }[] }>("/api/expenses?page=1&pageSize=100").then((result) => setExpenses(arrayValue<{ id: string; title?: string }>(result.expenses).map((row) => ({ id: row.id, name: row.title ?? row.id })))).catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load expenses.")),
      request<Record<string, unknown>>(`/analytics?${new URLSearchParams({ from: dateKey(new Date(new Date().getFullYear(), 0, 1)), to: dateKey(new Date()) })}`).then((result) => setAnalytics(result)).catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load task analytics.")),
      request<{ recurrences?: Recurrence[] }>("/recurrences").then((result) => setRecurrences(arrayValue(result.recurrences))).catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load recurring tasks.")),
      request<{ notifications?: TaskNotification[] }>("/notifications?unread=true&limit=20").then((result) => setNotifications(arrayValue(result.notifications))).catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load task notifications.")),
      request<{ count?: number }>("/notifications/count").then((result) => setNotificationCount(Number(result.count ?? 0))).catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load notification count.")),
    ]);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const current = new Date();
      setMonth(new Date(current.getFullYear(), current.getMonth(), 1));
      setSelectedCalendarDate(dateKey(current));
      setRecurrenceStartsOn(dateKey(current));
      setCalendarReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const loadCalendar = useCallback(async () => {
    if (mode !== "calendar") return;
    if (!calendarReady) return;
    setCalendarLoading(true);
    const anchor = selectedCalendarDate ? new Date(`${selectedCalendarDate}T00:00:00`) : month;
    let start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    let end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999);
    if (calendarView === "day") {
      start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
      end = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate(), 23, 59, 59, 999);
    } else if (calendarView === "week") {
      start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - ((anchor.getDay() + 6) % 7));
      end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
    }
    const from = start.toISOString();
    const to = end.toISOString();
    try {
      const response = await request<unknown>(`/calendar?${new URLSearchParams({ from, to })}`);
      setCalendarTasks(getTaskArray(response));
    } catch (loadError) {
      if ((loadError as { status?: number }).status === 401) router.replace("/authPages/sign-in");
      else setError(loadError instanceof Error ? loadError.message : "Unable to load calendar.");
    } finally { setCalendarLoading(false); }
  }, [mode, month, router, calendarReady, calendarView, selectedCalendarDate]);
  useEffect(() => { void Promise.resolve().then(loadCalendar); }, [loadCalendar]);

  const loadDetail = async (task: Task) => {
    setDetail(task);
    setSubtasks([]);
    setComments([]);
    setActivity([]);
    setTimeEntries([]);
    setAttachments([]);
    setReminders([]);
    setTimeRunning(false);
    const results = await Promise.allSettled([
      request<{ task?: Task }>(`/${task.id}`).then((result) => {
        const full = result.task ?? task;
        setDetail(full);
        setDraft(asDraft(full));
        setActivity(arrayValue<Activity>(full.activity));
        setSubtasks(arrayValue<Subtask>(full.subtasks));
        setTimeEntries(arrayValue<TimeEntry>((full as Task & { timeEntries?: TimeEntry[] }).timeEntries));
        setAttachments(arrayValue<TaskAttachment>(full.attachments));
      }),
      request<{ comments?: Comment[] }>(`/${task.id}/comments`).then((result) => setComments(arrayValue(result.comments))),
      request<{ timeEntries?: TimeEntry[] }>(`/${task.id}/time-entries`).then((result) => {
        const entries = arrayValue<TimeEntry>(result.timeEntries);
        setTimeEntries(entries);
        setTimeRunning(entries.some((entry) => !entry.endedAt));
      }),
      request<{ reminders?: TaskReminder[] }>("/reminders?pending=true&limit=100").then((result) => setReminders(arrayValue<TaskReminder>(result.reminders).filter((reminder) => reminder.taskId === task.id))),
    ]);
    if (results.every((result) => result.status === "rejected")) setError("Task details could not be loaded.");
  };
  const saveTask = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await request(editing ? `/${editing.id}` : "", { method: editing ? "PUT" : "POST", body: JSON.stringify(taskPayload(draft)) });
      setEditorOpen(false);
      setEditing(null);
      await loadTasks();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to save task."); }
    finally { setSaving(false); }
  };
  const openNew = () => { setEditing(null); setDraft(asDraft()); setEditorOpen(true); setError(""); };
  const openEdit = (task: Task) => { setEditing(task); setDraft(asDraft(task)); setEditorOpen(true); setDetail(null); setError(""); };
  const changeStatus = async (task: Task, next: string) => {
    const old = tasks;
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status: next } : item));
    try {
      await request(`/${task.id}/status`, { method: "PATCH", body: JSON.stringify({ status: next }) });
      if (detail?.id === task.id) setDetail({ ...detail, status: next });
      if (mode === "board") {
        const result = await request<unknown>("/kanban");
        setTasks(getKanbanTasks(result));
      }
    } catch (updateError) {
      setTasks(old);
      setError(updateError instanceof Error ? updateError.message : "Status update failed.");
    }
  };
  const removeTask = async (task: Task) => {
    if (!window.confirm(`Delete “${task.title}”? This cannot be undone.`)) return;
    try { await request(`/${task.id}`, { method: "DELETE" }); setDetail(null); await loadTasks(); }
    catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Unable to delete task."); }
  };
  const runBulk = async (action: string, statusValue?: string) => {
    if (!selected.length) return;
    try {
      await request("/bulk", { method: "POST", body: JSON.stringify({ taskIds: selected, action, ...(statusValue ? { status: statusValue } : {}) }) });
      setSelected([]);
      await loadTasks();
    } catch (bulkError) { setError(bulkError instanceof Error ? bulkError.message : "Bulk action failed."); }
  };
  const addSubtask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!detail || !subtaskTitle.trim()) return;
    try {
      const result = await request<{ subtask?: Subtask }>(`/${detail.id}/subtasks`, { method: "POST", body: JSON.stringify({ title: subtaskTitle.trim() }) });
      if (!result.subtask) throw new Error("The server did not return the saved checklist item.");
      setSubtasks((current) => [...current, result.subtask!]);
      setSubtaskTitle("");
    } catch (subtaskError) { setError(subtaskError instanceof Error ? subtaskError.message : "Unable to add checklist item."); }
  };
  const toggleSubtask = async (subtask: Subtask) => {
    if (!detail) return;
    const completedNow = !subtask.completed;
    try {
      await request(`/${detail.id}/subtasks/${subtask.id}`, { method: "PATCH", body: JSON.stringify({ completed: completedNow }) });
      setSubtasks((current) => current.map((item) => item.id === subtask.id ? { ...item, completed: completedNow } : item));
    } catch (subtaskError) { setError(subtaskError instanceof Error ? subtaskError.message : "Unable to update checklist item."); }
  };
  const deleteSubtask = async (subtask: Subtask) => {
    if (!detail) return;
    try { await request(`/${detail.id}/subtasks/${subtask.id}`, { method: "DELETE" }); setSubtasks((current) => current.filter((item) => item.id !== subtask.id)); }
    catch (subtaskError) { setError(subtaskError instanceof Error ? subtaskError.message : "Unable to delete checklist item."); }
  };
  const reorderSubtask = async (subtask: Subtask, offset: -1 | 1) => {
    if (!detail) return;
    const index = subtasks.findIndex((item) => item.id === subtask.id);
    const target = index + offset;
    if (target < 0 || target >= subtasks.length) return;
    const reordered = [...subtasks];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setSubtasks(reordered);
    try {
      await request(`/${detail.id}/subtasks/reorder`, { method: "PUT", body: JSON.stringify({ subtaskIds: reordered.map((item) => item.id) }) });
    } catch (reorderError) {
      setSubtasks(subtasks);
      setError(reorderError instanceof Error ? reorderError.message : "Unable to reorder checklist.");
    }
  };
  const addComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!detail || !commentText.trim()) return;
    try {
      const result = await request<{ comment?: Comment }>(`/${detail.id}/comments`, { method: "POST", body: JSON.stringify({ body: commentText.trim() }) });
      if (result.comment) setComments((current) => [...current, result.comment!]);
      else {
        const refreshed = await request<{ comments?: Comment[] }>(`/${detail.id}/comments`);
        setComments(arrayValue(refreshed.comments));
      }
      setCommentText("");
    } catch (commentError) { setError(commentError instanceof Error ? commentError.message : "Unable to post comment."); }
  };
  const timeAction = async (action: "start" | "pause" | "resume" | "stop") => {
    if (!detail) return;
    try {
      await request(`/${detail.id}/time/${action}`, { method: "POST" });
      setTimeRunning(action === "start" || action === "resume");
      const refreshed = await request<{ timeEntries?: TimeEntry[] }>(`/${detail.id}/time-entries`);
      setTimeEntries(arrayValue(refreshed.timeEntries));
    } catch (timeError) { setError(timeError instanceof Error ? timeError.message : "Unable to update timer."); }
  };
  const addManualTime = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!detail || !manualStartedAt || !manualEndedAt) return;
    const startedAt = datetimeLocalToIso(manualStartedAt);
    const endedAt = datetimeLocalToIso(manualEndedAt);
    if (!startedAt || !endedAt || new Date(endedAt) < new Date(startedAt)) {
      setError("Time entry end must be after its start.");
      return;
    }
    try {
      const result = await request<{ timeEntry: TimeEntry }>(`/${detail.id}/time-entries`, { method: "POST", body: JSON.stringify({ startedAt, endedAt }) });
      setTimeEntries((current) => [result.timeEntry, ...current]);
      setManualStartedAt("");
      setManualEndedAt("");
    } catch (timeError) { setError(timeError instanceof Error ? timeError.message : "Unable to add time."); }
  };
  const saveTimeEntry = async (entry: TimeEntry) => {
    if (!detail || !timeEntryStartedAt || !timeEntryEndedAt) return;
    const startedAt = datetimeLocalToIso(timeEntryStartedAt);
    const endedAt = datetimeLocalToIso(timeEntryEndedAt);
    if (!startedAt || !endedAt || new Date(endedAt) < new Date(startedAt)) {
      setError("Time entry end must be after its start.");
      return;
    }
    try {
      const result = await request<{ timeEntry: TimeEntry }>(`/${detail.id}/time-entries/${entry.id}`, { method: "PATCH", body: JSON.stringify({ startedAt, endedAt }) });
      setTimeEntries((current) => current.map((item) => item.id === entry.id ? result.timeEntry : item));
      setEditingTimeEntry(null);
    } catch (timeError) { setError(timeError instanceof Error ? timeError.message : "Unable to update time entry."); }
  };
  const deleteTimeEntry = async (entry: TimeEntry) => {
    if (!detail) return;
    try {
      await request(`/${detail.id}/time-entries/${entry.id}`, { method: "DELETE" });
      setTimeEntries((current) => current.filter((item) => item.id !== entry.id));
    } catch (timeError) { setError(timeError instanceof Error ? timeError.message : "Unable to delete time entry."); }
  };
  const uploadAttachment = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!detail || !file) return;
    const body = new FormData();
    body.append("file", file);
    setAttachmentBusy(true);
    try {
      const response = await fetch(apiUrl(`/${detail.id}/attachments`), { method: "POST", credentials: "include", body });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error ?? `Upload failed (${response.status}).`);
      }
      const result = await response.json() as { attachment: TaskAttachment };
      setAttachments((current) => [...current, result.attachment]);
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "Unable to upload attachment."); }
    finally { setAttachmentBusy(false); event.target.value = ""; }
  };
  const downloadAttachment = async (attachment: TaskAttachment) => {
    if (!detail) return;
    try {
      const response = await fetch(apiUrl(`/${detail.id}/attachments/${attachment.id}`), { credentials: "include" });
      if (!response.ok) throw new Error(`Download failed (${response.status}).`);
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = attachment.name;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (downloadError) { setError(downloadError instanceof Error ? downloadError.message : "Unable to download attachment."); }
  };
  const deleteAttachment = async (attachment: TaskAttachment) => {
    if (!detail || !window.confirm(`Delete “${attachment.name}”?`)) return;
    try {
      await request(`/${detail.id}/attachments/${attachment.id}`, { method: "DELETE" });
      setAttachments((current) => current.filter((item) => item.id !== attachment.id));
    } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Unable to delete attachment."); }
  };
  const addReminder = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!detail || !reminderAt) return;
    const remindAt = datetimeLocalToIso(reminderAt);
    if (!remindAt || new Date(remindAt) <= new Date()) {
      setError("Choose a reminder time in the future.");
      return;
    }
    try {
      const result = await request<{ reminder: TaskReminder }>(`/${detail.id}/reminders`, { method: "POST", body: JSON.stringify({ remindAt }) });
      setReminders((current) => [...current, result.reminder]);
      setReminderAt("");
    } catch (reminderError) { setError(reminderError instanceof Error ? reminderError.message : "Unable to create reminder."); }
  };
  const deleteReminder = async (reminder: TaskReminder) => {
    if (!detail) return;
    try {
      await request(`/${detail.id}/reminders/${reminder.id}`, { method: "DELETE" });
      setReminders((current) => current.filter((item) => item.id !== reminder.id));
    } catch (reminderError) { setError(reminderError instanceof Error ? reminderError.message : "Unable to delete reminder."); }
  };
  const openCalendarTask = (date: string) => {
    setEditing(null);
    setDraft({ ...asDraft(), dueDate: date });
    setEditorOpen(true);
    setError("");
  };
  const navigateCalendar = (direction: -1 | 1) => {
    const anchor = selectedCalendarDate ? new Date(`${selectedCalendarDate}T00:00:00`) : month;
    if (calendarView === "month" || calendarView === "agenda") {
      const next = new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1);
      setMonth(next);
      setSelectedCalendarDate(dateKey(next));
      return;
    }
    const next = new Date(anchor);
    next.setDate(next.getDate() + direction * (calendarView === "week" ? 7 : 1));
    setSelectedCalendarDate(dateKey(next));
    setMonth(new Date(next.getFullYear(), next.getMonth(), 1));
  };
  const markNotificationRead = async (notification: TaskNotification) => {
    try {
      await request(`/notifications/${notification.id}/read`, { method: "PATCH" });
      setNotifications((current) => current.filter((item) => item.id !== notification.id));
      setNotificationCount((count) => Math.max(0, count - 1));
    } catch (notificationError) { setError(notificationError instanceof Error ? notificationError.message : "Unable to mark notification as read."); }
  };
  const exportCsv = async () => {
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (status) params.set("status", status);
      if (priority) params.set("priority", priority);
      if (categoryId) params.set("categoryId", categoryId);
      if (tagId) params.set("tagId", tagId);
      if (customerId) params.set("customerId", customerId);
      if (invoiceId) params.set("invoiceId", invoiceId);
      if (expenseId) params.set("expenseId", expenseId);
      if (dueFrom) params.set("dueFrom", dueFrom);
      if (dueTo) params.set("dueTo", dueTo);
      if (createdFrom) params.set("createdFrom", createdFrom);
      if (createdTo) params.set("createdTo", createdTo);
      if (overdue) params.set("overdue", "true");
      if (recurring) params.set("recurring", "true");
      if (completed) params.set("completed", "true");
      const suffix = params.size ? `?${params}` : "";
      const response = await fetch(apiUrl(`/export.csv${suffix}`), { credentials: "include" });
      if (!response.ok) throw new Error(`Export failed (${response.status}).`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = "tasks.csv"; anchor.click(); URL.revokeObjectURL(url);
    } catch (exportError) { setError(exportError instanceof Error ? exportError.message : "Unable to export tasks."); }
  };
  const calendarDays = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start); date.setDate(start.getDate() + index);
      return date;
    });
  }, [month]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const taskStatuses = useMemo(() => Array.from(new Set([...STATUSES, ...tasks.map((task) => task.status).filter(Boolean)])), [tasks]);

  return <main className="crm-workspace min-h-screen bg-[#f7f8fa] text-[#26334b]">
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-[242px] shrink-0 border-r border-[#e9ecf1] bg-white px-4 py-5 lg:block">
        <Link href="/dashboard" className="mb-9 flex items-center gap-2.5 px-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#172b55] text-sm font-bold text-white">B</span><span className="text-base font-semibold">Business<span className="text-[#6278cf]">OS</span></span></Link>
        <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.12em] text-[#a2aab8]">WORKSPACE</p>
        <nav className="space-y-1" aria-label="Workspace navigation">
          {[["Dashboard", "/dashboard"], ["Customers", "/customers"], ["Sales", "/sales"], ["Invoices", "/invoices"], ["Expenses", "/expenses"], ["Tasks", "/tasks"], ["Appointments", "/appointments"], ["Settings", "/settings"]].map(([name, href]) => <Link key={name} href={href} aria-current={name === "Tasks" ? "page" : undefined} className={`block rounded-lg px-3 py-2.5 text-[13px] font-medium ${name === "Tasks" ? "bg-[#eff1fa] text-[#566bbd]" : "text-[#737f92] hover:bg-[#f7f8fa]"}`}>{name}</Link>)}
        </nav>
      </aside>
      <section className="min-w-0 flex-1">
        <nav aria-label="Workspace navigation" className="flex gap-1 overflow-x-auto border-b border-[#e9ecf1] bg-white px-3 py-2 lg:hidden">{[["Dashboard", "/dashboard"], ["Customers", "/customers"], ["Sales", "/sales"], ["Invoices", "/invoices"], ["Expenses", "/expenses"], ["Tasks", "/tasks"], ["Appointments", "/appointments"], ["Settings", "/settings"]].map(([name, href]) => <Link key={name} href={href} className={`shrink-0 rounded-lg px-3 py-2 text-xs ${name === "Tasks" ? "bg-[#eff1fa] text-[#566bbd]" : "text-[#737f92]"}`}>{name}</Link>)}</nav>
        <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-7 lg:px-9">
          <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#929bab]">WORKSPACE / TASKS</p><h1 className="mt-1 text-[27px] font-semibold tracking-[-0.05em] text-[#202d45]">{mode === "board" ? "Task board" : mode === "calendar" ? "Task calendar" : "Tasks"}</h1><p className="mt-1 text-sm text-[#8490a2]">Plan, prioritize, and keep work moving.</p></div>
            <div className="flex flex-wrap gap-2"><button onClick={exportCsv} className={buttonClass}>Export CSV</button><button onClick={() => void loadTasks()} className={buttonClass}>Refresh</button><button onClick={openNew} className="rounded-lg bg-[#172b55] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#243c70]">＋ New task</button></div>
          </header>
          <div className="mt-5 flex flex-wrap gap-1 border-b border-[#e8ebf0]">
            {[["list", "List", "/tasks"], ["board", "Board", "/tasks/board"], ["calendar", "Calendar", "/tasks/calendar"]].map(([id, name, href]) => <Link key={id} href={href} aria-current={mode === id ? "page" : undefined} className={`border-b-2 px-4 py-2.5 text-xs font-semibold ${mode === id ? "border-[#6278cf] text-[#5368bb]" : "border-transparent text-[#8993a3] hover:text-[#45536d]"}`}>{name}</Link>)}
          </div>
          <details className="mt-4 rounded-xl border border-[#e9edf2] bg-white p-4">
            <summary className="cursor-pointer text-xs font-semibold text-[#435069]">Notifications ({notificationCount} unread)</summary>
            {notifications.length === 0 ? <p className="mt-3 text-xs text-[#8993a3]">No unread task notifications.</p> : <ul className="mt-3 divide-y divide-[#f0f2f5]">{notifications.map((notification) => <li key={notification.id} className="flex items-start gap-3 py-2"><div className="min-w-0 flex-1"><p className="text-xs font-medium text-[#536078]">{notification.title}</p><p className="mt-1 text-[10px] text-[#8993a3]">{notification.body}</p></div><button className="text-xs text-[#6377c8]" onClick={() => void markNotificationRead(notification)}>Mark read</button></li>)}</ul>}
          </details>
          {mode === "list" && <details className="mt-4 rounded-xl border border-[#e9edf2] bg-white p-4">
            <summary className="cursor-pointer text-xs font-semibold text-[#435069]">Manage categories and tags</summary>
            <div className="mt-4 grid gap-5 lg:grid-cols-2">
              <section>
                <h2 className="mb-2 text-xs font-semibold text-[#566278]">Categories</h2>
                <form onSubmit={createCategory} className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
                  <input required maxLength={80} aria-label="New category name" className={fieldClass} value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Category name" />
                  <input type="color" aria-label="Category color" className="h-10 w-full rounded-lg border border-[#e5e9f0] p-1 sm:w-12" value={categoryColor} onChange={(event) => setCategoryColor(event.target.value)} />
                  <input required maxLength={40} aria-label="Category icon key" className={`${fieldClass} sm:w-28`} value={categoryIcon} onChange={(event) => setCategoryIcon(event.target.value)} placeholder="Icon key" />
                  <button className={buttonClass}>Add</button>
                </form>
                <ul className="mt-3 divide-y divide-[#f0f2f5]">{categories.map((category) => <li key={category.id} className="flex items-center gap-2 py-2 text-xs"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color ?? "#64748b" }} /><span className="flex-1">{category.name}</span><button className="text-[#6377c8]" onClick={() => void editCategory(category)}>Edit</button><button className="text-[#a35f59]" onClick={() => void deleteCategory(category)}>Delete</button></li>)}</ul>
              </section>
              <section>
                <h2 className="mb-2 text-xs font-semibold text-[#566278]">Tags</h2>
                <form onSubmit={createTag} className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                  <input required maxLength={60} aria-label="New tag name" className={fieldClass} value={tagName} onChange={(event) => setTagName(event.target.value)} placeholder="Tag name" />
                  <input type="color" aria-label="Tag color" className="h-10 w-full rounded-lg border border-[#e5e9f0] p-1 sm:w-12" value={tagColor} onChange={(event) => setTagColor(event.target.value)} />
                  <button className={buttonClass}>Add</button>
                </form>
                <ul className="mt-3 divide-y divide-[#f0f2f5]">{tags.map((tag) => <li key={tag.id} className="flex items-center gap-2 py-2 text-xs"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color ?? "#64748b" }} /><span className="flex-1">{tag.name}</span><button className="text-[#6377c8]" onClick={() => void editTag(tag)}>Edit</button><button className="text-[#a35f59]" onClick={() => void deleteTag(tag)}>Delete</button></li>)}</ul>
              </section>
            </div>
          </details>}
          {mode === "list" && <details className="mt-3 rounded-xl border border-[#e9edf2] bg-white p-4">
            <summary className="cursor-pointer text-xs font-semibold text-[#435069]">Recurring task schedules</summary>
            <form onSubmit={createRecurrence} className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
              <input required maxLength={200} aria-label="Recurring task title" className={`${fieldClass} lg:col-span-2`} value={recurrenceTitle} onChange={(event) => setRecurrenceTitle(event.target.value)} placeholder="Task title" />
              <select aria-label="Recurrence frequency" className={fieldClass} value={recurrenceCadence} onChange={(event) => setRecurrenceCadence(event.target.value)}>{["daily", "weekly", "monthly", "quarterly", "yearly"].map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>
              <input aria-label="Repeat interval" type="number" min={1} max={365} required className={fieldClass} value={recurrenceInterval} onChange={(event) => setRecurrenceInterval(event.target.value)} />
              <input aria-label="Recurrence start date" type="date" required className={fieldClass} value={recurrenceStartsOn} onChange={(event) => setRecurrenceStartsOn(event.target.value)} />
              <button className={buttonClass}>Create schedule</button>
              <label className="text-[10px] text-[#8993a3] sm:col-span-2 lg:col-span-6">Optional end date<input aria-label="Recurrence end date" type="date" min={recurrenceStartsOn} className={fieldClass} value={recurrenceEndsOn} onChange={(event) => setRecurrenceEndsOn(event.target.value)} /></label>
            </form>
            {recurrences.length === 0 ? <p className="mt-3 text-xs text-[#8993a3]">No recurring schedules yet.</p> : <ul className="mt-3 divide-y divide-[#f0f2f5]">{recurrences.map((recurrence) => <li key={recurrence.id} className="flex flex-wrap items-center gap-2 py-2 text-xs"><span className="min-w-0 flex-1 truncate font-medium text-[#536078]">{recurrence.title}</span><span className="text-[#8993a3]">{recurrence.intervalCount > 1 ? `Every ${recurrence.intervalCount} ` : "Every "}{recurrence.cadence} · next {dateLabel(recurrence.nextRun)}</span><button className="text-[#6377c8]" onClick={() => void toggleRecurrence(recurrence)}>{recurrence.active ? "Pause" : "Resume"}</button><button className="text-[#a35f59]" onClick={() => void cancelRecurrence(recurrence)}>Cancel</button></li>)}</ul>}
            <p className="mt-2 text-[10px] text-[#9aa3b0]">Schedules generate tasks when the configured backend worker runs; keep the recurring-task scheduler enabled in deployment.</p>
          </details>}
          {analytics && mode === "list" && <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {(() => {
              const summary = analytics.summary && typeof analytics.summary === "object" ? analytics.summary as Record<string, unknown> : {};
              const statusRows = Array.isArray(analytics.byStatus) ? analytics.byStatus as { status: string; count: number }[] : [];
              const count = (value: string) => Number(statusRows.find((row) => row.status === value)?.count ?? 0);
              const totalTasks = Number(summary.total ?? 0);
              const completedTasks = Number(summary.completed ?? count("completed"));
              const pendingTasks = count("backlog") + count("todo");
              const completionRate = totalTasks ? `${Math.round(completedTasks / totalTasks * 100)}%` : "0%";
              return [
                ["Total tasks", totalTasks],
                ["Completed", completedTasks],
                ["In progress", count("in_progress")],
                ["Pending", pendingTasks],
                ["Overdue", Number(summary.overdue ?? 0)],
                ["Completion rate", completionRate],
              ].map(([name, value]) => <div key={name} className="rounded-xl border border-[#e9edf2] bg-white p-4"><p className="text-[11px] text-[#8a95a6]">{name}</p><p className="mt-2 text-2xl font-semibold text-[#26344d]">{value}</p></div>);
            })()}
          </div>}
          {error && <div role="alert" className="mt-4 rounded-lg border border-[#f1d2cd] bg-[#fff7f6] px-4 py-3 text-sm text-[#9b514b]"><span>{error}</span><button className="ml-3 underline" onClick={() => setError("")}>Dismiss</button></div>}

          {mode === "list" && <section className="mt-5 overflow-hidden rounded-2xl border border-[#e9edf2] bg-white">
            <div className="border-b border-[#edf0f4] p-4 sm:p-5">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <input aria-label="Search tasks" className={fieldClass} placeholder="Search tasks..." value={query} onChange={(event) => { setPage(1); setQuery(event.target.value); }} />
                <select aria-label="Filter by status" className={fieldClass} value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }}><option value="">All statuses</option>{STATUSES.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>
                <select aria-label="Filter by priority" className={fieldClass} value={priority} onChange={(event) => { setPage(1); setPriority(event.target.value); }}><option value="">All priorities</option>{PRIORITIES.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>
                <select aria-label="Filter by category" className={fieldClass} value={categoryId} onChange={(event) => { setPage(1); setCategoryId(event.target.value); }}><option value="">All categories</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
                {tags.length > 0 && <select aria-label="Filter by tag" className={fieldClass} value={tagId} onChange={(event) => { setPage(1); setTagId(event.target.value); }}><option value="">All tags</option>{tags.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}
                {customers.length > 0 && <select aria-label="Filter by customer" className={fieldClass} value={customerId} onChange={(event) => { setPage(1); setCustomerId(event.target.value); }}><option value="">All customers</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}
                {invoices.length > 0 && <select aria-label="Filter by invoice" className={fieldClass} value={invoiceId} onChange={(event) => { setPage(1); setInvoiceId(event.target.value); }}><option value="">All invoices</option>{invoices.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}
                {expenses.length > 0 && <select aria-label="Filter by expense" className={fieldClass} value={expenseId} onChange={(event) => { setPage(1); setExpenseId(event.target.value); }}><option value="">All expenses</option>{expenses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}
                <label className="flex items-center gap-2 rounded-lg border border-[#e5e9f0] px-3 py-2 text-xs text-[#65718a]"><input type="checkbox" checked={overdue} onChange={(event) => { setPage(1); setOverdue(event.target.checked); }} />Overdue</label>
                <label className="flex items-center gap-2 rounded-lg border border-[#e5e9f0] px-3 py-2 text-xs text-[#65718a]"><input type="checkbox" checked={recurring} onChange={(event) => { setPage(1); setRecurring(event.target.checked); }} />Recurring</label>
                <label className="flex items-center gap-2 rounded-lg border border-[#e5e9f0] px-3 py-2 text-xs text-[#65718a]"><input type="checkbox" checked={completed} onChange={(event) => { setPage(1); setCompleted(event.target.checked); }} />Completed</label>
                <div className="flex gap-2"><input aria-label="Due from" type="date" className={fieldClass} value={dueFrom} onChange={(event) => { setPage(1); setDueFrom(event.target.value); }} /><input aria-label="Due to" type="date" className={fieldClass} value={dueTo} onChange={(event) => { setPage(1); setDueTo(event.target.value); }} /></div>
                <div className="flex gap-2"><input aria-label="Created from" title="Created from" type="date" className={fieldClass} value={createdFrom} onChange={(event) => { setPage(1); setCreatedFrom(event.target.value); }} /><input aria-label="Created to" title="Created to" type="date" className={fieldClass} value={createdTo} onChange={(event) => { setPage(1); setCreatedTo(event.target.value); }} /></div>
                <label className="flex gap-2"><select aria-label="Sort by" className={fieldClass} value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="dueDate">Due date</option><option value="createdAt">Created</option><option value="title">Title</option><option value="priority">Priority</option><option value="status">Status</option></select><select aria-label="Sort order" className={fieldClass} value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}><option value="asc">Ascending</option><option value="desc">Descending</option></select></label>
              </div>
              {selected.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-[#f5f6fa] p-2.5"><span className="mr-2 text-xs font-medium">{selected.length} selected</span><select className="rounded-md border border-[#e5e9f0] bg-white px-2 py-1.5 text-xs" value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value)}>{STATUSES.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select><button className={buttonClass} onClick={() => void runBulk("status", bulkStatus)}>Update status</button><button className={buttonClass} onClick={() => void runBulk("archive")}>Archive</button><button className="ml-auto text-xs text-[#778397]" onClick={() => setSelected([])}>Clear</button></div>}
            </div>
            {loading ? <div role="status" className="flex min-h-56 items-center justify-center text-sm text-[#8290a4]">Loading tasks…</div> : tasks.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center"><span className="text-3xl">✓</span><h2 className="mt-3 text-sm font-semibold">No tasks found</h2><p className="mt-1 text-xs text-[#8993a3]">{query || status || priority ? "Try adjusting your search or filters." : "Create your first task to get organized."}</p><button className="mt-4 rounded-lg bg-[#172b55] px-4 py-2 text-xs font-semibold text-white" onClick={openNew}>Create task</button></div> : <div className="overflow-x-auto">
              <table className="w-full min-w-[790px] text-left"><thead className="bg-[#fafbfc] text-[10px] font-semibold uppercase tracking-wide text-[#929bab]"><tr><th className="w-10 px-4 py-3"><input aria-label="Select all tasks" type="checkbox" checked={tasks.length > 0 && tasks.every((task) => selected.includes(task.id))} onChange={(event) => setSelected(event.target.checked ? tasks.map((task) => task.id) : [])} /></th><th className="px-3 py-3">Task</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Priority</th><th className="px-3 py-3">Due date</th><th className="px-3 py-3">Category</th><th className="px-4 py-3">Actions</th></tr></thead><tbody className="divide-y divide-[#f0f2f5]">{tasks.map((task) => <tr key={task.id} className="hover:bg-[#fbfcfd]"><td className="px-4 py-3"><input aria-label={`Select ${task.title}`} type="checkbox" checked={selected.includes(task.id)} onChange={(event) => setSelected(event.target.checked ? [...selected, task.id] : selected.filter((id) => id !== task.id))} /></td><td className="px-3 py-3"><button className="text-left text-sm font-semibold text-[#35415a] hover:text-[#6278cf]" onClick={() => void loadDetail(task)}>{task.title}</button><p className="mt-1 max-w-xs truncate text-xs text-[#929bab]">{task.description || "No description"}</p></td><td className="px-3 py-3"><select aria-label={`Status for ${task.title}`} className="rounded-md border border-[#e8ebf0] bg-white px-2 py-1.5 text-xs" value={task.status} onChange={(event) => void changeStatus(task, event.target.value)}>{taskStatusOptions(task.status).map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></td><td className="px-3 py-3 text-xs">{label(task.priority)}</td><td className="px-3 py-3 text-xs text-[#6f7a8e]">{dateLabel(task.dueDate)}</td><td className="px-3 py-3 text-xs text-[#6f7a8e]">{categories.find((item) => item.id === task.categoryId)?.name ?? "—"}</td><td className="px-4 py-3"><div className="flex gap-2"><button className="text-xs text-[#6377c8]" onClick={() => openEdit(task)}>Edit</button><button className="text-xs text-[#a35f59]" onClick={() => void removeTask(task)}>Delete</button></div></td></tr>)}</tbody></table>
            </div>}
            {!loading && total > 0 && <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0f4] px-4 py-3 text-xs text-[#8792a3]"><span>{total} tasks · Page {page} of {totalPages}</span><div className="flex gap-2"><button className={buttonClass} disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><button className={buttonClass} disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Next</button></div></footer>}
          </section>}

          {mode === "board" && <section className="mt-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-[#8490a2]">Drag cards between columns to update status.</p><button className={buttonClass} onClick={() => void loadTasks()}>Reload tasks</button></div>
            {!loading && tasks.length === 0 && <div className="mb-3 rounded-xl border border-dashed border-[#dfe4ec] bg-white p-5 text-center text-xs text-[#8993a3]">No tasks yet. Create a task to start your board.</div>}
            {loading ? <div role="status" className="rounded-xl border bg-white p-12 text-center text-sm text-[#8290a4]">Loading board…</div> : <div className="grid gap-4 md:grid-cols-3">{taskStatuses.map((column) => <div key={column} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const task = tasks.find((item) => item.id === event.dataTransfer.getData("text/task-id")); if (task && task.status !== column) void changeStatus(task, column); }} className="min-h-64 rounded-xl border border-[#e9edf2] bg-[#f2f4f8] p-3"><div className="mb-3 flex items-center justify-between"><h2 className="text-xs font-semibold text-[#536078]">{label(column)}</h2><span className="rounded-full bg-white px-2 py-1 text-[10px] text-[#8993a3]">{tasks.filter((task) => task.status === column).length}</span></div><div className="space-y-2">{tasks.filter((task) => task.status === column).map((task) => <article key={task.id} draggable onDragStart={(event) => event.dataTransfer.setData("text/task-id", task.id)} className="cursor-grab rounded-lg border border-[#e8ebf0] bg-white p-3 shadow-sm active:cursor-grabbing"><button onClick={() => void loadDetail(task)} className="text-left text-sm font-semibold text-[#35415a]">{task.title}</button><p className="mt-1 text-xs text-[#8a95a6]">{dateLabel(task.dueDate)}</p><div className="mt-3 flex items-center justify-between text-[10px] text-[#7d899d]"><span>{label(task.priority)}</span><button onClick={() => void changeStatus(task, taskStatuses[(taskStatuses.indexOf(column) + 1) % taskStatuses.length])} className="text-[#6377c8]">Next →</button></div></article>)}</div></div>)}</div>}
          </section>}

          {mode === "calendar" && <section className="mt-5 rounded-2xl border border-[#e9edf2] bg-white p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <button className={buttonClass} onClick={() => navigateCalendar(-1)}>← Previous</button>
              <h2 className="text-sm font-semibold text-[#35415a]">{(selectedCalendarDate ? new Date(`${selectedCalendarDate}T00:00:00`) : month).toLocaleDateString(undefined, { month: "long", year: "numeric", ...(calendarView === "day" ? { day: "numeric" } : {}) })}</h2>
              <button className={buttonClass} onClick={() => navigateCalendar(1)}>Next →</button>
              <select aria-label="Calendar view" className={fieldClass + " max-w-36"} value={calendarView} onChange={(event) => setCalendarView(event.target.value as "month" | "week" | "day" | "agenda")}><option value="month">Month</option><option value="week">Week</option><option value="day">Day</option><option value="agenda">Agenda</option></select>
              {calendarView !== "month" && <input aria-label="Calendar date" type="date" className={fieldClass + " max-w-44"} value={selectedCalendarDate} onChange={(event) => setSelectedCalendarDate(event.target.value)} />}
            </div>
            {calendarLoading ? <div role="status" className="p-12 text-center text-sm text-[#8290a4]">Loading calendar…</div> : <>
              {calendarView === "month" ? <div className="grid grid-cols-7 border-l border-t border-[#edf0f4]">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <div key={day} className="border-b border-r border-[#edf0f4] bg-[#fafbfc] p-2 text-center text-[10px] font-semibold text-[#8a95a6]">{day}</div>)}{calendarDays.map((day) => {
              const date = dateKey(day);
              const entries = calendarTasks.filter((task) => dateInput(task.dueDate) === date);
              const sameMonth = day.getMonth() === month.getMonth();
              return <div key={date} className={`min-h-[94px] border-b border-r border-[#edf0f4] p-1.5 ${sameMonth ? "" : "bg-[#fafbfc] text-[#b4bac4]"}`}><div className="flex items-center justify-between"><span className="text-[10px]">{day.getDate()}</span><button aria-label={`Create task due ${date}`} className="text-[10px] text-[#6377c8]" onClick={() => openCalendarTask(date)}>+</button></div><div className="mt-1 space-y-1">{entries.slice(0, 3).map((task) => <button key={task.id} onClick={() => void loadDetail(task)} title={task.title} className="block w-full truncate rounded bg-[#eff1fa] px-1.5 py-1 text-left text-[9px] text-[#5368bb]">{task.title}</button>)}{entries.length > 3 && <span className="text-[9px] text-[#8993a3]">+{entries.length - 3} more</span>}</div></div>;
            })}</div> : <div><h3 className="mb-2 text-xs font-semibold text-[#536078]">{calendarView === "agenda" ? "Upcoming tasks this month" : `${label(calendarView)} tasks`}</h3>{calendarTasks.length === 0 ? <div className="py-4 text-center"><p className="text-xs text-[#8993a3]">No tasks scheduled for this range.</p><button className={`${buttonClass} mt-2`} onClick={() => openCalendarTask(selectedCalendarDate || dateKey(new Date()))}>Create task for this date</button></div> : <div className="divide-y divide-[#f0f2f5]">{calendarTasks.map((task) => <div key={task.id} className="flex items-center gap-3 py-2"><button onClick={() => void loadDetail(task)} className="min-w-0 flex-1 truncate text-left text-xs font-medium text-[#45536d]">{task.title}</button><span className="shrink-0 text-[10px] text-[#8993a3]">{dateLabel(task.dueDate)}</span><button className="text-[10px] text-[#6377c8]" onClick={() => void loadDetail(task)}>Details</button></div>)}</div>}</div>}
            </>}
          </section>}
        </div>
      </section>
    </div>

    {editorOpen && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#101827]/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditorOpen(false); }}><form onSubmit={saveTask} className="my-auto w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl sm:p-7"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-semibold text-[#26344d]">{editing ? "Edit task" : "Create task"}</h2><p className="mt-1 text-xs text-[#8993a3]">Fields are saved to your task record.</p></div><button type="button" className={buttonClass} onClick={() => setEditorOpen(false)}>Close</button></div><TaskFields draft={draft} setDraft={setDraft} categories={categories} tags={tags} customers={customers} invoices={invoices} expenses={expenses} editing={Boolean(editing)} />{error && <p role="alert" className="mt-3 text-xs text-[#a34e49]">{error}</p>}<div className="mt-6 flex justify-end gap-2"><button type="button" className={buttonClass} onClick={() => setEditorOpen(false)}>Cancel</button><button disabled={saving} className="rounded-lg bg-[#172b55] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save task"}</button></div></form></div>}

    {detail && <div className="fixed inset-0 z-50 flex justify-end bg-[#101827]/45" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetail(null); }}><section aria-label={`Task details: ${detail.title}`} className="h-full w-full max-w-2xl overflow-y-auto bg-white p-5 shadow-xl sm:p-7"><header className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-[#8993a3]">TASK DETAILS</p><h2 className="mt-1 text-xl font-semibold text-[#26344d]">{detail.title}</h2><p className="mt-1 text-xs text-[#8993a3]">{label(detail.status)} · {label(detail.priority)} · {dateLabel(detail.dueDate)}</p></div><button className={buttonClass} onClick={() => setDetail(null)}>Close</button></header><div className="mt-4 flex gap-2"><button className={buttonClass} onClick={() => openEdit(detail)}>Edit</button><button className="rounded-lg border border-[#f0d7d4] px-3 py-2 text-xs text-[#a35f59]" onClick={() => void removeTask(detail)}>Delete</button><select aria-label="Task status" className="rounded-lg border px-3 text-xs" value={detail.status} onChange={(event) => void changeStatus(detail, event.target.value)}>{taskStatusOptions(detail.status).map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></div>
      {detail.description && <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-[#65718a]">{detail.description}</p>}
      <div className="mt-6 grid grid-cols-2 gap-3 rounded-xl bg-[#f8f9fb] p-4 text-xs"><span className="text-[#8993a3]">Start date</span><span>{dateLabel(detail.startDate)}</span><span className="text-[#8993a3]">Category</span><span>{categories.find((item) => item.id === detail.categoryId)?.name ?? "—"}</span><span className="text-[#8993a3]">Customer</span><span>{detail.customer?.name ?? customers.find((item) => item.id === detail.customerId)?.name ?? "—"}</span><span className="text-[#8993a3]">Tags</span><span>{(detail.tags ?? []).map((tag) => typeof tag === "string" ? tags.find((item) => item.id === tag)?.name : tag.name).filter(Boolean).join(", ") || "—"}</span></div>
      <section className="mt-6">
        <h3 className="text-sm font-semibold">Attachments</h3>
        <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#e5e9f0] px-3 py-2 text-xs text-[#536078]">
          {attachmentBusy ? "Uploading…" : "Attach image or PDF"}
          <input type="file" accept="image/png,image/jpeg,image/gif,image/webp,application/pdf" disabled={attachmentBusy} className="sr-only" onChange={(event) => void uploadAttachment(event)} />
        </label>
        {attachments.length === 0 ? <p className="mt-2 text-xs text-[#8993a3]">No attachments yet.</p> : <ul className="mt-2 divide-y divide-[#f0f2f5]">{attachments.map((attachment) => <li key={attachment.id} className="flex items-center gap-3 py-2 text-xs"><span className="min-w-0 flex-1 truncate text-[#536078]">{attachment.name}</span><span className="text-[10px] text-[#8993a3]">{Math.ceil(attachment.byteSize / 1024)} KB</span><button className="text-[#6377c8]" onClick={() => void downloadAttachment(attachment)}>Download</button><button className="text-[#a35f59]" onClick={() => void deleteAttachment(attachment)}>Delete</button></li>)}</ul>}
        <p className="mt-1 text-[10px] text-[#9aa3b0]">Private storage · PNG, JPEG, GIF, WebP, or PDF · 10 MB maximum</p>
      </section>
      <section className="mt-6">
        <h3 className="text-sm font-semibold">Reminders</h3>
        <form onSubmit={addReminder} className="mt-2 flex flex-wrap items-end gap-2">
          <label className="min-w-[220px] flex-1 text-[10px] text-[#8993a3]">Reminder time<input required type="datetime-local" className={fieldClass} value={reminderAt} onChange={(event) => setReminderAt(event.target.value)} /></label>
          <button className={buttonClass}>Add reminder</button>
        </form>
        {reminders.length === 0 ? <p className="mt-2 text-xs text-[#8993a3]">No pending reminders.</p> : <ul className="mt-2 divide-y divide-[#f0f2f5]">{reminders.map((reminder) => <li key={reminder.id} className="flex items-center gap-2 py-2 text-xs"><span className="flex-1 text-[#536078]">{new Date(reminder.remindAt).toLocaleString()}</span><button className="text-[#a35f59]" onClick={() => void deleteReminder(reminder)}>Remove</button></li>)}</ul>}
      </section>
      <section className="mt-6"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Checklist</h3><span className="text-[10px] text-[#8993a3]">{subtasks.filter((item) => item.completed).length}/{subtasks.length}</span></div>{subtasks.length > 0 && <div className="mt-2 divide-y divide-[#f0f2f5]">{subtasks.map((subtask, index) => <div key={subtask.id} className="flex items-center gap-2 py-2"><input type="checkbox" checked={Boolean(subtask.completed)} onChange={() => void toggleSubtask(subtask)} /><span className={`flex-1 text-xs ${subtask.completed ? "text-[#98a1af] line-through" : "text-[#536078]"}`}>{subtask.title}</span><button aria-label={`Move ${subtask.title} up`} disabled={index === 0} onClick={() => void reorderSubtask(subtask, -1)} className="text-xs text-[#6377c8] disabled:opacity-30">↑</button><button aria-label={`Move ${subtask.title} down`} disabled={index === subtasks.length - 1} onClick={() => void reorderSubtask(subtask, 1)} className="text-xs text-[#6377c8] disabled:opacity-30">↓</button><button onClick={() => void deleteSubtask(subtask)} className="text-xs text-[#a35f59]">Remove</button></div>)}</div>}<form onSubmit={addSubtask} className="mt-3 flex gap-2"><input className={fieldClass} value={subtaskTitle} onChange={(event) => setSubtaskTitle(event.target.value)} placeholder="Add checklist item" /><button className={buttonClass}>Add</button></form></section>
      <section className="mt-6">
        <h3 className="text-sm font-semibold">Time tracking</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          <button className={buttonClass} onClick={() => void timeAction(timeRunning ? "pause" : "start")}>{timeRunning ? "Pause timer" : "Start timer"}</button>
          {!timeRunning && <button className={buttonClass} onClick={() => void timeAction("resume")}>Resume</button>}
          <button className={buttonClass} onClick={() => void timeAction("stop")}>Stop</button>
        </div>
        <form onSubmit={addManualTime} className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <label className="text-[10px] text-[#8993a3]">Start<input required type="datetime-local" className={fieldClass} value={manualStartedAt} onChange={(event) => setManualStartedAt(event.target.value)} /></label>
          <label className="text-[10px] text-[#8993a3]">End<input required type="datetime-local" className={fieldClass} value={manualEndedAt} onChange={(event) => setManualEndedAt(event.target.value)} /></label>
          <button className={`${buttonClass} self-end`}>Add time</button>
        </form>
        {timeEntries.length > 0 && <div className="mt-3 space-y-2">{timeEntries.map((entry) => <div key={entry.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-[#f8f9fb] p-2.5 text-xs">
          <span className="flex-1 text-[#536078]">{entry.endedAt ? `${Math.floor((entry.durationSeconds ?? 0) / 60)}m ${(entry.durationSeconds ?? 0) % 60}s` : "Timer running"} · {dateLabel(entry.startedAt)}</span>
          {entry.endedAt && (editingTimeEntry === entry.id
            ? <><input aria-label="Edit time entry start" type="datetime-local" className="rounded border px-2 py-1" value={timeEntryStartedAt} onChange={(event) => setTimeEntryStartedAt(event.target.value)} /><input aria-label="Edit time entry end" type="datetime-local" className="rounded border px-2 py-1" value={timeEntryEndedAt} onChange={(event) => setTimeEntryEndedAt(event.target.value)} /><button className="text-[#6377c8]" onClick={() => void saveTimeEntry(entry)}>Save</button><button className="text-[#8993a3]" onClick={() => setEditingTimeEntry(null)}>Cancel</button></>
            : <><button className="text-[#6377c8]" onClick={() => { setEditingTimeEntry(entry.id); setTimeEntryStartedAt(toDatetimeLocal(entry.startedAt)); setTimeEntryEndedAt(toDatetimeLocal(entry.endedAt)); }}>Edit</button><button className="text-[#a35f59]" onClick={() => void deleteTimeEntry(entry)}>Delete</button></>)}
        </div>)}</div>}
      </section>
      <section className="mt-6"><h3 className="text-sm font-semibold">Comments</h3>{comments.length > 0 && <div className="mt-2 space-y-2">{comments.map((comment) => <article key={comment.id} className="rounded-lg bg-[#f8f9fb] p-3"><p className="whitespace-pre-wrap text-xs text-[#536078]">{comment.content ?? comment.body}</p><p className="mt-1 text-[10px] text-[#9aa3b0]">{comment.user?.name ?? comment.author ?? "Team member"} {comment.createdAt ? `· ${dateLabel(comment.createdAt)}` : ""}</p></article>)}</div>}<form onSubmit={addComment} className="mt-3 flex gap-2"><input className={fieldClass} value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Write a comment…" /><button className={buttonClass}>Send</button></form></section>
      <section className="mt-6"><h3 className="text-sm font-semibold">Activity</h3>{activity.length === 0 ? <p className="mt-2 text-xs text-[#8993a3]">No activity to show.</p> : <ol className="mt-2 space-y-2 border-l border-[#e7eaf0] pl-4">{activity.map((item) => <li key={item.id} className="text-xs text-[#65718a]"><span className="font-medium">{label(item.eventType ?? item.action ?? "updated")}</span>{item.details?.title ? ` · ${String(item.details.title)}` : ""}<p className="mt-1 text-[10px] text-[#9aa3b0]">{item.createdAt ? dateLabel(item.createdAt) : ""}</p></li>)}</ol>}</section>
    </section></div>}
  </main>;
}
