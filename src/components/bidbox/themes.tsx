import { Globe, HeartPulse, Landmark, Users } from "lucide-react";
import { Eyebrow, Reveal } from "@/components/bidbox/reveal";

const THEMES = [
  {
    icon: HeartPulse,
    sector: "Health & life sciences",
    title: "Health commodity tenders",
    body: "Specs against clinical need, quantities against real consumption, prices against other buyers.",
  },
  {
    icon: Landmark,
    sector: "Financial services",
    title: "Value for money",
    body: "Price outliers against past awards, budget reconciliation, unpaid-invoice exposure.",
  },
  {
    icon: Globe,
    sector: "Digital economy",
    title: "Open contracting",
    body: "Make the pipeline legible to citizens and small suppliers. Notices, deadlines, eligibility.",
  },
  {
    icon: Users,
    sector: "Future of work",
    title: "Inclusion & local economy",
    body: "Reserved-procurement quotas, local vs outside suppliers, what awards imply for jobs.",
  },
];

/**
 * Choose one theme — four lanes, one institution, one workflow.
 */
export function Themes() {
  return (
    <section id="themes" className="scroll-mt-20 bg-paper">
      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Reveal>
              <Eyebrow>Choose one theme</Eyebrow>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="mt-4 max-w-2xl font-display text-[34px] font-black leading-[1.06] tracking-[-0.025em] text-ink-950 sm:text-[44px]">
                Four lanes. Pick the one your agent will serve.
              </h2>
            </Reveal>
          </div>
          <Reveal delay={0.12}>
            <p className="max-w-sm text-[15px] leading-relaxed text-ink-500">
              One theme, one institution, one real workflow. Depth beats breadth in the judging
              room.
            </p>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {THEMES.map((theme, i) => (
            <Reveal key={theme.title} delay={0.08 * i} className="h-full">
              <article className="group flex h-full flex-col rounded-3xl border border-ink-100 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-[0_20px_44px_rgba(11,12,15,0.10)]">
                <div className="flex items-center justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 ring-1 ring-brand-200 transition-colors group-hover:bg-brand-600">
                    <theme.icon
                      className="h-5.5 w-5.5 text-brand-600 transition-colors group-hover:text-white"
                      aria-hidden="true"
                    />
                  </span>
                  <span className="font-code text-[10px] font-semibold text-ink-300 tabular">
                    T{String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <p className="mt-6 font-code text-[10px] font-semibold uppercase tracking-[0.24em] text-ink-400">
                  {theme.sector}
                </p>
                <h3 className="mt-2 font-display text-[21px] font-extrabold leading-snug tracking-[-0.01em] text-ink-950">
                  {theme.title}
                </h3>
                <p className="mt-3 text-[14px] leading-relaxed text-ink-600">{theme.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
