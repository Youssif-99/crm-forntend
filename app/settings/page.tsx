"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { formatUserDate, normalizeUserPreferences, useUserPreferences, type UserPreferences } from "../components/PreferencesProvider";

type Profile = { id: string; name: string; username: string; email: string; createdAt: string; lastLoginAt: string | null; avatarUrl: string | null };
type Onboarding = { currentStep: string; businessName: string | null; industry: string | null; country: string | null; completedAt: string | null };
type Section = "profile" | "preferences" | "security" | "onboarding" | "account";

const API = "";
const input = "w-full rounded-lg border border-[#e5e9f0] bg-white px-3 py-2.5 text-sm text-[#35415a] outline-none focus:border-[#7585d4]";
const button = "rounded-lg border border-[#e5e9f0] px-3 py-2 text-xs font-semibold text-[#536078] transition hover:bg-[#f5f6fa] disabled:opacity-50";
const primary = "rounded-lg bg-[#172b55] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#243c70] disabled:opacity-50";
const sections: { id: Section; title: string; description: string }[] = [
  { id: "profile", title: "Profile", description: "Personal information and avatar" },
  { id: "preferences", title: "Preferences", description: "Language, display, and regional settings" },
  { id: "security", title: "Security", description: "Password and active sessions" },
  { id: "onboarding", title: "Workspace setup", description: "Review or resume onboarding" },
  { id: "account", title: "Account information", description: "Account status and available controls" },
];
const zones = ["UTC", "Africa/Cairo", "Africa/Johannesburg", "America/Chicago", "America/Los_Angeles", "America/New_York", "Asia/Dubai", "Asia/Riyadh", "Asia/Tokyo", "Australia/Sydney", "Europe/London", "Europe/Paris"];

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

function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#566278]">{label}</span>{children}</label>;
}

function Card({ children }: { children: ReactNode }) {
  return <section className="rounded-2xl border border-[#e9edf2] bg-white p-5 sm:p-7">{children}</section>;
}

function dateLabel(value: string | null | undefined, preferences: UserPreferences, includeTime = false) {
  if (!value) return "Not available";
  return formatUserDate(value, preferences, includeTime);
}

export default function SettingsPage() {
  const router = useRouter();
  const { preferences, setPreferences, refresh: refreshPreferences } = useUserPreferences();
  const [section, setSection] = useState<Section>("profile");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [onboarding, setOnboarding] = useState<Onboarding | null>(null);
  const [draft, setDraft] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [deletionDialogOpen, setDeletionDialogOpen] = useState(false);
  const [deletionPassword, setDeletionPassword] = useState("");
  const [deletionConfirmation, setDeletionConfirmation] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  const preferenceDraft = draft ?? preferences;
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [account, prefs, progress] = await Promise.all([
          request<{ profile: Profile }>("/account/profile"),
          request<{ preferences: UserPreferences }>("/account/preferences"),
          request<{ onboarding: Onboarding }>("/account/onboarding"),
        ]);
        if (active) {
          setProfile(account.profile);
          const userPreferences = normalizeUserPreferences(prefs.preferences);
          setPreferences(userPreferences);
          setDraft(userPreferences);
          setOnboarding(progress.onboarding);
        }
      } catch (loadError) {
        if ((loadError as { status?: number }).status === 401) router.replace("/authPages/sign-in");
        else if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load account settings.");
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [router, setPreferences]);

  useEffect(() => {
    let objectUrl: string | undefined;
    if (!profile?.avatarUrl) return;
    let active = true;
    void fetch(`${API}${profile.avatarUrl}`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load profile avatar.");
        return URL.createObjectURL(await response.blob());
      })
      .then((url) => { objectUrl = url; if (active) setAvatarUrl(url); })
      .catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load profile avatar."); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [profile?.avatarUrl, avatarVersion]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setSuccess("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await request<{ profile: Profile }>("/account/profile", {
        method: "PATCH", body: JSON.stringify({ name: String(form.get("name") ?? "").trim() }),
      });
      setProfile(result.profile); setSuccess("Profile updated.");
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to save profile."); }
    finally { setSaving(false); }
  }

  async function savePreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setSuccess("");
    try {
      const result = await request<{ preferences: UserPreferences }>("/account/preferences", {
        method: "PUT", body: JSON.stringify(normalizeUserPreferences(preferenceDraft)),
      });
      const userPreferences = normalizeUserPreferences(result.preferences);
      setPreferences(userPreferences);
      setDraft(userPreferences);
      await refreshPreferences();
      setSuccess("Preferences saved and applied.");
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to save preferences."); }
    finally { setSaving(false); }
  }

  async function uploadAvatar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setAvatarBusy(true); setError(""); setSuccess("");
    try {
      await request("/account/profile/avatar", { method: "POST", body: new FormData(event.currentTarget) });
      const result = await request<{ profile: Profile }>("/account/profile");
      setProfile(result.profile); setAvatarVersion((version) => version + 1); setSuccess("Avatar updated.");
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "Unable to upload avatar."); }
    finally { setAvatarBusy(false); }
  }

  async function removeAvatar() {
    setAvatarBusy(true); setError(""); setSuccess("");
    try {
      await request("/account/profile/avatar", { method: "DELETE" });
      const result = await request<{ profile: Profile }>("/account/profile");
      setProfile(result.profile); setSuccess("Avatar removed.");
    } catch (removeError) { setError(removeError instanceof Error ? removeError.message : "Unable to remove avatar."); }
    finally { setAvatarBusy(false); }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setSuccess("");
    const form = new FormData(event.currentTarget);
    try {
      await request("/account/security/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword: form.get("currentPassword"), newPassword: form.get("newPassword") }),
      });
      event.currentTarget.reset();
      setSuccess("Password updated. Other sessions are now signed out.");
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to update password."); }
    finally { setSaving(false); }
  }

  async function revokeSessions() {
    if (!window.confirm("Sign out all other active sessions? This session will remain active.")) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      const result = await request<{ message: string }>("/account/security/revoke-other-sessions", { method: "POST" });
      setSuccess(result.message);
    } catch (revokeError) { setError(revokeError instanceof Error ? revokeError.message : "Unable to revoke sessions."); }
    finally { setSaving(false); }
  }

  async function logout() {
    setSaving(true); setError("");
    try {
      await request("/auth/logout", { method: "POST" });
      window.dispatchEvent(new Event("businessos:account-unauthenticated"));
      router.replace("/authPages/sign-in");
    } catch (logoutError) { setError(logoutError instanceof Error ? logoutError.message : "Unable to sign out."); }
    finally { setSaving(false); }
  }

  async function deleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (deletionConfirmation !== "DELETE") return;
    setDeletingAccount(true); setError(""); setSuccess("");
    try {
      await request("/account", {
        method: "DELETE",
        body: JSON.stringify({ currentPassword: deletionPassword }),
      });
      setProfile(null);
      setPreferences({
        language: "en", theme: "system", currency: "EGP",
        dateFormat: "YYYY-MM-DD", timeFormat: "24h", timezone: "UTC",
      });
      router.replace("/authPages/sign-in?accountDeletion=processing");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to request account deletion.");
      setDeletingAccount(false);
    }
  }

  async function restartOnboarding() {
    setSaving(true); setError("");
    try {
      await request("/account/onboarding", {
        method: "PUT", body: JSON.stringify({ currentStep: "welcome", skippedSteps: [] }),
      });
      router.push("/onboarding");
    } catch (restartError) { setError(restartError instanceof Error ? restartError.message : "Unable to resume workspace setup."); }
    finally { setSaving(false); }
  }

  if (loading) return <main className="crm-workspace flex min-h-screen items-center justify-center bg-[#f7f8fa]"><p role="status" className="text-sm text-[#738097]">Loading account settings...</p></main>;

  return <main className="crm-workspace min-h-screen bg-[#f7f8fa] text-[#26334b]">
    <div className="mx-auto max-w-[1320px] px-4 py-6 sm:px-7 sm:py-8 lg:px-9">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><Link href="/dashboard" className="text-xs font-semibold text-[#66748b] hover:text-[#566bbd]">← Workspace</Link><p className="mt-4 text-[10px] font-semibold uppercase tracking-[.13em] text-[#929bab]">ACCOUNT</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#202d45]">Settings</h1><p className="mt-1 text-sm text-[#8490a2]">Manage your profile, preferences, and account security.</p></div><button className={button} disabled={saving} onClick={() => void logout()}>Sign out</button></header>
      {(error || success) && <p role={error ? "alert" : "status"} className={`mb-4 rounded-xl border px-4 py-3 text-xs ${error ? "border-[#f0d7d4] bg-[#fff7f6] text-[#9b514b]" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{error || success}</p>}
      <div className="grid gap-5 lg:grid-cols-[250px_1fr]">
        <nav className="h-fit rounded-2xl border border-[#e9edf2] bg-white p-2" aria-label="Settings sections">{sections.map((item) => <button key={item.id} onClick={() => { setSection(item.id); setError(""); setSuccess(""); }} aria-current={section === item.id ? "page" : undefined} className={`w-full rounded-xl px-3 py-3 text-left transition ${section === item.id ? "bg-[#eff1fa] text-[#566bbd]" : "text-[#65718a] hover:bg-[#f7f8fa]"}`}><span className="block text-xs font-semibold">{item.title}</span><span className="mt-1 block text-[10px] opacity-70">{item.description}</span></button>)}</nav>
        <div className="min-w-0">
          {section === "profile" && <Card><h2 className="text-base font-semibold text-[#35415a]">Profile</h2><p className="mt-1 text-xs text-[#8993a3]">Your account identity and profile photo.</p>
            <form onSubmit={uploadAvatar} className="my-6 flex flex-wrap items-center gap-4"><div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-[#e8ebf8] text-lg font-semibold text-[#596cb9]">{profile?.avatarUrl && avatarUrl ? <Image src={avatarUrl} alt="Account avatar" width={64} height={64} unoptimized className="h-full w-full object-cover" /> : profile?.name.slice(0, 1).toUpperCase()}</div><div className="min-w-0 flex-1"><label className="block text-xs font-semibold text-[#566278]" htmlFor="avatar">Profile avatar</label><input id="avatar" name="file" type="file" accept="image/png,image/jpeg,image/gif,image/webp" required className="mt-2 block w-full text-xs text-[#69758a] file:mr-3 file:rounded-md file:border-0 file:bg-[#eff1fa] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#566bbd]" /><p className="mt-1 text-[10px] text-[#98a1af]">PNG, JPEG, GIF, or WebP · maximum 4 MB · private file storage required</p></div><button className={button} disabled={avatarBusy}>{avatarBusy ? "Uploading..." : "Upload avatar"}</button>{profile?.avatarUrl && <button type="button" className={button} disabled={avatarBusy} onClick={() => void removeAvatar()}>Remove</button>}</form>
            <form onSubmit={saveProfile} className="space-y-4"><Field label="Full name"><input className={input} name="name" required maxLength={100} defaultValue={profile?.name} /></Field><div className="grid gap-4 sm:grid-cols-2"><ReadOnly label="Email" value={profile?.email} /><ReadOnly label="Email features" value="Disabled" /><ReadOnly label="Username" value={`@${profile?.username ?? ""}`} /><ReadOnly label="Account created" value={dateLabel(profile?.createdAt, preferences)} /><ReadOnly label="Last sign in" value={dateLabel(profile?.lastLoginAt, preferences, true)} /></div><p className="text-xs leading-5 text-[#69758a]">Email verification and password recovery are disabled in this deployment.</p><div className="flex justify-end"><button className={primary} disabled={saving}>{saving ? "Saving..." : "Save profile"}</button></div></form>
          </Card>}
          {section === "preferences" && <Card><h2 className="text-base font-semibold text-[#35415a]">Application preferences</h2><p className="mt-1 text-xs text-[#8993a3]">Your preferred currency affects defaults and display only; it never converts existing records.</p>
            <form onSubmit={savePreferences} className="mt-5 space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Language"><select className={input} value={preferenceDraft.language} onChange={(event) => setDraft({ ...preferenceDraft, language: event.target.value as UserPreferences["language"] })}><option value="en">English</option><option value="ar">Arabic</option></select></Field><Field label="Theme"><select className={input} value={preferenceDraft.theme} onChange={(event) => setDraft({ ...preferenceDraft, theme: event.target.value as UserPreferences["theme"] })}><option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option></select></Field><Field label="Preferred currency"><select className={input} value={preferenceDraft.currency} onChange={(event) => setDraft({ ...preferenceDraft, currency: event.target.value as UserPreferences["currency"] })}><option>EGP</option><option>USD</option><option>EUR</option></select></Field><Field label="Date format"><select className={input} value={preferenceDraft.dateFormat} onChange={(event) => setDraft({ ...preferenceDraft, dateFormat: event.target.value as UserPreferences["dateFormat"] })}><option>YYYY-MM-DD</option><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option></select></Field><Field label="Time format"><select className={input} value={preferenceDraft.timeFormat} onChange={(event) => setDraft({ ...preferenceDraft, timeFormat: event.target.value as UserPreferences["timeFormat"] })}><option value="12h">12-hour</option><option value="24h">24-hour</option></select></Field><Field label="Time zone"><select className={input} value={preferenceDraft.timezone} onChange={(event) => setDraft({ ...preferenceDraft, timezone: event.target.value })}>{[...new Set([...zones, preferenceDraft.timezone])].sort().map((zone) => <option key={zone}>{zone}</option>)}</select></Field></div><p className="text-[11px] text-[#8993a3]">Theme and Arabic right-to-left layout are applied across the application. Regional preferences are available to account-aware date and currency displays.</p><div className="flex justify-end"><button className={primary} disabled={saving}>{saving ? "Saving..." : "Save preferences"}</button></div></form>
          </Card>}
          {section === "security" && <div className="space-y-5"><Card><h2 className="text-base font-semibold text-[#35415a]">Change password</h2><p className="mt-1 text-xs text-[#8993a3]">Use at least 12 characters with uppercase, lowercase, and a number.</p><form className="mt-5 space-y-4" onSubmit={savePassword}><Field label="Current password"><input className={input} name="currentPassword" type="password" autoComplete="current-password" required /></Field><Field label="New password"><input className={input} name="newPassword" type="password" autoComplete="new-password" minLength={12} required /></Field><div className="flex justify-end"><button className={primary} disabled={saving}>{saving ? "Updating..." : "Update password"}</button></div></form></Card><Card><h2 className="text-base font-semibold text-[#35415a]">Active sessions</h2><p className="mt-1 text-xs text-[#8993a3]">Sessions are not individually listed. Revoke other sessions to sign out all other devices while keeping this one active.</p><button className={`${button} mt-4`} disabled={saving} onClick={() => void revokeSessions()}>Revoke other sessions</button></Card></div>}
          {section === "onboarding" && <Card><h2 className="text-base font-semibold text-[#35415a]">Workspace setup</h2><p className="mt-1 text-xs text-[#8993a3]">{onboarding?.completedAt ? `Completed ${dateLabel(onboarding.completedAt, preferences, true)}` : `In progress · ${onboarding?.currentStep ?? "welcome"} step`}</p><dl className="mt-5 grid gap-3 text-xs sm:grid-cols-2"><ReadOnly label="Business name" value={onboarding?.businessName || "Not set"} /><ReadOnly label="Industry" value={onboarding?.industry || "Not set"} /><ReadOnly label="Country" value={onboarding?.country || "Not set"} /></dl><button className={`${primary} mt-5`} disabled={saving} onClick={() => void restartOnboarding()}>{onboarding?.completedAt ? "Review setup" : "Resume setup"}</button></Card>}
          {section === "account" && <div className="space-y-5"><Card><h2 className="text-base font-semibold text-[#35415a]">Account information</h2><p className="mt-1 text-xs text-[#8993a3]">Your personal workspace account and its data belong to this account.</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><ReadOnly label="Account ID" value={profile?.id} /><ReadOnly label="Created" value={dateLabel(profile?.createdAt, preferences)} /><ReadOnly label="Username" value={profile?.username} /><ReadOnly label="Email" value={profile?.email} /></div></Card><Card><div className="rounded-xl border border-red-200 bg-red-50 p-4 sm:p-5"><p className="text-[10px] font-bold uppercase tracking-[.13em] text-red-700">Danger zone</p><h2 className="mt-2 text-base font-semibold text-red-950">Permanently delete account</h2><p className="mt-2 text-xs leading-5 text-red-900">This permanently deletes your account, customers and CRM history, deals and pipelines, invoices and quotes, expenses and recurring templates, tasks and their activity, appointments and reminders, account settings, and all private uploaded files including receipts and attachments. This cannot be undone.</p><button type="button" className="mt-4 rounded-lg bg-red-700 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-red-800 disabled:opacity-50" disabled={deletingAccount} onClick={() => { setDeletionPassword(""); setDeletionConfirmation(""); setError(""); setDeletionDialogOpen(true); }}>Delete account permanently</button></div></Card></div>}
        </div>
      </div>
      <p className="mt-6 text-center text-[10px] text-[#a1a9b5]">Settings are stored securely with your account and are not shared with other users.</p>
    </div>
    {deletionDialogOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="delete-account-title" className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-5 shadow-2xl sm:p-7"><h2 id="delete-account-title" className="text-lg font-semibold text-red-950">Confirm permanent deletion</h2><p className="mt-2 text-xs leading-5 text-[#69758a]">The deletion request immediately signs you out. Data and private files are removed by a background process and retried automatically if storage is temporarily unavailable.</p><form className="mt-5 space-y-4" onSubmit={(event) => void deleteAccount(event)}><Field label="Current password"><input className={input} type="password" autoComplete="current-password" required value={deletionPassword} onChange={(event) => setDeletionPassword(event.target.value)} /></Field><Field label={<>Type <span className="font-bold text-red-700">DELETE</span> to confirm</>}><input className={input} autoComplete="off" required value={deletionConfirmation} onChange={(event) => setDeletionConfirmation(event.target.value)} /></Field><div className="flex flex-col-reverse justify-end gap-2 sm:flex-row"><button type="button" className={button} disabled={deletingAccount} onClick={() => setDeletionDialogOpen(false)}>Cancel</button><button type="submit" className="rounded-lg bg-red-700 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-red-800 disabled:opacity-50" disabled={deletingAccount || deletionConfirmation !== "DELETE" || !deletionPassword}>{deletingAccount ? "Submitting deletion request..." : "Permanently delete my account"}</button></div></form></section></div>}
  </main>;
}

function ReadOnly({ label, value }: { label: string; value: string | undefined }) {
  return <div><p className="text-[10px] font-semibold uppercase tracking-wide text-[#9ba4b1]">{label}</p><p className="mt-1 text-xs text-[#566278]">{value || "—"}</p></div>;
}
