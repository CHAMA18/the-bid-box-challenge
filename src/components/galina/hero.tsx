"use client";

import { motion } from "framer-motion";
import { ArrowRight, PackageSearch, ShieldCheck } from "lucide-react";
import { HERO_STATS, PARTNERS } from "@/lib/data";
import { Eyebrow } from "@/components/galina/reveal";

/** Animated corridor map — abstract route network with flowing arcs. */
function CorridorMap() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-[0_24px_60px_rgba(11,12,15,0.10)]">
      <div className="bg-grid-light absolute inset-0" aria-hidden="true" />
      <svg
        viewBox="0 0 640 460"
        className="relative h-auto w-full"
        role="img"
        aria-label="Route network map: Istanbul, Yiwu, Dubai and London connected to Baghdad, Erbil and Basra"
      >
        <defs>
          <linearGradient id="arc" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#e8382a" stopOpacity="0.15" />
            <stop offset="55%" stopColor="#e8382a" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#b41e10" />
          </linearGradient>
        </defs>

        {/* Origin nodes */}
        {[
          { x: 92, y: 84, label: "ISTANBUL" },
          { x: 84, y: 258, label: "LONDON" },
          { x: 150, y: 384, label: "DUBAI" },
          { x: 330, y: 52, label: "YIWU" },
        ].map((n) => (
          <g key={n.label}>
            <circle cx={n.x} cy={n.y} r="5" fill="#16181d" />
            <circle cx={n.x} cy={n.y} r="10" fill="none" stroke="#16181d" strokeOpacity="0.2" />
            <text x={n.x} y={n.y - 16} textAnchor="middle" className="fill-ink-600 font-mono" fontSize="10" letterSpacing="1.5">
              {n.label}
            </text>
          </g>
        ))}

        {/* Destination nodes (Iraq) */}
        {[
          { x: 512, y: 150, label: "ERBIL" },
          { x: 496, y: 236, label: "BAGHDAD" },
          { x: 520, y: 330, label: "BASRA" },
        ].map((n) => (
          <g key={n.label}>
            <circle cx={n.x} cy={n.y} r="12" fill="#e8382a" fillOpacity="0.14" />
            <circle cx={n.x} cy={n.y} r="5.5" fill="#d92616" />
            <text x={n.x} y={n.y + 30} textAnchor="middle" className="fill-brand-700 font-mono" fontSize="10" fontWeight="600" letterSpacing="1.5">
              {n.label}
            </text>
          </g>
        ))}

        {/* Animated arcs */}
        <path id="arc-ist" d="M97 84 C 260 60, 380 120, 496 230" fill="none" stroke="url(#arc)" strokeWidth="2" strokeDasharray="6 6" className="animate-route-flow" />
        <path id="arc-lon" d="M89 258 C 240 250, 380 246, 490 240" fill="none" stroke="url(#arc)" strokeWidth="2" strokeDasharray="6 6" className="animate-route-flow" />
        <path id="arc-dxb" d="M155 384 C 280 388, 400 362, 514 336" fill="none" stroke="url(#arc)" strokeWidth="2" strokeDasharray="6 6" className="animate-route-flow" />
        <path id="arc-yiw" d="M335 57 C 420 66, 470 100, 508 144" fill="none" stroke="url(#arc)" strokeWidth="2" strokeDasharray="6 6" className="animate-route-flow" />

        {/* Moving shipments */}
        <circle r="4" fill="#d92616" stroke="#fff" strokeWidth="1.5">
          <animateMotion dur="5.5s" repeatCount="indefinite" rotate="auto">
            <mpath href="#arc-ist" />
          </animateMotion>
        </circle>
        <circle r="3.4" fill="#16181d" stroke="#fff" strokeWidth="1.5">
          <animateMotion dur="7s" repeatCount="indefinite" rotate="auto" begin="1.2s">
            <mpath href="#arc-yiw" />
          </animateMotion>
        </circle>
        <circle r="3.4" fill="#b41e10" stroke="#fff" strokeWidth="1.5">
          <animateMotion dur="6.2s" repeatCount="indefinite" rotate="auto" begin="0.6s">
            <mpath href="#arc-dxb" />
          </animateMotion>
        </circle>
      </svg>

      {/* Floating telemetry cards */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.6 }}
        className="absolute left-5 top-16 rounded-xl border border-ink-100 bg-white/95 px-3.5 py-2.5 shadow-lg backdrop-blur"
      >
        <p className="font-code text-[9.5px] font-semibold tracking-[0.14em] text-ink-400">AWB 072-48219935</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-900">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-brand-500" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" />
          </span>
          In transit — IST → BGW
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.6 }}
        className="absolute bottom-14 right-5 flex items-center gap-2 rounded-xl border border-ink-100 bg-white/95 px-3.5 py-2.5 shadow-lg backdrop-blur"
      >
        <ShieldCheck className="h-4 w-4 text-brand-600" aria-hidden="true" />
        <p className="text-[12.5px] font-semibold text-ink-900">
          Customs cleared <span className="font-code text-[10px] font-medium text-ink-400">· GRAND escrow</span>
        </p>
      </motion.div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-paper">
      <div className="bg-grid-light pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]" aria-hidden="true" />
      <div className="relative mx-auto w-full max-w-7xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:px-8 lg:pb-24 lg:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
          {/* Copy */}
          <div className="lg:col-span-6">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
              <Eyebrow>Cross-border e-commerce enabler — Iraq</Eyebrow>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 font-display text-[42px] font-black leading-[1.02] tracking-[-0.03em] text-ink-950 text-balance sm:text-[58px] lg:text-[68px]"
            >
              Connecting global sellers to{" "}
              <span className="relative inline-block text-brand-600">
                local buyers
                <svg viewBox="0 0 220 12" className="absolute -bottom-1 left-0 w-full" aria-hidden="true" preserveAspectRatio="none">
                  <path d="M3 9 C 60 2, 160 2, 217 8" stroke="#e8382a" strokeWidth="4" strokeLinecap="round" fill="none" />
                </svg>
              </span>{" "}
              across Iraq.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 max-w-xl text-[17px] leading-relaxed text-ink-600"
            >
              Air, road &amp; sea freight, escrow-secured payments and last-mile delivery — one
              network carrying your commerce from Türkiye, China, the GCC and Europe to all nine
              Iraqi cities. Secure payments, seamless experience.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 flex flex-wrap items-center gap-3.5"
            >
              <a
                href="#quote"
                className="group inline-flex h-[52px] items-center gap-2 rounded-full bg-brand-600 px-7 text-[15px] font-semibold text-white shadow-[0_12px_30px_rgba(217,38,22,0.32)] transition-all hover:bg-brand-700 hover:shadow-[0_14px_36px_rgba(217,38,22,0.4)]"
              >
                Get an instant quote
                <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </a>
              <a
                href="#tracking"
                className="inline-flex h-[52px] items-center gap-2.5 rounded-full border border-ink-200 bg-white px-7 text-[15px] font-semibold text-ink-900 transition-all hover:border-ink-300 hover:shadow-md"
              >
                <PackageSearch className="h-4.5 w-4.5 text-brand-600" aria-hidden="true" />
                Track a shipment
              </a>
            </motion.div>

            {/* Stats */}
            <motion.dl
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="mt-12 grid grid-cols-2 gap-x-6 gap-y-7 border-t border-ink-100 pt-8 sm:grid-cols-4"
            >
              {HERO_STATS.map((s) => (
                <div key={s.label}>
                  <dt className="order-2 mt-1 text-[12.5px] font-medium leading-snug text-ink-500">{s.label}</dt>
                  <dd className="order-1 font-display text-[30px] font-extrabold tracking-tight text-ink-950 tabular">
                    {s.value}
                    <span className="text-brand-600">{s.suffix}</span>
                  </dd>
                </div>
              ))}
            </motion.dl>
          </div>

          {/* Map */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-6"
          >
            <CorridorMap />
          </motion.div>
        </div>

        {/* Partner strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.55 }}
          className="mt-14 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 border-t border-ink-100 pt-8"
        >
          <p className="font-code text-[10px] font-semibold tracking-[0.3em] text-ink-400">
            PAYMENTS &amp; TRUST PARTNERS
          </p>
          {PARTNERS.map((p) => (
            <span key={p} className="font-display text-[17px] font-bold tracking-tight text-ink-300 transition-colors hover:text-ink-600">
              {p}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
