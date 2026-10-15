"use client";

import { motion, useReducedMotion } from "framer-motion";
import { FileSearch, Scale, ShieldAlert } from "lucide-react";
import { Eyebrow, Reveal } from "@/components/quorum/reveal";
import { Aurora, Spotlight } from "@/components/quorum/motion-kit";

const GUARANTEES = [
  { icon: FileSearch, text: "Every finding cites the document it came from" },
  { icon: ShieldAlert, text: "An unsourced flag against a supplier is worse than no flag" },
  { icon: Scale, text: "Procurement law across Africa keeps the award with a human committee" },
];

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * The one rule that is not negotiable — dark statement band.
 */
export function RuleBand() {
  const reduce = useReducedMotion();
  return (
    <section className="relative overflow-hidden bg-ink-950 text-white">
      <div className="bg-grid-dark absolute inset-0" aria-hidden="true" />
      <Aurora className="-right-32 -top-32 h-[520px] w-[520px] opacity-80" />
      <Aurora slow className="-bottom-40 left-10 h-[420px] w-[420px] opacity-60" />
      <div className="relative mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <Eyebrow tone="light">One rule — not negotiable</Eyebrow>
            <div className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.05] px-5 py-4 backdrop-blur">
              <Scale className="h-6 w-6 shrink-0 text-brand-400" aria-hidden="true" />
              <p className="font-code text-[11px] font-semibold leading-relaxed tracking-[0.18em] text-ink-200">
                AGENT PREPARES
                <motion.span
                  className="mx-2 inline-block text-brand-400"
                  animate={reduce ? undefined : { x: [0, 6, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                >
                  →
                </motion.span>
                COMMITTEE AWARDS
              </p>
            </div>
          </Reveal>

          <div className="lg:col-span-8">
            <Reveal delay={0.08}>
              <h2 className="font-display text-[34px] font-black leading-[1.06] tracking-[-0.025em] text-white sm:text-[48px]">
                Quorum prepares the file.{" "}
                <span className="relative inline-block text-brand-400">
                  It never awards the tender.
                  <motion.span
                    aria-hidden="true"
                    className="absolute -bottom-1 left-0 h-[3px] w-full origin-left rounded-full bg-brand-500"
                    initial={reduce ? false : { scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9, delay: 0.5, ease: EASE }}
                  />
                </span>
              </h2>
            </Reveal>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {GUARANTEES.map((g, i) => (
                <motion.div
                  key={g.text}
                  initial={reduce ? false : { opacity: 0, y: 26 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ delay: 0.16 + i * 0.12, duration: 0.7, ease: EASE }}
                  className="h-full"
                >
                  <Spotlight className="h-full rounded-2xl">
                    <div className="h-full rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition-colors duration-300 group-hover:border-brand-500/40">
                      <g.icon className="h-5 w-5 text-brand-400" aria-hidden="true" />
                      <p className="mt-3 text-[13.5px] font-medium leading-relaxed text-ink-200">{g.text}</p>
                    </div>
                  </Spotlight>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
