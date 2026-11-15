"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useUserPreferences, type UserPreferences } from "../components/PreferencesProvider";

type Onboarding = { currentStep: "welcome" | "business" | "preferences" | "completed"; businessName: string | null; industry: string | null; country: string | null; skippedSteps: string[]; completedAt: string | null };
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const input = "w-full rounded-lg border border-[#e5e9f0] bg-white px-3 py-2.5 text-sm text-[#35415a] outline-none focus:border-[#7585d4]";
const button = "rounded-lg border border-[#e5e9f0] px-4 py-2.5 text-xs font-semibold text-[#536078] hover:bg-[#f5f6fa] disabled:opacity-50";
const primary = "rounded-lg bg-[#172b55] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#243c70] disabled:opacity-50";
const zones = ["UTC", "Africa/Cairo", "America/New_York", "Asia/Dubai", "Europe/London", "Europe/Paris"];

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}/api${path}`, {
    ...init, credentials: "include",
    headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
  });
  if (response.status === 401) throw Object.assign(new Error("Sign in to continue setup."), { status: 401 });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#566278]">{label}</span>{children}</label>;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { preferences, setPreferences } = useUserPreferences();
  const [onboarding, setOnboarding] = useState<Onboarding | null>(null);
  const [draft, setDraft] = useState<UserPreferences>(preferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [progress, prefs] = await Promise.all([
          request<{ onboarding: Onboarding }>("/account/onboarding"),
          request<{ preferences: UserPreferences }>("/account/preferences"),
        ]);
        if (active) {
          setOnboarding(progress.onboarding);
          setDraft(prefs.preferences);
          setPreferences(prefs.preferences);
        }
      } catch (loadError) {
        if ((loadError as { status?: number }).status === 401) router.replace("/authPages/sign-in");
        else if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load workspace setup.");
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [router, setPreferences]);

  async function saveProgress(value: Partial<Onboarding>) {
    setSaving(true); setError("");
    try {
      const result = await request<{ onboarding: Onboarding }>("/account/onboarding", {
        method: "PUT", body: JSON.stringify(value),
      });
      setOnboarding(result.onboarding);
      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save setup progress.");
      return false;
    } finally { setSaving(false); }
  }

  async function finish(preferencesToSave = draft, skippedSteps = onboarding?.skippedSteps ?? []) {
    setSaving(true); setError("");
    try {
      const result = await request<{ preferences: UserPreferences }>("/account/preferences", {
        method: "PUT", body: JSON.stringify(preferencesToSave),
      });
      setPreferences(result.preferences);
      const progress = await request<{ onboarding: Onboarding }>("/account/onboarding", {
        method: "PUT", body: JSON.stringify({ currentStep: "completed", skippedSteps }),
      });
      setOnboarding(progress.onboarding);
      router.replace("/dashboard");
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to complete setup."); }
    finally { setSaving(false); }
  }

  async function submitBusiness(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (await saveProgress({
      currentStep: "preferences",
      businessName: String(form.get("businessName") ?? "").trim() || null,
      industry: String(form.get("industry") ?? "").trim() || null,
      country: String(form.get("country") ?? "").trim().toUpperCase() || null,
    })) setError("");
  }

  async function skipBusiness() {
    await saveProgress({ currentStep: "preferences", skippedSteps: [...new Set([...(onboarding?.skippedSteps ?? []), "business"])] });
  }

  const step = onboarding?.currentStep ?? "welcome";
  const stepNumber = step === "welcome" ? 1 : step === "business" ? 2 : 3;

  if (loading) return <main className="crm-workspace flex min-h-screen items-center justify-center bg-[#f7f8fa]"><p role="status" className="text-sm text-[#738097]">Loading workspace setup...</p></main>;
  if (!onboarding) return <main className="crm-workspace flex min-h-screen items-center justify-center bg-[#f7f8fa] p-5"><div className="rounded-2xl border border-[#e9edf2] bg-white p-7 text-center"><p role="alert" className="text-sm text-rose-700">{error || "Workspace setup is unavailable."}</p><Link className="mt-4 inline-block text-sm font-semibold text-[#566bbd]" href="/settings">Open settings</Link></div></main>;
  if (step === "completed") return <main className="crm-workspace flex min-h-screen items-center justify-center bg-[#f7f8fa] p-5"><section className="w-full max-w-xl rounded-2xl border border-[#e9edf2] bg-white p-8 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-xl text-emerald-700">✓</span><h1 className="mt-5 text-2xl font-semibold text-[#26344d]">Your workspace is ready</h1><p className="mt-2 text-sm text-[#788397]">You can revisit these settings any time from Account Settings.</p><button className={`${primary} mt-6`} onClick={() => router.replace("/dashboard")}>Go to workspace</button></section></main>;

  return <main className="crm-workspace min-h-screen bg-[#f7f8fa] px-4 py-8 text-[#26334b]">
    <div className="mx-auto max-w-2xl">
      <header className="mb-7 flex items-center justify-between"><Link href="/dashboard" className="text-sm font-bold text-[#27344c]">BusinessOS</Link><Link href="/settings" className="text-xs font-semibold text-[#68758a]">Settings</Link></header>
      <section className="rounded-2xl border border-[#e9edf2] bg-white p-6 shadow-sm sm:p-9">
        <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#7888d0]">Workspace setup · Step {stepNumber} of 3</p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#edf0f5]"><div className="h-full rounded-full bg-[#566bbd] transition-all" style={{ width: `${stepNumber / 3 * 100}%` }} /></div>
        {error && <p role="alert" className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">{error}</p>}
        {step === "welcome" && <div className="py-8"><h1 className="text-3xl font-semibold tracking-tight text-[#26344d]">Welcome to your workspace</h1><p className="mt-3 max-w-lg text-sm leading-6 text-[#788397]">A few optional details help personalize BusinessOS. You can skip any step and start using your workspace right away.</p><div className="mt-7 flex flex-wrap gap-2"><button className={primary} disabled={saving} onClick={() => void saveProgress({ currentStep: "business" })}>Get started</button><button className={button} disabled={saving} onClick={() => void finish(draft, ["business", "preferences"])}>Skip setup</button></div></div>}
        {step === "business" && <div className="py-5"><h1 className="text-2xl font-semibold text-[#26344d]">Business information</h1><p className="mt-2 text-sm text-[#788397]">Optional. Your workspace remains personal and single-user.</p><form className="mt-6 space-y-4" onSubmit={submitBusiness}><Field label="Business name"><input className={input} name="businessName" maxLength={120} defaultValue={onboarding.businessName ?? ""} placeholder="Your business name" /></Field><Field label="Industry"><input className={input} name="industry" maxLength={100} defaultValue={onboarding.industry ?? ""} placeholder="e.g. Consulting" /></Field><Field label="Country code (optional)"><input className={input} name="country" minLength={2} maxLength={2} pattern="[A-Za-z]{2}" defaultValue={onboarding.country ?? ""} placeholder="EG" /></Field><div className="flex flex-wrap justify-between gap-2 pt-2"><button type="button" className={button} disabled={saving} onClick={() => void skipBusiness()}>Skip this step</button><button className={primary} disabled={saving}>{saving ? "Saving..." : "Continue"}</button></div></form></div>}
        {step === "preferences" && <div className="py-5"><h1 className="text-2xl font-semibold text-[#26344d]">Regional preferences</h1><p className="mt-2 text-sm text-[#788397]">Choose defaults for new records and your workspace display. Existing financial records are not converted.</p><div className="mt-6 grid gap-4 sm:grid-cols-2"><Field label="Language"><select className={input} value={draft.language} onChange={(event) => setDraft({ ...draft, language: event.target.value as UserPreferences["language"] })}><option value="en">English</option><option value="ar">Arabic</option></select></Field><Field label="Preferred currency"><select className={input} value={draft.currency} onChange={(event) => setDraft({ ...draft, currency: event.target.value as UserPreferences["currency"] })}><option>EGP</option><option>USD</option><option>EUR</option></select></Field><Field label="Theme"><select className={input} value={draft.theme} onChange={(event) => setDraft({ ...draft, theme: event.target.value as UserPreferences["theme"] })}><option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option></select></Field><Field label="Time zone"><select className={input} value={draft.timezone} onChange={(event) => setDraft({ ...draft, timezone: event.target.value })}>{[...new Set([...zones, draft.timezone])].sort().map((zone) => <option key={zone}>{zone}</option>)}</select></Field><Field label="Date format"><select className={input} value={draft.dateFormat} onChange={(event) => setDraft({ ...draft, dateFormat: event.target.value as UserPreferences["dateFormat"] })}><option>YYYY-MM-DD</option><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option></select></Field><Field label="Time format"><select className={input} value={draft.timeFormat} onChange={(event) => setDraft({ ...draft, timeFormat: event.target.value as UserPreferences["timeFormat"] })}><option value="12h">12-hour</option><option value="24h">24-hour</option></select></Field></div><div className="mt-7 flex flex-wrap justify-between gap-2"><button className={button} disabled={saving} onClick={() => void finish(draft, [...new Set([...(onboarding.skippedSteps ?? []), "preferences"])])}>Skip preferences</button><button className={primary} disabled={saving} onClick={() => void finish()}>{saving ? "Saving..." : "Complete setup"}</button></div></div>}
      </section>
      <p className="mt-4 text-center text-[10px] text-[#98a1af]">Setup progress is saved to your account and can be resumed on any device.</p>
    </div>
  </main>;
}
