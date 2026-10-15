"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Eyebrow, Reveal } from "@/components/bidbox/reveal";

const STATS = [
  { value: 1284, format: (n: number) => Math.round(n).toLocaleString("en-US"), label: "tenders read end to end" },
  { value: 9317, format: (n: number) => Math.round(n).toLocaleString("en-US"), label: "findings cited to a source" },
  { value: 11, format: (n: number) => String(Math.round(n)), label: "OCDS portals covered" },
  { value: 23, format: (n: number) => String(Math.round(n)), label: "min — median run, notice to report" },
];

const QUOTES = [
  {
    quote:
      "The first run found a lapsed registration our own reviewers had passed over twice. The citation made it undeniable.",
    name: "A. Mwangi",
    role: "Procurement lead · county health supply agency",
  },
  {
    quote:
      "I sign the gate the way I sign anything else — after the evidence. The audit log is what sold our auditors.",
    name: "T. Okonkwo",
    role: "Internal audit · state finance ministry",
  },
];

function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
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

  return <span ref={ref}>{format(display)}</span>;
}

/**
 * Proof band — pilot telemetry with count-up animation, plus two
 * committee-side testimonials. Dark statement surface.
 */
export function ProofBand() {
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
              <Eyebrow tone="light">Receipts, not promises</Eyebrow>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="mt-4 max-w-2xl font-display text-[34px] font-black leading-[1.06] tracking-[-0.025em] text-white sm:text-[44px]">
                Numbers from pilot runs.
              </h2>
            </Reveal>
          </div>
          <Reveal delay={0.12}>
            <p className="max-w-sm text-[15px] leading-relaxed text-ink-400">
              Aggregate telemetry across pilot deployments — every number below is itself sourced,
              from the run logs.
            </p>
          </Reveal>
        </div>

        {/* Counters */}
        <Reveal delay={0.1}>
          <dl className="mt-12 grid grid-cols-2 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="border-l-2 border-brand-600/60 pl-5">
                <dd className="font-display text-[38px] font-black leading-none tracking-tight text-white tabular sm:text-[46px]">
                  <CountUp value={s.value} format={s.format} />
                </dd>
                <dt className="mt-2.5 text-[13px] font-medium leading-snug text-ink-400">{s.label}</dt>
              </div>
            ))}
          </dl>
        </Reveal>

        {/* Testimonials */}
        <div className="mt-14 grid gap-5 lg:grid-cols-2">
          {QUOTES.map((q, i) => (
            <Reveal key={q.name} delay={0.08 * i} className="h-full">
              <figure className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:p-7">
                <span className="font-display text-[34px] font-black leading-none text-brand-400" aria-hidden="true">
                  &ldquo;
                </span>
                <blockquote className="mt-2 text-[15.5px] font-medium leading-relaxed text-ink-100">
                  {q.quote}
                </blockquote>
                <figcaption className="mt-5 border-t border-white/10 pt-4">
                  <p className="font-display text-[14.5px] font-extrabold tracking-tight text-white">{q.name}</p>
                  <p className="mt-0.5 font-code text-[10px] tracking-[0.16em] text-ink-400">
                    {q.role.toUpperCase()}
                  </p>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
