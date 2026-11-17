import Link from "next/link";

export default function EmailFeatureUnavailable() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050b19] px-4 py-10 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0a1226] p-7 shadow-2xl sm:p-10">
        <Link href="/authPages/sign-in" className="text-sm text-sky-300 hover:underline">BusinessOS</Link>
        <h1 className="mt-8 text-3xl font-semibold">Email delivery is disabled</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Email verification and password recovery are unavailable in this deployment.
          Contact your workspace administrator if you need help accessing your account.
        </p>
        <p className="mt-6 text-sm text-slate-400">
          <Link href="/authPages/sign-in" className="text-sky-300 hover:underline">Back to sign in</Link>
        </p>
      </section>
    </main>
  );
}
