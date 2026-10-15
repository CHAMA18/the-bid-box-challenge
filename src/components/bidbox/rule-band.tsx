import { FileSearch, Scale, ShieldAlert } from "lucide-react";
import { Eyebrow, Reveal } from "@/components/bidbox/reveal";

const GUARANTEES = [
  { icon: FileSearch, text: "Every finding cites the document it came from" },
  { icon: ShieldAlert, text: "An unsourced flag against a supplier is worse than no flag" },
  { icon: Scale, text: "Procurement law across Africa keeps the award with a human committee" },
];

/**
 * The one rule that is not negotiable — dark statement band.
 */
export function RuleBand() {
  return (
    <section className="relative overflow-hidden bg-ink-950 text-white">
      <div className="bg-grid-dark absolute inset-0" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-600/20 blur-[120px]"
        aria-hidden="true"
      />
      <div className="relative mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <Eyebrow tone="light">One rule — not negotiable</Eyebrow>
            <div className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.05] px-5 py-4">
              <Scale className="h-6 w-6 shrink-0 text-brand-400" aria-hidden="true" />
              <p className="font-code text-[11px] font-semibold leading-relaxed tracking-[0.18em] text-ink-200">
                AGENT PREPARES
                <span className="mx-2 text-brand-400">→</span>
                COMMITTEE AWARDS
              </p>
            </div>
          </Reveal>

          <div className="lg:col-span-8">
            <Reveal delay={0.08}>
              <h2 className="font-display text-[34px] font-black leading-[1.06] tracking-[-0.025em] text-white sm:text-[48px]">
                Bid Box prepares the file.{" "}
                <span className="text-brand-400">It never awards the tender.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.16}>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {GUARANTEES.map((g) => (
                  <div key={g.text} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                    <g.icon className="h-5 w-5 text-brand-400" aria-hidden="true" />
                    <p className="mt-3 text-[13.5px] font-medium leading-relaxed text-ink-200">{g.text}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
