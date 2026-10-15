"use client";

/**
 * StackConsole — the "Tools & models" view in mission control.
 *
 * Everything here is LIVE and wired to the real quorum-mcp mini-service on
 * :3031 (reached through the gateway with XTransformPort):
 *   · the five tools of our own MCP server (three change state)
 *   · the official @modelcontextprotocol/server-filesystem we did NOT write
 *   · LangGraph.js orchestration (review_graph halts at the gate)
 *   · open-weights drafting + the exact model string the endpoint returns
 *   · the append-only tool log — inputs, outputs, timestamps, actor, status
 *   · gate decisions that demand a named human before anything irreversible
 */

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  FileLock2,
  Fingerprint,
  GitBranch,
  Play,
  Radio,
  Server,
  ShieldCheck,
  Stamp,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SVC = "/api";

interface Health {
  ok: boolean;
  uptimeSec: number;
  fsMcp: { status: string; tools: string[] };
  graphs: string[];
  counts: { toolCalls: number; runs: number; gates: number; pendingGates: number };
}

interface ToolDef {
  name: string;
  kind: "READ" | "WRITES" | "IRREVERSIBLE";
  description: string;
}

interface LogEntry {
  seq: number;
  id: string;
  ts: string;
  actor: string;
  server: string;
  tool: string;
  kind: string;
  runId?: string;
  inputs: unknown;
  outputs: unknown;
  status: string;
  durationMs: number;
}

interface Finding {
  id: string;
  rule: string;
  severity: string;
  item: string;
  evidence: string;
  citation: string;
}

interface Draft {
  id: string;
  findingId: string;
  proposed: string;
  rationale: string;
  model: string;
}

interface Run {
  id: string;
  tenderId: string;
  status: string;
  startedAt: string;
  progress: string[];
  requirements: { id: string; clause: string; page: number }[];
  findings: Finding[];
  drafts: Draft[];
  gateId?: string;
}

interface Gate {
  id: string;
  runId: string;
  tenderId: string;
  tool: string;
  inputs: Record<string, unknown>;
  status: string;
  createdAt: string;
  decidedAt?: string;
  approver?: string;
  note?: string;
  executedAt?: string;
  receipt?: { submissionId: string; hash: string; portal: string };
}

interface StackCard {
  layer: string;
  name: string;
  detail: string;
}

const EASE = [0.22, 1, 0.36, 1] as const;

/* ── small atoms ─────────────────────────────────────────────────────────── */

function MonoLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("font-code text-[9px] font-semibold uppercase tracking-[0.24em] text-ink-400", className)}>
      {children}
    </p>
  );
}

function KindChip({ kind }: { kind: string }) {
  const map: Record<string, string> = {
    READ: "border-ink-200 bg-white text-ink-600",
    WRITES: "border-brand-300 bg-brand-50 text-brand-700",
    IRREVERSIBLE: "border-brand-600 bg-brand-600 text-white",
    GATE_DECISION: "border-ink-800 bg-ink-900 text-white",
    PENDING_GATE: "border-brand-500 bg-brand-500 text-white",
  };
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 font-code text-[8px] font-bold tracking-[0.14em]",
        map[kind] ?? "border-ink-200 bg-white text-ink-500"
      )}
    >
      {kind.replace("_", "-")}
    </span>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "OK") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />;
  if (status === "PENDING_GATE") return <Stamp className="h-3.5 w-3.5 animate-pulse text-brand-600" aria-hidden="true" />;
  return <XCircle className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />;
}

function Clock(iso: string) {
  return iso.slice(11, 19);
}

/* ── main view ───────────────────────────────────────────────────────────── */

export function StackConsole({ onToast }: { onToast: (msg: string) => void }) {
  const [health, setHealth] = useState<Health | null>(null);
  const [tools, setTools] = useState<ToolDef[]>([]);
  const [stack, setStack] = useState<StackCard[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [gates, setGates] = useState<Gate[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [approverDraft, setApproverDraft] = useState<Record<string, { name: string; note: string }>>({});
  const logAnchor = useRef<HTMLDivElement | null>(null);

  const pull = useCallback(async () => {
    try {
      /* Self-heal: if the sidecar died, the long-lived server respawns it. */
      void fetch("/api/mcp-ensure").catch(() => null);
      const [h, t, a, r, g] = await Promise.all([
        fetch(`${SVC}/health?XTransformPort=3031`).then((x) => x.json()),
        fetch(`${SVC}/tools?XTransformPort=3031`).then((x) => x.json()),
        fetch(`${SVC}/architecture?XTransformPort=3031`).then((x) => x.json()),
        fetch(`${SVC}/runs?XTransformPort=3031`).then((x) => x.json()),
        fetch(`${SVC}/gates?XTransformPort=3031`).then((x) => x.json()),
      ]);
      setHealth(h);
      setTools(t.tools ?? []);
      setStack(a.stack ?? []);
      setRuns(r.runs ?? []);
      setGates(g.gates ?? []);
      const l = await fetch(`${SVC}/log?limit=60&XTransformPort=3031`).then((x) => x.json());
      setLog(l.entries ?? []);
    } catch {
      /* service briefly down — keep last snapshot */
    }
  }, []);

  useEffect(() => {
    void pull();
    const id = setInterval(() => void pull(), 3500);
    return () => clearInterval(id);
  }, [pull]);

  const launchRun = async () => {
    /* Re-run the most recent real tender — nothing is launched without one. */
    const tenderId = runs[0]?.tenderId;
    if (!tenderId) {
      onToast("NO TENDER STAGED — START A NEW RUN FROM THE DASHBOARD");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${SVC}/runs?XTransformPort=3031`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenderId }),
      });
      if (!res.ok) throw new Error("run failed");
      onToast(`REVIEW GRAPH INVOKED — LANGGRAPH.JS PICKING UP ${tenderId}`);
    } catch {
      onToast("STACK UNREACHABLE — quorum-mcp NOT RESPONDING");
    } finally {
      setBusy(false);
    }
  };

  const decide = async (gate: Gate, decision: "APPROVE" | "REJECT") => {
    const draft = approverDraft[gate.id] ?? { name: "", note: "" };
    if (draft.name.trim().length < 3) {
      onToast("A NAMED HUMAN IS REQUIRED — TYPE THE APPROVING OFFICER'S FULL NAME");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${SVC}/gates/${gate.id}/decision?XTransformPort=3031`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision, approver: draft.name.trim(), note: draft.note.trim() }),
      });
      const data = (await res.json()) as { error?: string; gate?: Gate };
      if (!res.ok || data.error) {
        onToast(data.error?.toUpperCase() ?? "GATE DECISION FAILED");
      } else if (decision === "APPROVE") {
        onToast(`GATE SIGNED BY ${draft.name.trim().toUpperCase()} — BUNDLE FILED · ${data.gate?.receipt?.submissionId ?? ""}`);
      } else {
        onToast("SUBMISSION RETURNED — DECISION LOGGED AGAINST THE GATE");
      }
      setApproverDraft((p) => ({ ...p, [gate.id]: { name: "", note: "" } }));
      void pull();
    } catch {
      onToast("STACK UNREACHABLE — DECISION NOT RECORDED");
    } finally {
      setBusy(false);
    }
  };

  const pending = gates.filter((g) => g.status === "PENDING");
  const decided = gates.filter((g) => g.status !== "PENDING");
  const lastRun = runs[0];

  return (
    <div className="space-y-8">
      {/* header */}
      <section aria-labelledby="mc-stack-h">
        <MonoLabel>SYSTEM — THE STACK, LIVE</MonoLabel>
        <h1 id="mc-stack-h" className="mt-3 font-display text-[32px] font-black leading-[1.04] tracking-[-0.02em] text-ink-950 sm:text-[40px]">
          Every claim, wired to a real service.
        </h1>
        <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-ink-600">
          This console talks to <span className="font-code text-[13px] text-ink-900">quorum-mcp</span> — our own MCP
          server — as it runs. Five tools, three of which change state. Documents are read by the official filesystem
          MCP server. The graph is LangGraph.js, and it halts at the gate. Every call lands in the audit log below.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-code text-[8.5px] font-bold tracking-[0.18em]",
              health?.ok ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-brand-300 bg-brand-50 text-brand-700"
            )}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className={cn("absolute inline-flex h-full w-full animate-ping-slow rounded-full", health?.ok ? "bg-emerald-500" : "bg-brand-500")} aria-hidden="true" />
              <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", health?.ok ? "bg-emerald-600" : "bg-brand-600")} aria-hidden="true" />
            </span>
            {health?.ok ? "QUORUM-MCP ONLINE" : "QUORUM-MCP OFFLINE"}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-code text-[8.5px] font-bold tracking-[0.18em]",
              health?.fsMcp.status === "connected" ? "border-ink-200 bg-white text-ink-700" : "border-ink-200 bg-white text-ink-400"
            )}
          >
            <Server className="h-3 w-3" aria-hidden="true" />
            SERVER-FILESYSTEM MCP · {health?.fsMcp.status.toUpperCase() ?? "…"}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3 py-1.5 font-code text-[8.5px] font-bold tracking-[0.18em] text-ink-700">
            <GitBranch className="h-3 w-3" aria-hidden="true" />
            LANGGRAPH.JS · 2 GRAPHS
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3 py-1.5 font-code text-[8.5px] font-bold tracking-[0.18em] text-ink-700">
            <Fingerprint className="h-3 w-3" aria-hidden="true" />
            {health?.counts.toolCalls ?? 0} TOOL CALLS LOGGED
          </span>
        </div>
      </section>

      {/* architecture cards */}
      <section aria-label="Stack architecture">
        <MonoLabel>ARCHITECTURE — SIX LAYERS, NO HAND-WAVING</MonoLabel>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {stack.map((c, i) => (
            <motion.div
              key={c.layer}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.06, ease: EASE }}
              className="rounded-2xl border border-ink-100 bg-white p-5 shadow-[0_1px_0_rgba(11,12,15,0.04)]"
            >
              <div className="flex items-center justify-between gap-3">
                <MonoLabel className="text-ink-500">{c.layer}</MonoLabel>
                <span className="font-code text-[9px] text-ink-300">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <p className="mt-2.5 break-words font-code text-[12.5px] font-bold tracking-tight text-ink-950">{c.name}</p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-ink-600">{c.detail}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* tools + launcher */}
      <section aria-label="MCP tools" className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-ink-100 bg-white p-5 lg:col-span-3">
          <div className="flex items-center justify-between gap-3">
            <MonoLabel>OUR OWN MCP SERVER — FIVE TOOLS</MonoLabel>
            <MonoLabel className="text-ink-300">POST /mcp · JSON-RPC 2.0</MonoLabel>
          </div>
          <ul className="mt-4 space-y-2.5">
            {tools.map((t) => (
              <li key={t.name} className="flex items-start gap-3 rounded-xl border border-ink-100 bg-paper px-3.5 py-3">
                <KindChip kind={t.kind} />
                <div className="min-w-0">
                  <p className="font-code text-[12px] font-bold text-ink-950">{t.name}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-ink-600">{t.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="rounded-2xl border border-ink-100 bg-night p-5 text-white">
            <MonoLabel className="text-ink-300">RUN THE GRAPH — LIVE</MonoLabel>
            <p className="mt-2.5 text-[13px] leading-relaxed text-ink-200">
              Fire <span className="font-code text-[11.5px] text-white">review_graph</span> at the MRI tender. Reads via
              the filesystem MCP, flags against three rules, drafts redlines with the configured LLM (or the template fallback), then raises a gate.
            </p>
            <button
              type="button"
              onClick={launchRun}
              disabled={busy}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-[13.5px] font-semibold text-white shadow-[0_10px_26px_rgba(217,38,22,0.35)] transition-all hover:bg-brand-700 disabled:opacity-60"
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              {busy ? "INVOKING GRAPH…" : "RUN FULL REVIEW"}
            </button>
          </div>
          <div className="min-h-0 flex-1 rounded-2xl border border-ink-100 bg-white p-5">
            <MonoLabel>LATEST RUN — GRAPH TRACE</MonoLabel>
            {lastRun ? (
              <div className="mt-3 max-h-56 overflow-y-auto pr-1 [scrollbar-width:thin]">
                <p className="font-code text-[10.5px] text-ink-400">
                  {lastRun.id} · {lastRun.tenderId} ·{" "}
                  <span
                    className={cn(
                      "font-bold",
                      lastRun.status === "AWAITING_GATE" && "text-brand-600",
                      lastRun.status === "FILED" && "text-emerald-700",
                      lastRun.status === "REJECTED" && "text-ink-600",
                      lastRun.status === "RUNNING" && "text-ink-900"
                    )}
                  >
                    {lastRun.status.replace("_", " ")}
                  </span>
                </p>
                <div className="mt-2 space-y-1 font-code text-[11px] leading-relaxed text-ink-700">
                  {lastRun.progress.map((p, i) => (
                    <motion.p key={`${lastRun.id}-${i}`} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}>
                      {p}
                    </motion.p>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-ink-200 px-2.5 py-1 font-code text-[9px] tracking-[0.14em] text-ink-600">
                    {lastRun.requirements.length} REQUIREMENTS
                  </span>
                  <span className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 font-code text-[9px] tracking-[0.14em] text-brand-700">
                    {lastRun.findings.length} FINDINGS
                  </span>
                  <span className="rounded-full border border-ink-200 px-2.5 py-1 font-code text-[9px] tracking-[0.14em] text-ink-600">
                    {lastRun.drafts.length} DRAFTS
                  </span>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-[12.5px] text-ink-500">No run yet — fire the graph to watch it live.</p>
            )}
          </div>
        </div>
      </section>

      {/* gates */}
      <section aria-label="Human gates">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <MonoLabel>GATES — THE ONLY IRREVERSIBLE TOOL, HELD FOR A NAMED HUMAN</MonoLabel>
          <MonoLabel className="text-ink-300">{pending.length} PENDING</MonoLabel>
        </div>
        <div className="mt-4 space-y-3">
          <AnimatePresence initial={false}>
            {pending.map((g) => {
              const draft = approverDraft[g.id] ?? { name: "", note: "" };
              return (
                <motion.div
                  key={g.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="overflow-hidden rounded-2xl border-2 border-brand-500/70 bg-white"
                >
                  <div className="flex flex-wrap items-center gap-2 border-b border-brand-100 bg-brand-50 px-4 py-2.5 sm:px-5">
                    <KindChip kind="IRREVERSIBLE" />
                    <p className="font-code text-[11px] font-bold tracking-tight text-ink-950">
                      {g.tool} <span className="text-ink-400">· {g.id}</span>
                    </p>
                    <span className="ml-auto font-code text-[9.5px] tracking-[0.14em] text-ink-500">
                      RAISED {Clock(g.createdAt)} UTC
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:px-5 md:grid-cols-2">
                    <div className="min-w-0">
                      <MonoLabel>BUNDLE — WHAT WILL BE FILED</MonoLabel>
                      <pre className="mt-2 max-h-40 overflow-auto rounded-xl bg-night p-3 font-code text-[10.5px] leading-relaxed text-ink-200 [scrollbar-width:thin]">
{JSON.stringify(g.inputs, null, 2)}
                      </pre>
                    </div>
                    <div className="min-w-0">
                      <MonoLabel>DECISION — LOGGED WITH YOUR NAME ON IT</MonoLabel>
                      <label htmlFor={`appr-${g.id}`} className="mt-2 block text-[12px] font-medium text-ink-700">
                        Approving officer — full name
                      </label>
                      <input
                        id={`appr-${g.id}`}
                        type="text"
                        value={draft.name}
                        onChange={(e) => setApproverDraft((p) => ({ ...p, [g.id]: { ...draft, name: e.target.value } }))}
                        placeholder="e.g. Dr. Chanda Mwale"
                        autoComplete="name"
                        className="mt-1.5 h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-[13px] text-ink-950 outline-none transition-all placeholder:text-ink-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-600/15"
                      />
                      <label htmlFor={`note-${g.id}`} className="mt-3 block text-[12px] font-medium text-ink-700">
                        Decision note (logged, optional)
                      </label>
                      <input
                        id={`note-${g.id}`}
                        type="text"
                        value={draft.note}
                        onChange={(e) => setApproverDraft((p) => ({ ...p, [g.id]: { ...draft, note: e.target.value } }))}
                        placeholder="Why this may proceed — or why not"
                        className="mt-1.5 h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-[13px] text-ink-950 outline-none transition-all placeholder:text-ink-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-600/15"
                      />
                      <div className="mt-3.5 flex flex-wrap gap-2.5">
                        <button
                          type="button"
                          onClick={() => void decide(g, "APPROVE")}
                          disabled={busy}
                          className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-[13px] font-semibold text-white transition-all hover:bg-brand-700 disabled:opacity-60"
                        >
                          <FileLock2 className="h-4 w-4" aria-hidden="true" />
                          APPROVE &amp; FILE — IRREVERSIBLE
                        </button>
                        <button
                          type="button"
                          onClick={() => void decide(g, "REJECT")}
                          disabled={busy}
                          className="inline-flex h-10 items-center gap-2 rounded-xl border border-ink-300 bg-white px-4 text-[13px] font-semibold text-ink-800 transition-all hover:border-ink-400 hover:bg-ink-50 disabled:opacity-60"
                        >
                          RETURN TO AGENT
                        </button>
                      </div>
                      <p className="mt-2.5 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-ink-500">
                        <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" aria-hidden="true" />
                        Execution is blocked until a human signs. The decision — your name, note and timestamp — is
                        appended to the audit log.
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {pending.length === 0 && (
            <div className="rounded-2xl border border-dashed border-ink-200 bg-white px-5 py-6 text-center">
              <ShieldCheck className="mx-auto h-5 w-5 text-ink-300" aria-hidden="true" />
              <p className="mt-2 text-[13px] text-ink-500">
                Nothing waits on a human right now. Run the graph — filing always stops here first.
              </p>
            </div>
          )}
          {decided.length > 0 && (
            <div className="rounded-2xl border border-ink-100 bg-white p-4 sm:p-5">
              <MonoLabel>DECIDED — WITH RECEIPTS</MonoLabel>
              <ul className="mt-3 space-y-2">
                {decided.slice(0, 4).map((g) => (
                  <li key={g.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-ink-100 bg-paper px-3.5 py-2.5">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 font-code text-[8.5px] font-bold tracking-[0.14em]",
                        g.status === "EXECUTED" ? "bg-emerald-100 text-emerald-800" : "bg-ink-100 text-ink-700"
                      )}
                    >
                      {g.status}
                    </span>
                    <span className="font-code text-[11px] font-bold text-ink-950">{g.id}</span>
                    <span className="text-[12px] text-ink-600">
                      by <span className="font-semibold text-ink-900">{g.approver}</span>
                    </span>
                    {g.receipt && (
                      <span className="font-code text-[10.5px] text-ink-500">
                        {g.receipt.submissionId} · sha {g.receipt.hash.slice(0, 12)}
                      </span>
                    )}
                    <span className="ml-auto font-code text-[9.5px] tracking-[0.14em] text-ink-400">
                      {(g.executedAt ?? g.decidedAt ?? "").slice(11, 19)} UTC
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* audit log */}
      <section aria-label="Tool call audit log" ref={logAnchor}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <MonoLabel>TOOL LOG — EVERY CALL, APPEND-ONLY</MonoLabel>
          <MonoLabel className="text-ink-300">
            {health?.counts.toolCalls ?? log.length} ENTRIES · JSONL ON DISK
          </MonoLabel>
        </div>
        <div className="mt-4 max-h-[26rem] overflow-y-auto rounded-2xl border border-ink-100 bg-white [scrollbar-width:thin]">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-paper/95 backdrop-blur">
              <tr className="border-b border-ink-100">
                {["TIME · UTC", "ACTOR", "SERVER", "TOOL", "STATUS", ""].map((h) => (
                  <th key={h} className="px-3.5 py-2.5 font-code text-[8.5px] font-bold uppercase tracking-[0.18em] text-ink-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {log.map((e) => (
                <Fragment key={e.id}>
                  <tr
                    className="cursor-pointer border-b border-ink-50 transition-colors hover:bg-brand-50/40"
                    onClick={() => setExpanded((p) => (p === e.id ? null : e.id))}
                    aria-expanded={expanded === e.id}
                  >
                    <td className="whitespace-nowrap px-3.5 py-2.5 font-code text-[10.5px] text-ink-500">{Clock(e.ts)}</td>
                    <td className="max-w-[10rem] truncate px-3.5 py-2.5 text-[12px] font-medium text-ink-800">{e.actor}</td>
                    <td className="max-w-[13rem] truncate px-3.5 py-2.5 font-code text-[10.5px] text-ink-600">{e.server}</td>
                    <td className="px-3.5 py-2.5 font-code text-[11px] font-bold text-ink-950">{e.tool}</td>
                    <td className="px-3.5 py-2.5">
                      <span className="inline-flex items-center gap-1.5">
                        <StatusIcon status={e.status} />
                        <span className="font-code text-[9.5px] font-bold tracking-[0.1em] text-ink-600">
                          {e.status.replace("_", " ")}
                        </span>
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      <ChevronDown
                        className={cn("ml-auto h-3.5 w-3.5 text-ink-300 transition-transform", expanded === e.id && "rotate-180")}
                        aria-hidden="true"
                      />
                    </td>
                  </tr>
                  {expanded === e.id && (
                    <tr className="border-b border-ink-50 bg-night">
                      <td colSpan={6} className="px-4 py-3.5">
                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                          <div>
                            <MonoLabel className="text-ink-400">INPUTS · {e.durationMs}MS</MonoLabel>
                            <pre className="mt-1.5 max-h-36 overflow-auto rounded-lg bg-black/40 p-3 font-code text-[10px] leading-relaxed text-emerald-200/90 [scrollbar-width:thin]">
{typeof e.inputs === "string" ? e.inputs : JSON.stringify(e.inputs, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <MonoLabel className="text-ink-400">OUTPUTS · {e.kind}</MonoLabel>
                            <pre className="mt-1.5 max-h-36 overflow-auto rounded-lg bg-black/40 p-3 font-code text-[10px] leading-relaxed text-ink-200 [scrollbar-width:thin]">
{typeof e.outputs === "string" ? e.outputs : JSON.stringify(e.outputs, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
          {log.length === 0 && (
            <p className="px-5 py-8 text-center text-[13px] text-ink-500">
              The log is empty — fire a run and every call will land here.
            </p>
          )}
        </div>
        <p className="mt-3 flex items-center gap-2 font-code text-[9px] tracking-[0.2em] text-ink-400">
          <Radio className="h-3 w-3 text-brand-600" aria-hidden="true" />
          POLLING QUORUM-MCP EVERY 3.5S · ENTRIES TRUNCATED FOR DISPLAY, FULL JSONL ON DISK
        </p>
      </section>
    </div>
  );
}
