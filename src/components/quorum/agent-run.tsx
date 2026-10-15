"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CirclePause, FileText, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

type Kind = "sys" | "tool" | "cite" | "agent" | "gate" | "done";

interface Line {
  kind: Kind;
  time?: string;
  label?: string;
  text: string;
}

/**
 * One faithful pass of a Quorum run:
 * OCDS in, logged MCP tool calls, every finding carrying a citation,
 * and a hard stop at the human gate.
 */
const SCRIPT: Line[] = [
  { kind: "sys", text: "quorum-agent run --tender KE-NCB-104293 --format ocds" },
  { kind: "tool", time: "00:00.4", label: "fetch-notices", text: "portal reachable · 4 bids parsed from OCDS" },
  { kind: "tool", time: "00:03.1", label: "check-documents", text: "16 required · bid 03 missing tax clearance" },
  { kind: "cite", text: "bid-03/checklist.pdf — page 4" },
  { kind: "tool", time: "00:07.9", label: "verify-bidder", text: "registration expired 12 Mar 2025" },
  { kind: "cite", text: "bid-03/registration.pdf — page 2" },
  { kind: "tool", time: "00:12.6", label: "compare-prices", text: "item 3 median $18.40 · bid 03 at $26.10 (+41.8%)" },
  { kind: "cite", text: "price-schedules.xlsx — tab C, rows 31–47" },
  { kind: "tool", time: "00:16.2", label: "cross-check", text: "same supplier flagged twice in 2024 awards" },
  { kind: "cite", text: "awards-2024.json — ocids 2 and 17" },
  { kind: "agent", time: "00:19.4", label: "draft-report", text: "6 findings · 6 citations · 0 unsourced flags" },
  { kind: "gate", time: "00:20.1", label: "human gate", text: "irreversible step ahead: the award decision" },
  { kind: "done", text: "Agent stopped. Sourced report handed over — the committee decides." },
];

function MonoChip({ children, tone = "dim" }: { children: React.ReactNode; tone?: "dim" | "red" | "solid" }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded px-1.5 py-0.5 font-code text-[9px] font-semibold uppercase tracking-[0.14em]",
        tone === "dim" && "bg-white/[0.07] text-ink-400",
        tone === "red" && "bg-brand-600/20 text-brand-300",
        tone === "solid" && "bg-brand-600 text-white"
      )}
    >
      {children}
    </span>
  );
}

function LineRow({ line }: { line: Line }) {
  switch (line.kind) {
    case "sys":
      return (
        <p className="font-code text-[11.5px] leading-relaxed text-ink-400 sm:text-[12.5px]">
          <span className="mr-2 text-brand-400">$</span>
          {line.text}
        </p>
      );
    case "tool":
    case "agent":
      return (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-code text-[11.5px] leading-relaxed sm:text-[12.5px]">
          <span className="tabular text-ink-600">{line.time}</span>
          <MonoChip tone={line.kind === "agent" ? "solid" : "dim"}>{line.kind === "agent" ? "agent" : "tool"}</MonoChip>
          <span className="font-semibold text-brand-400">{line.label}</span>
          <span className="text-ink-200">{line.text}</span>
        </p>
      );
    case "cite":
      return (
        <p className="flex items-center gap-2 pl-2 font-code text-[10.5px] leading-relaxed text-ink-500 sm:pl-7 sm:text-[11px]">
          <FileText className="h-3 w-3 shrink-0 text-ink-600" aria-hidden="true" />
          <span className="tracking-[0.1em]">SRC</span>
          <span className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-ink-300">{line.text}</span>
        </p>
      );
    case "gate":
      return (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border-l-2 border-brand-500 bg-brand-600/10 px-3 py-2 font-code text-[11.5px] leading-relaxed sm:text-[12.5px]">
          <span className="tabular text-ink-600">{line.time}</span>
          <MonoChip tone="red">{line.label}</MonoChip>
          <CirclePause className="h-3.5 w-3.5 shrink-0 text-brand-300" aria-hidden="true" />
          <span className="text-brand-100">{line.text}</span>
        </p>
      );
    case "done":
      return (
        <p className="flex items-center gap-2 border-t border-white/10 pt-3 font-code text-[11.5px] font-semibold leading-relaxed text-white sm:text-[12.5px]">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true">
            <path d="M2.5 8.5 6 12l7.5-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {line.text}
        </p>
      );
  }
}

/** The hero's animated agent-run terminal. Auto-plays once, then offers replay. */
export function AgentRun() {
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const started = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const begin = useCallback(() => {
    if (reduce) {
      // Reduced motion: skip the animation entirely and show the final state.
      setStep(SCRIPT.length);
      setRunning(false);
      return;
    }
    setStep(0);
    setRunning(true);
  }, [reduce]);

  // Auto-play the first run when the terminal scrolls into view.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          begin();
          io.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [begin]);

  // Advance the script while running. All state changes happen inside the
  // timer callback — never synchronously in the effect body.
  useEffect(() => {
    if (!running || reduce || step >= SCRIPT.length) return;
    const t = setTimeout(() => setStep((s) => s + 1), step === 0 ? 400 : 560);
    return () => clearTimeout(t);
  }, [running, step, reduce]);

  const finished = step >= SCRIPT.length;

  return (
    <div
      ref={rootRef}
      className="relative overflow-hidden rounded-3xl border border-white/10 bg-night-2 shadow-[0_32px_80px_rgba(11,12,15,0.35)]"
      role="img"
      aria-label="Animated terminal showing a logged agent run: OCDS notices fetched, documents checked, a bidder verified with citations, prices compared, a sourced report drafted, and a stop at the human gate"
    >
      {/* Chrome */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-ink-700" />
            <span className="h-2.5 w-2.5 rounded-full bg-ink-700" />
            <span className="h-2.5 w-2.5 rounded-full bg-brand-500" />
          </span>
          <span className="font-code text-[10.5px] font-semibold tracking-[0.16em] text-ink-400">
            quorum-agent — sample run
          </span>
        </div>
        <span className="hidden font-code text-[9px] tracking-[0.22em] text-ink-600 sm:block">MCP · LOGGED · OCDS</span>
      </div>

      {/* Lines */}
      <div className="min-h-[368px] space-y-2 px-5 py-5 sm:min-h-[356px] sm:px-6">
        {SCRIPT.slice(0, step).map((line, i) => (
          <motion.div
            key={i}
            initial={reduce ? false : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <LineRow line={line} />
          </motion.div>
        ))}
        {!finished && (
          <p className="pt-1 font-code text-[12.5px] text-brand-400" aria-hidden="true">
            <span className="animate-pulse">▊</span>
          </p>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-white/[0.03] px-5 py-3 sm:px-6">
        <p className="font-code text-[9.5px] tracking-[0.18em] text-ink-500">
          {finished ? "RUN COMPLETE · 6 FINDINGS · 6 CITATIONS · 0 UNSOURCED" : "EVERY TOOL CALL LOGGED — INPUTS, OUTPUTS, TIMESTAMPS"}
        </p>
        <button
          type="button"
          onClick={begin}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 font-code text-[10px] font-semibold tracking-[0.14em] text-ink-200 transition-colors hover:border-brand-500 hover:text-white"
        >
          <RotateCcw className="h-3 w-3" aria-hidden="true" />
          RE-RUN
        </button>
      </div>
    </div>
  );
}
