"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const subscribeToHash = (callback: () => void) => {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
};
const getHashToken = () => new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";

export default function VerifyEmailPage() {
  const token = useSyncExternalStore(subscribeToHash, getHashToken, () => "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function verifyEmail() {
    if (!token) {
      setError("This verification link is invalid or expired.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API}/api/auth/email/verification/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token }),
      });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "This verification link is invalid or expired.");
      window.history.replaceState(null, "", window.location.pathname);
      setMessage(result.message ?? "Your email address has been verified.");
    } catch (verifyError: unknown) {
      setError(verifyError instanceof Error ? verifyError.message : "Unable to verify this email address.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="flex min-h-screen items-center justify-center bg-[#050b19] px-4 py-10 text-white">
    <section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0a1226] p-7 shadow-2xl sm:p-10">
      <Link href="/authPages/sign-in" className="text-sm text-sky-300 hover:underline">BusinessOS</Link>
      <h1 className="mt-8 text-3xl font-semibold">Email verification</h1>
      {message && <p role="status" className="mt-4 text-sm text-emerald-200">{message}</p>}
      {error && <p role="alert" className="mt-4 text-sm text-rose-300">{error}</p>}
      {!message && <button type="button" disabled={!token || loading} onClick={() => void verifyEmail()} className="mt-6 rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold disabled:opacity-50">{loading ? "Verifying..." : "Verify email address"}</button>}
      {!token && !error && <p role="status" className="mt-4 text-sm text-amber-200">Open the verification link from your email to continue.</p>}
      <p className="mt-6 text-sm text-slate-400"><Link href="/authPages/sign-in" className="text-sky-300 hover:underline">Continue to sign in</Link></p>
    </section>
  </main>;
}
