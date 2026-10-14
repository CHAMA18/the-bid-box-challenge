"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { animate, useInView } from "framer-motion";
import { Eyebrow } from "@/components/galina/reveal";

const IMPACT_STATS = [
  { value: 12400, suffix: "+", label: "Shipments delivered", format: (v: number) => Math.round(v).toLocaleString("en-US") },
  { value: 2400, suffix: "+", label: "Active merchants", format: (v: number) => Math.round(v).toLocaleString("en-US") },
  { value: 86, prefix: "$", suffix: "M", label: "GMV enabled", format: (v: number) => Math.round(v).toString() },
  { value: 40, suffix: "+", label: "Delivery hubs", format: (v: number) => Math.round(v).toString() },
];

function Counter({
  value,
  prefix = "",
  suffix = "",
  format,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  format: (v: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration: 1.8,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(format(v)),
    });
    return () => controls.stop();
  }, [inView, value, format]);

  return (
    <span ref={ref} className="tabular">
      {prefix}
      {display}
      <span className="text-brand-400">{suffix}</span>
    </span>
  );
}

/** Full-bleed fleet image band with animated impact counters. */
export function Impact() {
  return (
    <section className="relative overflow-hidden bg-ink-950">
      <Image
        src="/images/hero-truck.jpg"
        alt="Convoy of red and white Galina trucks on a desert highway at golden hour"
        fill
        sizes="100vw"
        className="object-cover opacity-45"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/80 to-ink-950/30" aria-hidden="true" />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
        <Eyebrow tone="light">Proof in motion</Eyebrow>
        <h2 className="mt-4 max-w-2xl font-display text-[34px] font-black leading-[1.05] tracking-[-0.025em] text-white sm:text-[46px]">
          The numbers behind <span className="text-brand-400">the promise.</span>
        </h2>

        <dl className="mt-12 grid grid-cols-2 gap-x-8 gap-y-10 lg:grid-cols-4">
          {IMPACT_STATS.map((s) => (
            <div key={s.label} className="border-l-2 border-brand-600 pl-5">
              <dd className="font-display text-[36px] font-black tracking-tight text-white sm:text-[44px]">
                <Counter value={s.value} prefix={s.prefix} suffix={s.suffix} format={s.format} />
              </dd>
              <dt className="mt-1.5 text-[13.5px] font-medium text-ink-300">{s.label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
