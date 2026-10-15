"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Eyebrow, Reveal } from "@/components/quorum/reveal";

interface LiveRun {
  tenderId: string;
  findings: unknown[];
  drafts: unknown[];
}

interface LiveTotals {
  tenders: number;
  findings: number;
  drafts: number;
  runs: number;
}

const EMPTY: LiveTotals = { tenders: 0, findings: 0, drafts: 0, runs: 0 };

function CountUp({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    // Already animated once: follow later value changes (live data arrives async).
    if (started.current) {
      setDisplay(value);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return;
        started.current = true;
        io.disconnect();
        // Reduced motion: no animation — show the final value immediately.
        if (reduce) {
          setDisplay(value);
          return;
        }
        const t0 = performance.now();
        const DURATION = 1400;
        const tick = (now: number) => {
          const p = Math.min(1, (now - t0) / DURATION);
          const eased = 1 - Math.pow(1 - p, 3);
          setDisplay(value * eased);
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, reduce]);

  return <span ref={ref}>{Math.round(display).toLocaleString("en-US")}</span>;
}

/**
 * Proof band — counters computed from the runs on the quorum-mcp sidecar.
 * Shows zero until a run exists; nothing is invented.
 */
export function ProofBand() {
  const [totals, setTotals] = useState<LiveTotals>(EMPTY);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/runs?XTransformPort=3031");
        const json = (await res.json()) as { runs?: LiveRun[] };
        if (!alive) return;
        const runs = json.runs ?? [];
        setTotals({
          tenders: new Set(runs.map((r) => r.tenderId)).size,
          findings: runs.reduce((n, r) => n + r.findings.length, 0),
          drafts: runs.reduce((n, r) => n + r.drafts.length, 0),
          runs: runs.length,
        });
      } catch {
        /* Sidecar unreachable — counters stay at zero rather than showing invented numbers. */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const STATS = [
    { value: totals.tenders, label: "tenders reviewed" },
    { value: totals.runs, label: "review runs" },
    { value: totals.findings, label: "findings flagged" },
    { value: totals.drafts, label: "redlines drafted" },
  ];

  return (
    <section id="proof" className="relative scroll-mt-20 overflow-hidden bg-ink-950 text-white">
      <div className="bg-grid-dark absolute inset-0" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -left-32 -bottom-32 h-96 w-96 rounded-full bg-brand-600/20 blur-[120px]"
        aria-hidden="true"
      />
      <div className="relative mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Reveal>
              <Eyebrow tone="light">Live from this workspace</Eyebrow>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="mt-4 max-w-2xl font-display text-[34px] font-black leading-[1.06] tracking-[-0.025em] text-white sm:text-[44px]">
                What the agent has actually done.
              </h2>
            </Reveal>
          </div>
          <Reveal delay={0.12}>
            <p className="max-w-sm text-[15px] leading-relaxed text-ink-400">
              Counted from the review runs on this server. Zero means no run has happened yet.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <dl className="mt-12 grid grid-cols-2 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="border-l-2 border-brand-600/60 pl-5">
                <dd className="font-display text-[38px] font-black leading-none tracking-tight text-white tabular sm:text-[46px]">
                  <CountUp value={s.value} />
                </dd>
                <dt className="mt-2.5 text-[13px] font-medium leading-snug text-ink-400">{s.label}</dt>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}
