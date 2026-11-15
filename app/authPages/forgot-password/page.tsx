"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${API}/api/auth/password/forgot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: form.get("email") }),
      });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to request a password reset.");
      setMessage(result.message ?? "If an account exists for that email, a password reset link will be sent.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to request a password reset.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="flex min-h-screen items-center justify-center bg-[#050b19] px-4 py-10 text-white">
    <section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0a1226] p-7 shadow-2xl sm:p-10">
      <Link href="/authPages/sign-in" className="text-sm text-sky-300 hover:underline">BusinessOS</Link>
      <h1 className="mt-8 text-3xl font-semibold">Forgot password?</h1>
      <p className="mt-3 text-sm leading-6 text-slate-400">Enter your account email. If it matches an account, we will email a one-time reset link.</p>
      <form className="mt-7 space-y-4" onSubmit={(event) => void submit(event)}>
        <label className="block text-sm font-medium" htmlFor="email">Email address</label>
        <input id="email" name="email" type="email" autoComplete="email" required maxLength={254}
          className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm outline-none focus:border-sky-400/70" />
        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        {message && <p role="status" className="text-sm text-emerald-200">{message}</p>}
        <button disabled={loading} className="h-12 w-full rounded-xl bg-sky-600 text-sm font-semibold hover:bg-sky-500 disabled:opacity-50">
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-400"><Link href="/authPages/sign-in" className="text-sky-300 hover:underline">Back to sign in</Link></p>
    </section>
  </main>;
}
