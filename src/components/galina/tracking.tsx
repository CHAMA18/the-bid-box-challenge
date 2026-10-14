"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, Package, Plane, Truck, Ship, CircleCheck, CircleDashed, Loader2, TriangleAlert } from "lucide-react";
import { TRACKING_HINTS } from "@/lib/data";
import { Eyebrow, Reveal } from "@/components/galina/reveal";
import { cn } from "@/lib/utils";

type TrackEvent = {
  title: string;
  location: string;
  note: string | null;
  timestamp: string;
  done: boolean;
};

type TrackResult = {
  code: string;
  origin: string;
  originCode: string;
  destination: string;
  destinationCode: string;
  service: string;
  status: string;
  weightKg: number;
  pieces: number;
  shipper: string;
  consignee: string;
  etaLabel: string;
  events: TrackEvent[];
};

const SERVICE_LABEL: Record<string, string> = {
  EXPRESS_AIR: "Express Air",
  STANDARD_ROAD: "Standard Road",
  ECONOMY_SEA: "Economy Sea",
};

const STATUS_STYLE: Record<string, string> = {
  BOOKED: "bg-ink-800 text-ink-100 ring-ink-600",
  PICKED_UP: "bg-ink-800 text-ink-100 ring-ink-600",
  IN_TRANSIT: "bg-brand-600 text-white ring-brand-400",
  CUSTOMS: "bg-amber-500 text-ink-950 ring-amber-300",
  OUT_FOR_DELIVERY: "bg-brand-600 text-white ring-brand-400",
  DELIVERED: "bg-emerald-600 text-white ring-emerald-300",
};

const SERVICE_ICON: Record<string, typeof Plane> = {
  EXPRESS_AIR: Plane,
  STANDARD_ROAD: Truck,
  ECONOMY_SEA: Ship,
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export function Tracking() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackResult | null>(null);

  async function track(value: string) {
    const q = value.trim().toUpperCase();
    if (!q) return;
    setCode(q);
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/track?code=${encodeURIComponent(q)}`);
      if (res.status === 404) {
        setError(`No shipment found for “${q}”. Double-check the code and try again.`);
      } else if (!res.ok) {
        setError("Tracking service is temporarily unavailable. Please try again shortly.");
      } else {
        const data = (await res.json()) as { shipment: TrackResult };
        setResult(data.shipment);
      }
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const doneCount = result?.events.filter((e) => e.done).length ?? 0;
  const progress = result ? Math.round((doneCount / result.events.length) * 100) : 0;
  const ServiceIcon = result ? SERVICE_ICON[result.service] ?? Package : Package;

  return (
    <section id="tracking" className="relative scroll-mt-24 overflow-hidden bg-night py-20 sm:py-28">
      <div className="bg-grid-dark pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_75%_70%_at_50%_30%,black,transparent)]" aria-hidden="true" />
      <div className="relative mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <Eyebrow tone="light" className="justify-center">Live tracking</Eyebrow>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-[34px] font-black leading-[1.05] tracking-[-0.025em] text-white sm:text-[46px]">
            Follow every parcel, <span className="text-brand-400">kilometre by kilometre.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15.5px] leading-relaxed text-ink-300">
            Enter a tracking code to see live status, customs milestones and proof-of-delivery —
            the same feed our merchants integrate via API.
          </p>
        </Reveal>

        {/* Search */}
        <Reveal delay={0.1}>
          <form
            className="mx-auto mt-9 flex max-w-2xl flex-col gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              void track(code);
            }}
            role="search"
            aria-label="Track a shipment"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-ink-400" aria-hidden="true" />
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="GXL-0000-XXX"
                aria-label="Tracking code"
                className="h-14 w-full rounded-2xl border border-white/15 bg-white/[0.06] pl-12 pr-4 font-code text-[15px] font-medium uppercase tracking-[0.12em] text-white placeholder:text-ink-500 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-600/25"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-brand-600 px-8 text-[15px] font-semibold text-white shadow-[0_10px_30px_rgba(217,38,22,0.4)] transition-all hover:bg-brand-500 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4.5 w-4.5 animate-spin" aria-hidden="true" /> : null}
              Track
            </button>
          </form>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="font-code text-[10.5px] tracking-[0.18em] text-ink-500">TRY A DEMO CODE:</span>
            {TRACKING_HINTS.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => void track(h)}
                className={cn(
                  "rounded-full border px-3 py-1.5 font-code text-[11.5px] font-medium tracking-wide transition-all",
                  code === h
                    ? "border-brand-500 bg-brand-600/15 text-brand-300"
                    : "border-white/15 text-ink-300 hover:border-white/35 hover:text-white"
                )}
              >
                {h}
              </button>
            ))}
          </div>
        </Reveal>

        {/* States */}
        <div className="mt-10" aria-live="polite">
          <AnimatePresence mode="wait">
            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mx-auto max-w-3xl space-y-4"
              >
                <div className="h-28 animate-pulse rounded-2xl bg-white/[0.06]" />
                <div className="h-64 animate-pulse rounded-2xl bg-white/[0.04]" />
              </motion.div>
            )}

            {!loading && error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mx-auto flex max-w-2xl items-start gap-3 rounded-2xl border border-brand-500/40 bg-brand-950/60 px-5 py-4"
                role="alert"
              >
                <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-brand-400" aria-hidden="true" />
                <p className="text-[14.5px] leading-relaxed text-brand-100">{error}</p>
              </motion.div>
            )}

            {!loading && result && (
              <motion.div
                key={result.code}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="mx-auto max-w-3xl"
              >
                {/* Summary card */}
                <div className="rounded-3xl border border-white/12 bg-white/[0.05] p-6 backdrop-blur sm:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-code text-[11px] tracking-[0.2em] text-ink-400">TRACKING CODE</p>
                      <p className="mt-1 font-display text-[24px] font-extrabold tracking-tight text-white">{result.code}</p>
                    </div>
                    <span className={cn("rounded-full px-3.5 py-1.5 text-[12px] font-bold uppercase tracking-[0.08em] ring-1", STATUS_STYLE[result.status])}>
                      {result.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  {/* Route line */}
                  <div className="mt-7 flex items-center gap-3">
                    <div className="text-left">
                      <p className="font-display text-[17px] font-bold text-white">{result.originCode}</p>
                      <p className="max-w-[110px] text-[11.5px] leading-tight text-ink-400">{result.origin}</p>
                    </div>
                    <div className="relative flex-1 px-2">
                      <div className="h-[3px] w-full rounded-full bg-white/10">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                          className="relative h-[3px] rounded-full bg-gradient-to-r from-brand-500 to-brand-600"
                        />
                      </div>
                      <motion.div
                        initial={{ left: "0%" }}
                        animate={{ left: `${progress}%` }}
                        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                        className="absolute -top-[9px] -translate-x-1/2"
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 ring-4 ring-brand-600/25">
                          <ServiceIcon className="h-3.5 w-3.5 text-white" aria-hidden="true" />
                        </span>
                      </motion.div>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-[17px] font-bold text-white">{result.destinationCode}</p>
                      <p className="ml-auto max-w-[110px] text-[11.5px] leading-tight text-ink-400">{result.destination}</p>
                    </div>
                  </div>

                  {/* Meta */}
                  <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-white/10 pt-5 text-[13px] sm:grid-cols-4">
                    <div>
                      <dt className="font-code text-[9.5px] tracking-[0.18em] text-ink-500">SERVICE</dt>
                      <dd className="mt-1 font-semibold text-white">{SERVICE_LABEL[result.service]}</dd>
                    </div>
                    <div>
                      <dt className="font-code text-[9.5px] tracking-[0.18em] text-ink-500">WEIGHT / PIECES</dt>
                      <dd className="mt-1 font-semibold text-white tabular">{result.weightKg.toLocaleString()} kg · {result.pieces}</dd>
                    </div>
                    <div>
                      <dt className="font-code text-[9.5px] tracking-[0.18em] text-ink-500">SHIPPER</dt>
                      <dd className="mt-1 font-semibold text-white">{result.shipper}</dd>
                    </div>
                    <div>
                      <dt className="font-code text-[9.5px] tracking-[0.18em] text-ink-500">ETA</dt>
                      <dd className="mt-1 font-semibold text-brand-300">{result.etaLabel}</dd>
                    </div>
                  </dl>
                </div>

                {/* Timeline */}
                <div className="mt-5 rounded-3xl border border-white/12 bg-white/[0.03] p-6 sm:p-7">
                  <p className="font-code text-[10.5px] tracking-[0.22em] text-ink-400">SHIPMENT JOURNEY</p>
                  <ol className="relative mt-5 space-y-0">
                    {result.events.map((ev, i) => (
                      <motion.li
                        key={`${ev.title}-${i}`}
                        initial={{ opacity: 0, x: -14 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25 + i * 0.07, duration: 0.4 }}
                        className="relative flex gap-4 pb-6 last:pb-0"
                      >
                        {/* Connector */}
                        {i < result.events.length - 1 && (
                          <span
                            aria-hidden="true"
                            className={cn(
                              "absolute left-[11px] top-6 h-[calc(100%-14px)] w-[2px]",
                              ev.done ? "bg-brand-600/60" : "bg-white/10"
                            )}
                          />
                        )}
                        <span className={cn("relative mt-0.5 shrink-0", ev.done ? "text-brand-400" : "text-ink-600")}>
                          {ev.done ? (
                            <CircleCheck className="h-6 w-6" aria-hidden="true" />
                          ) : (
                            <CircleDashed className="h-6 w-6" aria-hidden="true" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                            <p className={cn("text-[14.5px] font-semibold", ev.done ? "text-white" : "text-ink-400")}>
                              {ev.title}
                            </p>
                            <p className={cn("font-code text-[11px] tabular", ev.done ? "text-ink-300" : "text-ink-600")}>
                              {ev.done ? fmtTime(ev.timestamp) : "PENDING"}
                            </p>
                          </div>
                          <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-ink-400">
                            <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                            {ev.location}
                          </p>
                          {ev.note && <p className="mt-1 text-[12.5px] italic leading-relaxed text-ink-500">{ev.note}</p>}
                        </div>
                      </motion.li>
                    ))}
                  </ol>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
