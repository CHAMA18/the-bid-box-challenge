import { Plane, Truck, ShieldCheck, Ship } from "lucide-react";

const ITEMS = [
  { icon: Plane, text: "ISTANBUL → BAGHDAD · 48H DOOR-TO-DOOR" },
  { icon: Ship, text: "YIWU → UMM QASR · 3 SAILINGS WEEKLY" },
  { icon: Truck, text: "DUBAI → BASRA · COLD-CHAIN DAILY" },
  { icon: ShieldCheck, text: "GRAND GUARANTEE ESCROW NOW LIVE" },
  { icon: Plane, text: "LONDON → BAGHDAD · TWICE WEEKLY" },
  { icon: Truck, text: "9 CITIES · 40+ DELIVERY HUBS" },
];

/** Top announcement ticker — live corridor marquee. */
export function TopTicker() {
  const row = [...ITEMS, ...ITEMS];
  return (
    <div className="relative overflow-hidden bg-ink-950 py-2" aria-label="Network announcements">
      <div className="flex w-max animate-marquee items-center gap-10 pr-10">
        {row.map((item, i) => (
          <span
            key={i}
            className="flex items-center gap-2.5 whitespace-nowrap font-code text-[10.5px] font-medium tracking-[0.18em] text-ink-200"
          >
            <item.icon className="h-3.5 w-3.5 text-brand-400" aria-hidden="true" />
            {item.text}
            <span className="ml-6 inline-block h-1 w-1 rounded-full bg-brand-500" aria-hidden="true" />
          </span>
        ))}
      </div>
      {/* Edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-ink-950 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-ink-950 to-transparent" />
    </div>
  );
}
