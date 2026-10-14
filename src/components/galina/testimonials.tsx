"use client";

import useEmblaCarousel from "embla-carousel-react";
import { useEffect, useState } from "react";
import { Quote, ArrowLeft, ArrowRight } from "lucide-react";
import { TESTIMONIALS } from "@/lib/data";
import { Eyebrow, Reveal } from "@/components/galina/reveal";
import { cn } from "@/lib/utils";

export function Testimonials() {
  const [emblaRef, embla] = useEmblaCarousel({ loop: true, align: "start" });
  const [selected, setSelected] = useState(0);
  const [snaps, setSnaps] = useState<number[]>([]);

  useEffect(() => {
    if (!embla) return;
    const sync = () => {
      setSnaps(embla.scrollSnapList());
      setSelected(embla.selectedScrollSnap());
    };
    embla.on("select", sync).on("reInit", sync);
    // Defer first sync out of the effect body to avoid a cascading render.
    const t = setTimeout(sync, 0);
    return () => {
      clearTimeout(t);
      embla.off("select", sync).off("reInit", sync);
    };
  }, [embla]);

  return (
    <section className="bg-paper py-20 sm:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <Reveal>
            <Eyebrow>Merchant voices</Eyebrow>
            <h2 className="mt-4 max-w-xl font-display text-[34px] font-black leading-[1.05] tracking-[-0.025em] text-ink-950 sm:text-[46px]">
              Trusted on every <span className="text-brand-600">trade lane.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => embla?.scrollPrev()}
                aria-label="Previous testimonial"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-700 transition-all hover:border-brand-500 hover:text-brand-600"
              >
                <ArrowLeft className="h-4.5 w-4.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => embla?.scrollNext()}
                aria-label="Next testimonial"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-700 transition-all hover:border-brand-500 hover:text-brand-600"
              >
                <ArrowRight className="h-4.5 w-4.5" aria-hidden="true" />
              </button>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.12}>
          <div ref={emblaRef} className="mt-10 overflow-hidden" role="region" aria-label="Merchant testimonials carousel">
            <div className="flex gap-5">
              {TESTIMONIALS.map((t) => (
                <figure
                  key={t.name}
                  className="min-w-0 flex-[0_0_88%] rounded-3xl border border-ink-100 bg-white p-7 shadow-[0_14px_40px_rgba(11,12,15,0.06)] sm:flex-[0_0_55%] lg:flex-[0_0_42%]"
                >
                  <Quote className="h-7 w-7 text-brand-500" aria-hidden="true" />
                  <blockquote className="mt-4 text-[15.5px] leading-relaxed text-ink-800">
                    “{t.quote}”
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-3.5 border-t border-ink-100 pt-5">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-600 font-display text-[14px] font-extrabold text-white">
                      {t.initials}
                    </span>
                    <div>
                      <p className="text-[14.5px] font-bold text-ink-950">{t.name}</p>
                      <p className="text-[12.5px] text-ink-500">{t.role}</p>
                    </div>
                    <span className="ml-auto rounded-full bg-sand px-2.5 py-1 font-code text-[10px] font-semibold tracking-[0.08em] text-ink-600">
                      {t.market.toUpperCase()}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>

          {/* Dots */}
          <div className="mt-6 flex justify-center gap-2">
            {snaps.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => embla?.scrollTo(i)}
                aria-label={`Go to testimonial ${i + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  selected === i ? "w-7 bg-brand-600" : "w-1.5 bg-ink-200 hover:bg-ink-300"
                )}
              />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
