"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FAQS } from "@/lib/data";
import { Eyebrow, Reveal } from "@/components/galina/reveal";

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-24 bg-sand py-20 sm:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <Eyebrow>Answers</Eyebrow>
            <h2 className="mt-4 font-display text-[34px] font-black leading-[1.05] tracking-[-0.025em] text-ink-950 sm:text-[46px]">
              Frequently <span className="text-brand-600">asked.</span>
            </h2>
            <p className="mt-4 max-w-sm text-[15.5px] leading-relaxed text-ink-600">
              Everything merchants ask before their first booking. Anything else — our team
              answers in under 2 hours, Saturday to Thursday.
            </p>
            <a
              href="#contact"
              className="mt-6 inline-flex items-center gap-2 text-[14.5px] font-semibold text-brand-600 transition-colors hover:text-brand-700"
            >
              Talk to a specialist →
            </a>
          </Reveal>

          <Reveal delay={0.1} className="lg:col-span-8">
            <Accordion type="single" collapsible className="rounded-3xl border border-ink-100 bg-white px-6 sm:px-8">
              {FAQS.map((f, i) => (
                <AccordionItem key={f.q} value={`faq-${i}`} className="border-ink-100 last:border-b-0">
                  <AccordionTrigger className="py-5 text-left text-[16px] font-bold text-ink-950 hover:no-underline [&[data-state=open]]:text-brand-700">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="pb-6 text-[14.5px] leading-relaxed text-ink-600">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
