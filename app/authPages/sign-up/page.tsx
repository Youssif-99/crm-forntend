"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion, type Variants } from "framer-motion";
import ThreeBackground from "@/app/components/ThreeBackground";

export default function SignUpPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const reduceMotion = useReducedMotion();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const form = new FormData(e.currentTarget);
      const response = await fetch(
        `/api/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: form.get("name"),
            username: form.get("username"),
            email: form.get("email"),
            password: form.get("password"),
          }),
        },
      );
      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? "We couldn't create your account. Please try again.");
        return;
      }

      let loginResponse: Response;
      try {
        loginResponse = await fetch(
          `/api/auth/login`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              email: form.get("email"),
              password: form.get("password"),
            }),
          },
        );
      } catch {
        setError("Your registration was received, but we couldn't sign you in automatically. Please sign in to continue.");
        setSubmitted(true);
        return;
      }

      if (loginResponse.ok) {
        const loginResult = await loginResponse.json() as { onboardingRequired?: boolean };
        window.dispatchEvent(new Event("businessos:account-authenticated"));
        router.replace(loginResult.onboardingRequired ? "/onboarding" : "/dashboard");
        return;
      }

      if (loginResponse.status === 401) {
        setError("We couldn't sign you in. An account with this email may already exist; try signing in or resetting your password.");
      } else {
        setError("Your registration was received, but automatic sign-in failed. Please sign in to continue.");
      }
      setSubmitted(true);
    } catch {
      setError("We couldn't connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // One orchestrated entrance: card rises, then its contents stagger in.
  const card: Variants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 36, scale: reduceMotion ? 1 : 0.97 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.9,
        ease: [0.22, 1, 0.36, 1],
        when: "beforeChildren",
        staggerChildren: 0.07,
      },
    },
  };
  const item: Variants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
  };

  const inputClass =
    "h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none transition duration-300 placeholder:text-slate-500 hover:border-white/20 focus:border-sky-400/70 focus:bg-black/40 focus:ring-4 focus:ring-sky-400/10";
  const labelClass = "mb-2 block text-xs font-semibold text-slate-300";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050b19] px-4 py-10 text-white">
      <Image
        src="/icons/auth-bg.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center opacity-40"
      />

      {/* Dark overlays */}
      <div className="absolute inset-0 bg-[#030817]/70" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/40 via-transparent to-black/60" />

      {/* Three.js backdrop */}
      <ThreeBackground />

      {/* Slow ambient glows */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute left-[12%] top-[18%] z-[2] h-72 w-72 rounded-full bg-blue-600/25 blur-[110px]"
        animate={reduceMotion ? undefined : { x: [0, 40, 0], y: [0, 30, 0], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[12%] right-[10%] z-[2] h-80 w-80 rounded-full bg-cyan-400/15 blur-[120px]"
        animate={reduceMotion ? undefined : { x: [0, -50, 0], y: [0, -30, 0], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Content */}
      <div className="relative z-10 my-auto w-full max-w-[440px]">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: reduceMotion ? 0 : -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link href="/" className="relative z-10 mb-7 flex items-center justify-center gap-3">
            <motion.div
              whileHover={reduceMotion ? undefined : { rotate: -6, scale: 1.06 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-blue-700 text-xl font-extrabold shadow-lg shadow-blue-600/40"
            >
              B
            </motion.div>

            <span className="text-2xl font-bold tracking-tight">
              Business<span className="text-sky-400">OS</span>
            </span>
          </Link>
        </motion.div>

        {/* Card */}
        <motion.div
          variants={card}
          initial="hidden"
          animate="show"
          className="relative isolate overflow-hidden rounded-[32px] border border-white/10 bg-[#0a1226]/60 p-7 shadow-[0_40px_100px_rgba(0,0,0,0.6)] backdrop-blur-2xl backdrop-saturate-150 ring-1 ring-sky-300/10 sm:p-9"
        >
          {/* Top edge light + moving sheen */}
          <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/60 to-transparent" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-transparent" />
          {!reduceMotion && (
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-y-10 -left-1/2 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent"
              animate={{ x: ["0%", "480%"] }}
              transition={{ duration: 7, repeat: Infinity, repeatDelay: 5, ease: "easeInOut" }}
            />
          )}

          <div className="relative z-10">
            {/* Heading */}
            <motion.div variants={item} className="mb-7">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1.5 text-[10px] font-semibold tracking-widest text-sky-300">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sky-400" />
                </span>
                GET STARTED WITH BUSINESS OS
              </div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Build something{" "}
                <span className="bg-gradient-to-r from-sky-300 to-blue-500 bg-clip-text text-transparent">
                  great.
                </span>
              </h1>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                Create a single-user workspace for your customer records and everyday business workflows.
              </p>
            </motion.div>

            {/* Form */}
            {submitted ? (
              <div role="status" className="space-y-4 rounded-xl border border-sky-400/20 bg-sky-500/10 p-4 text-sm leading-6 text-sky-100">
                <p>{error || "We couldn't sign you in automatically. Try signing in or resetting your password."}</p>
                <Link
                  href="/authPages/sign-in"
                  className="inline-flex font-semibold text-sky-300 transition hover:text-sky-200"
                >
                  Continue to sign in
                </Link>
              </div>
            ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full name */}
              <motion.div variants={item}>
                <label htmlFor="name" className={labelClass}>
                  Full name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="John Smith"
                  autoComplete="name"
                  required
                  className={inputClass}
                />
              </motion.div>

              {/* Username */}
              <motion.div variants={item}>
                <label htmlFor="username" className={labelClass}>
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="johnsmith"
                  autoComplete="username"
                  required
                  className={inputClass}
                />
              </motion.div>

              {/* Email */}
              <motion.div variants={item}>
                <label htmlFor="email" className={labelClass}>
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                  className={inputClass}
                />
              </motion.div>

              {/* Password */}
              <motion.div variants={item}>
                <label htmlFor="password" className={labelClass}>
                  Password
                </label>

                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    autoComplete="new-password"
                    minLength={12}
                    required
                    className={`${inputClass} pr-16`}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded text-xs font-medium text-sky-400 transition hover:text-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                <p className="mt-2 text-[10px] text-slate-500">Use at least 12 characters with uppercase, lowercase, and a number.</p>
              </motion.div>

              <p className="text-xs leading-5 text-amber-200">
                The linked legal documents are drafts pending owner and legal approval.
              </p>

              {/* Draft legal acknowledgement */}
              <motion.label
                variants={item}
                className="flex cursor-pointer items-start gap-3 py-1 text-xs leading-5 text-slate-400"
              >
                <input
                  type="checkbox"
                  required
                  className="mt-1 h-4 w-4 shrink-0 accent-sky-500"
                />

                <span>
                  I acknowledge that the{" "}
                  <Link href="/terms" className="text-sky-400 hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-sky-400 hover:underline">
                    Privacy Policy
                  </Link>
                  are drafts pending approval.
                </span>
              </motion.label>

              <AnimatePresence initial={false}>
                {error && (
                  <motion.p
                    key="error"
                    role="alert"
                    initial={{ opacity: 0, height: 0, x: 0 }}
                    animate={{
                      opacity: 1,
                      height: "auto",
                      x: reduceMotion ? 0 : [0, -6, 6, -4, 4, 0],
                    }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.4 }}
                    className="overflow-hidden rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Submit */}
              <motion.div variants={item}>
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={reduceMotion || loading ? undefined : { y: -2 }}
                  whileTap={reduceMotion || loading ? undefined : { scale: 0.98 }}
                  className="group relative flex h-12 w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition-shadow hover:shadow-sky-500/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  {loading && (
                    <motion.span
                      aria-hidden="true"
                      className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    />
                  )}
                  <span className="relative">{loading ? "Please wait..." : "Create Account"}</span>
                  {!loading && (
                    <span className="relative transition-transform group-hover:translate-x-1">→</span>
                  )}
                </motion.button>
              </motion.div>
            </form>
            )}

            {/* Footer */}
            <motion.div variants={item} className="mt-7 border-t border-white/[0.08] pt-6 text-center">
              <p className="text-sm text-slate-400">
                Already have an account?{" "}
                <Link
                  href="/authPages/sign-in"
                  className="font-semibold text-sky-400 transition hover:text-sky-300"
                >
                  Sign in
                </Link>
              </p>
            </motion.div>
          </div>
        </motion.div>

        {/* Bottom caption */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="mt-6 text-center text-[11px] text-slate-500"
        >
          © 2026 Business OS. All rights reserved.
        </motion.p>
      </div>
    </main>
  );
}