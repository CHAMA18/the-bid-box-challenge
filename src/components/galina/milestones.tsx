import { MILESTONES } from "@/lib/data";
import { Eyebrow, Reveal } from "@/components/galina/reveal";
import { cn } from "@/lib/utils";

/** Vertical journey timeline on a dark engineering-grid band. */
export function Milestones() {
  return (
    <section id="milestones" className="relative scroll-mt-24 overflow-hidden bg-night py-20 sm:py-28">
      <div className="bg-grid-dark pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <Eyebrow tone="light" className="justify-center">Our journey</Eyebrow>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-[34px] font-black leading-[1.05] tracking-[-0.025em] text-white sm:text-[46px]">
            Milestones on the road <span className="text-brand-400">to everywhere.</span>
          </h2>
        </Reveal>

        <div className="relative mt-16">
          {/* Spine */}
          <div className="absolute left-4 top-0 h-full w-[2px] bg-gradient-to-b from-brand-600 via-brand-600/40 to-transparent sm:left-1/2 sm:-translate-x-1/2" aria-hidden="true" />

          <ol className="space-y-12">
            {MILESTONES.map((m, i) => {
              const leftSide = i % 2 === 0;
              return (
                <li key={m.year} className="relative">
                  {/* Node */}
                  <span
                    aria-hidden="true"
                    className="absolute left-4 top-7 z-10 flex h-4 w-4 -translate-x-1/2 items-center justify-center sm:left-1/2"
                  >
                    <span className="absolute h-4 w-4 animate-ping-slow rounded-full bg-brand-600/50" />
                    <span className="relative h-3 w-3 rounded-full border-2 border-night bg-brand-500" />
                  </span>

                  <Reveal
                    delay={0.05 * i}
                    className={cn(
                      "pl-12 sm:w-[calc(50%-2.5rem)] sm:pl-0",
                      leftSide ? "sm:mr-auto sm:text-right" : "sm:ml-auto"
                    )}
                  >
                    <div
                      className={cn(
                        "group rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur transition-colors hover:border-brand-600/50",
                        leftSide && "sm:[direction:ltr]"
                      )}
                    >
                      <p className="font-code text-[10.5px] font-semibold tracking-[0.24em] text-brand-400">{m.year}</p>
                      <h3 className="mt-2 font-display text-[21px] font-extrabold tracking-tight text-white">{m.title}</h3>
                      <p className="mt-2 text-[14px] leading-relaxed text-ink-300">{m.body}</p>
                      <span
                        className={cn(
                          "mt-4 inline-block rounded-full bg-brand-600/15 px-3 py-1.5 font-code text-[10.5px] font-semibold tracking-[0.14em] text-brand-300 ring-1 ring-brand-600/30"
                        )}
                      >
                        {m.stat.toUpperCase()}
                      </span>
                    </div>
                  </Reveal>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
