"use client";

import { useState } from "react";
import { ArrowRight, CirclePause, Download, FileText, PenLine } from "lucide-react";
import { Eyebrow, Reveal } from "@/components/quorum/reveal";
import { cn } from "@/lib/utils";

type TabId = "report" | "flags" | "audit";

const TABS: { id: TabId; label: string; count: number }[] = [
  { id: "report", label: "REPORT", count: 5 },
  { id: "flags", label: "FLAGS", count: 3 },
  { id: "audit", label: "AUDIT LOG", count: 7 },
];

const FINDINGS = [
  {
    severity: "red" as const,
    tag: "MISSING DOC",
    text: "Bid 03 is missing the tax clearance certificate required by line 12 of the checklist.",
    cite: "bid-03/checklist.pdf — p.4",
    note: "← cited to the page",
  },
  {
    severity: "red" as const,
    tag: "REGISTRY",
    text: "Bidder registration lapsed on 12 Mar 2025 — thirty days before the closing date.",
    cite: "bid-03/registration.pdf — p.2",
    note: null,
  },
  {
    severity: "amber" as const,
    tag: "PRICE",
    text: "Item 3 unit price is +41.8% above the median across bids ($26.10 vs $18.40).",
    cite: "price-schedules.xlsx — tab C, rows 31–47",
    note: null,
  },
  {
    severity: "amber" as const,
    tag: "PATTERN",
    text: "Same supplier appears in two 2024 awards with the same evaluatee signatures.",
    cite: "awards-2024.json — ocids 2, 17",
    note: "← every pattern has a source",
  },
  {
    severity: "green" as const,
    tag: "CLEAR",
    text: "Bids 01, 02 and 04: all 16 required documents present and in date.",
    cite: "run log — 00:03.1",
    note: null,
  },
];

const FLAGS = [
  {
    code: "FLAG-01",
    level: "DISQUALIFYING",
    text: "Bid 03 — missing tax clearance certificate.",
    action: "Committee may reject under clause 14.2.",
  },
  {
    code: "FLAG-02",
    level: "PRICE OUTLIER",
    text: "Item 3 priced +41.8% above median.",
    action: "Committee may seek clarification.",
  },
  {
    code: "FLAG-03",
    level: "PATTERN",
    text: "Repeat supplier in 2024 awards (ocids 2, 17).",
    action: "Committee may request a conflict review.",
  },
];

const AUDIT = [
  { t: "00:00.4", call: "fetch-notices", io: "in: ppip.go.ke · ocds  →  out: 4 bids parsed" },
  { t: "00:03.1", call: "check-documents", io: "in: 4 bids · 16 required  →  out: 1 missing" },
  { t: "00:07.9", call: "verify-bidder", io: "in: bid-03 registry  →  out: expired 12 Mar 2025" },
  { t: "00:12.6", call: "compare-prices", io: "in: 4 schedules  →  out: median 18.40 · outlier 26.10" },
  { t: "00:16.2", call: "cross-check", io: "in: supplier id  →  out: 2 hits in awards-2024" },
  { t: "00:19.4", call: "draft-report", io: "out: 6 findings · 6 citations · 0 unsourced" },
  { t: "00:20.1", call: "human-gate", io: "⏸ awaiting sign-off — committee chair", paused: true },
];

const TICKS = [
  "Findings written in committee language, not model output",
  "Every claim carries the document, page and rows it came from",
  "Flags separated from clear items — nothing buried in prose",
  "The gate chip stays open until a human signs",
];

function SeverityChip({ severity, tag }: { severity: "red" | "amber" | "green"; tag: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded px-1.5 py-0.5 font-code text-[9px] font-bold uppercase tracking-[0.12em]",
        severity === "red" && "bg-brand-600/12 text-brand-700",
        severity === "amber" && "bg-amber-500/15 text-amber-700",
        severity === "green" && "bg-emerald-500/15 text-emerald-700"
      )}
    >
      {tag}
    </span>
  );
}

function Annotation({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute z-10 hidden select-none items-center gap-1.5 font-code text-[10px] font-semibold italic tracking-[0.06em] text-brand-600 xl:flex",
        className
      )}
      aria-hidden="true"
    >
      <PenLine className="h-3 w-3 -scale-x-100" />
      {children}
    </span>
  );
}

/**
 * The output — an annotated, interactive mock of the sourced report
 * Quorum hands to the committee: report, flag register and audit log.
 */
export function ReportMock() {
  const [tab, setTab] = useState<TabId>("report");

  return (
    <section id="report" className="scroll-mt-20 border-y border-ink-100 bg-sand/60">
      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-14">
          {/* Copy */}
          <div className="min-w-0 lg:col-span-4">
            <Reveal>
              <Eyebrow>The output</Eyebrow>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="mt-4 font-display text-[34px] font-black leading-[1.06] tracking-[-0.025em] text-ink-950 sm:text-[44px]">
                What lands in the committee pack.
              </h2>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-6 text-[16.5px] leading-relaxed text-ink-600">
                One document, three panes. The report the committee reads, the flag register it
                rules on, and the audit log that proves how every line got there.
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <ul className="mt-7 space-y-3.5">
                {TICKS.map((t) => (
                  <li key={t} className="flex items-start gap-3 text-[14.5px] font-medium text-ink-800">
                    <svg viewBox="0 0 16 16" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true">
                      <path d="M2.5 8.5 6 12l7.5-8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {t}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={0.24}>
              <a
                href="#inside"
                className="group mt-8 inline-flex items-center gap-2 text-[15px] font-semibold text-brand-700 transition-colors hover:text-brand-800"
              >
                See everything inside the run
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </a>
            </Reveal>
          </div>

          {/* Document sheet */}
          <Reveal delay={0.1} className="min-w-0 lg:col-span-8">
            <div className="relative rounded-2xl border border-ink-200/70 bg-white shadow-[0_32px_80px_rgba(11,12,15,0.14)]">
              {/* Punched holes for the pack metaphor */}
              <div className="absolute left-3 top-0 hidden h-full flex-col justify-center gap-16 sm:flex" aria-hidden="true">
                <span className="h-3 w-3 rounded-full bg-sand ring-1 ring-ink-200" />
                <span className="h-3 w-3 rounded-full bg-sand ring-1 ring-ink-200" />
                <span className="h-3 w-3 rounded-full bg-sand ring-1 ring-ink-200" />
              </div>

              <div className="relative sm:pl-7">
                {/* Doc header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-4 sm:px-7">
                  <p className="font-code text-[10px] font-bold tracking-[0.2em] text-ink-950">
                    SOURCED REPORT · TENDER KE-NCB-104293
                  </p>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-300 bg-brand-50 px-3 py-1 font-code text-[9px] font-bold tracking-[0.14em] text-brand-700">
                    <CirclePause className="h-3 w-3" aria-hidden="true" />
                    GATE: PENDING SIGN-OFF
                  </span>
                </div>
                <p className="border-b border-ink-100 bg-paper px-5 py-2.5 font-code text-[9.5px] tracking-[0.14em] text-ink-400 sm:px-7">
                  4 BIDS · 16 DOCUMENTS · RUN 00:20:14 · MODEL QWEN3-32B (OPEN WEIGHTS) · EVERY CLAIM CITED
                </p>

                {/* Tabs */}
                <div role="tablist" aria-label="Report panes" className="flex gap-1 border-b border-ink-100 px-4 pt-3 sm:px-6">
                  {TABS.map((t) => {
                    const active = tab === t.id;
                    return (
                      <button
                        key={t.id}
                        role="tab"
                        id={`tab-${t.id}`}
                        aria-selected={active}
                        aria-controls={`pane-${t.id}`}
                        onClick={() => setTab(t.id)}
                        className={cn(
                          "relative -mb-px inline-flex items-center gap-1.5 rounded-t-lg px-3.5 py-2.5 font-code text-[10px] font-bold tracking-[0.16em] transition-colors",
                          active
                            ? "border border-b-white border-ink-100 bg-white text-ink-950"
                            : "border border-transparent text-ink-400 hover:text-ink-700"
                        )}
                      >
                        {t.label}
                        <span
                          className={cn(
                            "rounded px-1 py-0.5 text-[8.5px] tabular",
                            active ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-500"
                          )}
                        >
                          {t.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Panes */}
                <div className="min-h-[352px] px-5 py-5 sm:px-7">
                  {tab === "report" && (
                    <div role="tabpanel" id="pane-report" aria-labelledby="tab-report" className="relative divide-y divide-ink-100">
                      <Annotation className="-right-2 top-1">
                        every claim cited to a page
                      </Annotation>
                      {FINDINGS.map((f) => (
                        <div key={f.tag + f.cite} className="relative flex flex-col gap-1.5 py-3.5 first:pt-1 last:pb-1 sm:flex-row sm:items-start sm:gap-3">
                          <SeverityChip severity={f.severity} tag={f.tag} />
                          <div className="min-w-0 flex-1">
                            <p className="text-[13.5px] font-medium leading-snug text-ink-800">{f.text}</p>
                            <p className="mt-1.5 flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 rounded border border-ink-200 bg-paper px-1.5 py-0.5 font-code text-[9.5px] tracking-[0.06em] text-ink-500">
                                <FileText className="h-2.5 w-2.5" aria-hidden="true" />
                                {f.cite}
                              </span>
                              {f.note && <span className="font-code text-[9.5px] italic text-brand-600">{f.note}</span>}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {tab === "flags" && (
                    <div role="tabpanel" id="pane-flags" aria-labelledby="tab-flags" className="relative space-y-3">
                      <Annotation className="-right-2 top-0">
                        nothing buried in prose
                      </Annotation>
                      {FLAGS.map((f) => (
                        <div key={f.code} className="relative rounded-xl border border-ink-100 bg-paper p-4">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="font-code text-[10px] font-bold text-ink-400">{f.code}</span>
                            <span className="inline-flex items-center rounded bg-brand-600/12 px-1.5 py-0.5 font-code text-[9px] font-bold tracking-[0.12em] text-brand-700">
                              {f.level}
                            </span>
                          </div>
                          <p className="mt-2 text-[13.5px] font-semibold text-ink-900">{f.text}</p>
                          <p className="mt-1 text-[12.5px] text-ink-500">{f.action}</p>
                        </div>
                      ))}
                      <p className="pt-1 font-code text-[9.5px] tracking-[0.14em] text-ink-400">
                        FLAGS ARE ADVICE — THE RULING BELONGS TO THE COMMITTEE.
                      </p>
                    </div>
                  )}

                  {tab === "audit" && (
                    <div role="tabpanel" id="pane-audit" aria-labelledby="tab-audit" className="relative space-y-1.5">
                      <Annotation className="-right-2 top-0">
                        inputs, outputs, timestamps
                      </Annotation>
                      {AUDIT.map((a) => (
                        <p
                          key={a.call}
                          className={cn(
                            "flex flex-wrap items-baseline gap-x-3 font-code text-[10.5px] leading-relaxed sm:text-[11px]",
                            a.paused ? "rounded-lg border-l-2 border-brand-500 bg-brand-600/10 px-3 py-2" : "text-ink-600"
                          )}
                        >
                          <span className="tabular text-ink-400">{a.t}</span>
                          <span className={cn("font-bold", a.paused ? "text-brand-700" : "text-brand-600")}>{a.call}</span>
                          <span className={a.paused ? "text-brand-800" : "text-ink-500"}>{a.io}</span>
                        </p>
                      ))}
                      <div className="flex flex-wrap items-center gap-2 pt-3">
                        <span className="rounded border border-ink-200 bg-paper px-2 py-1 font-code text-[9.5px] text-ink-500">
                          sha256 : 9f3c…a41b
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded border border-ink-200 bg-paper px-2 py-1 font-code text-[9.5px] font-semibold text-ink-700">
                          <Download className="h-2.5 w-2.5" aria-hidden="true" />
                          export audit.json
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Doc footer */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 px-5 py-3 sm:px-7">
                  <p className="font-code text-[9px] tracking-[0.18em] text-ink-400">
                    PAGE 1 OF 1 · GENERATED 00:20:14 · QUORUM
                  </p>
                  <p className="font-code text-[9px] tracking-[0.18em] text-brand-600">
                    THE COMMITTEE SIGNS — THE AGENT NEVER DOES
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
