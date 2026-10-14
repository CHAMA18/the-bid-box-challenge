"use client";

import { motion } from "framer-motion";
import { ArrowRight, CirclePause, FileCheck2, Ticket } from "lucide-react";
import { AgentRun } from "@/components/bidbox/agent-run";
import { Eyebrow } from "@/components/bidbox/reveal";

const STATS = [
  { value: "20", suffix: " min", label: "for the agent to do the committee's work" },
  { value: "3", suffix: "+", label: "different tools on your own MCP server" },
  { value: "100", suffix: "%", label: "of findings cited to a source document" },
  { value: "1", suffix: "", label: "human gate before anything irreversible" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-paper">
      <div
        className="bg-grid-light pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]"
        aria-hidden="true"
      />
      <div className="relative mx-auto w-full max-w-7xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:px-8 lg:pb-24 lg:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
          {/* Copy */}
          <div className="lg:col-span-6">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <Eyebrow>Agentic AI for Africa — Innovation Challenge</Eyebrow>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 font-display text-[42px] font-black leading-[1.02] tracking-[-0.03em] text-ink-950 text-balance sm:text-[58px] lg:text-[64px]"
            >
              Do in{" "}
              <span className="relative inline-block text-brand-600">
                twenty minutes
                <svg
                  viewBox="0 0 220 12"
                  className="absolute -bottom-1 left-0 w-full"
                  aria-hidden="true"
                  preserveAspectRatio="none"
                >
                  <path d="M3 9 C 60 2, 160 2, 217 8" stroke="#e8382a" strokeWidth="4" strokeLinecap="round" fill="none" />
                </svg>
              </span>{" "}
              what takes a committee twenty-six days.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 max-w-xl text-[17px] leading-relaxed text-ink-600"
            >
              Build an agent that reads a public tender end to end — sorts the bids, ticks off the
              documents, checks each bidder, compares prices and writes the report. Every finding
              cited. Then it stops and hands over:{" "}
              <span className="font-semibold text-ink-900">the committee decides.</span>
            </motion.p>

            {/* Prize chip */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6"
            >
              <span className="inline-flex items-center gap-2.5 rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-[13.5px] font-semibold text-brand-700">
                <Ticket className="h-4 w-4" aria-hidden="true" />
                Prize — a ticket to the MCP Conference, Nairobi
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 flex flex-wrap items-center gap-3.5"
            >
              <a
                href="#submit"
                className="group inline-flex h-[52px] items-center gap-2 rounded-full bg-brand-600 px-7 text-[15px] font-semibold text-white shadow-[0_12px_30px_rgba(217,38,22,0.32)] transition-all hover:bg-brand-700 hover:shadow-[0_14px_36px_rgba(217,38,22,0.4)]"
              >
                Submit your build
                <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </a>
              <a
                href="#requirements"
                className="inline-flex h-[52px] items-center gap-2.5 rounded-full border border-ink-200 bg-white px-7 text-[15px] font-semibold text-ink-900 transition-all hover:border-ink-300 hover:shadow-md"
              >
                Read the brief
              </a>
            </motion.div>

            {/* Stats */}
            <motion.dl
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.42, ease: [0.22, 1, 0.36, 1] }}
              className="mt-12 grid grid-cols-2 gap-x-6 gap-y-7 border-t border-ink-100 pt-8 sm:grid-cols-4"
            >
              {STATS.map((s) => (
                <div key={s.label}>
                  <dt className="order-2 mt-1 text-[12.5px] font-medium leading-snug text-ink-500">{s.label}</dt>
                  <dd className="order-1 font-display text-[30px] font-extrabold tracking-tight text-ink-950 tabular">
                    {s.value}
                    <span className="text-brand-600">{s.suffix}</span>
                  </dd>
                </div>
              ))}
            </motion.dl>
          </div>

          {/* Agent run */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative lg:col-span-6"
          >
            <AgentRun />

            {/* Floating proof chips */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.6 }}
              className="absolute -left-4 top-10 hidden items-center gap-2 rounded-xl border border-ink-100 bg-white/95 px-3.5 py-2.5 shadow-lg backdrop-blur md:flex lg:-left-8"
            >
              <FileCheck2 className="h-4 w-4 text-brand-600" aria-hidden="true" />
              <p className="text-[12.5px] font-semibold text-ink-900">
                Every claim cited <span className="font-code text-[10px] font-medium text-ink-400">· or it doesn&apos;t count</span>
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5, duration: 0.6 }}
              className="absolute -right-3 bottom-16 hidden items-center gap-2 rounded-xl border border-ink-100 bg-white/95 px-3.5 py-2.5 shadow-lg backdrop-blur md:flex lg:-right-7"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-brand-500" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" />
              </span>
              <CirclePause className="h-4 w-4 text-brand-600" aria-hidden="true" />
              <p className="text-[12.5px] font-semibold text-ink-900">Stops before the award</p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
