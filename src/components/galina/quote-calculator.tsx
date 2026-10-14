"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plane, Truck, Ship, Loader2, ShieldCheck, ArrowRight, Receipt } from "lucide-react";
import { ORIGINS, DESTINATIONS, SERVICES } from "@/lib/data";
import { Eyebrow, Reveal } from "@/components/galina/reveal";
import { cn } from "@/lib/utils";

const SERVICE_META: Record<string, { icon: typeof Plane; blurb: string }> = {
  EXPRESS_AIR: { icon: Plane, blurb: "Next-flight-out · 48–72h" },
  STANDARD_ROAD: { icon: Truck, blurb: "Sealed convoy · 5–8 days" },
  ECONOMY_SEA: { icon: Ship, blurb: "FCL / LCL · 24–32 days" },
};

type QuoteResponse = {
  priceMin: number;
  priceMax: number;
  transitDays: number;
  breakdown: { label: string; amount: number }[];
};

export function QuoteCalculator() {
  const [origin, setOrigin] = useState<string>("IST");
  const [destination, setDestination] = useState<string>("BGW");
  const [weight, setWeight] = useState(45);
  const [service, setService] = useState<string>("EXPRESS_AIR");
  const [insurance, setInsurance] = useState(true);
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedService = useMemo(() => SERVICES.find((s) => s.id === service)!, [service]);

  async function getQuote() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin, destination, weightKg: weight, service, insurance }),
      });
      if (!res.ok) throw new Error("quote failed");
      const data = (await res.json()) as QuoteResponse;
      setQuote(data);
    } catch {
      setError("Could not calculate right now — please try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="quote" className="scroll-mt-24 bg-paper py-20 sm:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Copy */}
          <div className="lg:col-span-5">
            <Reveal>
              <Eyebrow>Transparent pricing</Eyebrow>
              <h2 className="mt-4 font-display text-[34px] font-black leading-[1.05] tracking-[-0.025em] text-ink-950 sm:text-[46px]">
                Your lane, priced in <span className="text-brand-600">ten seconds.</span>
              </h2>
              <p className="mt-5 max-w-md text-[15.5px] leading-relaxed text-ink-600">
                No sales calls, no PDF tennis. Pick a lane and a service level — the same engine
                our merchants use returns a live estimate with the full cost breakdown.
              </p>
            </Reveal>

            {/* Result card */}
            <div className="mt-9" aria-live="polite">
              <AnimatePresence mode="wait">
                {loading && (
                  <motion.div key="q-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="h-72 animate-pulse rounded-3xl border border-ink-100 bg-white" />
                  </motion.div>
                )}
                {!loading && error && (
                  <motion.p
                    key="q-error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="rounded-2xl border border-brand-200 bg-brand-50 px-5 py-4 text-[14px] font-medium text-brand-800"
                    role="alert"
                  >
                    {error}
                  </motion.p>
                )}
                {!loading && quote && (
                  <motion.div
                    key="quote"
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden rounded-3xl border border-ink-950 bg-ink-950 text-white shadow-[0_24px_60px_rgba(11,12,15,0.25)]"
                  >
                    <div className="p-6 sm:p-7">
                      <div className="flex items-center justify-between">
                        <p className="flex items-center gap-2 font-code text-[10.5px] tracking-[0.22em] text-ink-400">
                          <Receipt className="h-4 w-4 text-brand-400" aria-hidden="true" />
                          ESTIMATE · {ORIGINS.find((o) => o.id === origin)?.city.toUpperCase()} →{" "}
                          {DESTINATIONS.find((d) => d.id === destination)?.city.toUpperCase()}
                        </p>
                      </div>
                      <p className="mt-4 font-display text-[40px] font-black leading-none tracking-tight tabular sm:text-[48px]">
                        ${quote.priceMin.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        <span className="mx-1.5 text-ink-500">—</span>
                        ${quote.priceMax.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                      <p className="mt-2 text-[13.5px] text-ink-300">
                        {selectedService.label} · door-to-door in ~{quote.transitDays} days · duties &amp; VAT estimated at checkout
                      </p>

                      <dl className="mt-6 space-y-2.5 border-t border-white/10 pt-5">
                        {quote.breakdown.map((b) => (
                          <div key={b.label} className="flex items-baseline justify-between gap-4 text-[13.5px]">
                            <dt className="text-ink-400">{b.label}</dt>
                            <dd className="font-semibold tabular">${b.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                    <a
                      href="#contact"
                      className="group flex items-center justify-between bg-brand-600 px-6 py-4 text-[14.5px] font-semibold text-white transition-colors hover:bg-brand-500 sm:px-7"
                    >
                      Lock this rate with a booking
                      <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </a>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Form */}
          <Reveal delay={0.1} className="lg:col-span-7">
            <div className="rounded-3xl border border-ink-100 bg-white p-6 shadow-[0_18px_50px_rgba(11,12,15,0.07)] sm:p-8">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void getQuote();
                }}
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="origin" className="mb-2 block font-code text-[10.5px] font-semibold tracking-[0.2em] text-ink-500">
                      ORIGIN
                    </label>
                    <select
                      id="origin"
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                      className="h-13 w-full appearance-none rounded-xl border border-ink-200 bg-paper px-4 py-3.5 text-[15px] font-medium text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
                    >
                      {ORIGINS.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.city}, {o.country}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="destination" className="mb-2 block font-code text-[10.5px] font-semibold tracking-[0.2em] text-ink-500">
                      DESTINATION — IRAQ
                    </label>
                    <select
                      id="destination"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="h-13 w-full appearance-none rounded-xl border border-ink-200 bg-paper px-4 py-3.5 text-[15px] font-medium text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
                    >
                      {DESTINATIONS.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.city}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Weight */}
                <div className="mt-6">
                  <div className="mb-2 flex items-baseline justify-between">
                    <label htmlFor="weight" className="font-code text-[10.5px] font-semibold tracking-[0.2em] text-ink-500">
                      CHARGEABLE WEIGHT
                    </label>
                    <span className="font-display text-[20px] font-extrabold text-ink-950 tabular">{weight} kg</span>
                  </div>
                  <input
                    id="weight"
                    type="range"
                    min={1}
                    max={2000}
                    step={1}
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-ink-100 accent-brand-600"
                    aria-valuetext={`${weight} kilograms`}
                  />
                  <div className="mt-1.5 flex justify-between font-code text-[10px] text-ink-400">
                    <span>1 KG</span>
                    <span>2,000 KG</span>
                  </div>
                </div>

                {/* Service */}
                <fieldset className="mt-6">
                  <legend className="mb-2 font-code text-[10.5px] font-semibold tracking-[0.2em] text-ink-500">
                    SERVICE LEVEL
                  </legend>
                  <div className="grid gap-2.5 sm:grid-cols-3">
                    {SERVICES.map((s) => {
                      const meta = SERVICE_META[s.id];
                      const Icon = meta.icon;
                      const active = service === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setService(s.id)}
                          aria-pressed={active}
                          className={cn(
                            "rounded-2xl border p-4 text-left transition-all",
                            active
                              ? "border-brand-600 bg-brand-50 ring-2 ring-brand-600/20"
                              : "border-ink-200 bg-white hover:border-ink-300"
                          )}
                        >
                          <Icon className={cn("h-5 w-5", active ? "text-brand-600" : "text-ink-400")} aria-hidden="true" />
                          <p className={cn("mt-2.5 text-[14.5px] font-bold", active ? "text-brand-700" : "text-ink-900")}>
                            {s.label}
                          </p>
                          <p className="mt-0.5 text-[11.5px] leading-snug text-ink-500">{meta.blurb}</p>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                {/* Insurance */}
                <label className="mt-6 flex cursor-pointer items-start gap-3.5 rounded-2xl border border-ink-200 bg-paper p-4 transition-colors hover:border-ink-300">
                  <input
                    type="checkbox"
                    checked={insurance}
                    onChange={(e) => setInsurance(e.target.checked)}
                    className="mt-0.5 h-5 w-5 rounded accent-brand-600"
                  />
                  <span>
                    <span className="flex items-center gap-2 text-[14.5px] font-bold text-ink-950">
                      <ShieldCheck className="h-4.5 w-4.5 text-brand-600" aria-hidden="true" />
                      Add Galina Shield insurance
                      <span className="rounded-full bg-brand-100 px-2 py-0.5 font-code text-[10px] font-semibold text-brand-700">+1.5%</span>
                    </span>
                    <span className="mt-1 block text-[13px] leading-relaxed text-ink-500">
                      Full commercial value cover, claims settled from escrow within 7 working days.
                    </span>
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-brand-600 text-[15.5px] font-semibold text-white shadow-[0_12px_30px_rgba(217,38,22,0.3)] transition-all hover:bg-brand-700 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
                  Calculate my estimate
                </button>
              </form>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
