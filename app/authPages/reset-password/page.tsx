"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const subscribeToHash = (callback: () => void) => {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
};
const getHashToken = () => new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";

export default function ResetPasswordPage() {
  const token = useSyncExternalStore(subscribeToHash, getHashToken, () => "");
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${API}/api/auth/password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, newPassword: form.get("newPassword") }),
      });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to reset your password.");
      window.history.replaceState(null, "", window.location.pathname);
      window.dispatchEvent(new Event("businessos:account-unauthenticated"));
      setComplete(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to reset your password.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="flex min-h-screen items-center justify-center bg-[#050b19] px-4 py-10 text-white">
    <section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0a1226] p-7 shadow-2xl sm:p-10">
      <Link href="/authPages/sign-in" className="text-sm text-sky-300 hover:underline">BusinessOS</Link>
      <h1 className="mt-8 text-3xl font-semibold">Reset password</h1>
      {complete ? <div className="mt-5 space-y-4"><p role="status" className="text-sm text-emerald-200">Your password was reset. Other sessions have been revoked.</p><Link className="inline-block rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold" href="/authPages/sign-in?passwordReset=complete">Continue to sign in</Link></div> : <>
        <p className="mt-3 text-sm leading-6 text-slate-400">Choose a strong password with at least 12 characters, uppercase and lowercase letters, and a number.</p>
        <form className="mt-7 space-y-4" onSubmit={(event) => void submit(event)}>
          <label className="block text-sm font-medium" htmlFor="newPassword">New password</label>
          <input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={12} maxLength={72} required
            className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm outline-none focus:border-sky-400/70" />
          {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
          {!token && <p role="status" className="text-sm text-amber-200">Open the reset link from your email to continue.</p>}
          <button disabled={loading || !token} className="h-12 w-full rounded-xl bg-sky-600 text-sm font-semibold hover:bg-sky-500 disabled:opacity-50">
            {loading ? "Updating..." : "Reset password"}
          </button>
        </form>
      </>}
    </section>
  </main>;
}
