
"use client";

import Link from "next/link";
import {
  motion,
  useScroll,
  useReducedMotion,
  useSpring,
  useTransform,
  type TargetAndTransition,
  type Variants,
} from "framer-motion";
import ThreeBackground from "@/app/components/ThreeBackground";

const features = [
  {
    number: "01",
    title: "Know your customers",
    description:
      "Create customer and prospect records, keep key details, and review related work.",
    icon: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 5.8M17 14a5 5 0 0 1 3.5 4.8" />
      </>
    ),
  },
  {
    number: "02",
    title: "Keep deals moving",
    description:
      "Track deals through pipeline stages, associate them with customers, and review stage history.",
    icon: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="3" />
        <path d="M8 9h8M8 13h5M8 17h3" />
      </>
    ),
  },
  {
    number: "03",
    title: "Organize daily work",
    description:
      "Create invoices and quotes, record expenses, and manage tasks and appointments.",
    icon: (
      <>
        <path d="M3 17 9 11l4 4 8-9" />
        <path d="M15 6h6v6" />
      </>
    ),
  },
];

const ease = [0.22, 1, 0.36, 1] as const;

const stats = [
  { label: "TOTAL CONTACTS", value: "2,841", delta: "↗ 12.8%" },
  { label: "OPEN OPPORTUNITIES", value: "48", delta: "↗ 8.2%" },
  { label: "PIPELINE VALUE", value: "$84.2k", delta: "↗ 18.4%" },
  { label: "TASKS COMPLETED", value: "126", delta: "↗ 6.1%" },
];

function Brand() {
  return (
    <Link
      href="/"
      aria-label="BusinessOS home"
      className="inline-flex items-center gap-2.5"
    >
      <span       className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 via-blue-500 to-violet-600 text-sm font-bold text-white shadow-lg shadow-cyan-500/30">
        B
      </span>
      <span className="text-[17px] font-semibold tracking-[-0.04em] text-white">
        Business<span className="text-sky-400">OS</span>
      </span>
    </Link>
  );
}

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className="h-4 w-4"
    >
      <path
        d="M4.5 10h11M11 5.5 15.5 10 11 14.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DashboardPreview({
  reduceMotion,
  float,
}: {
  reduceMotion: boolean | null;
  float: (distance: number, duration: number) => TargetAndTransition | undefined;
}) {
  const { scrollYProgress } = useScroll();
  const tiltX = useSpring(
    useTransform(scrollYProgress, [0, 0.4], [5, -4]),
    { stiffness: 70, damping: 24 },
  );
  const tiltY = useSpring(
    useTransform(scrollYProgress, [0, 0.4], [-3, 2]),
    { stiffness: 70, damping: 24 },
  );
  const scale = useSpring(
    useTransform(scrollYProgress, [0, 0.16], [1, 0.94]),
    { stiffness: 70, damping: 24 },
  );
  const previewY = useSpring(
    useTransform(scrollYProgress, [0, 0.16], [0, 72]),
    { stiffness: 70, damping: 24 },
  );
  const previewOpacity = useTransform(scrollYProgress, [0, 0.17], [1, 0]);

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: reduceMotion ? 0 : 40,
        scale: reduceMotion ? 1 : 0.97,
      }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      style={reduceMotion ? undefined : {
        rotateX: tiltX,
        rotateY: tiltY,
        scale,
        y: previewY,
        opacity: previewOpacity,
        transformPerspective: 1400,
      }}
      transition={{ duration: 1, ease, delay: 0.3 }}
      className="relative mx-auto w-full max-w-[650px] transform-gpu lg:ml-auto"
    >
      <div
        aria-hidden="true"
        className="absolute -inset-12 -z-10 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.3),rgba(5,11,25,0)_68%)] blur-2xl"
      />

      {/* Floating top card */}
      <motion.div
        initial={{ opacity: 0, y: reduceMotion ? 0 : -20, }}
        animate={float(6, 5)}
        className="absolute -right-3 -top-5 z-20 hidden items-center gap-3 rounded-xl border border-white/10 bg-[#0a1226]/80 px-4 py-3 shadow-[0_12px_35px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:flex"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
          <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
            <path
              d="M4 13.5 8 9.5l2.5 2.5L16 6.5M12 6.5h4v4"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span>
          <span className="block text-[10px] font-medium text-slate-500">
            Example pipeline
          </span>
          <span className="text-sm font-semibold text-slate-100">
            Demo status <span className="text-emerald-300">↗</span>
          </span>
        </span>
      </motion.div>

      {/* Dashboard window */}
      <div className="relative overflow-hidden rounded-[20px] border border-cyan-200/[0.16] bg-[#09152c]/75 shadow-[0_28px_90px_rgba(0,0,0,0.55),0_0_55px_rgba(37,99,235,0.12)] ring-1 ring-sky-300/[0.16] backdrop-blur-2xl">
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/80 to-violet-300/30" />

        {/* Dashboard top bar */}
        <div className="flex h-12 items-center justify-between border-b border-white/[0.07] px-4 sm:px-5">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-blue-400 to-blue-700 text-[10px] font-bold text-white">
              B
            </span>
            <span className="text-[11px] font-semibold text-slate-200">
              BusinessOS
            </span>
            <span className="whitespace-nowrap rounded border border-white/10 px-1.5 py-0.5 text-[7px] font-medium text-slate-400">
              Demo preview
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="hidden rounded-md border border-white/10 px-2.5 py-1 text-[9px] text-slate-500 sm:inline">
              Search anything...
            </span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-400/20 text-[8px] font-bold text-orange-200">
              AM
            </span>
          </div>
        </div>

        <div className="grid min-h-[365px] grid-cols-[116px_1fr] sm:grid-cols-[150px_1fr]">
          {/* Sidebar */}
          <aside className="border-r border-white/[0.07] bg-black/20 px-2.5 py-4 sm:px-3.5">
            <p className="mb-3 px-2 text-[8px] font-semibold tracking-[0.12em] text-slate-500">
              WORKSPACE
            </p>

            <div className="space-y-1">
              <div className="flex items-center gap-2 rounded-lg bg-cyan-300/[0.13] px-2 py-2 text-[9px] font-semibold text-cyan-200">
                <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                  <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
                  <rect x="9" y="2" width="5" height="3" rx="1" stroke="currentColor" strokeWidth="1.4" />
                  <rect x="9" y="7" width="5" height="7" rx="1" stroke="currentColor" strokeWidth="1.4" />
                  <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
                </svg>
                Overview
              </div>

              <div className="flex items-center gap-2 px-2 py-2 text-[9px] font-medium text-slate-500">
                <span className="text-[12px]">◎</span> Contacts
              </div>
              <div className="flex items-center gap-2 px-2 py-2 text-[9px] font-medium text-slate-500">
                <span className="text-[12px]">◇</span> Opportunities
              </div>
              <div className="flex items-center gap-2 px-2 py-2 text-[9px] font-medium text-slate-500">
                <span className="text-[12px]">▤</span> Activities
              </div>
            </div>

            <div className="mt-7 border-t border-white/[0.07] pt-4">
              <p className="mb-2 px-2 text-[8px] font-semibold tracking-[0.12em] text-slate-500">
                YOUR WORKSPACE
              </p>
              <div className="flex items-center gap-2 px-2 py-2 text-[9px] font-medium text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Personal workspace
              </div>
            </div>
          </aside>

          {/* Dashboard content */}
          <div className="min-w-0 p-3.5 sm:p-5">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-[8px] font-medium text-slate-500">
                  MONDAY, OCTOBER 21, 2024
                </p>
                <h2 className="mt-1 text-[15px] font-semibold tracking-[-0.04em] text-white sm:text-[18px]">
                  Good morning, Alex <span className="text-base text-sky-300">✦</span>
                </h2>
                <p className="mt-1 text-[9px] text-slate-500">
                  Here&apos;s what&apos;s happening with your business.
                </p>
              </div>
              <span className="rounded-md border border-white/10 px-2 py-1 text-[8px] font-medium text-slate-400">
                This month⌄
              </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + i * 0.08, duration: 0.5, ease }}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3"
                >
                  <p className="text-[8px] font-medium text-slate-500">
                    {stat.label}
                  </p>
                  <div className="mt-2 flex items-end justify-between gap-1">
                    <p className="text-[20px] font-semibold tracking-[-0.06em] text-white sm:text-[24px]">
                      {stat.value}
                    </p>
                    <span className="mb-1 rounded bg-emerald-400/10 px-1.5 py-0.5 text-[8px] font-semibold text-emerald-300">
                      {stat.delta}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Revenue chart */}
            <div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 sm:p-4">
              <div className="mb-1 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-semibold text-slate-200">
                    Revenue overview
                  </p>
                  <p className="mt-0.5 text-[8px] text-slate-500">
                    A steady rhythm of growth
                  </p>
                </div>
                <span className="rounded bg-emerald-400/10 px-1.5 py-1 text-[8px] font-semibold text-emerald-300">
                  +18.4%
                </span>
              </div>

              <svg
                role="img"
                aria-label="Revenue trend chart showing steady growth"
                viewBox="0 0 440 92"
                fill="none"
                className="mt-2 h-[78px] w-full"
              >
                <path
                  d="M0 72H440M0 48H440M0 24H440"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="1"
                />
                <motion.path
                  d="M4 69C27 65 34 68 56 56S88 61 108 49 139 54 160 42 190 51 215 36 246 43 269 29 300 38 322 23 352 32 375 17 405 25 436 8V90H4V69Z"
                  fill="url(#chart-fill)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.6, duration: 0.8 }}
                />
                <motion.path
                  d="M4 69C27 65 34 68 56 56S88 61 108 49 139 54 160 42 190 51 215 36 246 43 269 29 300 38 322 23 352 32 375 17 405 25 436 8"
                  stroke="#67e8f9"
                  strokeWidth="2"
                  strokeLinecap="round"
                  initial={{ pathLength: reduceMotion ? 1 : 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.9, duration: 1.6, ease: "easeInOut" }}
                />
                <defs>
                  <linearGradient
                    id="chart-fill"
                    x1="220"
                    y1="8"
                    x2="220"
                    y2="90"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#22d3ee" stopOpacity=".38" />
                    <stop offset=".58" stopColor="#8b5cf6" stopOpacity=".1" />
                    <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>

              <div className="mt-1 flex justify-between text-[7px] text-slate-500">
                <span>May</span>
                <span>Jun</span>
                <span>Jul</span>
                <span>Aug</span>
                <span>Sep</span>
                <span>Oct</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating bottom card */}
      <motion.div
        animate={float(7, 6)}
        className="absolute -bottom-5 -left-3 z-20 hidden items-center gap-2.5 rounded-xl border border-white/10 bg-[#0a1226]/80 px-3.5 py-3 shadow-[0_12px_35px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:flex"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-400/15 text-sm text-violet-300">
          ✦
        </span>
        <span className="text-[10px] font-medium text-slate-300">
          Example opportunity
          <br />
          <span className="text-slate-500">Demo preview content.</span>
        </span>
      </motion.div>
    </motion.div>
  );
}

export default function HomePage() {
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.13], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.13], [0, 62]);
  const heroScale = useTransform(scrollYProgress, [0, 0.13], [1, 0.96]);

  const heroGroup: Variants = {
    hidden: {},
    show: {
      transition: { staggerChildren: 0.09, delayChildren: 0.15 },
    },
  };

  const rise: Variants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 18 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, ease },
    },
  };

  const featureGroup: Variants = {
    hidden: {},
    show: {
      transition: { staggerChildren: 0.12 },
    },
  };

  const featureCard: Variants = {
    hidden: {
      opacity: 0,
      y: reduceMotion ? 0 : 34,
      rotateX: reduceMotion ? 0 : 10,
      scale: reduceMotion ? 1 : 0.94,
    },
    show: {
      opacity: 1,
      y: 0,
      rotateX: 0,
      scale: 1,
      transition: { duration: 0.7, ease },
    },
  };

  const float = (distance: number, duration: number) =>
    reduceMotion
      ? undefined
      : {
          y: [0, -distance, 0],
          transition: {
            duration,
            repeat: Infinity,
            ease: "easeInOut" as const,
          },
        };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050916] text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_18%_8%,rgba(37,99,235,0.17),transparent_34%),radial-gradient(ellipse_at_83%_34%,rgba(124,58,237,0.11),transparent_32%),radial-gradient(ellipse_at_52%_88%,rgba(8,145,178,0.1),transparent_38%)]"
      />
      <motion.div
        aria-hidden="true"
        className="fixed inset-x-0 top-0 z-50 h-px origin-left bg-gradient-to-r from-violet-400 via-cyan-200 to-emerald-200 shadow-[0_0_16px_rgba(34,211,238,0.9)]"
        style={{ scaleX: scrollYProgress }}
      />

      {/* Three.js animated background — replaces landing-bg.png */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
      >
        <ThreeBackground />
      </div>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: reduceMotion ? 0 : -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease }}
        className="relative z-10 mx-auto flex max-w-[1240px] items-center justify-between px-5 py-5 sm:px-8 lg:px-10"
      >
        <Brand />

        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-9 md:flex"
        >
          <a
            href="#features"
            className="text-[13px] font-medium text-slate-400 transition hover:text-white"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="text-[13px] font-medium text-slate-400 transition hover:text-white"
          >
            Why BusinessOS
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/authPages/sign-in"
            className="hidden rounded-lg px-3 py-2 text-[13px] font-semibold text-slate-300 transition hover:text-white sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/authPages/sign-up"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-500 px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-blue-600/35 transition hover:shadow-cyan-400/45 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/30"
          >
            Get started <ArrowIcon />
          </Link>
        </div>
      </motion.header>

      {/* Hero */}
      <motion.section
        style={reduceMotion ? undefined : {
          opacity: heroOpacity,
          y: heroY,
          scale: heroScale,
        }}
        className="relative z-10 mx-auto grid max-w-[1240px] items-center gap-14 px-5 pb-20 pt-10 sm:px-8 sm:pt-14 md:pb-28 lg:grid-cols-[0.98fr_1.02fr] lg:gap-8 lg:px-10 lg:pt-16"
      >
        <motion.div
          variants={heroGroup}
          initial="hidden"
          animate="show"
          className="relative z-10 max-w-[530px]"
        >
          <motion.div
            variants={rise}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-gradient-to-r from-cyan-400/[0.12] to-violet-400/[0.1] px-3 py-1.5 text-[11px] font-semibold tracking-[0.07em] text-cyan-200 backdrop-blur"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            A CLEARER WAY TO RUN YOUR BUSINESS
          </motion.div>

          <motion.h1
            variants={rise}
            className="max-w-[590px] text-[clamp(2.75rem,4.8vw,4.5rem)] font-semibold leading-[1.04] tracking-[-0.065em] text-white"
          >
            Good things happen when{" "}
            <span className="bg-gradient-to-r from-cyan-200 via-sky-300 to-violet-300 bg-clip-text font-serif font-medium italic text-transparent">
              everything
            </span>{" "}
            works together.
          </motion.h1>

          <motion.p
            variants={rise}
            className="mt-6 max-w-[440px] text-[16px] leading-7 text-slate-400 sm:text-[17px]"
          >
            A single-user workspace to manage customer records, sales
            opportunities, invoices, expenses, tasks, and appointments.
          </motion.p>

          <motion.div
            variants={rise}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <motion.div
              whileHover={reduceMotion ? undefined : { y: -2 }}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            >
              <Link
                href="/authPages/sign-up"
                className="group relative inline-flex h-12 items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-500 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-600/35 transition-shadow hover:shadow-cyan-400/45 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/30"
              >
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                <span className="relative">Start your workspace</span>
                <span className="relative transition-transform group-hover:translate-x-1">
                  <ArrowIcon />
                </span>
              </Link>
            </motion.div>

            <a
              href="#features"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-white/15 bg-white/[0.05] px-5 text-sm font-semibold text-slate-200 backdrop-blur transition hover:border-sky-300/40 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400/20"
            >
              Explore the platform
            </a>
          </motion.div>

          <motion.p variants={rise} className="mt-9 text-xs leading-5 text-slate-400">
            One private workspace for each account.
          </motion.p>
        </motion.div>

        {/* Product preview */}
        <DashboardPreview reduceMotion={reduceMotion} float={float} />
      </motion.section>

      {/* Features */}
      <section
        id="features"
        className="relative z-10 border-y border-cyan-100/[0.1] bg-[#070d1d]/65 backdrop-blur-xl"
      >
        <div className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: reduceMotion ? 0 : 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.35, margin: "-40px 0px" }}
            transition={{ duration: 0.7, ease }}
            className="mx-auto max-w-[610px] text-center"
          >
            <p className="text-[11px] font-semibold tracking-[0.16em] text-sky-300">
              CUSTOMER AND BUSINESS WORKFLOWS
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.055em] text-white sm:text-[40px]">
              Core work, in one personal workspace.
            </h2>
            <p className="mt-4 text-sm leading-6 text-slate-400 sm:text-[15px]">
              Keep customer records and everyday sales, finance, task, and
              appointment workflows together.
            </p>
          </motion.div>

          <motion.div
            variants={featureGroup}
            initial="hidden"
            whileInView="show"
            viewport={{ once: false, amount: 0.25, margin: "-40px 0px" }}
            className="mt-12 grid gap-4 md:grid-cols-3"
          >
            {features.map((feature) => (
              <motion.article
                key={feature.number}
                variants={featureCard}
                whileHover={reduceMotion ? undefined : {
                  y: -8,
                  rotateX: 3,
                  rotateY: -2,
                  scale: 1.015,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                style={{ transformPerspective: 900, transformStyle: "preserve-3d" }}
                className="group relative overflow-hidden rounded-2xl border border-indigo-200/[0.14] bg-gradient-to-br from-blue-400/[0.08] via-white/[0.035] to-violet-400/[0.07] p-6 backdrop-blur transition-colors hover:border-cyan-200/35 hover:from-cyan-400/[0.12] hover:to-violet-400/[0.12]"
              >
                <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/50 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300/[0.18] to-violet-400/[0.14] text-cyan-200 ring-1 ring-cyan-200/25">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5"
                    >
                      {feature.icon}
                    </svg>
                  </span>
                  <span className="text-xs font-medium tracking-[0.12em] text-slate-600">
                    {feature.number}
                  </span>
                </div>

                <h3 className="mt-6 text-[17px] font-semibold tracking-[-0.03em] text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-[13px] leading-6 text-slate-400">
                  {feature.description}
                </p>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Connected workflow */}
      <section className="relative z-10 overflow-hidden border-b border-white/[0.07] bg-gradient-to-b from-[#071124]/80 via-[#071124]/60 to-[#050b19]/80">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.12),transparent_68%)]"
        />
        <div className="relative mx-auto grid max-w-[1240px] items-center gap-10 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16 lg:px-10">
          <motion.div
            initial={{ opacity: 0, x: reduceMotion ? 0 : -34, filter: "blur(8px)" }}
            whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            viewport={{ once: false, amount: 0.35, margin: "-40px 0px" }}
            transition={{ duration: 0.85, ease }}
          >
            <p className="text-[11px] font-semibold tracking-[0.16em] text-sky-300">
              ONE WORKSPACE. A BETTER RHYTHM.
            </p>
            <h2 className="mt-4 max-w-[500px] text-4xl font-semibold leading-[1.08] tracking-[-0.06em] text-white sm:text-5xl">
              From first hello to{" "}
              <span className="bg-gradient-to-r from-sky-300 via-blue-300 to-violet-300 bg-clip-text text-transparent">
                work well done.
              </span>
            </h2>
            <p className="mt-5 max-w-[420px] text-[15px] leading-7 text-slate-400">
              The context follows the work. Connect people to opportunities,
              then keep the next action, appointment, and invoice in view.
            </p>
            <motion.a
              href="#features"
              whileHover={reduceMotion ? undefined : { x: 5 }}
              className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-sky-300 transition-colors hover:text-white"
            >
              Explore the workspace <ArrowIcon />
            </motion.a>
          </motion.div>

          <motion.div
            initial={{
              opacity: 0,
              y: reduceMotion ? 0 : 42,
              rotateX: reduceMotion ? 0 : 9,
              rotateY: reduceMotion ? 0 : -8,
              scale: reduceMotion ? 1 : 0.93,
            }}
            whileInView={{ opacity: 1, y: 0, rotateX: 0, rotateY: 0, scale: 1 }}
            viewport={{ once: false, amount: 0.3, margin: "-30px 0px" }}
            transition={{ duration: 1, ease }}
            style={{ transformPerspective: 1200, transformStyle: "preserve-3d" }}
            className="relative mx-auto aspect-[1.15] w-full max-w-[600px]"
          >
            <div
              aria-hidden="true"
              className="absolute inset-[8%] rounded-full border border-sky-300/[0.09] shadow-[0_0_80px_rgba(37,99,235,0.08)]"
            />
            <motion.div
              aria-hidden="true"
              animate={reduceMotion ? undefined : { rotate: 360 }}
              transition={{ duration: 48, repeat: Infinity, ease: "linear" }}
              className="absolute inset-[15%] rounded-full border border-dashed border-sky-300/[0.18]"
            />
            <div
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-400/10 blur-3xl"
            />

            <svg
              aria-hidden="true"
              viewBox="0 0 600 520"
              fill="none"
              className="absolute inset-0 h-full w-full"
            >
              <motion.path
                d="M170 125C205 125 205 210 300 260C395 310 395 395 430 395M430 125C395 125 395 210 300 260C205 310 205 395 170 395"
                stroke="url(#workflow-line)"
                strokeWidth="1.5"
                strokeDasharray="5 8"
                initial={{ pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 1 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 1.6, ease, delay: 0.25 }}
              />
              <defs>
                <linearGradient id="workflow-line" x1="120" y1="80" x2="480" y2="440" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#22d3ee" stopOpacity=".18" />
                  <stop offset=".5" stopColor="#67e8f9" stopOpacity=".95" />
                  <stop offset="1" stopColor="#c084fc" stopOpacity=".28" />
                </linearGradient>
              </defs>
            </svg>

            <motion.div
              animate={float(8, 5)}
              className="absolute left-1/2 top-1/2 z-10 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[28px] border border-cyan-200/35 bg-[#0b1830]/90 shadow-[0_0_80px_rgba(34,211,238,0.28),0_0_120px_rgba(139,92,246,0.16)] ring-1 ring-white/15 backdrop-blur-xl sm:h-28 sm:w-28"
            >
              <div className="absolute inset-2 rounded-[22px] border border-white/[0.07]" />
              <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-200 via-blue-500 to-violet-600 text-xl font-bold text-white shadow-[0_8px_30px_rgba(34,211,238,0.4)]">
                B
              </span>
            </motion.div>

            {[
              { title: "Customers", subtitle: "People, with context", icon: "◎", color: "text-sky-300", position: "left-[1%] top-[8%]" },
              { title: "Opportunities", subtitle: "Momentum, made visible", icon: "↗", color: "text-violet-300", position: "right-[1%] top-[8%]" },
              { title: "Daily work", subtitle: "The next thing, in focus", icon: "✓", color: "text-emerald-300", position: "left-[1%] bottom-[8%]" },
              { title: "Invoices", subtitle: "Details, all in place", icon: "$", color: "text-amber-300", position: "right-[1%] bottom-[8%]" },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{
                  opacity: 0,
                  y: reduceMotion ? 0 : (index < 2 ? -18 : 18),
                  scale: reduceMotion ? 1 : 0.88,
                  rotateY: reduceMotion ? 0 : (index % 2 === 0 ? 10 : -10),
                }}
                whileInView={{ opacity: 1, y: 0, scale: 1, rotateY: 0 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 0.75, ease, delay: 0.18 + index * 0.1 }}
                style={{ transformPerspective: 900, transformStyle: "preserve-3d" }}
                className={`absolute ${item.position} z-20 w-[47%] max-w-[220px]`}
              >
                <motion.div
                  animate={float(5 + (index % 2) * 2, 4.5 + index * 0.45)}
                  className="rounded-2xl border border-cyan-100/[0.14] bg-gradient-to-br from-[#101d38]/95 via-[#0b1429]/95 to-[#17132f]/90 p-3.5 shadow-[0_20px_60px_rgba(0,0,0,0.34),0_0_28px_rgba(59,130,246,0.08)] backdrop-blur-xl sm:p-4"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-lg ${item.color}`}>
                      {item.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-semibold text-white sm:text-[13px]">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block truncate text-[9px] text-slate-500 sm:text-[10px]">
                        {item.subtitle}
                      </span>
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-1">
                    <span className={`h-1 w-[34%] rounded-full ${index === 0 ? "bg-sky-400/70" : "bg-white/10"}`} />
                    <span className={`h-1 w-[24%] rounded-full ${index === 1 ? "bg-violet-400/70" : "bg-white/10"}`} />
                    <span className={`h-1 w-[18%] rounded-full ${index > 1 ? "bg-emerald-400/70" : "bg-white/10"}`} />
                  </div>
                </motion.div>
              </motion.div>
            ))}

            <div className="absolute bottom-[2%] left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-white/[0.08] bg-[#071124]/80 px-3 py-1.5 text-[9px] font-medium tracking-[0.1em] text-slate-500 backdrop-blur">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-300" />
              YOUR BUSINESS, IN SYNC
            </div>
          </motion.div>
        </div>
      </section>

      {/* Call to action */}
      <motion.section
        id="how-it-works"
        initial={{ opacity: 0, y: reduceMotion ? 0 : 28, scale: reduceMotion ? 1 : 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: false, amount: 0.35, margin: "-40px 0px" }}
        transition={{ duration: 0.8, ease }}
        className="relative z-10 mx-auto flex max-w-[1240px] flex-col items-start justify-between gap-7 px-5 py-14 sm:px-8 md:flex-row md:items-center md:py-16 lg:px-10"
      >
        <div>
          <p className="text-[11px] font-semibold tracking-[0.15em] text-sky-300">
            YOUR WORKSPACE
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-white sm:text-3xl">
            Keep the details connected.
          </h2>
          <p className="mt-2 max-w-[550px] text-sm leading-6 text-slate-400">
            Work with customer records, deals, invoices, expenses, tasks, and
            appointments from one account.
          </p>
        </div>

        <motion.div
          whileHover={reduceMotion ? undefined : { y: -2 }}
          whileTap={reduceMotion ? undefined : { scale: 0.98 }}
        >
          <Link
            href="/authPages/sign-up"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/35 transition-shadow hover:shadow-cyan-400/45 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/30"
          >
            Create your workspace <ArrowIcon />
          </Link>
        </motion.div>
      </motion.section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-cyan-100/[0.1] bg-[#060b19]/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1240px] flex-col items-center justify-between gap-4 px-5 py-5 sm:flex-row sm:px-8 lg:px-10">
          <Brand />
          <nav aria-label="Footer navigation" className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-400">
            <Link href="/terms" className="transition hover:text-white">Terms of Service</Link>
            <Link href="/privacy" className="transition hover:text-white">Privacy Policy</Link>
            <Link href="/authPages/sign-in" className="transition hover:text-white">Sign in</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
