"use client";

import { useState } from "react";
import { ArrowRight, Check, Gauge } from "lucide-react";
import { Eyebrow, Reveal } from "@/components/bidbox/reveal";
import { cn } from "@/lib/utils";

const CHECKLIST = [
  { id: "repo", label: "Public repo — OSI licence, one-command README" },
  { id: "video", label: "Demo video < 3 min — unedited agent run on screen" },
  { id: "desc", label: "~300-word description — theme, institution, workflow" },
  { id: "arch", label: "ARCHITECTURE.md — one page, built vs borrowed" },
  { id: "evals", label: "EVALS.md — 8+ test tasks, one honest failure" },
];

/**
 * Closing band — the scope line, plus an interactive readiness checklist
 * mirroring the five submission artefacts.
 */
export function Closing() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const count = CHECKLIST.filter((c) => checked[c.id]).length;
  const ready = count === CHECKLIST.length;

  function toggle(id: string) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <section id="submit" className="scroll-mt-20 bg-brand-600">
      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Statement */}
          <div className="lg:col-span-7">
            <Reveal>
              <Eyebrow tone="light" className="text-white/80">
                Before you write a line of code
              </Eyebrow>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="mt-5 font-display text-[36px] font-black leading-[1.04] tracking-[-0.025em] text-white sm:text-[52px]">
                Three tools that work beat nine that half-work.
              </h2>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-white/85">
                In five days, scope is the skill we are watching for.
              </p>
            </Reveal>
            <Reveal delay={0.22}>
              <div className="mt-9 flex flex-wrap items-center gap-3.5">
                <a
                  href="#requirements"
                  className="group inline-flex h-[52px] items-center gap-2 rounded-full bg-ink-950 px-7 text-[15px] font-semibold text-white transition-all hover:bg-ink-900 hover:shadow-[0_14px_36px_rgba(11,12,15,0.35)]"
                >
                  Re-check the requirements
                  <ArrowRight
                    className="h-4.5 w-4.5 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </a>
                <a
                  href="#jargon"
                  className="inline-flex h-[52px] items-center rounded-full border border-white/35 px-7 text-[15px] font-semibold text-white transition-all hover:border-white hover:bg-white/10"
                >
                  Back to the jargon
                </a>
              </div>
            </Reveal>
          </div>

          {/* Readiness checklist */}
          <Reveal delay={0.14} className="lg:col-span-5">
            <div className="rounded-3xl bg-white p-6 shadow-[0_32px_80px_rgba(11,12,15,0.35)] sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 ring-1 ring-brand-200">
                    <Gauge className="h-5 w-5 text-brand-600" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-code text-[9.5px] font-semibold tracking-[0.24em] text-ink-500">
                      SUBMISSION READINESS
                    </p>
                    <p className="font-display text-[18px] font-extrabold tracking-tight text-ink-950">
                      {ready ? "Ready to submit" : `${count} of ${CHECKLIST.length} ready`}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "font-code text-[12px] font-bold tabular",
                    ready ? "text-brand-600" : "text-ink-400"
                  )}
                >
                  {Math.round((count / CHECKLIST.length) * 100)}%
                </span>
              </div>

              {/* Progress bar */}
              <div
                className="mt-5 h-2 w-full overflow-hidden rounded-full bg-ink-100"
                role="progressbar"
                aria-valuenow={count}
                aria-valuemin={0}
                aria-valuemax={CHECKLIST.length}
                aria-label="Submission readiness"
              >
                <div
                  className="h-full rounded-full bg-brand-600 transition-all duration-500 ease-out"
                  style={{ width: `${(count / CHECKLIST.length) * 100}%` }}
                />
              </div>

              <ul className="mt-5 space-y-2.5">
                {CHECKLIST.map((item) => {
                  const on = !!checked[item.id];
                  return (
                    <li key={item.id}>
                      <label
                        htmlFor={`chk-${item.id}`}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition-all",
                          on
                            ? "border-brand-300 bg-brand-50/70"
                            : "border-ink-100 bg-paper hover:border-ink-200"
                        )}
                      >
                        <input
                          id={`chk-${item.id}`}
                          type="checkbox"
                          checked={on}
                          onChange={() => toggle(item.id)}
                          className="peer sr-only"
                        />
                        <span
                          aria-hidden="true"
                          className={cn(
                            "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-all",
                            on ? "border-brand-600 bg-brand-600 text-white" : "border-ink-300 bg-white"
                          )}
                        >
                          {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                        </span>
                        <span
                          className={cn(
                            "text-[13.5px] font-medium leading-snug transition-colors",
                            on ? "text-brand-900" : "text-ink-700"
                          )}
                        >
                          {item.label}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>

              <p
                aria-live="polite"
                className={cn(
                  "mt-5 rounded-xl px-4 py-3 text-center font-code text-[10.5px] font-semibold tracking-[0.16em] transition-colors",
                  ready ? "bg-brand-600 text-white" : "bg-sand text-ink-500"
                )}
              >
                {ready
                  ? "FIVE FOR FIVE — SHIP IT TO THE BID BOX"
                  : "TICK ALL FIVE — THE BID BOX ONLY OPENS ON A COMPLETE FILE"}
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
