"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  CloudUpload,
  Copy,
  Database,
  Download,
  FileText,
  FileUp,
  Files,
  Gavel,
  Gauge,
  HardDrive,
  ListChecks,
  Lock,
  LogOut,
  Menu,
  Plus,
  Radio,
  RefreshCw,
  Search,
  ServerCog,
  ShieldCheck,
  Stamp,
  Terminal,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { QuorumLogo } from "@/components/quorum/logo";
import { StackConsole } from "@/components/quorum/stack-console";
import type { AuthUser } from "@/lib/auth-types";
import { uploadTenderDocument } from "@/lib/firebase";
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
  /* Documents ingested at launch — set when the run was briefed
     through the guided wizard (seeded runs have no pack attached). */
  docs?: number;
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
  { id: "KE-NCB-104318", title: "County vaccine cold-chain — phase 2", buyer: "Public Health Institute · Kenya", bids: 7, findings: 0, citations: 0, unsourced: 0, status: "running", startedAt: "JUST NOW", duration: "LIVE" },
  { id: "ZM-PPA-8841", title: "Clinic refurbishment framework — Lusaka", buyer: "Provincial Health · Zambia", bids: 11, findings: 4, citations: 4, unsourced: 0, status: "gate", startedAt: "YESTERDAY", duration: "23 MIN" },
  { id: "RW-RPPA-0552", title: "Essential medicines framework — lot 2", buyer: "Medical Stores · Rwanda", bids: 9, findings: 5, citations: 5, unsourced: 0, status: "complete", startedAt: "YESTERDAY", duration: "24 MIN" },
  { id: "KE-NCB-104277", title: "Oxygen plant consumables — 6 counties", buyer: "Health Infrastructure · Kenya", bids: 6, findings: 6, citations: 6, unsourced: 0, status: "complete", startedAt: "MON", duration: "18 MIN" },
  { id: "ZM-PPA-8830", title: "Clinic laboratory reagents", buyer: "Health Procurement · Zambia", bids: 8, findings: 3, citations: 3, unsourced: 0, status: "complete", startedAt: "MON", duration: "15 MIN" },
  { id: "GH-PPA-3107", title: "District pharmaceuticals frame", buyer: "Health Commodities · Ghana", bids: null, findings: 0, citations: 0, unsourced: 0, status: "queued", startedAt: "QUEUED", duration: "—" },
];

const SEED_GATES: GateItem[] = [
  { id: "g-1", tender: "KE-NCB-104293", title: "Supply & delivery of MRI scanners", supplier: "MedEquip East Africa Ltd", value: "KES 412.6M", flags: 3, ago: "18 MIN AGO" },
  { id: "g-2", tender: "ZM-PPA-8841", title: "Clinic refurbishment framework — Lusaka", supplier: "Copperbelt Joinery Co-op", value: "ZMW 38.4M", flags: 1, ago: "2 H AGO" },
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

/* Grouped navigation — the options that fit an agentic procurement
   workspace: command the mission, inspect the evidence, sit as the
   committee, govern the system. */
type SectionId =
  | "mc-overview"
  | "mc-runs"
  | "mc-gates"
  | "mc-activity"
  | "mc-findings"
  | "mc-reports"
  | "mc-sources"
  | "mc-ledger"
  | "mc-committee"
  | "mc-rules"
  | "mc-stack";

type NavBadge = "runs" | "gates" | "findings";

const NAV_GROUPS: {
  group: string;
  items: { id: SectionId; label: string; icon: LucideIcon; badge?: NavBadge }[];
}[] = [
  {
    group: "COMMAND",
    items: [
      { id: "mc-overview", label: "OVERVIEW", icon: Gauge },
      { id: "mc-runs", label: "RUN REGISTER", icon: Terminal, badge: "runs" },
      { id: "mc-gates", label: "HUMAN GATES", icon: Stamp, badge: "gates" },
      { id: "mc-activity", label: "AGENT FEED", icon: Radio },
    ],
  },
  {
    group: "EVIDENCE",
    items: [
      { id: "mc-findings", label: "FINDINGS LEDGER", icon: ListChecks, badge: "findings" },
      { id: "mc-reports", label: "REPORT PACKS", icon: Files },
      { id: "mc-sources", label: "SOURCES & PORTALS", icon: Database },
    ],
  },
  {
    group: "COMMITTEE",
    items: [
      { id: "mc-ledger", label: "AWARD LEDGER", icon: Gavel },
      { id: "mc-committee", label: "COMMITTEE", icon: Users },
    ],
  },
  {
    group: "SYSTEM",
    items: [
      { id: "mc-stack", label: "AGENT STACK", icon: ServerCog },
      { id: "mc-rules", label: "RULES & GUARDS", icon: ShieldCheck },
    ],
  },
];

const SECTION_LABEL = Object.fromEntries(
  NAV_GROUPS.flatMap((g) => g.items.map((i) => [i.id, i.label] as const))
) as Record<SectionId, string>;

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

/* ── Real agent status (polled, never assumed) ─────────────────────────── */

type AgentHealth = {
  ok: boolean;
  service: string;
  version: string;
  uptimeSec: number;
  fsMcp: { status: string; tools: string[] };
  graphs: string[];
  counts: { toolCalls: number; runs: number; gates: number; pendingGates: number };
};

type AgentStatus = { sidecar: string | null; health: AgentHealth | null };

type AgentMode = "online" | "offline" | "linking";

function agentModeOf(s: AgentStatus): AgentMode {
  if (s.sidecar === null) return "linking"; /* first poll still in flight */
  return s.health?.ok ? "online" : "offline";
}

/**
 * Polls /api/agent-status — the server self-heals the quorum-mcp sidecar
 * and proxies its /api/health payload. The UI shows what this returns:
 * no hardcoded "ONLINE" anywhere.
 */
function useAgentStatus(): AgentStatus {
  const [status, setStatus] = useState<AgentStatus>({ sidecar: null, health: null });
  useEffect(() => {
    let alive = true;
    const pull = () =>
      fetch("/api/agent-status")
        .then((r) => r.json())
        .then((d: { sidecar?: string; health?: AgentHealth | null }) => {
          if (alive) setStatus({ sidecar: d.sidecar ?? "unavailable", health: d.health ?? null });
        })
        .catch(() => {
          if (alive) setStatus((p) => ({ ...p, health: null }));
        });
    void pull();
    const id = setInterval(pull, 15000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  return status;
}

function AgentStatusBadge({ mode, className }: { mode: AgentMode; className?: string }) {
  const label =
    mode === "online" ? "AGENT · ONLINE" : mode === "offline" ? "AGENT · OFFLINE" : "AGENT · LINKING";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-code text-[8.5px] font-semibold tracking-[0.18em]",
        mode === "online" && "border-ink-200 bg-white text-ink-700",
        mode === "offline" && "border-ink-200 bg-white text-ink-400",
        mode === "linking" && "border-ink-200 bg-white text-ink-500",
        className
      )}
      role="status"
      aria-label={`Agent status: ${mode}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        {mode === "online" && (
          <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-brand-500" aria-hidden="true" />
        )}
        <span
          className={cn(
            "relative inline-flex h-1.5 w-1.5 rounded-full",
            mode === "online" && "bg-brand-600",
            mode === "offline" && "bg-ink-300",
            mode === "linking" && "animate-pulse bg-ink-400"
          )}
          aria-hidden="true"
        />
      </span>
      {label}
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
          QUORUM-AGENT · SAMPLE RUN
        </p>
      </div>
      <div
        className="min-h-[190px] px-4 py-4 font-code text-[10.5px] leading-[2] sm:text-[11.5px]"
        role="img"
        aria-label="Sample agent run: a scripted replay of a run ingesting bids, checking documents, citing findings and queueing a human gate"
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

/* ── New-run wizard: brief → documents → scope ───────────────────────────── */

const SAMPLE_TITLES = [
  "Supply & installation of laboratory equipment",
  "Essential health commodities framework — lot 3",
  "Electronic medical records rollout — phase 2",
];

const WIZARD_STEPS = ["DETAILS", "DOCUMENTS", "SCOPE"] as const;

type StagedDoc = {
  id: string;
  name: string;
  size: string;
  status: "RECEIVED" | "PARSING" | "INDEXED";
  /* Cloud mirror state — present only for real uploaded files (the sample
     pack is simulated, so it carries none). SYNCING → CLOUD | LOCAL. */
  storage?: "SYNCING" | "CLOUD" | "LOCAL";
};

/* A realistic pack for the sample tender — the notice, the OCDS release,
   three sealed bids and their certificates (health theme throughout). */
const SAMPLE_PACK: { name: string; size: string }[] = [
  { name: "KE-NCB-104341-tender-notice.pdf", size: "2.4 MB" },
  { name: "ke-ncb-104341-ocds.json", size: "861 KB" },
  { name: "bid-01-medline-supplies.pdf", size: "8.2 MB" },
  { name: "bid-02-equity-lab-systems.pdf", size: "6.7 MB" },
  { name: "bid-03-apex-scientific.pdf", size: "7.9 MB" },
  { name: "batch-validity-certificates.pdf", size: "1.1 MB" },
];

const SCOPE_CHECKS = [
  { id: "specs", label: "Specs against clinical need", desc: "Every line item read against the clinical requirement." },
  { id: "quantities", label: "Quantities against consumption", desc: "Volumes checked against real offtake, not optimism." },
  { id: "prices", label: "Prices against other buyers", desc: "Unit rates benchmarked across the buyer network." },
] as const;

/* What the agent proposes when a user-launched run reaches its gate. */
const PROPOSED_AWARDS = [
  { supplier: "Medline Supplies Ltd", value: "KES 96.2M" },
  { supplier: "Equity Lab Systems", value: "KES 88.7M" },
  { supplier: "Apex Scientific Co.", value: "KES 91.4M" },
];

const LAUNCHED_NOTE_LINES = [
  "Price variance above the framework median — BOQ p.18",
  "Two mandatory certificates missing — checklist p.6",
  "Award criteria weighting unstated — p.3",
  "Bid validity shorter than the tender window — p.2",
];

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function DocStatusChip({ status }: { status: StagedDoc["status"] }) {
  if (status === "INDEXED")
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ink-950 px-2 py-0.5 font-code text-[7.5px] font-bold tracking-[0.14em] text-white">
        <CircleCheck className="h-2.5 w-2.5" aria-hidden="true" />
        INDEXED
      </span>
    );
  if (status === "PARSING")
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-50 px-2 py-0.5 font-code text-[7.5px] font-bold tracking-[0.14em] text-brand-700">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-brand-500" aria-hidden="true" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-600" aria-hidden="true" />
        </span>
        PARSING
      </span>
    );
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-ink-200 px-2 py-0.5 font-code text-[7.5px] font-bold tracking-[0.14em] text-ink-400">
      RECEIVED
    </span>
  );
}

/* Cloud-mirror chip for real uploads — Firebase Storage when the project
   allows it, the local vault when it doesn't. Never an error, always honest. */
function StorageChip({ storage }: { storage: NonNullable<StagedDoc["storage"]> }) {
  if (storage === "SYNCING")
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 font-code text-[7.5px] font-bold tracking-[0.14em] text-brand-700">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-brand-500" aria-hidden="true" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-600" aria-hidden="true" />
        </span>
        SYNC
      </span>
    );
  if (storage === "CLOUD")
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-ink-200 bg-white px-2 py-0.5 font-code text-[7.5px] font-bold tracking-[0.14em] text-ink-600">
        <CloudUpload className="h-2.5 w-2.5" aria-hidden="true" />
        CLOUD
      </span>
    );
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-ink-200 bg-white px-2 py-0.5 font-code text-[7.5px] font-bold tracking-[0.14em] text-ink-400">
      <HardDrive className="h-2.5 w-2.5" aria-hidden="true" />
      VAULT
    </span>
  );
}

function NewRunModal({
  open,
  onClose,
  onLaunch,
}: {
  open: boolean;
  onClose: () => void;
  onLaunch: (ref: string, title: string, format: string, docs: number, checks: number) => void;
}) {
  const [step, setStep] = useState(0);
  const [ref, setRef] = useState("KE-NCB-104341");
  const [title, setTitle] = useState(SAMPLE_TITLES[0]);
  const [format, setFormat] = useState("OCDS");
  const [docs, setDocs] = useState<StagedDoc[]>([]);
  const [dragging, setDragging] = useState(false);
  const [checks, setChecks] = useState<Record<string, boolean>>({ specs: true, quantities: true, prices: true });
  const refInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docsRef = useRef<StagedDoc[]>([]);
  const filesRef = useRef<Map<string, File>>(new Map());
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  /* Every fresh open is a fresh tender: back to step one, no pack staged. */
  useEffect(() => {
    if (!open) return;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    docsRef.current = [];
    filesRef.current.clear();
    const id = requestAnimationFrame(() => {
      setStep(0);
      setDocs([]);
      setDragging(false);
      refInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  /* Escape closes; pending parse timers die with the modal. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const timers = timersRef.current;
    return () => {
      window.removeEventListener("keydown", onKey);
      timers.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [open, onClose]);

  /* The ingestion pipeline every staged document walks:
     RECEIVED → PARSING → INDEXED — visible, never silent. */
  const runPipeline = (fresh: StagedDoc[]) => {
    fresh.forEach((d, idx) => {
      timersRef.current.push(
        setTimeout(() => {
          setDocs((cur) => cur.map((x) => (x.id === d.id ? { ...x, status: "PARSING" } : x)));
        }, 420 + idx * 340)
      );
      timersRef.current.push(
        setTimeout(() => {
          setDocs((cur) => cur.map((x) => (x.id === d.id ? { ...x, status: "INDEXED" } : x)));
        }, 1450 + idx * 340)
      );
    });
  };

  const addDocs = (items: { name: string; size: string; file?: File }[]) => {
    const seen = new Set(docsRef.current.map((d) => d.name));
    const fresh = items
      .filter((i) => !seen.has(i.name))
      .slice(0, 12)
      .map((i, idx) => {
        const id = `doc-${Date.now()}-${idx}-${i.name}`;
        if (i.file) filesRef.current.set(id, i.file);
        return {
          id,
          name: i.name,
          size: i.size,
          status: "RECEIVED" as const,
        };
      });
    if (fresh.length === 0) return [];
    docsRef.current = [...docsRef.current, ...fresh];
    setDocs(docsRef.current);
    runPipeline(fresh);
    return fresh;
  };

  const stageLocalFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const fresh = addDocs(
      Array.from(list).map((f) => ({ name: f.name, size: formatBytes(f.size), file: f }))
    );
    /* Every real file mirrors to Firebase Storage (project "public-tender")
       in parallel with the ingestion pipeline. If the bucket is unreachable
       the document simply stays in the local vault — never an error. */
    fresh.forEach((d) => {
      const file = filesRef.current.get(d.id);
      if (!file) return;
      setDocs((cur) => cur.map((x) => (x.id === d.id ? { ...x, storage: "SYNCING" } : x)));
      void uploadTenderDocument(ref.trim() || "UNREFERENCED", file).then((result) => {
        setDocs((cur) =>
          cur.map((x) => (x.id === d.id ? { ...x, storage: result ? "CLOUD" : "LOCAL" } : x))
        );
      });
    });
  };

  const indexed = docs.filter((d) => d.status === "INDEXED").length;
  const cloudSynced = docs.filter((d) => d.storage === "CLOUD").length;
  const checksOn = SCOPE_CHECKS.filter((c) => checks[c.id]).length;
  const canLeaveDocs = docs.length > 0;

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
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-ink-100 bg-white p-6 shadow-[0_40px_100px_rgba(11,12,15,0.45)] sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2.5 font-code text-[9px] font-semibold uppercase tracking-[0.28em] text-ink-500">
                  <span className="inline-block h-[2px] w-6 bg-brand-600" aria-hidden="true" />
                  LAUNCH A RUN
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

            {/* Step rail — 01 details · 02 documents · 03 scope */}
            <ol className="mt-5 flex items-center gap-2" aria-label="Run setup, three steps">
              {WIZARD_STEPS.map((label, i) => {
                const state = i === step ? "current" : i < step ? "done" : "todo";
                return (
                  <li key={label} className="flex min-w-0 flex-1 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => i <= step && setStep(i)}
                      disabled={i > step}
                      aria-current={state === "current" ? "step" : undefined}
                      className={cn(
                        "flex min-w-0 items-center gap-1.5 font-code text-[8.5px] font-bold tracking-[0.16em] transition-colors",
                        state === "current" && "text-brand-700",
                        state === "done" && "text-ink-900 hover:text-brand-700",
                        state === "todo" && "cursor-default text-ink-300"
                      )}
                    >
                      {state === "done" ? (
                        <CircleCheck className="h-3 w-3 shrink-0" aria-hidden="true" />
                      ) : (
                        <span
                          className={cn(
                            "grid h-4 w-4 shrink-0 place-items-center rounded-full border text-[7.5px]",
                            state === "current" && "border-brand-600 bg-brand-50 text-brand-700",
                            state === "todo" && "border-ink-200 text-ink-300"
                          )}
                          aria-hidden="true"
                        >
                          {i + 1}
                        </span>
                      )}
                      <span className="truncate">
                        0{i + 1} {label}
                      </span>
                    </button>
                    {i < WIZARD_STEPS.length - 1 && (
                      <span className={cn("h-px flex-1", i < step ? "bg-ink-950" : "bg-ink-100")} aria-hidden="true" />
                    )}
                  </li>
                );
              })}
            </ol>

            <form
              className="mt-6"
              onSubmit={(e) => {
                e.preventDefault();
                if (step < 2) {
                  setStep(step + 1);
                  return;
                }
                onLaunch(ref.trim() || "KE-NCB-104341", title, format, docs.length, checksOn);
              }}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -14 }}
                  transition={{ duration: 0.24, ease: EASE }}
                  className="space-y-4"
                >
                  {step === 0 && (
                    <>
                      <div>
                        <label htmlFor="nr-ref" className="mb-1.5 block font-code text-[9px] font-semibold tracking-[0.18em] text-ink-500">
                          TENDER REFERENCE
                        </label>
                        <input
                          id="nr-ref"
                          ref={refInputRef}
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
                    </>
                  )}

                  {step === 1 && (
                    <>
                      <div>
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="font-code text-[9px] font-semibold tracking-[0.18em] text-ink-500">TENDER PACK</p>
                          <p className="font-code text-[8.5px] tracking-[0.14em] text-ink-400" aria-live="polite">
                            {docs.length === 0
                              ? "NO DOCUMENTS STAGED"
                              : `INDEXED ${indexed} OF ${docs.length}${cloudSynced > 0 ? ` · ${cloudSynced} CLOUD` : ""}`}
                          </p>
                        </div>
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragging(true);
                          }}
                          onDragLeave={() => setDragging(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setDragging(false);
                            stageLocalFiles(e.dataTransfer.files);
                          }}
                          className={cn(
                            "relative mt-1.5 grid place-items-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
                            dragging ? "border-brand-500 bg-brand-50" : "border-ink-200 bg-paper/60 hover:border-ink-400"
                          )}
                        >
                          <input
                            ref={fileInputRef}
                            id="nr-files"
                            type="file"
                            multiple
                            accept=".pdf,.json,.zip,.xlsx,.csv,.docx,.eml"
                            className="sr-only"
                            onChange={(e) => {
                              stageLocalFiles(e.target.files);
                              e.target.value = "";
                            }}
                          />
                          <FileUp className={cn("h-6 w-6", dragging ? "text-brand-600" : "text-ink-300")} aria-hidden="true" />
                          <p className="mt-2.5 text-[14px] font-semibold text-ink-900">Drop the tender pack here</p>
                          <p className="mt-1 font-code text-[8px] tracking-[0.16em] text-ink-400">
                            NOTICE · BIDS · OCDS JSON · PRICE SCHEDULES · EMAILS — UP TO 12 FILES
                          </p>
                          <p className="mt-1.5 font-code text-[7.5px] tracking-[0.16em] text-ink-300">
                            REAL FILES MIRROR TO FIREBASE STORAGE · PROJECT “PUBLIC-TENDER”
                          </p>
                          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ink-950 px-4 font-code text-[9px] font-bold tracking-[0.14em] text-white transition-colors hover:bg-brand-600"
                            >
                              <FileUp className="h-3.5 w-3.5" aria-hidden="true" />
                              BROWSE FILES
                            </button>
                            <button
                              type="button"
                              onClick={() => addDocs(SAMPLE_PACK)}
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-4 font-code text-[9px] font-bold tracking-[0.14em] text-ink-600 transition-colors hover:border-ink-400 hover:text-ink-900"
                            >
                              USE SAMPLE PACK
                            </button>
                          </div>
                        </div>
                      </div>
                      {docs.length > 0 && (
                        <div>
                          <div
                            className="h-1 w-full overflow-hidden rounded-full bg-ink-100"
                            role="progressbar"
                            aria-label="Documents indexed"
                            aria-valuemin={0}
                            aria-valuemax={docs.length}
                            aria-valuenow={indexed}
                          >
                            <motion.div
                              className="h-full rounded-full bg-brand-600"
                              initial={false}
                              animate={{ width: `${(indexed / docs.length) * 100}%` }}
                              transition={{ duration: 0.5, ease: EASE }}
                            />
                          </div>
                          <ul className="mt-2.5 max-h-40 space-y-1.5 overflow-y-auto pr-1 [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-ink-200 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1">
                            {docs.map((d) => (
                              <li key={d.id} className="flex items-center gap-2.5 rounded-lg border border-ink-100 bg-white px-3 py-2">
                                <FileText className="h-3.5 w-3.5 shrink-0 text-ink-400" aria-hidden="true" />
                                <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink-800">{d.name}</span>
                                <span className="shrink-0 font-code text-[8px] tracking-[0.08em] text-ink-300">{d.size}</span>
                                <DocStatusChip status={d.status} />
                                {d.storage && <StorageChip storage={d.storage} />}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}

                  {step === 2 && (
                    <>
                      <div>
                        <p className="font-code text-[9px] font-semibold tracking-[0.18em] text-ink-500">SCOPE OF REVIEW</p>
                        <ul className="mt-1.5 space-y-1.5">
                          {SCOPE_CHECKS.map((c) => {
                            const on = checks[c.id];
                            return (
                              <li key={c.id}>
                                <button
                                  type="button"
                                  onClick={() => setChecks((prev) => ({ ...prev, [c.id]: !prev[c.id] }))}
                                  aria-pressed={on}
                                  className={cn(
                                    "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all",
                                    on ? "border-ink-950 bg-ink-950/[0.03]" : "border-ink-200 bg-white hover:border-ink-400"
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "mt-0.5 grid h-4.5 w-4.5 shrink-0 place-items-center rounded-md border",
                                      on ? "border-ink-950 bg-ink-950 text-white" : "border-ink-300 bg-white text-transparent"
                                    )}
                                    aria-hidden="true"
                                  >
                                    <CircleCheck className="h-3 w-3" />
                                  </span>
                                  <span className="min-w-0">
                                    <span className={cn("block text-[13.5px] font-semibold", on ? "text-ink-950" : "text-ink-500")}>
                                      {c.label}
                                    </span>
                                    <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-500">{c.desc}</span>
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                      <div className="flex items-center gap-3 rounded-xl border border-ink-100 bg-paper px-4 py-3">
                        <Lock className="h-3.5 w-3.5 shrink-0 text-ink-400" aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-semibold text-ink-800">Page-level citations — always on</p>
                          <p className="mt-0.5 font-code text-[8px] tracking-[0.14em] text-ink-400">
                            EVERY CLAIM CARRIES A PAGE, CLAUSE OR REGISTRY ID. NO EXCEPTIONS.
                          </p>
                        </div>
                      </div>
                      <p className="rounded-xl bg-paper px-4 py-3 text-center font-code text-[9px] font-bold tracking-[0.16em] text-ink-700">
                        {docs.length} DOCUMENT{docs.length === 1 ? "" : "S"}
                        {cloudSynced > 0 ? ` · ${cloudSynced} CLOUD` : ""} · {checksOn} CHECK{checksOn === 1 ? "" : "S"} · EST. 11 MIN
                      </p>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Footer nav — the wizard always shows the next step */}
              <div className="mt-6 flex items-center gap-2.5">
                {step > 0 && (
                  <button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    className="inline-flex h-[50px] items-center gap-1.5 rounded-xl border border-ink-200 px-4 text-[13.5px] font-semibold text-ink-600 transition-colors hover:border-ink-400 hover:text-ink-900"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Back
                  </button>
                )}
                <button
                  type="submit"
                  disabled={step === 1 && !canLeaveDocs}
                  className="group inline-flex h-[50px] flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 text-[15px] font-semibold text-white shadow-[0_10px_26px_rgba(217,38,22,0.3)] transition-all hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                >
                  {step === 0 && "Continue to documents"}
                  {step === 1 && "Continue to scope"}
                  {step === 2 && "Launch run"}
                  <ArrowRight
                    className={cn("h-4.5 w-4.5 transition-transform group-hover:translate-x-1", step === 1 && !canLeaveDocs && "hidden")}
                    aria-hidden="true"
                  />
                </button>
              </div>
              {step === 1 && !canLeaveDocs && (
                <p role="status" className="mt-2.5 text-center font-code text-[8px] tracking-[0.18em] text-brand-700">
                  STAGE AT LEAST ONE DOCUMENT — DROP A FILE OR USE THE SAMPLE PACK
                </p>
              )}
              <p className="mt-4 text-center font-code text-[8px] tracking-[0.2em] text-ink-400">
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
  counts,
  agent,
  onNavigate,
  onNewRun,
  onSignOut,
  onExit,
}: {
  active: SectionId;
  user: AuthUser | null;
  counts: { runs: number; gates: number; findings: number };
  agent: AgentStatus;
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

      <nav
        aria-label="Mission control sections"
        className="min-h-0 flex-1 overflow-y-auto px-3 pb-1 [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1"
      >
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.group} className={cn(gi > 0 && "mt-6", gi === 0 && "pt-1")}>
            <p className="px-3 pb-2 font-code text-[8px] font-semibold tracking-[0.3em] text-ink-600">{group.group}</p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.id;
                const badge = item.badge ? counts[item.badge] : null;
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
          </div>
        ))}
      </nav>

      <div className="px-3 pb-1">
        <button
          type="button"
          onClick={onNewRun}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-3 py-3 text-[13px] font-semibold text-white shadow-[0_10px_26px_rgba(217,38,22,0.28)] transition-all hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New run
        </button>
      </div>

      <div className="px-3 pb-5 pt-4">
        <div className="rounded-xl border border-white/10 bg-night-2 px-3.5 py-3">
          <p className="flex items-center gap-2 font-code text-[9px] font-semibold tracking-[0.18em] text-ink-200">
            <span className="relative flex h-1.5 w-1.5">
              {agentModeOf(agent) === "online" && (
                <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-brand-500" aria-hidden="true" />
              )}
              <span
                className={cn(
                  "relative inline-flex h-1.5 w-1.5 rounded-full",
                  agentModeOf(agent) === "online" && "bg-brand-500",
                  agentModeOf(agent) === "offline" && "bg-ink-600",
                  agentModeOf(agent) === "linking" && "animate-pulse bg-ink-400"
                )}
                aria-hidden="true"
              />
            </span>
            {agentModeOf(agent) === "online"
              ? "AGENT · ONLINE"
              : agentModeOf(agent) === "offline"
                ? "AGENT · OFFLINE"
                : "AGENT · LINKING"}
          </p>
          <p className="mt-1.5 font-code text-[7.5px] leading-[1.8] tracking-[0.16em] text-ink-500">
            {agent.health
              ? `MCP · ${agent.health.fsMcp.tools.length} FS TOOLS · OPEN WEIGHTS`
              : "MCP · OPEN WEIGHTS"}
            <br />
            {agent.health
              ? `${agent.health.counts.toolCalls} TOOL CALLS LOGGED · ${agent.health.counts.pendingGates} GATE${
                  agent.health.counts.pendingGates === 1 ? "" : "S"
                } PENDING`
              : "AWAITING SIDECAR TELEMETRY"}
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
  notes,
}: {
  runs: McRun[];
  query: string;
  onQuery: (v: string) => void;
  filter: RunFilter;
  onFilter: (f: RunFilter) => void;
  onToast: (m: string) => void;
  notes: Record<string, string[]>;
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
                const notesFor = notes[run.id] ?? [];
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
                                <span className="font-semibold text-ink-900">
                                  Run in progress —{" "}
                                  {run.duration === "CROSS-CHECK"
                                    ? "cross-checking the bids against the scope you set"
                                    : "reading the pack you staged"}
                                  .
                                </span>{" "}
                                Findings stream in at completion — every claim will carry a page citation, and the file
                                stops at your gate before anything is awarded.
                              </p>
                            ) : (
                              <>
                                <p className="font-code text-[8.5px] font-semibold tracking-[0.2em] text-ink-400">
                                  TOP FINDINGS · {run.findings} FLAGGED · {run.citations} CITATIONS · {run.unsourced} UNSOURCED
                                </p>
                                <ul className="mt-2.5 flex flex-wrap gap-1.5">
                                  {notesFor.map((note) => (
                                    <li
                                      key={note}
                                      className="rounded-md bg-brand-50 px-2.5 py-1.5 text-[11.5px] font-medium text-brand-800"
                                    >
                                      {note}
                                    </li>
                                  ))}
                                  {run.findings > notesFor.length && (
                                    <li className="rounded-md bg-ink-50 px-2.5 py-1.5 font-code text-[10px] font-semibold tracking-[0.1em] text-ink-500">
                                      +{run.findings - notesFor.length} MORE IN THE SOURCED REPORT
                                    </li>
                                  )}
                                </ul>
                              </>
                            )}
                            {/* A pack ingested at launch follows the run everywhere */}
                            {typeof run.docs === "number" && (
                              <p className="mt-3 font-code text-[8px] tracking-[0.18em] text-ink-400">
                                PACK AT LAUNCH · {run.docs} DOCUMENT{run.docs === 1 ? "" : "S"} INDEXED · INGESTED BY QUORUM-AGENT
                              </p>
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

/* ── Shared view furniture ───────────────────────────────────────────────── */

function ViewShell({
  fig,
  title,
  sub,
  action,
  children,
}: {
  fig: string;
  title: string;
  sub: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          <p className="flex items-center gap-2.5 font-code text-[10px] font-semibold uppercase tracking-[0.3em] text-ink-500">
            <span className="inline-block h-[2px] w-6 bg-brand-600" aria-hidden="true" />
            FIG. {fig}
          </p>
          <h1 className="mt-4 font-display text-[30px] font-black leading-[1.05] tracking-[-0.02em] text-ink-950 sm:text-[38px]">
            {title}
            <span className="text-brand-600">.</span>
          </h1>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-ink-600">{sub}</p>
        </div>
        {action}
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}

function StandingRuleCard({ onToast }: { onToast: (m: string) => void }) {
  return (
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
  );
}

function NewRunCard({ onNewRun }: { onNewRun: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-ink-950 bg-night p-5 text-white shadow-[0_22px_55px_rgba(11,12,15,0.3)]">
      <div className="bg-grid-dark pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="relative">
        <h3 className="font-display text-[15px] font-black tracking-[-0.01em]">Put the agent in a file</h3>
        <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-300">
          Point Quorum at a tender — OCDS, a PDF pack or the email bag. The first finding lands in about twenty minutes.
        </p>
        <button
          type="button"
          onClick={onNewRun}
          className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-4 font-code text-[9px] font-bold tracking-[0.18em] text-white transition-colors hover:bg-brand-700"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          QUEUE A RUN
        </button>
      </div>
    </div>
  );
}

function GavelProtocolCard() {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-[0_1px_2px_rgba(11,12,15,0.04)]">
      <h3 className="font-display text-[15px] font-black tracking-[-0.01em] text-ink-950">The gavel protocol</h3>
      <ol className="mt-4 space-y-3">
        {[
          "THE AGENT QUEUES THE FILE AT THE GATE",
          "THE COMMITTEE READS THE CITED FLAGS",
          "AWARD OR RETURN — BY NAMED HUMANS",
          "THE LEDGER LOGS IT, PERMANENTLY",
        ].map((step, i) => (
          <li key={step} className="flex gap-3 font-code text-[8.5px] tracking-[0.16em] text-ink-600">
            <span className="shrink-0 font-bold text-brand-600">0{i + 1}</span>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ── Findings ledger ─────────────────────────────────────────────────────── */

type FindingClass =
  | "DOCUMENT"
  | "COMPLIANCE"
  | "PRICING"
  | "REGISTRY"
  | "ARITHMETIC"
  | "DISCLOSURE"
  | "LOGISTICS";
type FindingStatus = "OPEN" | "CLEARED" | "RE-CHECK";
type SeedFinding = { run: string; note: string; cls: FindingClass; src: string };
type FindingRow = SeedFinding & { id: string; tender: string; status: FindingStatus };

const SEED_FINDINGS: SeedFinding[] = [
  { run: "KE-NCB-104293", note: "Bank statement anomaly", cls: "DOCUMENT", src: "P.114" },
  { run: "KE-NCB-104293", note: "Bid bond expires before award", cls: "COMPLIANCE", src: "BOND CERT · P.88" },
  { run: "KE-NCB-104293", note: "Registry match — related bidders", cls: "REGISTRY", src: "REGISTRY · P.78" },
  { run: "ZM-PPA-8841", note: "Unit price 38% above framework median", cls: "PRICING", src: "BOQ · P.22" },
  { run: "RW-RPPA-0552", note: "Missing tax clearance — bid 3", cls: "COMPLIANCE", src: "BID 3 · P.9" },
  { run: "RW-RPPA-0552", note: "Arithmetic variance in the BOQ", cls: "ARITHMETIC", src: "BOQ · P.22" },
  { run: "RW-RPPA-0552", note: "Subcontractor undisclosed", cls: "DISCLOSURE", src: "FORM 12 · P.51" },
  { run: "KE-NCB-104277", note: "Two bids share one IP address", cls: "REGISTRY", src: "AUDIT LOG · P.130" },
  { run: "KE-NCB-104277", note: "Deposit source undocumented", cls: "DOCUMENT", src: "P.77" },
  { run: "KE-NCB-104277", note: "Delivery window infeasible", cls: "LOGISTICS", src: "SCHEDULE · P.64" },
  { run: "ZM-PPA-8830", note: "Quotation date mismatch", cls: "DOCUMENT", src: "P.12" },
];

/* Findings the agent raises when a freshly launched run completes. */
const LAUNCHED_FINDINGS: SeedFinding[] = [
  { run: "", note: "Price variance above the framework median", cls: "PRICING", src: "BOQ · P.18" },
  { run: "", note: "Two mandatory certificates missing", cls: "COMPLIANCE", src: "CHECKLIST" },
  { run: "", note: "Award criteria weighting left unstated", cls: "DISCLOSURE", src: "CRITERIA · P.3" },
  { run: "", note: "Bid validity shorter than the tender window", cls: "COMPLIANCE", src: "BID · P.2" },
];

function buildFindingRows(
  seed: SeedFinding[],
  runs: McRun[],
  verdicts: Record<string, "AWARDED" | "RETURNED">
): FindingRow[] {
  return seed.flatMap((f, i) => {
    const run = runs.find((r) => r.id === f.run);
    if (!run) return [];
    /* A run still in flight has no findings yet — except one the committee
       has returned, whose flags re-open as RE-CHECK while the agent re-verifies. */
    if (run.status === "queued") return [];
    if (run.status === "running" && verdicts[f.run] !== "RETURNED") return [];
    const status: FindingStatus =
      verdicts[f.run] === "AWARDED" ? "CLEARED" : verdicts[f.run] === "RETURNED" ? "RE-CHECK" : "OPEN";
    return [{ ...f, id: `${f.run}-f${i}`, tender: run.title, status }];
  });
}

function FindingStatusChip({ status }: { status: FindingStatus }) {
  if (status === "OPEN")
    return (
      <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 font-code text-[8.5px] font-bold tracking-[0.16em] text-brand-800">
        OPEN
      </span>
    );
  if (status === "RE-CHECK")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-2.5 py-1 font-code text-[8.5px] font-bold tracking-[0.16em] text-white">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-white" aria-hidden="true" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />
        </span>
        RE-CHECK
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-ink-950 px-2.5 py-1 font-code text-[8.5px] font-bold tracking-[0.16em] text-white">
      <CircleCheck className="h-2.5 w-2.5" aria-hidden="true" />
      CLEARED
    </span>
  );
}

function FindingsView({ rows, onOpenRun }: { rows: FindingRow[]; onOpenRun: () => void }) {
  const [f, setF] = useState<"ALL" | FindingStatus>("ALL");
  const filtered = f === "ALL" ? rows : rows.filter((r) => r.status === f);
  const open = rows.filter((r) => r.status === "OPEN").length;
  const classCounts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.cls] = (acc[r.cls] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <ViewShell
      fig="08"
      title="Findings ledger"
      sub="Every flag the agent has raised — classed, cited, and traceable to the page it came from. When the committee clears a gate, its flags clear with it."
    >
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-[0_1px_2px_rgba(11,12,15,0.04)]">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
              <div>
                <h2 className="font-display text-[17px] font-black tracking-[-0.01em] text-ink-950">Ledger</h2>
                <p className="mt-0.5 font-code text-[8.5px] tracking-[0.2em] text-ink-400">
                  {rows.length} FLAGS · {open} OPEN · 0 UNSOURCED
                </p>
              </div>
              <div className="flex items-center gap-1.5" role="group" aria-label="Filter findings by status">
                {(["ALL", "OPEN", "CLEARED", "RE-CHECK"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setF(k)}
                    aria-pressed={f === k}
                    className={cn(
                      "h-7 rounded-full border px-3 font-code text-[8.5px] font-bold tracking-[0.14em] transition-all",
                      f === k
                        ? "border-ink-950 bg-ink-950 text-white"
                        : "border-ink-200 bg-white text-ink-500 hover:border-ink-400"
                    )}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </header>
            <div className="max-h-[520px] overflow-y-auto [scrollbar-width:thin]">
              <table className="w-full min-w-[620px] border-collapse text-left">
                <caption className="sr-only">Findings ledger — every flag with its class, status and source</caption>
                <thead className="sticky top-0 z-10 bg-paper/95 backdrop-blur">
                  <tr className="border-b border-ink-100">
                    {["FINDING", "CLASS", "STATUS", "SOURCE", "RUN"].map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className="px-4 py-2.5 font-code text-[8px] font-semibold tracking-[0.22em] text-ink-400"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr
                      key={row.id}
                      tabIndex={0}
                      onClick={onOpenRun}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onOpenRun();
                        }
                      }}
                      aria-label={`Open the run register at ${row.run}`}
                      className="cursor-pointer border-b border-ink-50 transition-colors hover:bg-paper"
                    >
                      <td className="max-w-[280px] py-3.5 pl-5 pr-4">
                        <p className="text-[13px] font-semibold text-ink-900">{row.note}</p>
                        <p className="mt-0.5 truncate text-[11.5px] text-ink-400">{row.tender}</p>
                      </td>
                      <td className="px-4">
                        <span className="inline-flex rounded-md border border-ink-200 bg-white px-2 py-1 font-code text-[7.5px] font-bold tracking-[0.14em] text-ink-600">
                          {row.cls}
                        </span>
                      </td>
                      <td className="px-4">
                        <FindingStatusChip status={row.status} />
                      </td>
                      <td className="px-4 font-code text-[8.5px] tracking-[0.1em] text-ink-500">{row.src}</td>
                      <td className="py-3.5 pr-5 font-code text-[9.5px] font-bold tracking-[0.06em] text-ink-950">{row.run}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center font-code text-[10px] tracking-[0.18em] text-ink-400">
                        NO FINDINGS IN THIS VIEW
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="grid content-start gap-4 sm:gap-6">
          <div className="relative overflow-hidden rounded-2xl border border-ink-950 bg-night p-5 text-white shadow-[0_22px_55px_rgba(11,12,15,0.3)]">
            <div className="bg-grid-dark pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
            <div className="relative">
              <h3 className="font-display text-[15px] font-black tracking-[-0.01em]">The invariant</h3>
              <p className="mt-3 font-code text-[9px] leading-[2] tracking-[0.16em] text-ink-300">
                0 UNSOURCED CLAIMS.
                <br />
                EVERY FLAG CARRIES A PAGE,
                <br />
                A CLAUSE OR A REGISTRY ID —
                <br />
                <span className="text-brand-400">BY CONSTRUCTION, NOT BY PROMISE.</span>
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-[0_1px_2px_rgba(11,12,15,0.04)]">
            <h3 className="font-display text-[15px] font-black tracking-[-0.01em] text-ink-950">Class map</h3>
            <ul className="mt-4 space-y-2.5">
              {Object.entries(classCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([cls, n]) => (
                  <li key={cls} className="flex items-center gap-3">
                    <span className="w-[96px] shrink-0 font-code text-[8px] font-bold tracking-[0.16em] text-ink-600">{cls}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                      <span
                        className="block h-full rounded-full bg-brand-500"
                        style={{ width: `${rows.length > 0 ? (n / rows.length) * 100 : 0}%` }}
                      />
                    </span>
                    <span className="w-6 text-right font-code text-[9px] font-bold text-ink-800 tabular">{n}</span>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </div>
    </ViewShell>
  );
}

/* ── Report packs ────────────────────────────────────────────────────────── */

function shaTag(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const a = h.toString(16).padStart(8, "0").slice(0, 4);
  const b = (h >>> 7).toString(16).padStart(4, "0").slice(-4);
  return `${a}…${b}`;
}

function ReportPacksView({
  runs,
  verdicts,
  onToast,
}: {
  runs: McRun[];
  verdicts: Record<string, "AWARDED" | "RETURNED">;
  onToast: (m: string) => void;
}) {
  const packs = runs.filter((r) => r.findings > 0 && (r.status === "gate" || r.status === "complete"));

  return (
    <ViewShell
      fig="09"
      title="Report packs"
      sub="The sourced report is the deliverable — findings, citations and the audit hash, bound per run. A pack seals the moment the committee signs; after that it is evidence, not a document."
    >
      <div className="relative overflow-hidden rounded-2xl border border-ink-950 bg-night p-5 text-white shadow-[0_22px_55px_rgba(11,12,15,0.3)] sm:p-6">
        <div className="bg-grid-dark pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-[15px] font-black tracking-[-0.01em]">The committee pack</h3>
            <p className="mt-2 max-w-md text-[12.5px] leading-relaxed text-ink-300">
              Every sealed report for the sitting, bound into one cited file with a shared audit hash — the pack the
              committee actually reads.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onToast("COMMITTEE PACK BINDING QUEUED — READY BEFORE THE SITTING")}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 font-code text-[9px] font-bold tracking-[0.18em] text-white transition-colors hover:bg-brand-700"
          >
            <Files className="h-3.5 w-3.5" aria-hidden="true" />
            QUEUE BINDING
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:mt-6 sm:grid-cols-2">
        {packs.map((run, i) => {
          const assembling = run.status === "gate";
          const v = verdicts[run.id];
          const decision =
            v === "AWARDED"
              ? "AWARDED — SIGNED AT THE GATE"
              : v === "RETURNED"
                ? "RETURNED — RE-FILED AFTER CLARIFICATION"
                : null;
          const pages = 58 + run.citations * 9;
          const size = (2.4 + run.findings * 1.6).toFixed(1);
          return (
            <motion.article
              key={run.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 * i, ease: EASE }}
              className="flex flex-col rounded-2xl border border-ink-100 bg-white p-5 shadow-[0_1px_2px_rgba(11,12,15,0.04)]"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-code text-[10px] font-bold tracking-[0.08em] text-ink-950">{run.id}</p>
                {assembling ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 font-code text-[8px] font-bold tracking-[0.16em] text-brand-700">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-brand-500" aria-hidden="true" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-600" aria-hidden="true" />
                    </span>
                    ASSEMBLING
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-ink-950 px-2.5 py-1 font-code text-[8px] font-bold tracking-[0.16em] text-white">
                    <CircleCheck className="h-2.5 w-2.5" aria-hidden="true" />
                    SEALED
                  </span>
                )}
              </div>
              <p className="mt-1.5 truncate text-[13.5px] font-semibold text-ink-700">{run.title}</p>
              <dl className="mt-4 grid grid-cols-3 gap-2 border-y border-ink-50 py-3 font-code text-[8px] tracking-[0.14em]">
                <div>
                  <dt className="text-ink-300">FINDINGS</dt>
                  <dd className="mt-1 text-[13px] font-bold text-ink-950 tabular">{run.findings}</dd>
                </div>
                <div>
                  <dt className="text-ink-300">CITED</dt>
                  <dd className="mt-1 text-[13px] font-bold text-ink-950 tabular">{run.citations}</dd>
                </div>
                <div>
                  <dt className="text-ink-300">UNSOURCED</dt>
                  <dd className="mt-1 text-[13px] font-bold text-brand-700 tabular">0</dd>
                </div>
              </dl>
              <p className="mt-3 font-code text-[7.5px] leading-[1.9] tracking-[0.14em] text-ink-400">
                PAGES ~{pages} · SIZE {size} MB · sha256 {shaTag(run.id)}
                {decision && (
                  <>
                    <br />
                    DECISION · {decision}
                  </>
                )}
              </p>
              <div className="mt-4 flex items-center gap-2 pt-1">
                {assembling ? (
                  <button
                    type="button"
                    onClick={() => onToast(`${run.id} SEALS AT THE GATE — EXPORT UNLOCKS ON SIGNATURE`)}
                    className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-ink-200 px-3 font-code text-[8.5px] font-bold tracking-[0.14em] text-ink-500 transition-colors hover:border-ink-400 hover:text-ink-800"
                  >
                    <Lock className="h-3 w-3" aria-hidden="true" />
                    PREVIEW ONLY
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onToast(`EXPORT QUEUED — ${run.id} · PDF + OCDS · ${size} MB`)}
                    className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-ink-950 px-3 font-code text-[8.5px] font-bold tracking-[0.14em] text-white transition-colors hover:bg-brand-600"
                  >
                    <Download className="h-3 w-3" aria-hidden="true" />
                    DOWNLOAD PACK
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.clipboard?.writeText)
                      navigator.clipboard.writeText(`quorum audit — ${run.id} — sha256 ${shaTag(run.id)}`).catch(() => undefined);
                    onToast("AUDIT TRAIL COPIED TO CLIPBOARD");
                  }}
                  aria-label={`Copy audit trail for ${run.id}`}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-ink-200 text-ink-500 transition-colors hover:border-ink-400 hover:text-ink-900"
                >
                  <Copy className="h-3 w-3" aria-hidden="true" />
                </button>
              </div>
            </motion.article>
          );
        })}
      </div>
    </ViewShell>
  );
}

/* ── Sources & portals ───────────────────────────────────────────────────── */

const PORTAL_KINDS: Record<string, string> = {
  "OCDS EXPLORER": "OPEN DATA · OCDS 1.1",
  "PPA · KENYA": "NATIONAL PORTAL",
  "PRAZ · ZIMBABWE": "NATIONAL PORTAL",
  "GGPPBD · GHANA": "NATIONAL PORTAL",
};

function SourcesView({ onToast }: { onToast: (m: string) => void }) {
  const standards = ["OCDS 1.1", "MCP TOOLS", "OPEN WEIGHTS", "PAGE CITATIONS"];
  const degraded = PORTALS.filter((p) => !p.ok).length;

  return (
    <ViewShell
      fig="10"
      title="Sources & portals"
      sub="A finding is only as lawful as its source. Every bid is read against national portals, supplier registries and the OCDS record — and each finding cites which."
      action={
        <button
          type="button"
          onClick={() => onToast("SOURCE REQUESTS ARE ADMIN-LOCKED IN v0.9")}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 font-code text-[9px] font-bold tracking-[0.18em] text-ink-600 transition-colors hover:border-ink-950 hover:text-ink-950"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          REQUEST A SOURCE
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {standards.map((s, i) => (
          <motion.div
            key={s}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 * i, ease: EASE }}
            className="rounded-2xl border border-ink-100 bg-white p-4 shadow-[0_1px_2px_rgba(11,12,15,0.04)]"
          >
            <p className="font-code text-[9.5px] font-bold tracking-[0.18em] text-ink-900">{s}</p>
            <p className="mt-1.5 font-code text-[7px] tracking-[0.18em] text-ink-400">STANDARD {String(i + 1).padStart(2, "0")}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-[0_1px_2px_rgba(11,12,15,0.04)]">
            <header className="flex items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
              <div>
                <h2 className="font-display text-[17px] font-black tracking-[-0.01em] text-ink-950">Connected portals</h2>
                <p className="mt-0.5 font-code text-[8.5px] tracking-[0.2em] text-ink-400">
                  {PORTALS.length} SOURCES · {degraded} DEGRADED
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3 py-1.5 font-code text-[8px] font-semibold tracking-[0.18em] text-ink-600">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-brand-500" aria-hidden="true" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-600" aria-hidden="true" />
                </span>
                POLLING
              </span>
            </header>
            <ul>
              {PORTALS.map((p) => (
                <li
                  key={p.name}
                  className="flex flex-wrap items-center gap-3 border-b border-ink-50 px-5 py-4 last:border-b-0"
                >
                  <span
                    className={cn("relative flex h-2 w-2 shrink-0", !p.ok && "text-brand-600")}
                    aria-hidden="true"
                  >
                    {p.ok ? (
                      <span className="h-2 w-2 rounded-full bg-ink-950" />
                    ) : (
                      <>
                        <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-brand-500" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" />
                      </>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-code text-[10px] font-bold tracking-[0.12em] text-ink-950">
                      {p.name}
                    </span>
                    <span className="mt-0.5 block font-code text-[7.5px] tracking-[0.18em] text-ink-400">
                      {PORTAL_KINDS[p.name] ?? "DATA SOURCE"}
                    </span>
                  </span>
                  <span className="font-code text-[8px] tracking-[0.14em] text-ink-400">SYNCED {p.at}</span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 font-code text-[8px] font-bold tracking-[0.16em]",
                      p.ok ? "bg-ink-950 text-white" : "bg-brand-600 text-white"
                    )}
                  >
                    {p.ok ? "SYNCED" : "DEGRADED"}
                  </span>
                  {!p.ok && (
                    <button
                      type="button"
                      onClick={() => onToast("RETRY QUEUED — GGPPBD SYNC · ATTEMPT 2 IN 60S")}
                      aria-label={`Retry sync for ${p.name}`}
                      className="grid h-7 w-7 place-items-center rounded-md border border-ink-200 text-ink-500 transition-colors hover:border-brand-400 hover:text-brand-700"
                    >
                      <RefreshCw className="h-3 w-3" aria-hidden="true" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="grid content-start gap-4 sm:gap-6">
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-[0_1px_2px_rgba(11,12,15,0.04)]">
            <h3 className="font-display text-[15px] font-black tracking-[-0.01em] text-ink-950">Why sources matter</h3>
            <p className="mt-3 text-[12.5px] leading-relaxed text-ink-600">
              A price is not “high” until the framework median says so. A bidder is not “related” until the registry says
              so. Quorum cites the source — or it does not speak.
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-ink-100 bg-sand p-5">
            <ShieldCheck className="h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
            <p className="font-code text-[7.5px] leading-[1.9] tracking-[0.14em] text-ink-600">
              AUDIT LOGS sha256-SEALED · ON-PREM READY · NO TRACKERS
            </p>
          </div>
        </div>
      </div>
    </ViewShell>
  );
}

/* ── Award ledger ────────────────────────────────────────────────────────── */

function AwardLedgerView({
  ledger,
  awaiting,
  onToast,
}: {
  ledger: LedgerRow[];
  awaiting: number;
  onToast: (m: string) => void;
}) {
  const awarded = ledger.filter((l) => l.action === "AWARDED").length;
  const returned = ledger.filter((l) => l.action === "RETURNED").length;

  return (
    <ViewShell
      fig="11"
      title="Award ledger"
      sub="Every decision made at a gate — who signed, what they signed, and when. The agent writes everything else; only this page carries the gavel."
    >
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 sm:space-y-6 lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {[
              { label: "DECISIONS LOGGED", value: ledger.length },
              { label: "AWARDED", value: awarded },
              { label: "RETURNED", value: returned },
              { label: "AWAITING GATE", value: awaiting },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.05 * i, ease: EASE }}
                className="rounded-2xl border border-ink-100 bg-white p-4 shadow-[0_1px_2px_rgba(11,12,15,0.04)]"
              >
                <p className="font-code text-[8px] font-semibold tracking-[0.22em] text-ink-400">{s.label}</p>
                <p className="mt-2 font-display text-[28px] font-black leading-none tracking-[-0.02em] tabular">{s.value}</p>
              </motion.div>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-[0_1px_2px_rgba(11,12,15,0.04)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-left">
                <caption className="sr-only">Award ledger — decisions signed at the human gate</caption>
                <thead>
                  <tr className="border-b border-ink-100 bg-paper/60">
                    {["TENDER", "DECISION", "SIGNED BY", "LOGGED"].map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className="px-4 py-2.5 font-code text-[8px] font-semibold tracking-[0.22em] text-ink-400"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((row) => (
                    <tr
                      key={`${row.tender}-${row.at}-${row.action}`}
                      className="border-b border-ink-50 transition-colors last:border-b-0 hover:bg-paper"
                    >
                      <td className="py-3.5 pl-5 pr-4 font-code text-[10px] font-bold tracking-[0.08em] text-ink-950">
                        {row.tender}
                      </td>
                      <td className="px-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-code text-[8.5px] font-bold tracking-[0.16em]",
                            row.action === "AWARDED"
                              ? "bg-ink-950 text-white"
                              : "border border-brand-200 bg-brand-50 text-brand-800"
                          )}
                        >
                          {row.action === "AWARDED" ? (
                            <CircleCheck className="h-2.5 w-2.5" aria-hidden="true" />
                          ) : (
                            <CircleAlert className="h-2.5 w-2.5" aria-hidden="true" />
                          )}
                          {row.action}
                        </span>
                      </td>
                      <td className="px-4 text-[13px] font-semibold text-ink-700">{row.by}</td>
                      <td className="py-3.5 pr-5 font-code text-[8.5px] tracking-[0.12em] text-ink-400">{row.at}</td>
                    </tr>
                  ))}
                  {ledger.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center font-code text-[10px] tracking-[0.18em] text-ink-400">
                        THE LEDGER IS BLANK — DECISIONS APPEAR THE MOMENT A GATE SIGNS
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="grid content-start gap-4 sm:gap-6">
          <div className="relative overflow-hidden rounded-2xl border border-ink-950 bg-night p-5 text-white shadow-[0_22px_55px_rgba(11,12,15,0.3)]">
            <div className="bg-grid-dark pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
            <div className="relative">
              <h3 className="font-display text-[15px] font-black tracking-[-0.01em]">The gavel has no autoplay</h3>
              <p className="mt-3 font-code text-[9px] leading-[2] tracking-[0.16em] text-ink-300">
                EVERY LINE CARRIES A NAME
                <br />
                AND A TIMESTAMP.
                <br />
                <span className="text-brand-400">THE AGENT PREPARES, FLAGS AND CITES — IT CAN NEVER SIGN.</span>
              </p>
            </div>
          </div>
          <StandingRuleCard onToast={onToast} />
        </div>
      </div>
    </ViewShell>
  );
}

/* ── Committee ───────────────────────────────────────────────────────────── */

type CommitteeData = {
  seats: number;
  required: number;
  present: number;
  open: number;
  members: { name: string; role: string; isChair: boolean; status: "PRESENT" | "EXCUSED" }[];
  you: { name: string } | null;
  lastSummonsAt: string | null;
};

const NUMBER_WORDS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
];

function countWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

function capWord(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function summonsClock(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

function CommitteeView({ user, onToast }: { user: AuthUser | null; onToast: (m: string) => void }) {
  const [data, setData] = useState<CommitteeData | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const [summoning, setSummoning] = useState(false);

  const load = useCallback(() => {
    let alive = true;
    setLoadErr(false);
    fetch("/api/committee")
      .then((r) => r.json())
      .then((d: CommitteeData | { error: string }) => {
        if (!alive) return;
        if ("error" in d) setLoadErr(true);
        else {
          setData(d);
          setLoadErr(false);
        }
      })
      .catch(() => {
        if (alive) setLoadErr(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => load(), [load]);

  const summon = async () => {
    if (summoning) return;
    setSummoning(true);
    try {
      const res = await fetch("/api/committee/summon", { method: "POST" });
      const d = (await res.json()) as CommitteeData | { error: string };
      if (!res.ok || "error" in d) throw new Error("error" in d ? d.error : "failed");
      setData(d);
      onToast(
        d.open === 0
          ? "QUORUM PRESENT — THE SITTING CAN PROCEED"
          : `SITTING SUMMONS ISSUED — ${d.open} SEAT${d.open === 1 ? "" : "S"} STILL PENDING QUORUM CALL`
      );
    } catch {
      onToast("SUMMONS FAILED — COMMITTEE SERVICE UNREACHABLE");
    } finally {
      setSummoning(false);
    }
  };

  /* Roll-call order: the chair opens, the gavel sits second, then the rest.
     Excused members close the roll. Everything here comes from /api/committee —
     stored members plus the signed-in officer; nothing is hardcoded. */
  const roll: { initials: string; name: string; role: string; you?: boolean; excused?: boolean }[] = [];
  if (data) {
    const presentMembers = data.members.filter((m) => m.status === "PRESENT");
    const excusedMembers = data.members.filter((m) => m.status === "EXCUSED");
    const chair = presentMembers.find((m) => m.isChair);
    const rest = presentMembers.filter((m) => !m.isChair);
    if (chair) roll.push({ initials: initialsOf(chair.name), name: chair.name, role: chair.role });
    if (data.you)
      roll.push({
        initials: initialsOf(data.you.name),
        name: `${data.you.name} — you`,
        role: "PROCUREMENT OFFICER · HOLDS THE GAVEL",
        you: true,
      });
    rest.forEach((m) => roll.push({ initials: initialsOf(m.name), name: m.name, role: m.role }));
    excusedMembers.forEach((m) =>
      roll.push({ initials: initialsOf(m.name), name: m.name, role: m.role, excused: true })
    );
  }
  const youSeatIndex = roll.findIndex((m) => m.you); /* the gavel's square on the quorum grid */

  return (
    <ViewShell
      fig="12"
      title="The committee"
      sub={
        data
          ? `${capWord(countWord(data.seats))} seats, ${countWord(data.present)} present — the quorum the law asks for before an award counts. The agent attends every sitting; it holds no seat and no gavel.`
          : "The roll-call is being read from the committee record — the seats, the presence, and the quorum the law asks for before an award counts."
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          {loadErr ? (
            <div className="rounded-2xl border border-dashed border-ink-200 p-8 text-center">
              <p className="font-code text-[10px] font-bold tracking-[0.22em] text-ink-500">
                COMMITTEE ROLL UNAVAILABLE
              </p>
              <p className="mt-2 font-code text-[8px] tracking-[0.18em] text-ink-400">
                THE RECORD COULD NOT BE READ — NOTHING IS SHOWN RATHER THAN GUESSED
              </p>
              <button
                type="button"
                onClick={load}
                className="mt-4 inline-flex h-9 items-center rounded-xl border border-ink-200 bg-white px-4 font-code text-[9px] font-bold tracking-[0.18em] text-ink-600 transition-colors hover:border-ink-950 hover:text-ink-950"
              >
                RE-READ THE ROLL
              </button>
            </div>
          ) : !data ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3" aria-busy="true" aria-label="Reading the committee roll">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-[104px] animate-pulse rounded-2xl border border-ink-100 bg-ink-50/60" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
              {roll.map((m, i) => (
                <motion.div
                  key={m.name}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.05 * i, ease: EASE }}
                  className={cn(
                    "rounded-2xl border bg-white p-4 shadow-[0_1px_2px_rgba(11,12,15,0.04)]",
                    m.you ? "border-brand-300 ring-2 ring-brand-600/15" : m.excused ? "border-ink-100 bg-ink-50/50" : "border-ink-100"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "grid h-10 w-10 shrink-0 place-items-center rounded-full font-code text-[10px] font-bold text-white",
                        m.you ? "bg-brand-600" : "bg-ink-950"
                      )}
                      aria-hidden="true"
                    >
                      {m.initials}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-semibold text-ink-950">{m.name}</p>
                      <p className="mt-0.5 font-code text-[7px] tracking-[0.18em] text-ink-400">{m.role}</p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-code text-[8px] font-bold tracking-[0.16em]",
                      m.you
                        ? "bg-brand-600 text-white"
                        : m.excused
                          ? "border border-ink-200 bg-white text-ink-400"
                          : "bg-ink-50 text-ink-700"
                    )}
                  >
                    {m.you ? (
                      <>
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-white" aria-hidden="true" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />
                        </span>
                        YOU · GAVEL
                      </>
                    ) : m.excused ? (
                      "EXCUSED"
                    ) : (
                      "PRESENT"
                    )}
                  </span>
                </motion.div>
              ))}
              {Array.from({ length: data.open }).map((_, i) => (
                <motion.div
                  key={`open-${i}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.3 + 0.05 * i, ease: EASE }}
                  className="grid place-items-center rounded-2xl border border-dashed border-ink-200 p-4 text-center"
                >
                  <div>
                    <p className="font-code text-[8px] font-semibold tracking-[0.22em] text-ink-400">SEAT OPEN</p>
                    <p className="mt-1 font-code text-[7px] tracking-[0.18em] text-ink-300">QUORUM CALL PENDING</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="grid content-start gap-4 sm:gap-6">
          <div className="relative overflow-hidden rounded-2xl border border-ink-950 bg-night p-5 text-white shadow-[0_22px_55px_rgba(11,12,15,0.3)]">
            <div className="bg-grid-dark pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
            <div className="relative">
              <div className="flex items-center justify-between gap-4">
                <h3 className="font-display text-[15px] font-black tracking-[-0.01em]">Quorum</h3>
                <div className="grid grid-cols-3 gap-1" aria-hidden="true">
                  {data
                    ? Array.from({ length: data.seats }).map((_, i) => (
                        <span
                          key={i}
                          className={cn(
                            "h-2 w-2 rounded-[2px]",
                            i === youSeatIndex
                              ? "bg-brand-500"
                              : i < data.present
                                ? "bg-white"
                                : "border border-white/25"
                          )}
                        />
                      ))
                    : Array.from({ length: 9 }).map((_, i) => (
                        <span key={i} className="h-2 w-2 rounded-[2px] border border-white/25" />
                      ))}
                </div>
              </div>
              <p className="mt-4 font-display text-[40px] font-black leading-none tracking-[-0.02em]">
                {data ? data.present : "—"}
                <span className="text-brand-400">/</span>
                {data ? data.seats : "—"}
              </p>
              <p className="mt-3 text-[12.5px] leading-relaxed text-ink-300">
                The minimum of members a committee needs before an award becomes lawful — the mark on the door is that
                threshold, drawn.
              </p>
              <p className="mt-4 font-code text-[8px] tracking-[0.18em] text-ink-400">
                {data
                  ? `PRESENT TODAY ${data.present} · OPEN ${data.open} · A SITTING REQUIRES ${data.required}`
                  : "READING THE COMMITTEE RECORD…"}
              </p>
            </div>
          </div>
          <GavelProtocolCard />
          <button
            type="button"
            onClick={summon}
            disabled={!data || summoning}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-4 font-code text-[9px] font-bold tracking-[0.18em] text-ink-600 transition-colors hover:border-ink-950 hover:text-ink-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {summoning ? "ISSUING SUMMONS…" : "SUMMON THE SITTING"}
          </button>
          {data?.lastSummonsAt && (
            <p className="text-center font-code text-[8px] tracking-[0.18em] text-ink-400">
              LAST SUMMONS {summonsClock(data.lastSummonsAt)} · RECORDED IN THE COMMITTEE REGISTER
            </p>
          )}
        </div>
      </div>
    </ViewShell>
  );
}

/* ── Rules & guards ──────────────────────────────────────────────────────── */

function GuardPills<T extends string>({
  value,
  options,
  onChange,
  groupLabel,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  groupLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={groupLabel}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          aria-pressed={value === o}
          className={cn(
            "h-8 rounded-full border px-3.5 font-code text-[8.5px] font-bold tracking-[0.14em] transition-all",
            value === o
              ? "border-ink-950 bg-ink-950 text-white"
              : "border-ink-200 bg-white text-ink-500 hover:border-ink-400"
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function RulesView({ onToast }: { onToast: (m: string) => void }) {
  const [variance, setVariance] = useState<"15%" | "25%" | "40%">("25%");
  const [checklist, setChecklist] = useState<"STANDARD · 12/16" | "STRICT · 16/16">("STANDARD · 12/16");
  const [registry, setRegistry] = useState(true);

  const guards: { no: string; title: string; desc: string; control: ReactNode }[] = [
    {
      no: "01",
      title: "Price variance flag",
      desc: "Flag any bid priced above the framework median by more than —",
      control: (
        <GuardPills
          value={variance}
          options={["15%", "25%", "40%"] as const}
          onChange={(v) => {
            setVariance(v);
            onToast(`GUARD UPDATED — PRICE VARIANCE NOW ${v} · WRITTEN TO THE AUDIT TRAIL`);
          }}
          groupLabel="Price variance threshold"
        />
      ),
    },
    {
      no: "02",
      title: "Document checklist",
      desc: "Minimum documents present before a run may complete —",
      control: (
        <GuardPills
          value={checklist}
          options={["STANDARD · 12/16", "STRICT · 16/16"] as const}
          onChange={(v) => {
            setChecklist(v);
            onToast(`GUARD UPDATED — CHECKLIST MODE ${v} · WRITTEN TO THE AUDIT TRAIL`);
          }}
          groupLabel="Document checklist mode"
        />
      ),
    },
    {
      no: "03",
      title: "Registry cross-check",
      desc: "Match every bidder against the open registry before a finding is raised —",
      control: (
        <GuardPills
          value={registry ? "ON" : "OFF"}
          options={["ON", "OFF"] as const}
          onChange={(v) => {
            setRegistry(v === "ON");
            onToast(`GUARD UPDATED — REGISTRY CROSS-CHECK ${v} · WRITTEN TO THE AUDIT TRAIL`);
          }}
          groupLabel="Registry cross-check"
        />
      ),
    },
  ];

  return (
    <ViewShell
      fig="13"
      title="Rules & guards"
      sub="The thresholds the agent must obey inside a run. Three clauses are carved; the guards below are tunable — and every change is written to the audit trail with your name on it."
    >
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 sm:space-y-6 lg:col-span-2">
          {guards.map((g, i) => (
            <motion.div
              key={g.no}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 * i, ease: EASE }}
              className="rounded-2xl border border-ink-100 bg-white p-5 shadow-[0_1px_2px_rgba(11,12,15,0.04)]"
            >
              <p className="font-code text-[8px] font-semibold tracking-[0.22em] text-ink-400">GUARD {g.no}</p>
              <h3 className="mt-1.5 font-display text-[15px] font-black tracking-[-0.01em] text-ink-950">{g.title}</h3>
              <p className="mt-1 text-[12.5px] text-ink-500">{g.desc}</p>
              <div className="mt-4">{g.control}</div>
            </motion.div>
          ))}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
            className="rounded-2xl border border-ink-100 bg-white p-5 shadow-[0_1px_2px_rgba(11,12,15,0.04)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-code text-[8px] font-semibold tracking-[0.22em] text-ink-400">GUARD 04</p>
                <h3 className="mt-1.5 font-display text-[15px] font-black tracking-[-0.01em] text-ink-950">Citation policy</h3>
                <p className="mt-1 max-w-md text-[12.5px] text-ink-500">
                  Page-level citations on every claim. Zero unsourced tolerated — not a setting, a design constraint.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 font-code text-[8px] font-bold tracking-[0.16em] text-brand-800">
                <Lock className="h-3 w-3" aria-hidden="true" />
                LOCKED BY DESIGN
              </span>
            </div>
          </motion.div>
        </div>

        <div className="grid content-start gap-4 sm:gap-6">
          <StandingRuleCard onToast={onToast} />
          <div className="flex items-start gap-3 rounded-2xl border border-ink-100 bg-sand p-5">
            <ShieldCheck className="h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
            <p className="font-code text-[7.5px] leading-[1.9] tracking-[0.14em] text-ink-600">
              EVERY GUARD CHANGE IS LOGGED — NAME, TIMESTAMP, BEFORE &amp; AFTER VALUES.
            </p>
          </div>
        </div>
      </div>
    </ViewShell>
  );
}

/* ── Dedicated COMMAND views ─────────────────────────────────────────────── */

function RunsView({
  runs,
  query,
  onQuery,
  filter,
  onFilter,
  onToast,
  onNewRun,
  notes,
}: {
  runs: McRun[];
  query: string;
  onQuery: (v: string) => void;
  filter: RunFilter;
  onFilter: (f: RunFilter) => void;
  onToast: (m: string) => void;
  onNewRun: () => void;
  notes: Record<string, string[]>;
}) {
  return (
    <ViewShell
      fig="05"
      title="Run register"
      sub="Every file the agent has opened — live, queued, at a gate or decided. Expand a run for its top findings and its audit trail."
    >
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <RunRegister runs={runs} query={query} onQuery={onQuery} filter={filter} onFilter={onFilter} onToast={onToast} notes={notes} />
        </div>
        <div className="grid content-start gap-4 sm:gap-6">
          <NewRunCard onNewRun={onNewRun} />
          <StandingRuleCard onToast={onToast} />
        </div>
      </div>
    </ViewShell>
  );
}

function GatesView({
  queue,
  ledger,
  firstName,
  onSign,
  onReturn,
  onGoCommittee,
  onToast,
}: {
  queue: GateItem[];
  ledger: LedgerRow[];
  firstName: string;
  onSign: (g: GateItem) => void;
  onReturn: (g: GateItem) => void;
  onGoCommittee: () => void;
  onToast: (m: string) => void;
}) {
  return (
    <ViewShell
      fig="06"
      title="Human gates"
      sub="The stop only a human can pass. The agent assembles the file and halts; the committee reads the cited flags and decides — by name, on the record."
    >
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <GateQueue queue={queue} ledger={ledger} firstName={firstName} onSign={onSign} onReturn={onReturn} />
        </div>
        <div className="grid content-start gap-4 sm:gap-6">
          <GavelProtocolCard />
          <button
            type="button"
            onClick={onGoCommittee}
            className="group relative overflow-hidden rounded-2xl border border-ink-950 bg-night p-5 text-left text-white shadow-[0_22px_55px_rgba(11,12,15,0.3)] transition-transform hover:-translate-y-0.5"
          >
            <div className="bg-grid-dark pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
            <div className="relative">
              <h3 className="font-display text-[15px] font-black tracking-[-0.01em]">Who signs? The committee.</h3>
              <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-300">
                Five of nine seats present before an award counts. Meet the roster and the quorum rule.
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 font-code text-[8.5px] font-bold tracking-[0.2em] text-brand-400">
                OPEN THE ROSTER
                <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
              </span>
            </div>
          </button>
        </div>
      </div>
    </ViewShell>
  );
}

function FeedView({ onToast }: { onToast: (m: string) => void }) {
  return (
    <ViewShell
      fig="07"
      title="Agent feed"
      sub="The work, streaming. Ingest, checklist, registry, flags, citations — watch a run the way the committee will read it: line by line, every claim sourced."
    >
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <AgentFeed />
        </div>
        <div className="grid content-start gap-4 sm:gap-6">
          <PortalSync onToast={onToast} />
          <div className="relative overflow-hidden rounded-2xl border border-ink-950 bg-night p-5 text-white shadow-[0_22px_55px_rgba(11,12,15,0.3)]">
            <div className="bg-grid-dark pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
            <div className="relative">
              <h3 className="font-display text-[15px] font-black tracking-[-0.01em]">Citation policy</h3>
              <p className="mt-3 font-code text-[9px] leading-[2] tracking-[0.16em] text-ink-300">
                IF THE AGENT CANNOT CITE IT,
                <br />
                IT CANNOT SAY IT.
                <br />
                <span className="text-brand-400">PAGE, CLAUSE OR REGISTRY ID — EVERY TIME.</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </ViewShell>
  );
}

/* ── The screen ──────────────────────────────────────────────────────────── */

/* ── The flow guide: upload → agent runs → human gate → award ─────────── */

const FLOW_STEPS = [
  { num: "01", label: "BRIEF THE AGENT", sub: "Upload the tender pack" },
  { num: "02", label: "AGENT RUNS", sub: "Every claim cited" },
  { num: "03", label: "HUMAN GATE", sub: "The committee reads" },
  { num: "04", label: "AWARD LOGGED", sub: "Decision on the ledger" },
] as const;

const FLOW_SUB_CURRENT = [
  "START WITH THE PACK",
  "QUORUM-AGENT IS READING",
  "YOUR GAVEL — ACTION NEEDED",
  "SEE THE LEDGER",
];

function FlowGuide({
  current,
  complete,
  onStep,
}: {
  current: number;
  complete: boolean;
  onStep: (step: number) => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.02, ease: EASE }}
      aria-label="The flow — from upload to award"
      className="mt-8 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-[0_1px_2px_rgba(11,12,15,0.04)]"
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 px-5 py-3.5">
        <p className="flex items-center gap-2.5 font-code text-[9px] font-semibold tracking-[0.24em] text-ink-500">
          <span className="inline-block h-[2px] w-6 bg-brand-600" aria-hidden="true" />
          THE FLOW — UPLOAD TO AWARD
        </p>
        <p className="font-code text-[8.5px] font-semibold tracking-[0.18em] text-ink-400" aria-live="polite">
          {complete ? (
            <span className="text-ink-950">LOOP CLOSED · 04 OF 04 · RUN ANOTHER ANY TIME</span>
          ) : (
            `STEP ${current + 1} OF 4`
          )}
        </p>
      </header>
      <div className="grid grid-cols-1 gap-px bg-ink-100 sm:grid-cols-2 xl:grid-cols-4">
        {FLOW_STEPS.map((s, i) => {
          const done = complete || i < current;
          const isCurrent = !complete && i === current;
          return (
            <button
              key={s.num}
              type="button"
              onClick={() => onStep(i)}
              aria-current={isCurrent ? "step" : undefined}
              className="flex items-start gap-3 bg-white px-5 py-4 text-left transition-colors hover:bg-paper"
            >
              <span
                className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-full border font-code text-[9px] font-bold",
                  done
                    ? "border-ink-950 bg-ink-950 text-white"
                    : isCurrent
                      ? "border-brand-600 bg-brand-50 text-brand-700"
                      : "border-ink-200 text-ink-300"
                )}
                aria-hidden="true"
              >
                {done ? <CircleCheck className="h-3.5 w-3.5" /> : s.num}
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    "flex items-center gap-2 font-code text-[9px] font-bold tracking-[0.16em]",
                    isCurrent ? "text-ink-950" : done ? "text-ink-700" : "text-ink-400"
                  )}
                >
                  {s.label}
                  {isCurrent && (
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-brand-500" aria-hidden="true" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-600" aria-hidden="true" />
                    </span>
                  )}
                </span>
                <span className={cn("mt-1 block truncate text-[12px]", isCurrent ? "font-medium text-ink-800" : "text-ink-500")}>
                  {isCurrent ? FLOW_SUB_CURRENT[i] : done ? "DONE" : s.sub}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </motion.section>
  );
}

/* Session flow tracker — how far this officer has walked the loop:
   briefed a run with a real pack → watched the agent → sat the gate →
   logged the award. Drives the FlowGuide on the overview. */
type FlowState = { refs: string[]; decided: boolean; awarded: boolean };

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
  const [verdicts, setVerdicts] = useState<Record<string, "AWARDED" | "RETURNED">>(() =>
    Object.fromEntries(SEED_LEDGER.map((row) => [row.tender, row.action]))
  );
  const [extraFindings, setExtraFindings] = useState<SeedFinding[]>([]);
  const [extraNotes, setExtraNotes] = useState<Record<string, string[]>>({});
  const [flow, setFlow] = useState<FlowState>({ refs: [], decided: false, awarded: false });
  const completionTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  /* Live agent health — the pill and sidebar render what the stack reports. */
  const agent = useAgentStatus();
  const agentMode = agentModeOf(agent);

  /* Clock + date */
  useEffect(() => {
    const first = requestAnimationFrame(() => setNow(new Date()));
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => {
      cancelAnimationFrame(first);
      clearInterval(id);
    };
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

  const findingRows = useMemo(
    () => buildFindingRows([...SEED_FINDINGS, ...extraFindings], runs, verdicts),
    [extraFindings, runs, verdicts]
  );
  const openFindings = findingRows.filter((r) => r.status === "OPEN").length;

  /* Notes for the expanded register rows — seeds plus anything the
     freshly launched runs produced. */
  const notesMap = useMemo(() => ({ ...FINDING_NOTES, ...extraNotes }), [extraNotes]);

  /* Where the officer stands in the loop right now. */
  const userLive = runs.some((r) => flow.refs.includes(r.id) && (r.status === "running" || r.status === "queued"));
  const userGate = queue.some((g) => flow.refs.includes(g.tender));
  const flowCurrent = userLive ? 1 : userGate ? 2 : flow.decided ? 3 : 0;
  const flowComplete = flow.awarded && !userLive && !userGate;

  const switchTo = (id: SectionId) => {
    setNavOpen(false);
    setActive(id);
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  };

  const launchRun = (ref: string, title: string, format: string, docs: number, checks: number) => {
    setModalOpen(false);
    const run: McRun = {
      id: ref,
      title,
      buyer: `Your workspace · ${format.toLowerCase()} · ${docs} ${docs === 1 ? "doc" : "docs"}`,
      bids: null,
      findings: 0,
      citations: 0,
      unsourced: 0,
      status: "running",
      startedAt: "JUST NOW",
      duration: "LIVE",
      docs,
    };
    setRuns((prev) => [run, ...prev]);
    setFlow((f) => ({ ...f, refs: [...f.refs, ref] }));
    /* Guide the officer to the register — the run goes live in front of them. */
    setActive("mc-runs");
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    onToast(`RUN QUEUED — ${docs} DOC${docs === 1 ? "" : "S"} · ${checks} CHECK${checks === 1 ? "" : "S"} · ${ref.toUpperCase()} IS LIVE`);

    /* The run walks its phases in public: parse → cross-check → gate. */
    const phase = setTimeout(() => {
      setRuns((prev) => prev.map((r) => (r.id === ref ? { ...r, duration: "CROSS-CHECK" } : r)));
    }, 4500);
    const done = setTimeout(() => {
      setRuns((prev) =>
        prev.map((r) =>
          r.id === ref
            ? { ...r, status: "gate", bids: 5, findings: 4, citations: 4, duration: "11 MIN" }
            : r
        )
      );
      setExtraFindings((prev) => [...prev, ...LAUNCHED_FINDINGS.map((f) => ({ ...f, run: ref }))]);
      setExtraNotes((prev) => ({ ...prev, [ref]: LAUNCHED_NOTE_LINES }));
      setQueue((prev) => [
        {
          id: `g-user-${ref}`,
          tender: ref,
          title,
          supplier: PROPOSED_AWARDS[prev.length % PROPOSED_AWARDS.length].supplier,
          value: PROPOSED_AWARDS[prev.length % PROPOSED_AWARDS.length].value,
          flags: 4,
          ago: "JUST NOW",
        },
        ...prev,
      ]);
      onToast(`FILE AT THE GATE — ${ref.toUpperCase()} · 4 FINDINGS · 4 CITATIONS · THE COMMITTEE DECIDES`);
    }, 12_000);
    completionTimers.current.push(phase, done);
  };

  const signGate = (g: GateItem) => {
    setQueue((prev) => prev.filter((item) => item.id !== g.id));
    setVerdicts((prev) => ({ ...prev, [g.tender]: "AWARDED" }));
    setLedger((prev) => [
      { tender: g.tender, action: "AWARDED", by: firstName, at: "JUST NOW" },
      ...prev,
    ]);
    /* The committee has spoken — the run leaves the register as decided. */
    setRuns((prev) =>
      prev.map((r) => (r.id === g.tender ? { ...r, status: "complete", duration: `${r.duration.split(" ")[0]} MIN` } : r))
    );
    onToast(`GATE SIGNED — ${g.tender} AWARDED · DECISION LOGGED`);
    /* The officer has sat a gate and closed the loop at least once. */
    setFlow((f) => ({ ...f, decided: true, awarded: true }));
  };

  const returnGate = (g: GateItem) => {
    setQueue((prev) => prev.filter((item) => item.id !== g.id));
    setVerdicts((prev) => ({ ...prev, [g.tender]: "RETURNED" }));
    setLedger((prev) => [
      { tender: g.tender, action: "RETURNED", by: firstName, at: "JUST NOW" },
      ...prev,
    ]);
    /* Back to the agent for clarification — the file re-opens live. */
    setRuns((prev) =>
      prev.map((r) => (r.id === g.tender ? { ...r, status: "running", duration: "LIVE", startedAt: "RE-RUN" } : r))
    );
    onToast(`${g.tender} RETURNED — AGENT TASKED WITH CLARIFICATION`);
    /* A return is still a committee decision — the loop just re-opens. */
    setFlow((f) => ({ ...f, decided: true }));
  };

  /* The flow guide is clickable — each step jumps to where the work happens. */
  const handleFlowStep = (step: number) => {
    if (step === 0) setModalOpen(true);
    else if (step === 1) switchTo("mc-runs");
    else if (step === 2) switchTo("mc-gates");
    else switchTo("mc-ledger");
  };

  const renderView = () => {
    switch (active) {
      case "mc-runs":
        return (
          <RunsView
            runs={runs}
            query={query}
            onQuery={setQuery}
            filter={filter}
            onFilter={setFilter}
            onToast={onToast}
            onNewRun={() => setModalOpen(true)}
            notes={notesMap}
          />
        );
      case "mc-gates":
        return (
          <GatesView
            queue={queue}
            ledger={ledger}
            firstName={firstName}
            onSign={signGate}
            onReturn={returnGate}
            onGoCommittee={() => switchTo("mc-committee")}
            onToast={onToast}
          />
        );
      case "mc-activity":
        return <FeedView onToast={onToast} />;
      case "mc-findings":
        return <FindingsView rows={findingRows} onOpenRun={() => switchTo("mc-runs")} />;
      case "mc-reports":
        return <ReportPacksView runs={runs} verdicts={verdicts} onToast={onToast} />;
      case "mc-sources":
        return <SourcesView onToast={onToast} />;
      case "mc-ledger":
        return <AwardLedgerView ledger={ledger} awaiting={queue.length} onToast={onToast} />;
      case "mc-committee":
        return <CommitteeView user={user} onToast={onToast} />;
      case "mc-rules":
        return <RulesView onToast={onToast} />;
      case "mc-stack":
        return <StackConsole onToast={onToast} />;
      default:
        return null;
    }
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
            counts={{ runs: runs.length, gates: queue.length, findings: openFindings }}
            agent={agent}
            onNavigate={switchTo}
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
                  counts={{ runs: runs.length, gates: queue.length, findings: openFindings }}
                  agent={agent}
                  onNavigate={switchTo}
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
                {SECTION_LABEL[active] ?? "OVERVIEW"}
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
              <AgentStatusBadge mode={agentMode} className="hidden md:inline-flex" />
            </div>
          </div>
        </div>

        <main id="mc-main" className="mx-auto w-full max-w-[1200px] px-4 pb-14 pt-8 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait" initial={false}>
            {active === "mc-overview" ? (
              <motion.div key="mc-board" exit={{ opacity: 0, transition: { duration: 0.15 } }}>
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

            {/* The guided flow — upload to award, always showing the next move */}
            <FlowGuide current={flowCurrent} complete={flowComplete} onStep={handleFlowStep} />

            {/* Stats */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
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
                notes={notesMap}
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
              <StandingRuleCard onToast={onToast} />
            </div>
          </div>

          {/* Bottom strip */}
          <p className="mt-10 border-t border-ink-100 pt-5 text-center font-code text-[8px] tracking-[0.24em] text-ink-400">
            QUORUM · MISSION CONTROL · SESSION {initialsOf(user?.name ?? "Q")} · AUDIT-GRADE LOGS · NO TRACKERS
          </p>
              </motion.div>
            ) : (
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                transition={{ duration: 0.4, ease: EASE }}
              >
                {renderView()}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <NewRunModal open={modalOpen} onClose={() => setModalOpen(false)} onLaunch={launchRun} />
    </div>
  );
}
