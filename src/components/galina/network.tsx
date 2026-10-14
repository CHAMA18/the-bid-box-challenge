"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plane, Truck, Ship, ArrowRight, CalendarClock, Route } from "lucide-react";
import { CORRIDORS } from "@/lib/data";
import { Eyebrow, Reveal } from "@/components/galina/reveal";
import { cn } from "@/lib/utils";

const MODE_ICON: Record<string, typeof Plane> = {
  "Air + Sealed Road": Plane,
  "Sea FCL/LCL + Road": Ship,
  "Air + Road": Plane,
  "Air Charter + Road": Plane,
};

export function Network() {
  const [active, setActive] = useState(0);
  const corridor = CORRIDORS[active];
  const ModeIcon = MODE_ICON[corridor.mode] ?? Truck;

  return (
    <section id="network" className="scroll-mt-24 bg-sand py-20 sm:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <Reveal>
            <Eyebrow>The network</Eyebrow>
            <h2 className="mt-4 max-w-xl font-display text-[34px] font-black leading-[1.05] tracking-[-0.025em] text-ink-950 sm:text-[46px]">
              Four corridors into <span className="text-brand-600">one nation.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="max-w-sm text-[15.5px] leading-relaxed text-ink-600">
              Dedicated trade lanes from the world's manufacturing hearts into every Iraqi city —
              pick a corridor to inspect it.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.12}>
          {/* Corridor switcher */}
          <div className="mt-12 flex flex-wrap gap-2.5" role="tablist" aria-label="Trade corridors">
            {CORRIDORS.map((c, i) => (
              <button
                key={c.id}
                role="tab"
                aria-selected={active === i}
                aria-controls="corridor-panel"
                onClick={() => setActive(i)}
                className={cn(
                  "relative h-11 rounded-full px-6 text-[14.5px] font-semibold transition-all",
                  active === i
                    ? "bg-ink-950 text-white shadow-lg"
                    : "border border-ink-200 bg-white text-ink-600 hover:border-ink-300 hover:text-ink-900"
                )}
              >
                {c.origin}
                {active === i && (
                  <motion.span
                    layoutId="corridor-dot"
                    className="absolute right-3 top-1/2 hidden h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-brand-500 sm:block"
                  />
                )}
              </button>
            ))}
          </div>

          {/* Corridor panel */}
          <AnimatePresence mode="wait">
            <motion.div
              key={corridor.id}
              id="corridor-panel"
              role="tabpanel"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-[0_18px_50px_rgba(11,12,15,0.08)]"
            >
              <div className="grid lg:grid-cols-5">
                {/* Route headline */}
                <div className="relative overflow-hidden bg-ink-950 p-7 sm:p-9 lg:col-span-2">
                  <div className="bg-grid-dark absolute inset-0 opacity-60" aria-hidden="true" />
                  <div className="relative">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-[0_10px_24px_rgba(217,38,22,0.45)]">
                      <ModeIcon className="h-5.5 w-5.5" aria-hidden="true" />
                    </span>
                    <p className="mt-6 font-code text-[10.5px] tracking-[0.24em] text-ink-400">
                      CORRIDOR {corridor.id} — {corridor.origin.toUpperCase()}
                    </p>
                    <h3 className="mt-2 font-display text-[26px] font-extrabold leading-tight tracking-tight text-white">
                      {corridor.label}
                    </h3>
                    <p className="mt-3 text-[14px] leading-relaxed text-ink-300">{corridor.note}</p>

                    <div className="mt-7 flex items-center gap-2.5 border-t border-white/10 pt-6">
                      <span className="rounded-lg bg-white/[0.07] px-3 py-1.5 font-code text-[11px] font-semibold text-brand-300 ring-1 ring-white/10">
                        {corridor.transit}
                      </span>
                      <span className="rounded-lg bg-white/[0.07] px-3 py-1.5 font-code text-[11px] font-semibold text-white ring-1 ring-white/10">
                        {corridor.mode}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Facts */}
                <div className="grid gap-px bg-ink-100 sm:grid-cols-2 lg:col-span-3">
                  <div className="bg-white p-7">
                    <CalendarClock className="h-5 w-5 text-brand-600" aria-hidden="true" />
                    <p className="mt-3 font-code text-[9.5px] tracking-[0.2em] text-ink-400">FREQUENCY</p>
                    <p className="mt-1.5 font-display text-[18px] font-bold text-ink-950">{corridor.frequency}</p>
                  </div>
                  <div className="bg-white p-7">
                    <Route className="h-5 w-5 text-brand-600" aria-hidden="true" />
                    <p className="mt-3 font-code text-[9.5px] tracking-[0.2em] text-ink-400">TRANSIT TIME</p>
                    <p className="mt-1.5 font-display text-[18px] font-bold text-ink-950">{corridor.transit}</p>
                  </div>
                  <div className="bg-white p-7 sm:col-span-2">
                    <p className="font-code text-[9.5px] tracking-[0.2em] text-ink-400">GATEWAY SEQUENCE</p>
                    <ol className="mt-4 space-y-3">
                      {corridor.gateways.map((g, i) => (
                        <li key={g} className="flex items-center gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ink-200 font-code text-[11px] font-bold text-ink-700">
                            {i + 1}
                          </span>
                          <span className="text-[14.5px] font-medium text-ink-800">{g}</span>
                          {i < corridor.gateways.length - 1 && (
                            <ArrowRight className="h-3.5 w-3.5 text-brand-500" aria-hidden="true" />
                          )}
                        </li>
                      ))}
                    </ol>
                    <a
                      href="#quote"
                      className="group mt-6 inline-flex items-center gap-2 text-[14px] font-semibold text-brand-600 transition-colors hover:text-brand-700"
                    >
                      Price this lane
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </Reveal>
      </div>
    </section>
  );
}
