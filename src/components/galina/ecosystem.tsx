"use client";

import Image from "next/image";
import { ArrowUpRight, ShieldCheck, FileCheck2, Store } from "lucide-react";
import { ECOSYSTEM } from "@/lib/data";
import { Eyebrow, Reveal } from "@/components/galina/reveal";
import { cn } from "@/lib/utils";

const FALLBACK_ICONS = [FileCheck2, ShieldCheck, Store];

/**
 * Ecosystem bento — six capability cards in an editorial grid.
 * Media cards use generated brand photography; text cards use icon + copy.
 */
export function Ecosystem() {
  let textIdx = 0;
  return (
    <section id="ecosystem" className="scroll-mt-24 bg-paper py-20 sm:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <Reveal>
            <Eyebrow>One ecosystem</Eyebrow>
            <h2 className="mt-4 max-w-xl font-display text-[34px] font-black leading-[1.05] tracking-[-0.025em] text-ink-950 sm:text-[46px]">
              Every step of the journey,{" "}
              <span className="text-brand-600">under one roof.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="max-w-sm text-[15.5px] leading-relaxed text-ink-600">
              Freight, payments, customs, fulfilment and last mile — engineered as a single
              operating system for cross-border commerce into Iraq.
            </p>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ECOSYSTEM.map((item, i) => {
            const Icon = "image" in item && item.image ? null : FALLBACK_ICONS[textIdx++ % FALLBACK_ICONS.length];
            return (
              <Reveal
                key={item.tag}
                delay={0.06 * i}
                className={cn(
                  item.span === "large" && "sm:col-span-2",
                  item.span === "wide" && "lg:col-span-2",
                  item.span === "tall" && "sm:row-span-2"
                )}
              >
                <article
                  className={cn(
                    "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white transition-all duration-300",
                    "hover:-translate-y-1 hover:border-brand-200 hover:shadow-[0_20px_50px_rgba(11,12,15,0.10)]"
                  )}
                >
                  {"image" in item && item.image ? (
                    <div className={cn("relative w-full overflow-hidden", item.span === "large" ? "aspect-[16/8]" : "aspect-[16/9]")}>
                      <Image
                        src={item.image}
                        alt={item.alt}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/20 to-transparent" aria-hidden="true" />
                      <div className="absolute inset-x-0 bottom-0 p-6">
                        <p className="font-code text-[10px] font-semibold tracking-[0.24em] text-brand-300">{item.tag}</p>
                        <h3 className="mt-1.5 font-display text-[21px] font-extrabold tracking-tight text-white">
                          {item.title}
                        </h3>
                        <p className="mt-1.5 max-w-md text-[13.5px] leading-relaxed text-white/80">
                          {item.body}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full flex-col p-6">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                          {Icon && <Icon className="h-5 w-5" aria-hidden="true" />}
                        </span>
                        <ArrowUpRight className="h-4.5 w-4.5 text-ink-200 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand-600" aria-hidden="true" />
                      </div>
                      <p className="mt-5 font-code text-[10px] font-semibold tracking-[0.24em] text-ink-400">{item.tag}</p>
                      <h3 className="mt-1.5 font-display text-[20px] font-extrabold tracking-tight text-ink-950">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-[14px] leading-relaxed text-ink-600">{item.body}</p>
                      {"badge" in item && item.badge ? (
                        <span className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-ink-950 px-3 py-1.5 font-code text-[10px] font-semibold tracking-[0.14em] text-white">
                          <ShieldCheck className="h-3.5 w-3.5 text-brand-400" aria-hidden="true" />
                          {item.badge}
                        </span>
                      ) : null}
                    </div>
                  )}
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
