import { CirclePause, Ticket } from "lucide-react";
import { Eyebrow, Reveal } from "@/components/bidbox/reveal";

const TASKS = [
  "Sorting bids",
  "Ticking off documents",
  "Checking each bidder",
  "Comparing prices",
  "Writing the report",
];

/**
 * Overview — the job in numbers: 26 days of committee work vs ~20 minutes
 * of agent work, ending at a hard human gate.
 */
export function Overview() {
  return (
    <section id="overview" className="scroll-mt-20 border-y border-ink-100 bg-sand/60">
      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-14">
          {/* Copy */}
          <div className="min-w-0 lg:col-span-5">
            <Reveal>
              <Eyebrow>Overview</Eyebrow>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="mt-4 font-display text-[34px] font-black leading-[1.06] tracking-[-0.025em] text-ink-950 sm:text-[44px]">
                The same job. Two very different clocks.
              </h2>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-6 text-[16.5px] leading-relaxed text-ink-600">
                Sorting bids, ticking off documents, checking each bidder, comparing prices and
                writing the report is{" "}
                <span className="font-semibold text-ink-900">26 days of committee work today</span>.
                Your agent should do the same work in about twenty minutes — and then stop.
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <div className="mt-8 flex items-start gap-4 rounded-2xl border border-brand-200 bg-white p-5 shadow-sm">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 ring-1 ring-brand-200">
                  <Ticket className="h-5 w-5 text-brand-600" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-code text-[10px] font-semibold tracking-[0.22em] text-brand-700">
                    PRIZE POOL
                  </p>
                  <p className="mt-1 text-[15.5px] font-semibold leading-snug text-ink-900">
                    A ticket to the MCP Conference in Nairobi.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Timeline visual */}
          <Reveal delay={0.1} className="min-w-0 lg:col-span-7">
            <div className="rounded-3xl border border-ink-100 bg-white p-6 shadow-[0_24px_60px_rgba(11,12,15,0.08)] sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <p className="font-code text-[10px] font-semibold tracking-[0.26em] text-ink-500">
                  ONE TENDER, END TO END
                </p>
                <p className="font-code text-[10px] tracking-[0.18em] text-ink-400">FIG. 01 — THE CLOCK</p>
              </div>

              {/* Proportional bar */}
              <div className="mt-6 flex h-14 w-full items-stretch gap-1 overflow-hidden rounded-xl sm:h-16">
                <div className="relative flex min-w-0 flex-[100] items-center overflow-hidden rounded-l-lg bg-ink-950 px-4">
                  <div className="bg-grid-dark absolute inset-0 opacity-60" aria-hidden="true" />
                  <p className="relative truncate font-code text-[10.5px] font-semibold tracking-[0.18em] text-ink-200 sm:text-[11.5px]">
                    26 DAYS — COMMITTEE WORK TODAY
                  </p>
                </div>
                <div className="relative flex min-w-[64px] flex-[1.5] items-center justify-center overflow-hidden rounded-r-lg bg-brand-600 px-2">
                  <p className="text-center font-code text-[10.5px] font-bold tracking-[0.12em] text-white sm:text-[11.5px]">
                    ~20 MIN
                  </p>
                </div>
              </div>

              {/* Task chips over the committee segment */}
              <div className="mt-5 flex flex-wrap gap-2">
                {TASKS.map((t, i) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-2 rounded-full border border-ink-100 bg-paper px-3 py-1.5 text-[12px] font-medium text-ink-700"
                  >
                    <span className="font-code text-[9.5px] font-semibold text-brand-600 tabular">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {t}
                  </span>
                ))}
              </div>
              <p className="mt-2.5 font-code text-[10px] tracking-[0.14em] text-ink-400">
                ↑ WHAT THE COMMITTEE DOES BY HAND · WHAT YOUR AGENT SHOULD TAKE: THE RED SLICE ↑
              </p>

              {/* Human gate */}
              <div className="mt-6 flex items-start gap-4 rounded-xl border-2 border-dashed border-brand-300 bg-brand-50/60 p-4 sm:p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
                  <CirclePause className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-code text-[10.5px] font-bold tracking-[0.22em] text-brand-700">
                    COMMITTEE DECIDES
                  </p>
                  <p className="mt-1 text-[14.5px] font-medium leading-snug text-ink-800">
                    Your agent stops here and hands over a sourced report.
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
