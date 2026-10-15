"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Copy,
  Download,
  Gavel,
  Gauge,
  LogOut,
  Menu,
  Plus,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  Stamp,
  Terminal,
  X,
} from "lucide-react";
import { QuorumLogo } from "@/components/quorum/logo";
import type { AuthUser } from "@/lib/auth-types";
import { cn } from "@/lib/utils";

/**
 * Quorum — Mission Control.
 * The signed-in workspace: a living picture of every run, every finding
 * and every gate waiting on a named human. The agent prepares the file;
 * the committee awards the tender — so the gavel sits in the UI, not in
 * the pipeline.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

/* ── Data model ──────────────────────────────────────────────────────────── */

type RunStatus = "running" | "queued" | "gate" | "complete";

type McRun = {
  id: string;
  title: string;
  buyer: string;
  bids: number | null;
  findings: number;
  citations: number;
  unsourced: number;
  status: RunStatus;
  startedAt: string;
  duration: string;
};

type GateItem = {
  id: string;
  tender: string;
  title: string;
  supplier: string;
  value: string;
  flags: number;
  ago: string;
};

type LedgerRow = { tender: string; action: "AWARDED" | "RETURNED"; by: string; at: string };

const SEED_RUNS: McRun[] = [
  { id: "KE-NCB-104293", title: "Supply & delivery of MRI scanners", buyer: "Ministry of Health · Kenya", bids: 4, findings: 6, citations: 6, unsourced: 0, status: "gate", startedAt: "08:12", duration: "20 MIN" },
  { id: "KE-NCB-104318", title: "County fleet telemetry system", buyer: "Transport Authority · Kenya", bids: 7, findings: 0, citations: 0, unsourced: 0, status: "running", startedAt: "JUST NOW", duration: "LIVE" },
  { id: "ZM-PPA-8841", title: "School furniture framework — Lusaka", buyer: "Provincial Education · Zambia", bids: 11, findings: 4, citations: 4, unsourced: 0, status: "gate", startedAt: "YESTERDAY", duration: "23 MIN" },
  { id: "RW-RPPA-0552", title: "Regional road maintenance — lot 2", buyer: "Roads Fund · Rwanda", bids: 9, findings: 5, citations: 5, unsourced: 0, status: "complete", startedAt: "YESTERDAY", duration: "24 MIN" },
  { id: "KE-NCB-104277", title: "Border post solar kits", buyer: "Energy Ministry · Kenya", bids: 6, findings: 6, citations: 6, unsourced: 0, status: "complete", startedAt: "MON", duration: "18 MIN" },
  { id: "ZM-PPA-8830", title: "Clinic laboratory reagents", buyer: "Health Procurement · Zambia", bids: 8, findings: 3, citations: 3, unsourced: 0, status: "complete", startedAt: "MON", duration: "15 MIN" },
  { id: "GH-PPA-3107", title: "District pharmaceuticals frame", buyer: "Health Commodities · Ghana", bids: null, findings: 0, citations: 0, unsourced: 0, status: "queued", startedAt: "QUEUED", duration: "—" },
];

const SEED_GATES: GateItem[] = [
  { id: "g-1", tender: "KE-NCB-104293", title: "Supply & delivery of MRI scanners", supplier: "MedEquip East Africa Ltd", value: "KES 412.6M", flags: 3, ago: "18 MIN AGO" },
  { id: "g-2", tender: "ZM-PPA-8841", title: "School furniture framework — Lusaka", supplier: "Copperbelt Joinery Co-op", value: "ZMW 38.4M", flags: 1, ago: "2 H AGO" },
];

const SEED_LEDGER: LedgerRow[] = [
  { tender: "RW-RPPA-0552", action: "AWARDED", by: "C. Mwangi", at: "YESTERDAY" },
  { tender: "KE-NCB-104277", action: "RETURNED", by: "THE COMMITTEE", at: "MON" },
];

const FINDING_NOTES: Record<string, string[]> = {
  "KE-NCB-104293": ["Bank statement anomaly — p.114", "Bid bond expires before award", "Registry match — related bidders"],
  "ZM-PPA-8841": ["Unit price 38% above framework median"],
  "RW-RPPA-0552": ["Missing tax clearance — bid 3", "Arithmetic variance — BOQ p.22", "Subcontractor undisclosed"],
  "KE-NCB-104277": ["Two bids share one IP address", "Deposit source undocumented", "Delivery window infeasible"],
  "ZM-PPA-8830": ["Quotation date mismatch"],
};

const PORTALS = [
  { name: "OCDS EXPLORER", at: "2 MIN AGO", ok: true },
  { name: "PPA · KENYA", at: "6 MIN AGO", ok: true },
  { name: "PRAZ · ZIMBABWE", at: "31 MIN AGO", ok: true },
  { name: "GGPPBD · GHANA", at: "4 H AGO", ok: false },
];

const SPARK_A = [40, 62, 34, 78, 52, 70, 44, 88, 58, 74, 48, 84];
const SPARK_B = [55, 40, 70, 46, 82, 60, 38, 74, 50, 66, 42, 90];

const SECTION_NAV = [
  { id: "mc-overview", label: "OVERVIEW", icon: Gauge },
  { id: "mc-runs", label: "RUN REGISTER", icon: Terminal },
  { id: "mc-gates", label: "HUMAN GATES", icon: Stamp },
  { id: "mc-activity", label: "AGENT FEED", icon: Radio },
] as const;

type SectionId = (typeof SECTION_NAV)[number]["id"];

function firstNameOf(user: AuthUser | null): string {
  return user?.name.trim().split(/\s+/)[0] ?? "Officer";
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "Q";
}

function clockNow(d: Date): string {
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function dateLine(d: Date): string {
  return d
    .toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();
}

/* ── Motion primitives ───────────────────────────────────────────────────── */

function useCountUp(target: number, duration = 1100): number {
  const reduce = useReducedMotion();
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (reduce) {
      const id = requestAnimationFrame(() => setVal(target));
      return () => cancelAnimationFrame(id);
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduce]);
  return val;
}

function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const first = requestAnimationFrame(() => setNow(new Date()));
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => {
      cancelAnimationFrame(first);
      clearInterval(id);
    };
  }, []);
  return (
    <span className="tabular" aria-label={now ? `Local time ${clockNow(now)}` : "Local time"}>
      {now ? clockNow(now) : "--:--:--"}
    </span>
  );
}

/* ── Agent feed terminal ─────────────────────────────────────────────────── */

type FeedKind = "cmd" | "step" | "ok" | "gate";
const FEED_SCRIPT: { text: string; kind: FeedKind }[] = [
  { text: "quorum-agent run --tender KE-NCB-104318 --format ocds", kind: "cmd" },
  { text: "▸ ingesting 96 pages · 7 bids parsed", kind: "step" },
  { text: "▸ document checklist — 12/16 present", kind: "step" },
  { text: "▸ cross-checking the supplier registry", kind: "step" },
  { text: "▸ flagging anomaly — bank statement p.41", kind: "step" },
  { text: "✓ findings ready — every claim cited", kind: "ok" },
  { text: "⏸ human gate — queued for the committee", kind: "gate" },
];

function AgentFeed() {
  const [step, setStep] = useState(0);
  const done = step >= FEED_SCRIPT.length;

  useEffect(() => {
    if (step >= FEED_SCRIPT.length) {
      const t = setTimeout(() => setStep(0), 5200);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep((s) => s + 1), step === 0 ? 800 : 680);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-night-2 shadow-[0_28px_70px_rgba(11,12,15,0.35)]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-600/90" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        </div>
        <p className="flex items-center gap-2 font-code text-[9px] font-semibold tracking-[0.22em] text-ink-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-brand-500" aria-hidden="true" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-600" aria-hidden="true" />
          </span>
          QUORUM-AGENT · LIVE
        </p>
      </div>
      <div
        className="min-h-[190px] px-4 py-4 font-code text-[10.5px] leading-[2] sm:text-[11.5px]"
        role="img"
        aria-label="Live agent feed: the current run ingesting bids, checking documents, citing findings and queueing a human gate"
      >
        {FEED_SCRIPT.slice(0, step).map((line) => (
          <p
            key={line.text}
            className={cn(
              line.kind === "cmd" && "text-ink-200",
              line.kind === "step" && "text-ink-400",
              line.kind === "ok" && "font-semibold text-white",
              line.kind === "gate" && "text-brand-300"
            )}
          >
            {line.kind === "cmd" && <span className="mr-2 text-brand-400">$</span>}
            {line.text}
          </p>
        ))}
        {!done && <span className="mt-1 inline-block h-3.5 w-[7px] animate-pulse bg-brand-500" aria-hidden="true" />}
      </div>
    </div>
  );
}

/* ── Small pieces ────────────────────────────────────────────────────────── */

function StatusChip({ status }: { status: RunStatus }) {
  if (status === "running")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 font-code text-[8.5px] font-bold tracking-[0.16em] text-brand-700">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-brand-500" aria-hidden="true" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-600" aria-hidden="true" />
        </span>
        LIVE
      </span>
    );
  if (status === "queued")
    return (
      <span className="inline-flex items-center rounded-full border border-ink-200 px-2.5 py-1 font-code text-[8.5px] font-bold tracking-[0.16em] text-ink-500">
        QUEUED
      </span>
    );
  if (status === "gate")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 font-code text-[8.5px] font-bold tracking-[0.16em] text-brand-800">
        <Gavel className="h-2.5 w-2.5" aria-hidden="true" />
        HUMAN GATE
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-ink-950 px-2.5 py-1 font-code text-[8.5px] font-bold tracking-[0.16em] text-white">
      <CircleCheck className="h-2.5 w-2.5" aria-hidden="true" />
      COMPLETE
    </span>
  );
}

function Spark({ data, tone = "ink" }: { data: number[]; tone?: "ink" | "brand" }) {
  return (
    <div className="flex h-8 items-end gap-[3px]" aria-hidden="true">
      {data.map((h, i) => (
        <motion.span
          key={i}
          initial={{ height: 2 }}
          animate={{ height: `${h}%` }}
          transition={{ duration: 0.7, delay: 0.5 + i * 0.045, ease: EASE }}
          className={cn("w-[4px] rounded-full", tone === "ink" ? "bg-ink-200" : "bg-brand-200")}
        />
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix,
  sub,
  spark,
  featured,
  pulse,
  delay,
}: {
  label: string;
  value: number;
  suffix?: string;
  sub: string;
  spark: number[];
  featured?: boolean;
  pulse?: boolean;
  delay: number;
}) {
  const n = useCountUp(value);
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: EASE }}
      className={cn(
        "relative overflow-hidden rounded-2xl border p-5",
        featured
          ? "border-ink-950 bg-night text-white shadow-[0_22px_55px_rgba(11,12,15,0.35)]"
          : "border-ink-100 bg-white shadow-[0_1px_2px_rgba(11,12,15,0.04)]"
      )}
    >
      {featured && <div className="bg-grid-dark pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />}
      <div className="relative">
        <div className="flex items-center justify-between gap-2">
          <p className={cn("font-code text-[9px] font-semibold tracking-[0.22em]", featured ? "text-ink-300" : "text-ink-400")}>
            {label}
          </p>
          {pulse && (
            <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-brand-500" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-500" />
            </span>
          )}
        </div>
        <p className="mt-3 flex items-baseline gap-1 font-display text-[40px] font-black leading-none tracking-[-0.02em] tabular">
          {n}
          {suffix && <span className={cn("text-[22px]", featured ? "text-brand-400" : "text-brand-600")}>{suffix}</span>}
        </p>
        <div className="mt-3 flex items-end justify-between gap-3">
          <p className={cn("font-code text-[8.5px] leading-[1.7] tracking-[0.14em]", featured ? "text-ink-400" : "text-ink-400")}>
            {sub}
          </p>
          <Spark data={spark} tone={featured ? "brand" : "ink"} />
        </div>
      </div>
    </motion.div>
  );
}

/* ── New-run modal ───────────────────────────────────────────────────────── */

const SAMPLE_TITLES = [
  "Supply & installation of laboratory equipment",
  "Upgrade of the provincial data centre",
  "Electronic medical records rollout — phase 2",
];

function NewRunModal({
  open,
  onClose,
  onLaunch,
}: {
  open: boolean;
  onClose: () => void;
  onLaunch: (ref: string, title: string, format: string) => void;
}) {
  const [ref, setRef] = useState("KE-NCB-104341");
  const [title, setTitle] = useState(SAMPLE_TITLES[0]);
  const [format, setFormat] = useState("OCDS");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-[80] grid place-items-center bg-night/70 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-run-title"
            initial={{ opacity: 0, y: 26, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.32, ease: EASE }}
            className="w-full max-w-md rounded-2xl border border-ink-100 bg-white p-6 shadow-[0_40px_100px_rgba(11,12,15,0.45)] sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2.5 font-code text-[9px] font-semibold uppercase tracking-[0.28em] text-ink-500">
                  <span className="inline-block h-[2px] w-6 bg-brand-600" aria-hidden="true" />
                  FIG. 05 — Launch a run
                </p>
                <h2 id="new-run-title" className="mt-3 font-display text-[26px] font-black tracking-[-0.02em] text-ink-950">
                  New run<span className="text-brand-600">.</span>
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid h-9 w-9 place-items-center rounded-lg border border-ink-200 text-ink-500 transition-colors hover:bg-ink-50 hover:text-ink-900"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                onLaunch(ref.trim() || "KE-NCB-104341", title, format);
              }}
            >
              <div>
                <label htmlFor="nr-ref" className="mb-1.5 block font-code text-[9px] font-semibold tracking-[0.18em] text-ink-500">
                  TENDER REFERENCE
                </label>
                <input
                  id="nr-ref"
                  ref={inputRef}
                  type="text"
                  value={ref}
                  onChange={(e) => setRef(e.target.value)}
                  className="h-11 w-full rounded-xl border border-ink-200 bg-white px-4 font-code text-[13px] tracking-[0.04em] text-ink-900 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-600/15"
                />
              </div>
              <div>
                <label htmlFor="nr-title" className="mb-1.5 block font-code text-[9px] font-semibold tracking-[0.18em] text-ink-500">
                  TENDER TITLE
                </label>
                <select
                  id="nr-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-11 w-full appearance-none rounded-xl border border-ink-200 bg-white px-4 text-[13.5px] text-ink-900 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-600/15"
                >
                  {SAMPLE_TITLES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="mb-1.5 font-code text-[9px] font-semibold tracking-[0.18em] text-ink-500">SOURCE FORMAT</p>
                <div className="grid grid-cols-3 gap-2" role="group" aria-label="Source format">
                  {["OCDS", "PDF PACK", "EMAIL BAG"].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFormat(f)}
                      aria-pressed={format === f}
                      className={cn(
                        "h-10 rounded-xl border font-code text-[9.5px] font-bold tracking-[0.14em] transition-all",
                        format === f
                          ? "border-ink-950 bg-ink-950 text-white"
                          : "border-ink-200 bg-white text-ink-500 hover:border-ink-400"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                className="group inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-[15px] font-semibold text-white shadow-[0_10px_26px_rgba(217,38,22,0.3)] transition-all hover:bg-brand-700"
              >
                Launch run
                <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </button>
              <p className="text-center font-code text-[8px] tracking-[0.2em] text-ink-400">
                THE AGENT PREPARES THE FILE — THE COMMITTEE STILL AWARDS
              </p>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Sidebar (shared by desktop rail + mobile drawer) ────────────────────── */

function SidebarContent({
  active,
  user,
  runsCount,
  gatesCount,
  onNavigate,
  onNewRun,
  onSignOut,
  onExit,
}: {
  active: SectionId;
  user: AuthUser | null;
  runsCount: number;
  gatesCount: number;
  onNavigate: (id: SectionId) => void;
  onNewRun: () => void;
  onSignOut: () => void;
  onExit: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pb-6 pt-7">
        <QuorumLogo variant="light" />
        <p className="mt-3 font-code text-[8.5px] font-semibold tracking-[0.3em] text-ink-400">
          MISSION CONTROL · v0.9
        </p>
      </div>

      <nav aria-label="Mission control sections" className="flex-1 px-3">
        <p className="px-3 pb-2 font-code text-[8px] font-semibold tracking-[0.3em] text-ink-600">COMMAND</p>
        <ul className="space-y-1">
          {SECTION_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            const badge = item.id === "mc-gates" ? gatesCount : item.id === "mc-runs" ? runsCount : null;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                    isActive ? "bg-white/10 text-white" : "text-ink-400 hover:bg-white/5 hover:text-ink-100"
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="mc-nav-rail"
                      className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-brand-500"
                      aria-hidden="true"
                    />
                  )}
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="flex-1 font-code text-[10px] font-semibold tracking-[0.18em]">{item.label}</span>
                  {badge !== null && badge > 0 && (
                    <span
                      className={cn(
                        "grid h-5 min-w-5 place-items-center rounded-full px-1.5 font-code text-[9px] font-bold",
                        item.id === "mc-gates" ? "bg-brand-600 text-white" : "bg-white/10 text-ink-200"
                      )}
                    >
                      {badge}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={onNewRun}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-3 py-3 text-[13px] font-semibold text-white shadow-[0_10px_26px_rgba(217,38,22,0.28)] transition-all hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New run
        </button>
      </nav>

      <div className="px-3 pb-5 pt-4">
        <div className="rounded-xl border border-white/10 bg-night-2 px-3.5 py-3">
          <p className="flex items-center gap-2 font-code text-[9px] font-semibold tracking-[0.18em] text-ink-200">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-brand-500" aria-hidden="true" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden="true" />
            </span>
            AGENT · ONLINE
          </p>
          <p className="mt-1.5 font-code text-[7.5px] leading-[1.8] tracking-[0.16em] text-ink-500">
            QWEN3-32B · MCP · OPEN WEIGHTS
            <br />
            EVERY CLAIM CITED · 1 HUMAN GATE
          </p>
        </div>

        <div className="mt-3 flex items-center gap-3 rounded-xl px-2 py-2">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-600 font-code text-[10px] font-bold text-white"
            aria-hidden="true"
          >
            {initialsOf(user?.name ?? "Quorum")}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-white">{user?.name ?? "Guest officer"}</span>
            <span className="block truncate font-code text-[8px] tracking-[0.14em] text-ink-500">
              {(user?.email ?? "demo@quorum.africa").toUpperCase()}
            </span>
          </span>
          <button
            type="button"
            onClick={onSignOut}
            aria-label="Sign out"
            title="Sign out"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          onClick={onExit}
          className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 font-code text-[8.5px] font-semibold tracking-[0.22em] text-ink-500 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3 w-3" aria-hidden="true" />
          BACK TO SITE
        </button>
      </div>
    </div>
  );
}

/* ── Run register table ──────────────────────────────────────────────────── */

type RunFilter = "all" | "live" | "gates" | "done";

const RUN_FILTERS: { id: RunFilter; label: string }[] = [
  { id: "all", label: "ALL" },
  { id: "live", label: "LIVE" },
  { id: "gates", label: "GATES" },
  { id: "done", label: "DONE" },
];

function RunRegister({
  runs,
  query,
  onQuery,
  filter,
  onFilter,
  onToast,
}: {
  runs: McRun[];
  query: string;
  onQuery: (v: string) => void;
  filter: RunFilter;
  onFilter: (f: RunFilter) => void;
  onToast: (m: string) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = runs.filter((r) => {
    const q = query.trim().toLowerCase();
    const matches =
      q.length === 0 ||
      r.id.toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q) ||
      r.buyer.toLowerCase().includes(q);
    const inFilter =
      filter === "all" ||
      (filter === "live" && (r.status === "running" || r.status === "queued")) ||
      (filter === "gates" && r.status === "gate") ||
      (filter === "done" && r.status === "complete");
    return matches && inFilter;
  });

  return (
    <section id="mc-runs" aria-labelledby="mc-runs-h" className="scroll-mt-24">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
        className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-[0_1px_2px_rgba(11,12,15,0.04)]"
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
          <div>
            <h2 id="mc-runs-h" className="font-display text-[17px] font-black tracking-[-0.01em] text-ink-950">
              Run register
            </h2>
            <p className="mt-0.5 font-code text-[8.5px] tracking-[0.2em] text-ink-400">
              LAST 7 DAYS · {filtered.length} OF {runs.length} RUNS
            </p>
          </div>
          <div className="flex items-center gap-1.5" role="group" aria-label="Filter runs">
            {RUN_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onFilter(f.id)}
                aria-pressed={filter === f.id}
                className={cn(
                  "h-7 rounded-full border px-3 font-code text-[8.5px] font-bold tracking-[0.14em] transition-all",
                  filter === f.id
                    ? "border-ink-950 bg-ink-950 text-white"
                    : "border-ink-200 bg-white text-ink-500 hover:border-ink-400"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </header>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[660px] border-collapse text-left">
            <caption className="sr-only">Quorum run register — recent agent runs with status, findings and citations</caption>
            <thead>
              <tr className="border-b border-ink-100 bg-paper/60">
                {["RUN", "BIDS", "FINDINGS", "CITED", "STATUS", "DURATION", ""].map((h, i) => (
                  <th
                    key={i}
                    scope="col"
                    className={cn(
                      "px-4 py-2.5 font-code text-[8px] font-semibold tracking-[0.22em] text-ink-400",
                      i === 0 && "pl-5",
                      i === 6 && "w-8"
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((run) => {
                const isOpen = expanded === run.id;
                const notes = FINDING_NOTES[run.id] ?? [];
                return (
                  <Fragment key={run.id}>
                    <tr
                      className={cn(
                        "cursor-pointer border-b border-ink-50 transition-colors hover:bg-paper",
                        isOpen && "bg-paper"
                      )}
                      tabIndex={0}
                      onClick={() => setExpanded(isOpen ? null : run.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setExpanded(isOpen ? null : run.id);
                        }
                      }}
                      aria-expanded={isOpen}
                      aria-label={`${run.id} — ${run.title}. Toggle run details.`}
                    >
                      <td className="py-3.5 pl-5 pr-4">
                        <p className="font-code text-[10px] font-bold tracking-[0.08em] text-ink-950">{run.id}</p>
                        <p className="mt-0.5 max-w-[240px] truncate text-[12.5px] font-medium text-ink-600">{run.title}</p>
                      </td>
                      <td className="px-4 py-3.5 text-[13px] font-semibold text-ink-800 tabular">
                        {run.bids ?? "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        {run.findings > 0 ? (
                          <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-brand-700 tabular">
                            <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />
                            {run.findings}
                          </span>
                        ) : (
                          <span className="text-[13px] text-ink-300 tabular">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-[13px] font-semibold text-ink-800 tabular">
                        {run.status === "running" || run.status === "queued" ? "—" : `${run.citations}/${run.findings}`}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusChip status={run.status} />
                      </td>
                      <td className="px-4 py-3.5 font-code text-[9px] tracking-[0.12em] text-ink-500">{run.duration}</td>
                      <td className="pr-4">
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 text-ink-300 transition-transform duration-300",
                            isOpen && "rotate-180 text-ink-600"
                          )}
                          aria-hidden="true"
                        />
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b border-ink-50 bg-paper">
                        <td colSpan={7} className="px-5 py-4">
                          <div className="rounded-xl border border-ink-100 bg-white p-4">
                            {run.status === "running" || run.status === "queued" ? (
                              <p className="text-[13px] leading-relaxed text-ink-600">
                                <span className="font-semibold text-ink-900">Run in progress.</span> Findings stream in at
                                completion — every claim will carry a page citation before it reaches this table.
                              </p>
                            ) : (
                              <>
                                <p className="font-code text-[8.5px] font-semibold tracking-[0.2em] text-ink-400">
                                  TOP FINDINGS · {run.findings} FLAGGED · {run.citations} CITATIONS · {run.unsourced} UNSOURCED
                                </p>
                                <ul className="mt-2.5 flex flex-wrap gap-1.5">
                                  {notes.map((note) => (
                                    <li
                                      key={note}
                                      className="rounded-md bg-brand-50 px-2.5 py-1.5 text-[11.5px] font-medium text-brand-800"
                                    >
                                      {note}
                                    </li>
                                  ))}
                                  {run.findings > notes.length && (
                                    <li className="rounded-md bg-ink-50 px-2.5 py-1.5 font-code text-[10px] font-semibold tracking-[0.1em] text-ink-500">
                                      +{run.findings - notes.length} MORE IN THE SOURCED REPORT
                                    </li>
                                  )}
                                </ul>
                              </>
                            )}
                            <div className="mt-3.5 flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToast(
                                    `SOURCED REPORT — ${run.id} · ${run.findings} FINDINGS · ${run.citations} CITATIONS · EXPORT QUEUED`
                                  );
                                }}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-ink-950 px-3 font-code text-[9px] font-bold tracking-[0.14em] text-white transition-colors hover:bg-brand-600"
                              >
                                <Download className="h-3 w-3" aria-hidden="true" />
                                SOURCED REPORT
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const log = `quorum audit — ${run.id} — ${run.findings} findings · ${run.citations} citations · 0 unsourced · sha256 4f2a…9c31`;
                                  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(log).catch(() => undefined);
                                  onToast("AUDIT TRAIL COPIED TO CLIPBOARD");
                                }}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-ink-200 px-3 font-code text-[9px] font-bold tracking-[0.14em] text-ink-600 transition-colors hover:border-ink-400 hover:text-ink-900"
                              >
                                <Copy className="h-3 w-3" aria-hidden="true" />
                                COPY AUDIT TRAIL
                              </button>
                              <span className="ml-auto font-code text-[8px] tracking-[0.16em] text-ink-300">
                                BUYER · {run.buyer.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center">
                    <p className="font-code text-[10px] tracking-[0.18em] text-ink-400">
                      NO RUNS MATCH “{query.toUpperCase()}”
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        onQuery("");
                        onFilter("all");
                      }}
                      className="mt-3 inline-flex h-8 items-center rounded-lg border border-ink-200 px-3.5 text-[12px] font-semibold text-ink-600 transition-colors hover:border-ink-400"
                    >
                      Clear search & filters
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </section>
  );
}

/* ── Human gate queue ────────────────────────────────────────────────────── */

function GateQueue({
  queue,
  ledger,
  firstName,
  onSign,
  onReturn,
}: {
  queue: GateItem[];
  ledger: LedgerRow[];
  firstName: string;
  onSign: (g: GateItem) => void;
  onReturn: (g: GateItem) => void;
}) {
  const [decided, setDecided] = useState<Record<string, "AWARDED" | "RETURNED">>({});

  const act = (g: GateItem, kind: "AWARDED" | "RETURNED") => {
    setDecided((prev) => ({ ...prev, [g.id]: kind }));
    if (kind === "AWARDED") onSign(g);
    else onReturn(g);
  };

  return (
    <section id="mc-gates" aria-labelledby="mc-gates-h" className="scroll-mt-24">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.22, ease: EASE }}
        className="flex h-full flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-[0_1px_2px_rgba(11,12,15,0.04)]"
      >
        <header className="flex items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
          <div>
            <h2 id="mc-gates-h" className="flex items-center gap-2 font-display text-[17px] font-black tracking-[-0.01em] text-ink-950">
              <Gavel className="h-4 w-4 text-brand-600" aria-hidden="true" />
              Human gate
            </h2>
            <p className="mt-0.5 font-code text-[8.5px] tracking-[0.2em] text-ink-400">
              {queue.length === 0 ? "QUEUE CLEAR — THE GAVEL RESTS" : `${queue.length} AWAITING THE COMMITTEE`}
            </p>
          </div>
          <span
            aria-live="polite"
            className={cn(
              "rounded-full px-2.5 py-1 font-code text-[8.5px] font-bold tracking-[0.16em]",
              queue.length === 0 ? "bg-ink-950 text-white" : "bg-brand-600 text-white"
            )}
          >
            {queue.length === 0 ? "CLEAR" : "ACTION NEEDED"}
          </span>
        </header>

        <div className="flex-1 space-y-3 px-4 py-4" aria-live="polite">
          <AnimatePresence initial={false}>
            {queue.map((g) => (
              <motion.article
                key={g.id}
                layout
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 32, transition: { duration: 0.3 } }}
                transition={{ duration: 0.4, ease: EASE }}
                className="rounded-xl border border-ink-100 bg-paper p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-code text-[9.5px] font-bold tracking-[0.1em] text-ink-950">{g.tender}</p>
                    <p className="mt-0.5 truncate text-[13.5px] font-semibold text-ink-800">{g.title}</p>
                  </div>
                  {g.flags > 0 && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-50 px-2 py-1 font-code text-[8.5px] font-bold tracking-[0.1em] text-brand-700">
                      <CircleAlert className="h-2.5 w-2.5" aria-hidden="true" />
                      {g.flags} {g.flags === 1 ? "FLAG" : "FLAGS"}
                    </span>
                  )}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 font-code text-[8.5px] tracking-[0.12em] text-ink-500">
                  <div>
                    <dt className="text-ink-300">PROPOSED SUPPLIER</dt>
                    <dd className="mt-0.5 font-semibold text-ink-800">{g.supplier}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-300">CONTRACT VALUE</dt>
                    <dd className="mt-0.5 font-semibold text-ink-800">{g.value}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => act(g, "AWARDED")}
                    className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-600 text-[12.5px] font-bold tracking-[0.02em] text-white transition-all hover:bg-brand-700"
                  >
                    <Stamp className="h-3.5 w-3.5" aria-hidden="true" />
                    Award
                  </button>
                  <button
                    type="button"
                    onClick={() => act(g, "RETURNED")}
                    className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border border-ink-300 text-[12.5px] font-semibold text-ink-700 transition-colors hover:border-ink-950 hover:text-ink-950"
                  >
                    Return for review
                  </button>
                </div>
                <p className="mt-2.5 font-code text-[7.5px] tracking-[0.18em] text-ink-300">
                  FILE SUBMITTED {g.ago} · EVERY FLAG CITED
                </p>
              </motion.article>
            ))}
          </AnimatePresence>

          {queue.length === 0 && (
            <motion.div
              key="empty-queue"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="grid place-items-center rounded-xl border border-dashed border-ink-200 px-4 py-10 text-center"
            >
              <CircleCheck className="h-7 w-7 text-ink-300" aria-hidden="true" />
              <p className="mt-3 font-display text-[15px] font-black text-ink-900">The committee is caught up.</p>
              <p className="mt-1 max-w-[220px] text-[12.5px] leading-relaxed text-ink-500">
                No file waits on a human. The agent keeps preparing; the gavel keeps resting.
              </p>
            </motion.div>
          )}
        </div>

        {/* Ledger */}
        <div className="border-t border-ink-100 px-5 py-4">
          <p className="font-code text-[8.5px] font-semibold tracking-[0.22em] text-ink-400">GATE LEDGER</p>
          <ul className="mt-2.5 space-y-2">
            <AnimatePresence initial={false}>
              {ledger.slice(0, 4).map((row) => (
                <motion.li
                  key={`${row.tender}-${row.at}-${row.action}`}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="flex items-center justify-between gap-2 font-code text-[8.5px] tracking-[0.12em]"
                >
                  <span className="font-bold text-ink-800">{row.tender}</span>
                  <span className={cn("font-bold", row.action === "AWARDED" ? "text-ink-950" : "text-brand-600")}>
                    {row.action}
                  </span>
                  <span className="ml-auto text-ink-400">
                    {row.by} · {row.at}
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
            {ledger.length === 0 && (
              <li className="font-code text-[8.5px] tracking-[0.12em] text-ink-300">NO DECISIONS YET</li>
            )}
          </ul>
        </div>
      </motion.div>
    </section>
  );
}

/* ── Portal sync + audit ─────────────────────────────────────────────────── */

function PortalSync({ onToast }: { onToast: (m: string) => void }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-[0_1px_2px_rgba(11,12,15,0.04)]">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-[15px] font-black tracking-[-0.01em] text-ink-950">Portal sync</h3>
        <span className="font-code text-[8px] tracking-[0.2em] text-ink-400">4 SOURCES</span>
      </div>
      <ul className="mt-4 space-y-3">
        {PORTALS.map((p) => (
          <li key={p.name} className="flex items-center gap-3">
            <span
              className={cn(
                "relative flex h-1.5 w-1.5 shrink-0",
                !p.ok && "text-brand-600"
              )}
              aria-hidden="true"
            >
              {p.ok ? (
                <span className="h-1.5 w-1.5 rounded-full bg-ink-950" />
              ) : (
                <>
                  <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-brand-500" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-600" />
                </>
              )}
            </span>
            <span className="flex-1 truncate font-code text-[9.5px] font-semibold tracking-[0.14em] text-ink-800">
              {p.name}
            </span>
            <span className="font-code text-[8px] tracking-[0.14em] text-ink-400">{p.at}</span>
            {!p.ok && (
              <button
                type="button"
                onClick={() => onToast("RETRY QUEUED — GGPPBD SYNC · ATTEMPT 2 IN 60S")}
                aria-label={`Retry sync for ${p.name}`}
                className="grid h-6 w-6 place-items-center rounded-md border border-ink-200 text-ink-500 transition-colors hover:border-brand-400 hover:text-brand-700"
              >
                <RefreshCw className="h-3 w-3" aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-5 flex items-center gap-2.5 rounded-xl bg-sand px-3.5 py-3">
        <ShieldCheck className="h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
        <p className="font-code text-[7.5px] leading-[1.8] tracking-[0.14em] text-ink-600">
          AUDIT LOGS sha256-SEALED · ON-PREM READY
        </p>
      </div>
    </div>
  );
}

/* ── The screen ──────────────────────────────────────────────────────────── */

export function Dashboard({
  user,
  onSignOut,
  onToast,
  onExit,
}: {
  user: AuthUser | null;
  onSignOut: () => void;
  onToast: (message: string) => void;
  onExit: () => void;
}) {
  const [runs, setRuns] = useState<McRun[]>(SEED_RUNS);
  const [queue, setQueue] = useState<GateItem[]>(SEED_GATES);
  const [ledger, setLedger] = useState<LedgerRow[]>(SEED_LEDGER);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RunFilter>("all");
  const [active, setActive] = useState<SectionId>("mc-overview");
  const [navOpen, setNavOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const completionTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  /* Clock + date */
  useEffect(() => {
    const first = requestAnimationFrame(() => setNow(new Date()));
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => {
      cancelAnimationFrame(first);
      clearInterval(id);
    };
  }, []);

  /* Scrollspy */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id as SectionId);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: 0 }
    );
    SECTION_NAV.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  /* Body scroll lock for the mobile drawer */
  useEffect(() => {
    document.body.style.overflow = navOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [navOpen]);

  /* Clear pending run-completion timers on unmount */
  useEffect(() => {
    const timers = completionTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  const firstName = firstNameOf(user);
  const hour = now?.getHours() ?? 10;
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const activeRuns = runs.filter((r) => r.status === "running" || r.status === "queued").length;
  const findingsTotal = runs
    .filter((r) => r.status === "gate" || r.status === "complete")
    .reduce((sum, r) => sum + r.findings, 0);
  const citedTotal = runs
    .filter((r) => r.status === "gate" || r.status === "complete")
    .reduce((sum, r) => sum + r.citations, 0);
  const citationPct = findingsTotal > 0 ? Math.round((citedTotal / findingsTotal) * 100) : 100;

  const navigate = (id: SectionId) => {
    setNavOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const launchRun = (ref: string, title: string, format: string) => {
    setModalOpen(false);
    const run: McRun = {
      id: ref,
      title,
      buyer: `Your workspace · ${format.toLowerCase()}`,
      bids: null,
      findings: 0,
      citations: 0,
      unsourced: 0,
      status: "running",
      startedAt: "JUST NOW",
      duration: "LIVE",
    };
    setRuns((prev) => [run, ...prev]);
    onToast(`RUN QUEUED — QUORUM-AGENT PICKING UP ${ref.toUpperCase()} · ${format}`);
    const t = setTimeout(() => {
      setRuns((prev) =>
        prev.map((r) =>
          r.id === ref
            ? { ...r, status: "complete", bids: 5, findings: 4, citations: 4, duration: "11 MIN" }
            : r
        )
      );
      onToast(`RUN COMPLETE — ${ref.toUpperCase()} · 4 FINDINGS · 4 CITATIONS · 0 UNSOURCED`);
    }, 12_000);
    completionTimers.current.push(t);
  };

  const signGate = (g: GateItem) => {
    setQueue((prev) => prev.filter((item) => item.id !== g.id));
    setLedger((prev) => [
      { tender: g.tender, action: "AWARDED", by: firstName, at: "JUST NOW" },
      ...prev,
    ]);
    /* The committee has spoken — the run leaves the register as decided. */
    setRuns((prev) =>
      prev.map((r) => (r.id === g.tender ? { ...r, status: "complete", duration: `${r.duration.split(" ")[0]} MIN` } : r))
    );
    onToast(`GATE SIGNED — ${g.tender} AWARDED · DECISION LOGGED`);
  };

  const returnGate = (g: GateItem) => {
    setQueue((prev) => prev.filter((item) => item.id !== g.id));
    setLedger((prev) => [
      { tender: g.tender, action: "RETURNED", by: firstName, at: "JUST NOW" },
      ...prev,
    ]);
    /* Back to the agent for clarification — the file re-opens live. */
    setRuns((prev) =>
      prev.map((r) => (r.id === g.tender ? { ...r, status: "running", duration: "LIVE", startedAt: "RE-RUN" } : r))
    );
    onToast(`${g.tender} RETURNED — AGENT TASKED WITH CLARIFICATION`);
  };

  return (
    <div className="min-h-screen bg-paper font-body text-ink-900 antialiased">
      <a
        href="#mc-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[90] focus:rounded-lg focus:bg-ink-950 focus:px-4 focus:py-2 focus:text-[13px] focus:font-semibold focus:text-white"
      >
        Skip to mission control
      </a>

      {/* Desktop sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col border-r border-white/5 bg-night lg:flex"
        aria-label="Mission control sidebar"
      >
        <div className="bg-grid-dark pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="relative flex h-full flex-col">
          <SidebarContent
            active={active}
            user={user}
            runsCount={runs.length}
            gatesCount={queue.length}
            onNavigate={navigate}
            onNewRun={() => setModalOpen(true)}
            onSignOut={onSignOut}
            onExit={onExit}
          />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-white/10 bg-night px-4 py-3 lg:hidden">
        <QuorumLogo variant="light" />
        <div className="flex items-center gap-2.5">
          <span className="hidden items-center gap-2 font-code text-[8.5px] tracking-[0.2em] text-ink-300 sm:flex">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-brand-500" aria-hidden="true" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-600" aria-hidden="true" />
            </span>
            AGENT ONLINE
          </span>
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Open mission control menu"
            aria-expanded={navOpen}
            className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-white"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {navOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[60] bg-night/70 backdrop-blur-sm lg:hidden"
              onClick={() => setNavOpen(false)}
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.32, ease: EASE }}
              className="fixed inset-y-0 left-0 z-[61] w-[290px] bg-night lg:hidden"
              aria-label="Mission control menu"
            >
              <div className="bg-grid-dark pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
              <div className="relative flex h-full flex-col">
                <button
                  type="button"
                  onClick={() => setNavOpen(false)}
                  aria-label="Close menu"
                  className="absolute right-3 top-4 grid h-9 w-9 place-items-center rounded-lg text-ink-300 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4.5 w-4.5" aria-hidden="true" />
                </button>
                <SidebarContent
                  active={active}
                  user={user}
                  runsCount={runs.length}
                  gatesCount={queue.length}
                  onNavigate={navigate}
                  onNewRun={() => {
                    setNavOpen(false);
                    setModalOpen(true);
                  }}
                  onSignOut={onSignOut}
                  onExit={onExit}
                />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className="lg:pl-[264px]">
        {/* Sticky utility bar */}
        <div className="sticky top-0 z-30 border-b border-ink-100 bg-paper/85 backdrop-blur-xl">
          <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <p className="truncate font-code text-[9px] font-semibold tracking-[0.22em] text-ink-400">
              MISSION CONTROL <span className="text-ink-200">/</span>{" "}
              <span className="text-ink-900">
                {SECTION_NAV.find((s) => s.id === active)?.label ?? "OVERVIEW"}
              </span>
            </p>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative hidden sm:block">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-300"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search runs…"
                  aria-label="Search runs by reference, title or buyer"
                  className="h-9 w-44 rounded-full border border-ink-200 bg-white pl-9 pr-3 text-[12.5px] text-ink-900 outline-none transition-all placeholder:text-ink-300 focus:w-56 focus:border-brand-500 focus:ring-2 focus:ring-brand-600/15 lg:w-52"
                />
              </div>
              <p
                className="hidden items-center gap-2 font-code text-[9px] tracking-[0.2em] text-ink-500 md:flex"
                aria-label="Local time"
              >
                <LiveClock />
                <span className="text-ink-200">·</span> LOCAL
              </p>
              <span className="hidden items-center gap-2 rounded-full border border-ink-200 bg-white px-3 py-1.5 font-code text-[8.5px] font-semibold tracking-[0.18em] text-ink-700 md:inline-flex">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-brand-500" aria-hidden="true" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-600" aria-hidden="true" />
                </span>
                AGENT · ONLINE
              </span>
            </div>
          </div>
        </div>

        <main id="mc-main" className="mx-auto w-full max-w-[1200px] px-4 pb-14 pt-8 sm:px-6 lg:px-8">
          {/* Greeting */}
          <section id="mc-overview" aria-labelledby="mc-greeting" className="scroll-mt-20">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div className="min-w-0">
                <p className="flex items-center gap-2.5 font-code text-[10px] font-semibold uppercase tracking-[0.3em] text-ink-500">
                  <span className="inline-block h-[2px] w-6 bg-brand-600" aria-hidden="true" />
                  FIG. 04 — Mission control
                </p>
                <h1
                  id="mc-greeting"
                  className="mt-4 font-display text-[34px] font-black leading-[1.02] tracking-[-0.025em] text-ink-950 sm:text-[44px]"
                >
                  {greeting}, {firstName}
                  <span className="text-brand-600">.</span>
                </h1>
                <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-ink-600">
                  The agent has been in the files since 06:00. Everything below is cited — and the gavel
                  stays with you.
                </p>
              </div>
              <div className="flex flex-col items-start gap-3 sm:items-end">
                <p className="font-code text-[9px] tracking-[0.2em] text-ink-400">
                  {now ? dateLine(now) : "—"}
                </p>
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="group inline-flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-5 text-[14px] font-semibold text-white shadow-[0_10px_26px_rgba(217,38,22,0.28)] transition-all hover:bg-brand-700"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  New run
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
              <StatCard
                label="ACTIVE RUNS"
                value={activeRuns}
                sub={activeRuns > 0 ? "AGENT IN THE FILE" : "AGENT IDLE — QUEUE A RUN"}
                spark={SPARK_A}
                delay={0.05}
              />
              <StatCard
                label="FINDINGS FLAGGED"
                value={findingsTotal}
                sub="EVERY ONE CITED · ACROSS OPEN RUNS"
                spark={SPARK_B}
                delay={0.12}
              />
              <StatCard
                label="CITATIONS VERIFIED"
                value={citationPct}
                suffix="%"
                sub="0 UNSOURCED CLAIMS · PAGE-LEVEL"
                spark={SPARK_A}
                delay={0.19}
              />
              <StatCard
                label="GATES PENDING"
                value={queue.length}
                sub={queue.length > 0 ? "THE COMMITTEE HOLDS THE GAVEL" : "NOTHING WAITS ON A HUMAN"}
                spark={SPARK_B}
                featured
                pulse={queue.length > 0}
                delay={0.26}
              />
            </div>
          </section>

          {/* Runs + gates */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
            <div className="min-w-0 lg:col-span-2">
              <RunRegister
                runs={runs}
                query={query}
                onQuery={setQuery}
                filter={filter}
                onFilter={setFilter}
                onToast={onToast}
              />
            </div>
            <GateQueue
              queue={queue}
              ledger={ledger}
              firstName={firstName}
              onSign={signGate}
              onReturn={returnGate}
            />
          </div>

          {/* Feed + portals */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
            <div id="mc-activity" className="min-w-0 scroll-mt-24 lg:col-span-2">
              <AgentFeed />
            </div>
            <div className="grid content-start gap-4 sm:gap-6">
              <PortalSync onToast={onToast} />
              <div className="relative overflow-hidden rounded-2xl border border-ink-950 bg-night p-5 text-white shadow-[0_22px_55px_rgba(11,12,15,0.3)]">
                <div className="bg-grid-dark pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
                <div className="relative">
                <h3 className="font-display text-[15px] font-black tracking-[-0.01em]">The standing rule</h3>
                <p className="mt-3 font-code text-[9px] leading-[2] tracking-[0.16em] text-ink-300">
                  QUORUM PREPARES THE FILE.
                  <br />
                  IT NEVER AWARDS THE TENDER.
                  <br />
                  <span className="text-brand-400">THE COMMITTEE SIGNS — THE AGENT NEVER DOES.</span>
                </p>
                <button
                  type="button"
                  onClick={() => onToast("STANDING RULES — 3 CLAUSES · UNEDITABLE BY DESIGN")}
                  className="mt-4 inline-flex items-center gap-1.5 font-code text-[8.5px] font-bold tracking-[0.2em] text-ink-300 transition-colors hover:text-white"
                >
                  READ THE RULES
                  <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom strip */}
          <p className="mt-10 border-t border-ink-100 pt-5 text-center font-code text-[8px] tracking-[0.24em] text-ink-400">
            QUORUM · MISSION CONTROL · SESSION {initialsOf(user?.name ?? "Q")} · AUDIT-GRADE LOGS · NO TRACKERS
          </p>
        </main>
      </div>

      <NewRunModal open={modalOpen} onClose={() => setModalOpen(false)} onLaunch={launchRun} />
    </div>
  );
}
