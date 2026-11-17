"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type AppointmentStatus = "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show" | "rescheduled" | string;
type AppointmentType = { id: string; name: string; icon?: string; color?: string | null; description?: string | null; duration?: number | null; defaultDuration?: number | null; isDefault?: boolean };
type Related = { id: string; name?: string; title?: string; number?: string; customerName?: string };
type Reminder = { minutes?: number; at?: string; [key: string]: unknown };
type Attachment = { id: string; name: string; contentType?: string; byteSize?: number; createdAt?: string };
type Activity = { id?: string; action?: string; eventType?: string; description?: string; createdAt?: string; fromStatus?: string; toStatus?: string; reason?: string; user?: { name?: string }; details?: Record<string, unknown> };
type Appointment = {
  id: string; title: string; description?: string | null; typeId?: string | null; type?: AppointmentType | null;
  customerId?: string | null; customer?: Related | null; startAt: string; endAt: string; timezone?: string;
  locationType?: string | null; address?: string | null; city?: string | null; locationInstructions?: string | null;
  meetingUrl?: string | null; meetingPlatform?: string | null; accessInstructions?: string | null;
  phoneNumber?: string | null; priority?: string | null; relatedTaskId?: string | null; relatedTask?: Related | null;
  relatedInvoiceId?: string | null; relatedInvoice?: Related | null; notes?: string | null; status: AppointmentStatus;
  reminders?: Reminder[]; recurrence?: Record<string, unknown> | null; statusHistory?: Activity[]; history?: Activity[];
  activity?: Activity[]; attachments?: Attachment[]; createdAt?: string;
};
type PageResponse = { appointments?: Appointment[]; pagination?: { page?: number; pageSize?: number; total?: number; totalPages?: number } };
type DraftReminder = { kind: "offset" | "custom"; value: string };
type Draft = {
  title: string; description: string; typeId: string; customerId: string; startAt: string; endAt: string; timezone: string;
  locationType: string; address: string; city: string; locationInstructions: string; meetingUrl: string;
  meetingPlatform: string; accessInstructions: string; phoneNumber: string; priority: string;
  relatedTaskId: string; relatedInvoiceId: string; notes: string; reminders: DraftReminder[];
  recurring: boolean; frequency: string; intervalCount: string; recurrenceEnds: string;
};
type CalendarMode = "month" | "week" | "day" | "agenda";
type WorkspaceMode = "list" | "calendar";
type Slot = { startAt: string; endAt: string; timezone?: string };
type AvailabilityDay = { day: number; enabled: boolean; startTime: string; endTime: string; breakStart: string; breakEnd: string };
type AvailabilityDraft = {
  timezone: string; weekly: AvailabilityDay[]; duration: number; bufferMinutes: number;
  minimumNoticeMinutes: number; maximumAdvanceDays: number;
};

const API = "";
const PAGE_SIZE = 20;
const input = "w-full rounded-lg border border-[#e5e9f0] bg-white px-3 py-2 text-sm text-[#35415a] outline-none focus:border-[#7585d4]";
const button = "rounded-lg border border-[#e5e9f0] px-3 py-2 text-xs font-medium text-[#536078] transition hover:bg-[#f5f6fa] disabled:opacity-50";
const primary = "rounded-lg bg-[#566bbd] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#465aa9] disabled:opacity-50";
const statuses = ["scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show", "rescheduled"];
const priorities = ["low", "medium", "high", "urgent"];
const offsets = [["5", "5 minutes"], ["15", "15 minutes"], ["30", "30 minutes"], ["60", "1 hour"], ["1440", "1 day"]] as const;
const timezoneDefault = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
const defaultAvailability = (): AvailabilityDraft => ({
  timezone: timezoneDefault(),
  weekly: Array.from({ length: 7 }, (_, day) => ({ day, enabled: day > 0 && day < 6, startTime: "09:00", endTime: "17:00", breakStart: "", breakEnd: "" })),
  duration: 30, bufferMinutes: 0, minimumNoticeMinutes: 0, maximumAdvanceDays: 365,
});
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const dateInput = (date: Date) => `${dateKey(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
const localInput = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return dateInput(new Date(date.getTime() - date.getTimezoneOffset() * 60000));
};
const inputIso = (value: string) => value ? new Date(value).toISOString() : "";
const localInputInZone = (value: string | null | undefined, timezone: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
  } catch { return localInput(value); }
};
const inputIsoInZone = (value: string, timezone: string) => {
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return inputIso(value);
  const target = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]));
  let timestamp = target;
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(timestamp));
      const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
      const represented = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
      timestamp += target - represented;
    }
    return new Date(timestamp).toISOString();
  } catch { return inputIso(value); }
};
const readable = (value?: string | null, options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(undefined, options);
};
const readableInZone = (value?: string | null, timezone?: string, options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  try { return date.toLocaleString(undefined, { ...options, timeZone: timezone || timezoneDefault() }); }
  catch { return date.toLocaleString(undefined, options); }
};
const label = (value?: string | null) => value ? value.replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "—";
const relatedName = (record?: Related | null) => record?.name || record?.title || record?.number || "Related record";
const defaultDraft = (date = new Date()): Draft => {
  const start = new Date(date);
  if (start.getHours() === 0 && start.getMinutes() === 0) start.setHours(9, 0, 0, 0);
  start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0);
  const end = new Date(start.getTime() + 60 * 60000);
  return {
    title: "", description: "", typeId: "", customerId: "", startAt: dateInput(start), endAt: dateInput(end),
    timezone: timezoneDefault(), locationType: "in_person", address: "", city: "", locationInstructions: "",
    meetingUrl: "", meetingPlatform: "", accessInstructions: "", phoneNumber: "", priority: "medium",
    relatedTaskId: "", relatedInvoiceId: "", notes: "", reminders: [], recurring: false, frequency: "weekly",
    intervalCount: "1", recurrenceEnds: "",
  };
};
const fromAppointment = (item: Appointment): Draft => {
  const recurrence = item.recurrence ?? {};
  const timezone = item.timezone || timezoneDefault();
  return {
    ...defaultDraft(new Date(item.startAt)), title: item.title, description: item.description ?? "", typeId: item.typeId ?? item.type?.id ?? "",
    customerId: item.customerId ?? item.customer?.id ?? "", startAt: localInputInZone(item.startAt, timezone), endAt: localInputInZone(item.endAt, timezone),
    timezone, locationType: item.locationType || "in_person", address: item.address ?? "",
    city: item.city ?? "", locationInstructions: item.locationInstructions ?? "", meetingUrl: item.meetingUrl ?? "",
    meetingPlatform: item.meetingPlatform ?? "", accessInstructions: item.accessInstructions ?? "", phoneNumber: item.phoneNumber ?? "",
    priority: item.priority || "medium", relatedTaskId: item.relatedTaskId ?? item.relatedTask?.id ?? "",
    relatedInvoiceId: item.relatedInvoiceId ?? item.relatedInvoice?.id ?? "", notes: item.notes ?? "",
    reminders: (item.reminders ?? []).map((reminder) => typeof reminder.minutes === "number"
      ? { kind: "offset", value: String(reminder.minutes) }
      : { kind: "custom", value: localInputInZone(reminder.at, timezone) }),
    recurring: Boolean(item.recurrence), frequency: String(recurrence.cadence ?? "weekly"),
    intervalCount: String(recurrence.interval ?? 1), recurrenceEnds: String(recurrence.endsOn ?? ""),
  };
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}/api/appointments${path}`, {
    ...init, credentials: "include",
    headers: { ...(init?.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}), ...init?.headers },
  });
  if (response.status === 401) throw Object.assign(new Error("Your session has expired. Please sign in again."), { status: 401 });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string; message?: string } | null;
    throw new Error(body?.message ?? body?.error ?? `Request failed (${response.status}).`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
async function relatedRequest<T>(path: string): Promise<T> {
  const response = await fetch(`${API}${path}`, { credentials: "include" });
  if (response.status === 401) throw Object.assign(new Error("Your session has expired. Please sign in again."), { status: 401 });
  if (!response.ok) throw new Error(`Could not load related records (${response.status}).`);
  return response.json() as Promise<T>;
}
function paramsFrom(value: Record<string, string>) {
  const params = new URLSearchParams();
  Object.entries(value).forEach(([key, val]) => { if (val) params.set(key, val); });
  return params.toString();
}
function apiArray<T>(value: unknown, key: string): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object" && Array.isArray((value as Record<string, unknown>)[key])) return (value as Record<string, unknown>)[key] as T[];
  return [];
}
function startOfWeek(date: Date) {
  const result = new Date(date); result.setDate(result.getDate() - result.getDay()); result.setHours(0, 0, 0, 0); return result;
}
function rangesFor(date: Date, mode: CalendarMode) {
  const start = new Date(date); const end = new Date(date);
  if (mode === "month") {
    start.setDate(1); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - start.getDay());
    end.setMonth(end.getMonth() + 1, 0); end.setHours(23, 59, 59, 999); end.setDate(end.getDate() + (6 - end.getDay()));
  } else if (mode === "week") {
    start.setTime(startOfWeek(date).getTime()); end.setTime(start.getTime()); end.setDate(end.getDate() + 6); end.setHours(23, 59, 59, 999);
  } else {
    start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999);
  }
  return { from: start.toISOString(), to: end.toISOString() };
}
function eventList(value: unknown): Appointment[] {
  if (Array.isArray(value)) return value as Appointment[];
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  if (Array.isArray(record.appointments)) return record.appointments as Appointment[];
  if (Array.isArray(record.events)) return record.events.map((event) => {
    if (event && typeof event === "object" && (event as Record<string, unknown>).appointment) return (event as { appointment: Appointment }).appointment;
    return event as Appointment;
  });
  if (record.data) return eventList(record.data);
  return [];
}

function Field({ title, children }: { title: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-[#566278]">{title}</span>{children}</label>;
}
function Dialog({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#16213a]/45 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-label={title} className={`max-h-[94vh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl ${wide ? "max-w-3xl" : "max-w-xl"}`}>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#edf0f4] bg-white px-5 py-4"><h2 className="text-sm font-semibold text-[#26344f]">{title}</h2><button className={button} onClick={onClose} aria-label="Close dialog">Close</button></header>
      <div className="p-5">{children}</div>
    </section>
  </div>;
}
function AppointmentFields({ draft, setDraft, types, customers, tasks, invoices, showRecurrence = true }: {
  draft: Draft; setDraft: (value: Draft) => void; types: AppointmentType[]; customers: Related[]; tasks: Related[]; invoices: Related[]; showRecurrence?: boolean;
}) {
  const set = (key: keyof Draft, value: string | boolean | DraftReminder[]) => setDraft({ ...draft, [key]: value });
  const addReminder = () => set("reminders", [...draft.reminders, { kind: "offset", value: "15" }]);
  const setType = (typeId: string) => {
    const appointmentType = types.find((type) => type.id === typeId);
    const duration = Number(appointmentType?.duration ?? appointmentType?.defaultDuration);
    const start = inputIsoInZone(draft.startAt, draft.timezone);
    if (!duration || !start) { set("typeId", typeId); return; }
    const end = new Date(new Date(start).getTime() + duration * 60000).toISOString();
    setDraft({ ...draft, typeId, endAt: localInputInZone(end, draft.timezone) });
  };
  return <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2">
      <Field title="Title *"><input className={input} value={draft.title} onChange={(e) => set("title", e.target.value)} required maxLength={180} /></Field>
      <Field title="Appointment type"><select className={input} value={draft.typeId} onChange={(e) => setType(e.target.value)}><option value="">No type</option>{types.map((type) => <option key={type.id} value={type.id}>{type.name}{type.duration ?? type.defaultDuration ? ` · ${type.duration ?? type.defaultDuration} min` : ""}</option>)}</select></Field>
      <Field title="Starts *"><input className={input} type="datetime-local" value={draft.startAt} onChange={(e) => set("startAt", e.target.value)} required /></Field>
      <Field title="Ends *"><input className={input} type="datetime-local" value={draft.endAt} onChange={(e) => set("endAt", e.target.value)} required /></Field>
      <Field title="Timezone"><input className={input} value={draft.timezone} onChange={(e) => set("timezone", e.target.value)} /></Field>
      <Field title="Customer"><select className={input} value={draft.customerId} onChange={(e) => set("customerId", e.target.value)}><option value="">No customer</option>{customers.map((row) => <option key={row.id} value={row.id}>{relatedName(row)}</option>)}</select></Field>
      <Field title="Priority"><select className={input} value={draft.priority} onChange={(e) => set("priority", e.target.value)}>{priorities.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></Field>
      <Field title="Location"><select className={input} value={draft.locationType} onChange={(e) => set("locationType", e.target.value)}>{[["in_person", "In person"], ["online", "Online"], ["phone", "Phone"], ["other", "Other"]].map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></Field>
      <Field title="Related task"><select className={input} value={draft.relatedTaskId} onChange={(e) => set("relatedTaskId", e.target.value)}><option value="">None</option>{tasks.map((row) => <option key={row.id} value={row.id}>{relatedName(row)}</option>)}</select></Field>
      <Field title="Related invoice"><select className={input} value={draft.relatedInvoiceId} onChange={(e) => set("relatedInvoiceId", e.target.value)}><option value="">None</option>{invoices.map((row) => <option key={row.id} value={row.id}>{relatedName(row)}</option>)}</select></Field>
    </div>
    <Field title="Description"><textarea className={`${input} min-h-20`} value={draft.description} onChange={(e) => set("description", e.target.value)} /></Field>
    <div className="rounded-xl border border-[#edf0f4] p-4">
      <h3 className="mb-3 text-xs font-semibold text-[#35415a]">Location details</h3>
      {draft.locationType === "in_person" ? <div className="grid gap-3 sm:grid-cols-2"><Field title="Address"><input className={input} value={draft.address} onChange={(e) => set("address", e.target.value)} /></Field><Field title="City"><input className={input} value={draft.city} onChange={(e) => set("city", e.target.value)} /></Field><Field title="Location instructions"><input className={input} value={draft.locationInstructions} onChange={(e) => set("locationInstructions", e.target.value)} /></Field></div> : draft.locationType === "online" ? <div className="grid gap-3 sm:grid-cols-2"><Field title="Meeting URL"><input className={input} type="url" value={draft.meetingUrl} onChange={(e) => set("meetingUrl", e.target.value)} /></Field><Field title="Meeting platform"><input className={input} value={draft.meetingPlatform} onChange={(e) => set("meetingPlatform", e.target.value)} placeholder="Video platform" /></Field><Field title="Access instructions"><input className={input} value={draft.accessInstructions} onChange={(e) => set("accessInstructions", e.target.value)} /></Field></div> : <div className="grid gap-3 sm:grid-cols-2"><Field title="Phone number"><input className={input} type="tel" value={draft.phoneNumber} onChange={(e) => set("phoneNumber", e.target.value)} /></Field><Field title="Instructions"><input className={input} value={draft.locationInstructions} onChange={(e) => set("locationInstructions", e.target.value)} /></Field></div>}
    </div>
    <Field title="Notes"><textarea className={`${input} min-h-20`} value={draft.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
    <section className="rounded-xl border border-[#edf0f4] p-4">
      <div className="mb-3 flex items-center justify-between"><div><h3 className="text-xs font-semibold text-[#35415a]">Reminders</h3><p className="mt-1 text-[10px] text-[#929bab]">Set a time offset or choose a custom reminder time.</p></div><button type="button" className={button} onClick={addReminder}>Add reminder</button></div>
      {draft.reminders.length ? <div className="space-y-2">{draft.reminders.map((reminder, index) => <div key={`${index}-${reminder.kind}`} className="flex gap-2"><select className={`${input} max-w-36`} value={reminder.kind} onChange={(e) => set("reminders", draft.reminders.map((item, i) => i === index ? { kind: e.target.value as "offset" | "custom", value: e.target.value === "offset" ? "15" : dateInput(new Date(draft.startAt)) } : item))}><option value="offset">Before</option><option value="custom">Custom time</option></select>{reminder.kind === "offset" ? <select className={input} value={reminder.value} onChange={(e) => set("reminders", draft.reminders.map((item, i) => i === index ? { ...item, value: e.target.value } : item))}>{offsets.map(([value, text]) => <option key={value} value={value}>{text} before</option>)}</select> : <input className={input} type="datetime-local" value={reminder.value} onChange={(e) => set("reminders", draft.reminders.map((item, i) => i === index ? { ...item, value: e.target.value } : item))} />}<button type="button" className={button} onClick={() => set("reminders", draft.reminders.filter((_, i) => i !== index))} aria-label="Remove reminder">Remove</button></div>)}</div> : <p className="text-xs text-[#8b95a5]">No reminders set.</p>}
    </section>
    {showRecurrence && <section className="rounded-xl border border-[#edf0f4] p-4">
      <label className="flex items-center gap-2 text-xs font-semibold text-[#35415a]"><input type="checkbox" checked={draft.recurring} onChange={(e) => set("recurring", e.target.checked)} /> Repeat this appointment</label>
      {draft.recurring && <div className="mt-3 grid gap-3 sm:grid-cols-3"><Field title="Frequency"><select className={input} value={draft.frequency} onChange={(e) => set("frequency", e.target.value)}>{["daily", "weekly", "monthly", "quarterly", "yearly"].map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></Field><Field title="Every"><input className={input} type="number" min="1" max="52" value={draft.intervalCount} onChange={(e) => set("intervalCount", e.target.value)} /></Field><Field title="Ends on (optional)"><input className={input} type="date" value={draft.recurrenceEnds} onChange={(e) => set("recurrenceEnds", e.target.value)} /></Field></div>}
    </section>}
  </div>;
}

export function AppointmentsWorkspace({ calendarDefault = false }: { calendarDefault?: boolean }) {
  const router = useRouter();
  const initialMode: WorkspaceMode = calendarDefault ? "calendar" : "list";
  const [mode, setMode] = useState<WorkspaceMode>(initialMode);
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("month");
  const [date, setDate] = useState(new Date(0));
  const [todayKey, setTodayKey] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [types, setTypes] = useState<AppointmentType[]>([]);
  const [customers, setCustomers] = useState<Related[]>([]);
  const [tasks, setTasks] = useState<Related[]>([]);
  const [invoices, setInvoices] = useState<Related[]>([]);
  const [search, setSearch] = useState("");
  const [searchText, setSearchText] = useState("");
  const [status, setStatus] = useState("");
  const [typeId, setTypeId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [locationType, setLocationType] = useState("");
  const [recurring, setRecurring] = useState("");
  const [completed, setCompleted] = useState("");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);
  const [analyticsError, setAnalyticsError] = useState("");
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [resourcesError, setResourcesError] = useState("");
  const [form, setForm] = useState<Draft | null>(null);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [activity, setActivity] = useState<Activity[]>([]);
  const [statusHistory, setStatusHistory] = useState<Activity[]>([]);
  const [activityError, setActivityError] = useState("");
  const [customerHistoryError, setCustomerHistoryError] = useState("");
  const [customerHistory, setCustomerHistory] = useState<Appointment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [typeModal, setTypeModal] = useState(false);
  const [typeDraft, setTypeDraft] = useState<AppointmentType | null>(null);
  const [typeName, setTypeName] = useState("");
  const [typeColor, setTypeColor] = useState("#6478ce");
  const [typeDuration, setTypeDuration] = useState("60");
  const [typeIsDefault, setTypeIsDefault] = useState(false);
  const [savingType, setSavingType] = useState(false);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityDraft>(defaultAvailability);
  const [availabilityError, setAvailabilityError] = useState("");
  const [availabilitySaved, setAvailabilitySaved] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsError, setSlotsError] = useState("");
  const [slotLoading, setSlotLoading] = useState(false);
  const [reschedule, setReschedule] = useState<{ id: string; startAt: string; endAt: string; reason: string } | null>(null);
  const [cancel, setCancel] = useState<{ id: string; reason: string } | null>(null);
  const [operationBusy, setOperationBusy] = useState(false);

  const listParams = useMemo(() => paramsFrom({
    search, status, typeId, customerId, from: fromFilter, to: toFilter, locationType, recurring, completed,
    page: String(pagination.page), pageSize: String(PAGE_SIZE), sortBy: "startAt", sortOrder: "asc",
  }), [search, status, typeId, customerId, fromFilter, toFilter, locationType, recurring, completed, pagination.page]);
  const calRange = useMemo(() => rangesFor(date, calendarMode), [date, calendarMode]);
  const calendarLabel = useMemo(() => {
    if (calendarMode === "month") return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    if (calendarMode === "week") {
      const start = startOfWeek(date); const end = new Date(start); end.setDate(end.getDate() + 6);
      return `${readable(start.toISOString(), { month: "short", day: "numeric" })} – ${readable(end.toISOString(), { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }, [date, calendarMode]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const current = new Date();
      setDate(current);
      setTodayKey(dateKey(current));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const loadTypes = useCallback(async () => {
    const result = await request<unknown>("/types");
    setTypes(apiArray(result, "types"));
  }, []);
  const refreshList = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError("");
    try {
      if (mode === "list") {
        const result = await request<PageResponse>(`?${listParams}`, { signal });
        setAppointments(Array.isArray(result.appointments) ? result.appointments : []);
        setPagination((current) => ({ ...current, page: result.pagination?.page ?? current.page, total: Number(result.pagination?.total ?? 0), totalPages: Number(result.pagination?.totalPages ?? Math.max(1, Math.ceil(Number(result.pagination?.total ?? 0) / PAGE_SIZE))) }));
      } else {
        const result = await request<unknown>(`/calendar?${paramsFrom(calRange)}`, { signal });
        setAppointments(eventList(result));
      }
    } catch (reason) {
      if (signal?.aborted) return;
      if ((reason as { status?: number }).status === 401) router.replace("/authPages/sign-in");
      setAppointments([]);
      setError(reason instanceof Error ? reason.message : "Appointments could not be loaded.");
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [calRange, listParams, mode, router]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => { void refreshList(controller.signal); }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [refreshList]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => setSearch(searchText.trim()), 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [searchText]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void Promise.allSettled([
        loadTypes(),
        relatedRequest<{ customers?: Related[] }>("/api/customers").then((value) => setCustomers(apiArray(value, "customers"))),
        relatedRequest<{ tasks?: Related[] }>("/api/tasks?page=1&pageSize=100&sortBy=dueDate&sortOrder=asc").then((value) => setTasks(apiArray(value, "tasks"))),
        relatedRequest<{ invoices?: Related[] }>("/api/invoices?page=1&pageSize=100").then((value) => setInvoices(apiArray(value, "invoices"))),
      ]).then((results) => {
        if (controller.signal.aborted) return;
        const failures = results.flatMap((result) => result.status === "rejected" ? [result.reason] : []);
        if (failures.some((reason) => (reason as { status?: number }).status === 401)) router.replace("/authPages/sign-in");
        setResourcesError(failures.map((reason) => reason instanceof Error ? reason.message : "Some appointment options are unavailable.").join(" "));
        setResourcesLoading(false);
      });
    }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [loadTypes, router]);
  useEffect(() => {
    const controller = new AbortController();
    const range = mode === "list" ? { from: fromFilter, to: toFilter } : calRange;
    const query = paramsFrom(range);
    const timer = window.setTimeout(() => {
      void request<Record<string, unknown>>(`/analytics${query ? `?${query}` : ""}`, { signal: controller.signal }).then(setAnalytics).then(() => setAnalyticsError("")).catch((reason) => {
        if (!controller.signal.aborted) {
          if ((reason as { status?: number }).status === 401) router.replace("/authPages/sign-in");
          setAnalyticsError(reason instanceof Error ? reason.message : "Appointment analytics could not be loaded.");
        }
      });
    }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [calRange, fromFilter, mode, router, toFilter]);

  const openDetail = async (item: Appointment) => {
    setSelected(item); setDetailLoading(true); setDetailError(""); setActivity([]); setStatusHistory([]); setCustomerHistory([]);
    setActivityError(""); setCustomerHistoryError("");
    try {
      const result = await request<unknown>(`/${item.id}`);
      const full = result && typeof result === "object" && (result as { appointment?: Appointment }).appointment
        ? (result as { appointment: Appointment }).appointment
        : result && typeof result === "object" ? result as Appointment : item;
      setSelected(full); setAttachments(full.attachments ?? []); setStatusHistory(full.history ?? full.statusHistory ?? []);
      if (Array.isArray(full.activity)) setActivity(full.activity);
      else request<{ activity?: Activity[] }>(`/${item.id}/activity`).then((value) => setActivity(value.activity ?? [])).catch((reason) => setActivityError(reason instanceof Error ? reason.message : "Activity could not be loaded."));
      if (full.customerId ?? full.customer?.id) {
        const customer = full.customerId ?? full.customer?.id;
        relatedRequest<{ appointments?: Appointment[] }>(`/api/appointments/customers/${customer}/history`).then((value) => setCustomerHistory(value.appointments ?? []))
          .catch((reason) => setCustomerHistoryError(reason instanceof Error ? reason.message : "Customer history could not be loaded."));
      }
    } catch (reason) {
      setDetailError(reason instanceof Error ? reason.message : "Appointment details could not be loaded.");
    } finally { setDetailLoading(false); }
  };
  const saveAppointment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    const startAt = inputIsoInZone(form.startAt, form.timezone); const endAt = inputIsoInZone(form.endAt, form.timezone);
    if (!startAt || !endAt || new Date(endAt) <= new Date(startAt)) { setActionError("End time must be after the start time."); return; }
    setSaving(true); setActionError("");
    const payload: Record<string, unknown> = {
      title: form.title.trim(), description: form.description.trim() || null, typeId: form.typeId || null,
      customerId: form.customerId || null, startAt, endAt, timezone: form.timezone || timezoneDefault(),
      locationType: form.locationType, address: form.address || null, city: form.city || null,
      locationInstructions: form.locationInstructions || null, meetingUrl: form.meetingUrl || null,
      meetingPlatform: form.meetingPlatform || null, accessInstructions: form.accessInstructions || null,
      phoneNumber: form.phoneNumber || null, priority: form.priority, relatedTaskId: form.relatedTaskId || null,
      relatedInvoiceId: form.relatedInvoiceId || null, notes: form.notes || null,
      reminders: form.reminders.map((reminder) => reminder.kind === "offset" ? { minutes: Number(reminder.value) } : { at: inputIsoInZone(reminder.value, form.timezone) }),
    };
    if (form.recurring) payload.recurrence = { cadence: form.frequency, interval: Number(form.intervalCount) || 1, endsOn: form.recurrenceEnds || undefined };
    try {
      await request(editing ? `/${editing.id}` : "", { method: editing ? "PUT" : "POST", body: JSON.stringify(payload) });
      setForm(null); setEditing(null); await refreshList();
    } catch (reason) {
      if ((reason as { status?: number }).status === 401) router.replace("/authPages/sign-in");
      setActionError(reason instanceof Error ? reason.message : "Appointment could not be saved.");
    } finally { setSaving(false); }
  };
  const deleteAppointment = async (item: Appointment) => {
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    setOperationBusy(true);
    try { await request(`/${item.id}`, { method: "DELETE" }); setSelected(null); await refreshList(); }
    catch (reason) { setDetailError(reason instanceof Error ? reason.message : "Could not delete the appointment."); }
    finally { setOperationBusy(false); }
  };
  const changeStatus = async (item: Appointment, nextStatus: string, reason?: string) => {
    setOperationBusy(true); setDetailError("");
    try {
      await request(`/${item.id}/status`, { method: "PATCH", body: JSON.stringify({ status: nextStatus, ...(reason ? { reason } : {}) }) });
      await refreshList();
      const fresh = appointments.find((record) => record.id === item.id) ?? item;
      await openDetail(fresh);
      setCancel(null);
    } catch (problem) { setDetailError(problem instanceof Error ? problem.message : "Status could not be updated."); }
    finally { setOperationBusy(false); }
  };
  const submitReschedule = async (event: React.FormEvent) => {
    event.preventDefault(); if (!reschedule) return;
    if (new Date(reschedule.endAt) <= new Date(reschedule.startAt)) { setDetailError("End time must be after the start time."); return; }
    setOperationBusy(true); setDetailError("");
    try {
      await request(`/${reschedule.id}/reschedule`, { method: "PATCH", body: JSON.stringify({ startAt: inputIsoInZone(reschedule.startAt, selected?.timezone || timezoneDefault()), endAt: inputIsoInZone(reschedule.endAt, selected?.timezone || timezoneDefault()), reason: reschedule.reason || undefined }) });
      setReschedule(null); await refreshList();
      if (selected) await openDetail(selected);
    } catch (problem) { setDetailError(problem instanceof Error ? problem.message : "Appointment could not be rescheduled."); }
    finally { setOperationBusy(false); }
  };
  const saveType = async (event: React.FormEvent) => {
    event.preventDefault(); if (!typeName.trim()) return;
    setSavingType(true);
    try {
      const payload = { name: typeName.trim(), icon: typeDraft?.icon || "calendar", color: typeColor, duration: Number(typeDuration) || 60, isDefault: typeIsDefault };
      await request(typeDraft ? `/types/${typeDraft.id}` : "/types", { method: typeDraft ? "PUT" : "POST", body: JSON.stringify(payload) });
      await loadTypes(); setTypeDraft(null); setTypeName("");
    } catch (reason) { setActionError(reason instanceof Error ? reason.message : "Appointment type could not be saved."); }
    finally { setSavingType(false); }
  };
  const removeType = async (type: AppointmentType) => {
    if (!window.confirm(`Delete appointment type "${type.name}"?`)) return;
    try { await request(`/types/${type.id}`, { method: "DELETE" }); await loadTypes(); }
    catch (reason) { setActionError(reason instanceof Error ? reason.message : "Appointment type could not be deleted."); }
  };
  const openAvailability = async () => {
    setAvailabilityOpen(true); setAvailabilityError(""); setAvailabilitySaved("");
    try {
      const result = await request<unknown>("/availability");
      if (!result || typeof result !== "object") throw new Error("Availability response was invalid.");
      const value = result as { timezone?: string; config?: { week?: Record<string, { start: string; end: string }[]>; breaks?: Record<string, { start: string; end: string }[]>; duration?: number; bufferMinutes?: number; minimumNoticeMinutes?: number; maximumAdvanceDays?: number } };
      const config = value.config;
      if (!config?.week) throw new Error("Availability response was invalid.");
      setAvailability({
        ...defaultAvailability(),
        timezone: value.timezone || timezoneDefault(),
        duration: config.duration ?? 30,
        bufferMinutes: config.bufferMinutes ?? 0,
        minimumNoticeMinutes: config.minimumNoticeMinutes ?? 0,
        maximumAdvanceDays: config.maximumAdvanceDays ?? 365,
        weekly: Array.from({ length: 7 }, (_, day) => {
          const working = config.week?.[String(day)]?.[0];
          const pause = config.breaks?.[String(day)]?.[0];
          return {
            day, enabled: Boolean(working), startTime: working?.start ?? "09:00", endTime: working?.end ?? "17:00",
            breakStart: pause?.start ?? "", breakEnd: pause?.end ?? "",
          };
        }),
      });
    } catch (reason) { setAvailabilityError(reason instanceof Error ? reason.message : "Availability could not be loaded."); }
  };
  const saveAvailability = async (event: React.FormEvent) => {
    event.preventDefault(); setAvailabilityError(""); setAvailabilitySaved("");
    try {
      const week: Record<string, { start: string; end: string }[]> = {};
      const breaks: Record<string, { start: string; end: string }[]> = {};
      for (const day of availability.weekly) {
        if (day.enabled) {
          week[String(day.day)] = [{ start: day.startTime, end: day.endTime }];
          if (Boolean(day.breakStart) !== Boolean(day.breakEnd)) throw new Error("Enter both the start and end of each break.");
          if (day.breakStart && day.breakEnd) breaks[String(day.day)] = [{ start: day.breakStart, end: day.breakEnd }];
        }
      }
      await request("/availability", { method: "PUT", body: JSON.stringify({
        timezone: availability.timezone,
        config: { week, breaks, duration: availability.duration, bufferMinutes: availability.bufferMinutes,
          minimumNoticeMinutes: availability.minimumNoticeMinutes, maximumAdvanceDays: availability.maximumAdvanceDays },
      }) });
      setAvailabilitySaved("Availability saved.");
    } catch (reason) { setAvailabilityError(reason instanceof Error ? reason.message : "Availability could not be saved."); }
  };
  const loadSlots = async () => {
    setSlotLoading(true); setSlotsError(""); setSlots([]);
    const start = new Date(date); start.setHours(0, 0, 0, 0); const end = new Date(date); end.setHours(23, 59, 59, 999);
    try {
      const result = await request<unknown>(`/availability/slots?${paramsFrom({ from: start.toISOString(), to: end.toISOString(), duration: String(availability.duration) })}`);
      setSlots(apiArray(result, "slots"));
    } catch (reason) { setSlotsError(reason instanceof Error ? reason.message : "Available slots could not be loaded."); }
    finally { setSlotLoading(false); }
  };
  const uploadAttachment = async (file?: File) => {
    if (!selected || !file) return;
    setUploading(true); setDetailError("");
    const body = new FormData(); body.append("file", file);
    try {
      const result = await request<{ attachment?: Attachment }>(`/${selected.id}/attachments`, { method: "POST", body });
      const attachment = result.attachment;
      if (attachment) setAttachments((current) => [...current, attachment]);
      await openDetail(selected);
    } catch (reason) { setDetailError(reason instanceof Error ? reason.message : "Attachment could not be uploaded."); }
    finally { setUploading(false); }
  };
  const downloadAttachment = async (attachment: Attachment) => {
    if (!selected) return;
    try {
      const response = await fetch(`${API}/api/appointments/${selected.id}/attachments/${attachment.id}`, { credentials: "include" });
      if (!response.ok) throw new Error(`Download failed (${response.status}).`);
      const url = URL.createObjectURL(await response.blob()); const anchor = document.createElement("a");
      anchor.href = url; anchor.download = attachment.name; anchor.click(); URL.revokeObjectURL(url);
    } catch (reason) { setDetailError(reason instanceof Error ? reason.message : "Attachment could not be downloaded."); }
  };
  const removeAttachment = async (attachment: Attachment) => {
    if (!selected || !window.confirm(`Delete attachment "${attachment.name}"?`)) return;
    try {
      await request(`/${selected.id}/attachments/${attachment.id}`, { method: "DELETE" });
      setAttachments((current) => current.filter((value) => value.id !== attachment.id));
    } catch (reason) { setDetailError(reason instanceof Error ? reason.message : "Attachment could not be deleted."); }
  };
  const duplicate = (item: Appointment) => { setEditing(null); setForm(fromAppointment(item)); setSelected(null); setActionError(""); };
  const exportCsv = async () => {
    setActionError("");
    try {
      const response = await fetch(`${API}/api/appointments/export.csv`, { credentials: "include" });
      if (!response.ok) throw new Error(response.status === 401 ? "Your session has expired. Please sign in again." : "Appointment export could not be downloaded.");
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = "appointments.csv"; anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (reason) { setActionError(reason instanceof Error ? reason.message : "Appointment export could not be downloaded."); }
  };
  const selectedDate = new Date(date); const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const monthGridStart = new Date(monthStart); monthGridStart.setDate(1 - monthStart.getDay());
  const monthDays = Array.from({ length: 42 }, (_, index) => { const day = new Date(monthGridStart); day.setDate(day.getDate() + index); return day; });
  const sortedEvents = [...appointments].sort((a, b) => a.startAt.localeCompare(b.startAt));
  const metricValue = (keys: string[], fallback: string) => {
    if (!analytics) return "—";
    const sources = [analytics, analytics.summary, analytics.metrics].filter((value): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value)));
    for (const source of sources) {
      for (const key of keys) {
        const value = source[key];
        if (typeof value === "number" || typeof value === "string") return String(value);
        if (Array.isArray(value)) return String(value.reduce((sum, row) => sum + Number(row && typeof row === "object" ? (row as Record<string, unknown>).count ?? (row as Record<string, unknown>).total ?? 0 : 0), 0));
      }
    }
    const summaries = [analytics.summary, analytics.byStatus, analytics.statuses].find(Array.isArray);
    if (summaries) {
      const target = keys[0].toLowerCase();
      const matching = summaries.filter((row) => row && typeof row === "object" && (target === "total" ? true : String((row as Record<string, unknown>).status ?? (row as Record<string, unknown>).name ?? "").toLowerCase() === target));
      if (matching.length) return String(matching.reduce((sum, row) => sum + Number((row as Record<string, unknown>).count ?? (row as Record<string, unknown>).total ?? 0), 0));
    }
    return fallback;
  };
  const pageChange = (next: number) => setPagination((current) => ({ ...current, page: Math.max(1, Math.min(current.totalPages, next)) }));
  const stepDate = (direction: number) => setDate((current) => {
    const next = new Date(current);
    if (calendarMode === "month") next.setMonth(next.getMonth() + direction);
    else if (calendarMode === "week") next.setDate(next.getDate() + direction * 7);
    else next.setDate(next.getDate() + direction);
    return next;
  });
  const chooseDay = (day: Date) => { setDate(day); setCalendarMode("day"); setMode("calendar"); };
  const manageTypes = () => { setTypeDraft(null); setTypeName(""); setTypeColor("#6478ce"); setTypeDuration("60"); setTypeIsDefault(false); setActionError(""); setTypeModal(true); };
  const createDraft = (selectedDate = date) => {
    const draft = defaultDraft(selectedDate);
    const defaultType = types.find((type) => type.isDefault);
    if (defaultType) {
      draft.typeId = defaultType.id;
      const duration = Number(defaultType.duration ?? defaultType.defaultDuration);
      if (duration > 0) draft.endAt = localInputInZone(new Date(new Date(inputIsoInZone(draft.startAt, draft.timezone)).getTime() + duration * 60000).toISOString(), draft.timezone);
    }
    return draft;
  };

  return <main className="crm-workspace min-h-screen bg-[#f7f8fb] text-[#26344f]">
    <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-[#e9ecf1] bg-white px-4 py-6 lg:block">
      <Link href="/dashboard" className="mb-9 flex items-center gap-2.5 px-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#172b55] text-sm font-bold text-white">B</span><span className="text-base font-semibold">Business<span className="text-[#6278cf]">OS</span></span></Link>
      <nav className="space-y-1" aria-label="Workspace navigation">{[["Dashboard", "/dashboard"], ["Customers", "/customers"], ["Sales", "/sales"], ["Invoices", "/invoices"], ["Expenses", "/expenses"], ["Tasks", "/tasks"], ["Appointments", "/appointments"], ["Settings", "/settings"]].map(([name, href]) => <Link key={name} href={href} aria-current={name === "Appointments" ? "page" : undefined} className={`block rounded-lg px-3 py-2.5 text-[13px] font-medium ${name === "Appointments" ? "bg-[#eff1fa] text-[#566bbd]" : "text-[#737f92] hover:bg-[#f7f8fa]"}`}>{name}</Link>)}</nav>
    </aside>
    <div className="lg:pl-60">
      <header className="sticky top-0 z-20 border-b border-[#e9ecf1] bg-white/95 px-4 py-3 backdrop-blur sm:px-7">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3"><div><p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#929bab]">SCHEDULE</p><h1 className="text-xl font-semibold tracking-[-0.04em]">Appointments</h1></div><div className="flex flex-wrap gap-2"><button className={button} onClick={() => void exportCsv()}>Export CSV</button><button className={button} onClick={manageTypes}>Manage types</button><button className={button} onClick={openAvailability}>Availability</button><button className={primary} onClick={() => { setEditing(null); setForm(createDraft()); setActionError(""); }}>+ New appointment</button></div></div>
        <nav className="mt-3 flex gap-1 overflow-x-auto lg:hidden" aria-label="Workspace navigation">{[["Dashboard", "/dashboard"], ["Customers", "/customers"], ["Sales", "/sales"], ["Invoices", "/invoices"], ["Expenses", "/expenses"], ["Tasks", "/tasks"], ["Appointments", "/appointments"], ["Settings", "/settings"]].map(([name, href]) => <Link key={name} href={href} className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-medium ${name === "Appointments" ? "bg-[#eff1fa] text-[#566bbd]" : "text-[#737f92]"}`}>{name}</Link>)}</nav>
      </header>
      <div className="mx-auto max-w-[1440px] space-y-4 px-4 py-6 sm:px-7 lg:px-9">
        {(actionError || resourcesError) && !form && <p role="alert" className="rounded-xl border border-[#f0d7d4] bg-[#fff7f6] p-3 text-xs text-[#9b514b]">{[actionError, resourcesError].filter(Boolean).join(" ")}</p>}
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Appointment analytics">
          {[["Appointments", ["total", "count", "totalAppointments", "totalCount"], "In selected period"], ["Upcoming", ["upcoming", "upcomingCount"], "Scheduled upcoming"], ["Completed", ["completed", "completedCount"], "Completed appointments"], ["Cancelled", ["cancelled", "cancelledCount"], "Cancelled appointments"]].map(([title, keys, note]) => <article key={String(title)} className="rounded-2xl border border-[#e9edf2] bg-white p-4"><p className="text-xs text-[#788397]">{title}</p><p className="mt-3 text-2xl font-semibold text-[#202d45]">{metricValue(keys as string[], "—")}</p><p className="mt-1 text-[10px] text-[#98a1af]">{analyticsError || note}</p></article>)}
        </section>
        <section className="overflow-hidden rounded-2xl border border-[#e9edf2] bg-white">
          <div className="flex flex-col gap-3 border-b border-[#edf0f4] p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2"><div className="flex rounded-lg bg-[#f5f6fa] p-1">{(["list", "calendar"] as const).map((value) => <button key={value} className={`rounded-md px-3 py-1.5 text-xs font-medium ${mode === value ? "bg-white text-[#465aa9] shadow-sm" : "text-[#778397]"}`} onClick={() => { setMode(value); router.push(value === "calendar" ? "/appointments/calendar" : "/appointments"); if (value === "calendar") setCalendarMode("month"); }}>{label(value)}</button>)}</div>
              {mode === "calendar" && <div className="flex gap-1">{(["month", "week", "day", "agenda"] as const).map((value) => <button key={value} className={`${button} ${calendarMode === value ? "border-[#cbd3f1] bg-[#f2f4fc] text-[#566bbd]" : ""}`} onClick={() => setCalendarMode(value)}>{label(value)}</button>)}</div>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {mode === "calendar" ? <><button className={button} onClick={() => stepDate(-1)}>← Previous</button><strong className="min-w-36 text-center text-xs">{calendarLabel}</strong><button className={button} onClick={() => stepDate(1)}>Next →</button><button className={button} onClick={() => setDate(new Date())}>Today</button><button className={primary} onClick={() => { setForm(createDraft()); setEditing(null); }}>+ Selected date</button></>
                : <><label className="relative min-w-48 flex-1"><span className="sr-only">Search appointments</span><input className={input} placeholder="Search title, customer…" value={searchText} onChange={(e) => { setSearchText(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }} /></label><input aria-label="From date" className={`${input} w-36`} type="date" value={fromFilter} onChange={(e) => { setFromFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }} /><input aria-label="To date" className={`${input} w-36`} type="date" value={toFilter} onChange={(e) => { setToFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }} /></>}
            </div>
          </div>
          {mode === "list" && <div className="grid gap-2 border-b border-[#edf0f4] p-4 sm:grid-cols-2 xl:grid-cols-5">
            <select className={input} aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}><option value="">All statuses</option>{statuses.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select>
            <select className={input} aria-label="Filter by type" value={typeId} onChange={(e) => { setTypeId(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}><option value="">All types</option>{types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select>
            <select className={input} aria-label="Filter by customer" value={customerId} onChange={(e) => { setCustomerId(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}><option value="">All customers</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{relatedName(customer)}</option>)}</select>
            <select className={input} aria-label="Filter by location" value={locationType} onChange={(e) => { setLocationType(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}><option value="">All locations</option>{["in_person", "online", "phone", "other"].map((value) => <option key={value} value={value}>{label(value)}</option>)}</select>
            <div className="flex gap-2"><select className={input} aria-label="Filter recurring appointments" value={recurring} onChange={(e) => { setRecurring(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}><option value="">Recurring: any</option><option value="true">Recurring</option><option value="false">One-time</option></select><select className={input} aria-label="Filter completed appointments" value={completed} onChange={(e) => { setCompleted(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}><option value="">Completion: any</option><option value="true">Completed</option><option value="false">Not completed</option></select></div>
          </div>}
          {mode === "calendar" && <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf0f4] px-4 py-3"><p className="text-xs text-[#8490a2]">{loading ? "Loading schedule…" : `${appointments.length} appointments in view`}</p><button className={button} onClick={() => void loadSlots()} disabled={slotLoading}>{slotLoading ? "Checking availability…" : `Find available ${availability.duration}-minute slots`}</button></div>}
          {slotsError && <p role="alert" className="m-4 rounded-lg bg-[#fff7f6] p-3 text-xs text-[#9b514b]">{slotsError}</p>}
          {slots.length > 0 && <div className="border-b border-[#edf0f4] p-4"><p className="mb-2 text-xs font-semibold">Available on {date.toLocaleDateString()}</p><div className="flex flex-wrap gap-2">{slots.map((slot, index) => <button className={button} key={`${slot.startAt}-${index}`} onClick={() => { const next = createDraft(); next.timezone = slot.timezone || availability.timezone; next.startAt = localInputInZone(slot.startAt, next.timezone); next.endAt = localInputInZone(slot.endAt, next.timezone); setEditing(null); setForm(next); }}>{readableInZone(slot.startAt, slot.timezone, { hour: "numeric", minute: "2-digit" })}</button>)}</div></div>}
          {error && <div role="alert" className="m-4 rounded-xl border border-[#f0d7d4] bg-[#fff7f6] p-4 text-xs text-[#9b514b]">{error} <button className="ml-2 underline" onClick={() => void refreshList()}>Retry</button></div>}
          {mode === "list" && !error && <div className="overflow-x-auto">
            {loading ? <p className="p-10 text-center text-sm text-[#8993a3]">Loading appointments…</p> : appointments.length ? <table className="w-full min-w-[760px] text-left"><thead className="bg-[#fafbfc] text-[10px] uppercase tracking-wide text-[#929bab]"><tr>{["Appointment", "Customer", "Date & time", "Type / location", "Status", "Actions"].map((header) => <th key={header} className="px-4 py-3 font-semibold">{header}</th>)}</tr></thead><tbody className="divide-y divide-[#f0f2f5]">{appointments.map((item) => <tr key={item.id} className="hover:bg-[#fbfcfe]"><td className="px-4 py-3"><button className="text-left text-xs font-semibold text-[#36435c] hover:text-[#566bbd]" onClick={() => void openDetail(item)}>{item.title}</button><p className="mt-1 text-[10px] text-[#98a1af]">{item.priority ? `${label(item.priority)} priority` : "No priority"}</p></td><td className="px-4 py-3 text-xs text-[#647087]">{relatedName(item.customer)}</td><td className="px-4 py-3 text-xs text-[#647087]">{readable(item.startAt)}</td><td className="px-4 py-3 text-xs text-[#647087]">{item.type?.name ?? types.find((type) => type.id === item.typeId)?.name ?? "—"}<p className="mt-1 text-[10px] text-[#98a1af]">{label(item.locationType)}</p></td><td className="px-4 py-3"><span className="rounded-full bg-[#f2f4fa] px-2 py-1 text-[10px] text-[#6273ba]">{label(item.status)}</span></td><td className="px-4 py-3"><div className="flex gap-1"><button className={button} onClick={() => { setEditing(item); setForm(fromAppointment(item)); }}>Edit</button><button className={button} onClick={() => duplicate(item)}>Duplicate</button></div></td></tr>)}</tbody></table> : <div className="p-12 text-center"><h3 className="text-sm font-semibold">No appointments found</h3><p className="mt-1 text-xs text-[#8993a3]">Try changing your filters or create an appointment.</p><button className={`${primary} mt-4`} onClick={() => { setEditing(null); setForm(createDraft()); }}>Create appointment</button></div>}
            {!loading && appointments.length > 0 && <div className="flex items-center justify-between border-t border-[#edf0f4] px-4 py-3 text-xs text-[#788397]"><span>{pagination.total} appointments · Page {pagination.page} of {pagination.totalPages}</span><div className="flex gap-2"><button className={button} disabled={pagination.page <= 1} onClick={() => pageChange(pagination.page - 1)}>Previous</button><button className={button} disabled={pagination.page >= pagination.totalPages} onClick={() => pageChange(pagination.page + 1)}>Next</button></div></div>}
          </div>}
          {mode === "calendar" && !error && <div className="p-4">
            {loading ? <p className="p-10 text-center text-sm text-[#8993a3]">Loading calendar…</p> : calendarMode === "month" ? <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-[#edf0f4]">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="border-b border-[#edf0f4] bg-[#fafbfc] p-2 text-center text-[10px] font-semibold text-[#8993a3]">{day}</div>)}
              {monthDays.map((day) => {
                const dayEvents = sortedEvents.filter((item) => dateKey(new Date(item.startAt)) === dateKey(day));
                return <div key={dateKey(day)} className={`min-h-24 border-b border-r border-[#edf0f4] p-1.5 sm:min-h-28 ${day.getMonth() !== date.getMonth() ? "bg-[#fafbfc] text-[#b3bac5]" : ""}`}><button className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-[10px] ${todayKey && dateKey(day) === todayKey ? "bg-[#566bbd] text-white" : ""}`} onClick={() => chooseDay(day)}>{day.getDate()}</button><div className="space-y-1">{dayEvents.slice(0, 3).map((item) => <button key={item.id} title={item.title} onClick={() => void openDetail(item)} className="block w-full truncate rounded bg-[#eff1fa] px-1.5 py-1 text-left text-[9px] text-[#5368b2]">{new Date(item.startAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} {item.title}</button>)}{dayEvents.length > 3 && <button className="px-1 text-[9px] text-[#7b8698]" onClick={() => chooseDay(day)}>+{dayEvents.length - 3} more</button>}</div></div>;
              })}
            </div> : calendarMode === "agenda" ? <div className="divide-y divide-[#edf0f4]">{sortedEvents.length ? sortedEvents.map((item) => <button key={item.id} onClick={() => void openDetail(item)} className="flex w-full items-center justify-between gap-4 py-3 text-left hover:bg-[#fbfcfe]"><span><span className="block text-xs font-semibold">{item.title}</span><span className="mt-1 block text-[10px] text-[#8993a3]">{relatedName(item.customer)} · {label(item.status)}</span></span><span className="shrink-0 text-[10px] text-[#647087]">{readable(item.startAt)}</span></button>) : <p className="p-10 text-center text-xs text-[#8993a3]">No appointments in this period.</p>}</div> : <div className={calendarMode === "week" ? "grid gap-2 md:grid-cols-7" : "space-y-2"}>{(calendarMode === "week" ? Array.from({ length: 7 }, (_, index) => { const day = startOfWeek(date); day.setDate(day.getDate() + index); return day; }) : [date]).map((day) => { const dayEvents = sortedEvents.filter((item) => dateKey(new Date(item.startAt)) === dateKey(day)); return <section key={dateKey(day)} className="min-h-36 rounded-xl border border-[#edf0f4] p-3"><button className="mb-3 text-xs font-semibold text-[#5368b2]" onClick={() => chooseDay(day)}>{day.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · +</button>{dayEvents.length ? dayEvents.map((item) => <button key={item.id} onClick={() => void openDetail(item)} className="mb-2 block w-full rounded-lg bg-[#f2f4fa] p-2 text-left"><span className="block text-xs font-semibold">{item.title}</span><span className="mt-1 block text-[10px] text-[#778397]">{readable(item.startAt, { hour: "numeric", minute: "2-digit" })} – {readable(item.endAt, { hour: "numeric", minute: "2-digit" })}</span></button>) : <p className="text-[10px] text-[#a1a9b5]">No appointments</p>}</section>; })}</div>}
          </div>}
        </section>
      </div>
    </div>

    {form && <Dialog title={editing ? "Edit appointment" : "New appointment"} wide onClose={() => { if (!saving) { setForm(null); setEditing(null); setActionError(""); } }}><form onSubmit={saveAppointment}><AppointmentFields draft={form} setDraft={setForm} types={types} customers={customers} tasks={tasks} invoices={invoices} /><div className="mt-5 flex flex-wrap items-center justify-between gap-3">{actionError && <p role="alert" className="text-xs text-[#a44e48]">{actionError}</p>}<div className="ml-auto flex gap-2"><button type="button" className={button} onClick={() => { setForm(null); setEditing(null); }}>Cancel</button><button className={primary} disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Create appointment"}</button></div></div></form></Dialog>}
    {selected && <Dialog title="Appointment details" wide onClose={() => setSelected(null)}>
      {detailLoading ? <p className="py-10 text-center text-sm text-[#8993a3]">Loading appointment…</p> : <>
        {detailError && <p role="alert" className="mb-4 rounded-lg bg-[#fff7f6] p-3 text-xs text-[#9b514b]">{detailError}</p>}
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-semibold">{selected.title}</h3><p className="mt-1 text-xs text-[#8993a3]">{readableInZone(selected.startAt, selected.timezone)} – {readableInZone(selected.endAt, selected.timezone, { hour: "numeric", minute: "2-digit" })} · {selected.timezone || timezoneDefault()}</p><p className="mt-2 text-xs text-[#647087]">{selected.customer ? <Link className="text-[#566bbd]" href={`/customers?id=${selected.customer.id}`}>{relatedName(selected.customer)}</Link> : "No customer"} · {selected.type?.name ?? types.find((type) => type.id === selected.typeId)?.name ?? "No type"} · {label(selected.status)}</p></div><div className="flex flex-wrap gap-2"><select aria-label="Change appointment status" className={`${input} w-auto`} value={selected.status} disabled={operationBusy} onChange={(e) => e.target.value === "cancelled" ? setCancel({ id: selected.id, reason: "" }) : void changeStatus(selected, e.target.value)}>{Array.from(new Set([...statuses.filter((value) => value !== "rescheduled"), selected.status])).map((value) => <option key={value} value={value}>{label(value)}</option>)}</select><button className={button} onClick={() => { setEditing(selected); setForm(fromAppointment(selected)); setSelected(null); }}>Edit</button><button className={button} onClick={() => duplicate(selected)}>Duplicate</button><button className={button} disabled={operationBusy} onClick={() => setReschedule({ id: selected.id, startAt: localInputInZone(selected.startAt, selected.timezone || timezoneDefault()), endAt: localInputInZone(selected.endAt, selected.timezone || timezoneDefault()), reason: "" })}>Reschedule</button><button className={`${button} border-[#f0d7d4] text-[#a44e48]`} disabled={operationBusy} onClick={() => void deleteAppointment(selected)}>Delete</button></div></div>
        {selected.description && <p className="mt-4 whitespace-pre-wrap text-sm text-[#657188]">{selected.description}</p>}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">{[["Location", [label(selected.locationType), selected.address, selected.city, selected.meetingUrl, selected.phoneNumber].filter(Boolean).join(" · ")], ["Priority", label(selected.priority)], ["Related task", selected.relatedTask ? relatedName(selected.relatedTask) : selected.relatedTaskId ? <Link className="text-[#566bbd]" href="/tasks">Open task</Link> : "—"], ["Related invoice", selected.relatedInvoice ? relatedName(selected.relatedInvoice) : selected.relatedInvoiceId ? <Link className="text-[#566bbd]" href="/invoices">Open invoice</Link> : "—"], ["Instructions", selected.locationInstructions || selected.accessInstructions || "—"], ["Notes", selected.notes || "—"]].map(([name, value]) => <div key={String(name)} className="rounded-lg bg-[#f8f9fb] p-3"><p className="text-[10px] font-semibold uppercase text-[#929bab]">{name}</p><div className="mt-1 text-xs text-[#566278]">{value}</div></div>)}</div>
        <div className="mt-5 grid gap-4 md:grid-cols-2"><section className="rounded-xl border border-[#edf0f4] p-4"><div className="mb-2 flex items-center justify-between"><h4 className="text-xs font-semibold">Attachments</h4><label className={`${button} cursor-pointer`}>{uploading ? "Uploading…" : "Add file"}<input type="file" className="sr-only" disabled={uploading} onChange={(e) => { void uploadAttachment(e.target.files?.[0]); e.currentTarget.value = ""; }} /></label></div>{attachments.length ? attachments.map((attachment) => <div key={attachment.id} className="flex items-center justify-between gap-2 border-t border-[#f0f2f5] py-2"><button className="truncate text-left text-xs text-[#566bbd]" onClick={() => void downloadAttachment(attachment)}>{attachment.name}</button><button className="text-[10px] text-[#a44e48]" onClick={() => void removeAttachment(attachment)}>Delete</button></div>) : <p className="text-xs text-[#8993a3]">No attachments.</p>}</section>
          <section className="rounded-xl border border-[#edf0f4] p-4"><h4 className="mb-2 text-xs font-semibold">Reminders</h4>{selected.reminders?.length ? selected.reminders.map((reminder, index) => <p key={index} className="border-t border-[#f0f2f5] py-2 text-xs text-[#657188]">{typeof reminder.minutes === "number" ? `${reminder.minutes} minutes before` : readable(reminder.at)}</p>) : <p className="text-xs text-[#8993a3]">No reminders set.</p>}</section></div>
        <div className="mt-4 grid gap-4 md:grid-cols-3"><section><h4 className="mb-2 text-xs font-semibold">Status history</h4>{statusHistory.length ? statusHistory.map((entry, i) => <p key={entry.id ?? i} className="border-t border-[#f0f2f5] py-2 text-[10px] text-[#657188]">{entry.description ?? (entry.toStatus ? `${label(entry.fromStatus)} → ${label(entry.toStatus)}` : entry.action ?? entry.eventType ?? "Status updated")}{entry.reason ? ` · ${entry.reason}` : ""} · {readable(entry.createdAt)}</p>) : <p className="text-[10px] text-[#8993a3]">No history available.</p>}</section><section><h4 className="mb-2 text-xs font-semibold">Activity</h4>{activityError ? <p role="alert" className="text-[10px] text-[#a44e48]">{activityError}</p> : activity.length ? activity.map((entry, i) => <p key={entry.id ?? i} className="border-t border-[#f0f2f5] py-2 text-[10px] text-[#657188]">{entry.description ?? entry.action ?? entry.eventType ?? "Updated"} · {readable(entry.createdAt)}</p>) : <p className="text-[10px] text-[#8993a3]">No activity available.</p>}</section><section><h4 className="mb-2 text-xs font-semibold">Customer history</h4>{customerHistoryError ? <p role="alert" className="text-[10px] text-[#a44e48]">{customerHistoryError}</p> : customerHistory.length ? customerHistory.map((entry) => <p key={entry.id} className="border-t border-[#f0f2f5] py-2 text-[10px] text-[#657188]">{entry.title} · {readable(entry.startAt)} · {label(entry.status)}</p>) : <p className="text-[10px] text-[#8993a3]">No customer history available.</p>}</section></div>
      </>}
    </Dialog>}
    {cancel && <Dialog title="Cancel appointment" onClose={() => setCancel(null)}><form onSubmit={(e) => { e.preventDefault(); void changeStatus(selected!, "cancelled", cancel.reason); }}><Field title="Cancellation reason"><textarea className={`${input} min-h-24`} value={cancel.reason} onChange={(e) => setCancel({ ...cancel, reason: e.target.value })} required /></Field><div className="mt-4 flex justify-end gap-2"><button type="button" className={button} onClick={() => setCancel(null)}>Keep appointment</button><button className={primary} disabled={operationBusy}>Confirm cancellation</button></div></form></Dialog>}
    {reschedule && <Dialog title="Reschedule appointment" onClose={() => setReschedule(null)}><form onSubmit={submitReschedule} className="space-y-3"><Field title="New start"><input className={input} type="datetime-local" value={reschedule.startAt} required onChange={(e) => setReschedule({ ...reschedule, startAt: e.target.value })} /></Field><Field title="New end"><input className={input} type="datetime-local" value={reschedule.endAt} required onChange={(e) => setReschedule({ ...reschedule, endAt: e.target.value })} /></Field><Field title="Reason"><textarea className={`${input} min-h-20`} value={reschedule.reason} onChange={(e) => setReschedule({ ...reschedule, reason: e.target.value })} /></Field><div className="flex justify-end gap-2"><button type="button" className={button} onClick={() => setReschedule(null)}>Back</button><button className={primary} disabled={operationBusy}>Save new time</button></div></form></Dialog>}
    {typeModal && <Dialog title="Appointment types" onClose={() => setTypeModal(false)}>{actionError && <p role="alert" className="mb-3 text-xs text-[#a44e48]">{actionError}</p>}<form onSubmit={saveType} className="mb-5 grid gap-3 sm:grid-cols-2"><Field title="Type name"><input className={input} value={typeName} onChange={(e) => setTypeName(e.target.value)} required /></Field><Field title="Color"><input className={`${input} h-10 p-1`} type="color" value={typeColor} onChange={(e) => setTypeColor(e.target.value)} /></Field><Field title="Default duration (minutes)"><input className={input} type="number" min="5" max="1440" value={typeDuration} onChange={(e) => setTypeDuration(e.target.value)} /></Field><label className="flex items-center gap-2 self-end pb-2 text-xs text-[#566278]"><input type="checkbox" checked={typeIsDefault} onChange={(e) => setTypeIsDefault(e.target.checked)} />Use as default type</label><div className="flex items-end gap-2"><button className={primary} disabled={savingType}>{savingType ? "Saving…" : typeDraft ? "Update type" : "Add type"}</button>{typeDraft && <button type="button" className={button} onClick={() => { setTypeDraft(null); setTypeName(""); setTypeIsDefault(false); }}>New type</button>}</div></form><div className="divide-y divide-[#edf0f4]">{resourcesLoading ? <p className="py-4 text-xs text-[#8993a3]">Loading types…</p> : types.length ? types.map((type) => <div key={type.id} className="flex items-center justify-between gap-3 py-3"><span className="flex items-center gap-2 text-xs"><i className="h-3 w-3 rounded-full" style={{ backgroundColor: type.color || "#6478ce" }} />{type.name} · {type.duration ?? type.defaultDuration ?? 60} min {type.isDefault ? "· Default" : ""}</span><div className="flex gap-2"><button className={button} onClick={() => { setTypeDraft(type); setTypeName(type.name); setTypeColor(type.color || "#6478ce"); setTypeDuration(String(type.duration ?? type.defaultDuration ?? 60)); setTypeIsDefault(Boolean(type.isDefault)); }}>Edit</button><button className={button} onClick={() => void removeType(type)}>Delete</button></div></div>) : <p className="py-4 text-xs text-[#8993a3]">No appointment types configured.</p>}</div></Dialog>}
    {availabilityOpen && <Dialog title="Working availability" wide onClose={() => setAvailabilityOpen(false)}><form onSubmit={saveAvailability}>
      <Field title="Timezone"><input className={input} value={availability.timezone} onChange={(e) => setAvailability({ ...availability, timezone: e.target.value })} /></Field>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field title="Default appointment length (minutes)"><input className={input} type="number" min="5" max="1440" value={availability.duration} onChange={(e) => setAvailability({ ...availability, duration: Number(e.target.value) })} /></Field>
        <Field title="Buffer between appointments (minutes)"><input className={input} type="number" min="0" max="1440" value={availability.bufferMinutes} onChange={(e) => setAvailability({ ...availability, bufferMinutes: Number(e.target.value) })} /></Field>
        <Field title="Minimum booking notice (minutes)"><input className={input} type="number" min="0" max="525600" value={availability.minimumNoticeMinutes} onChange={(e) => setAvailability({ ...availability, minimumNoticeMinutes: Number(e.target.value) })} /></Field>
        <Field title="Maximum advance booking (days)"><input className={input} type="number" min="1" max="3650" value={availability.maximumAdvanceDays} onChange={(e) => setAvailability({ ...availability, maximumAdvanceDays: Number(e.target.value) })} /></Field>
      </div>
      <div className="mt-4 divide-y divide-[#edf0f4]">{availability.weekly.map((day) => <div key={day.day} className="grid gap-2 py-3 sm:grid-cols-[auto_1fr_1fr_1fr_1fr] sm:items-center"><label className="flex w-28 items-center gap-2 text-xs"><input type="checkbox" checked={day.enabled} onChange={(e) => setAvailability({ ...availability, weekly: availability.weekly.map((item) => item.day === day.day ? { ...item, enabled: e.target.checked } : item) })} />{["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day.day]}</label><input aria-label={`${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day.day]} start time`} className={input} type="time" value={day.startTime} disabled={!day.enabled} onChange={(e) => setAvailability({ ...availability, weekly: availability.weekly.map((item) => item.day === day.day ? { ...item, startTime: e.target.value } : item) })} /><input aria-label={`${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day.day]} end time`} className={input} type="time" value={day.endTime} disabled={!day.enabled} onChange={(e) => setAvailability({ ...availability, weekly: availability.weekly.map((item) => item.day === day.day ? { ...item, endTime: e.target.value } : item) })} /><input aria-label={`${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day.day]} break start`} className={input} type="time" value={day.breakStart} disabled={!day.enabled} onChange={(e) => setAvailability({ ...availability, weekly: availability.weekly.map((item) => item.day === day.day ? { ...item, breakStart: e.target.value } : item) })} /><input aria-label={`${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day.day]} break end`} className={input} type="time" value={day.breakEnd} disabled={!day.enabled} onChange={(e) => setAvailability({ ...availability, weekly: availability.weekly.map((item) => item.day === day.day ? { ...item, breakEnd: e.target.value } : item) })} /></div>)}</div>
      {availabilityError && <p role="alert" className="mt-3 text-xs text-[#a44e48]">{availabilityError}</p>}{availabilitySaved && <p role="status" className="mt-3 text-xs text-[#39754e]">{availabilitySaved}</p>}<div className="mt-4 flex justify-end"><button className={primary}>Save availability</button></div></form></Dialog>}
  </main>;
}

export default function AppointmentsPage() {
  return <AppointmentsWorkspace />;
}
