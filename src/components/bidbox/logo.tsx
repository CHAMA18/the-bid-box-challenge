import { cn } from "@/lib/utils";

/**
 * The Bid Box Challenge wordmark — an ink bid-box with a red "flag" dot,
 * stacked against a two-line editorial lockup.
 */
export function BidBoxLogo({ variant = "dark" }: { variant?: "dark" | "light" }) {
  return (
    <span className="flex items-center gap-3" aria-hidden="true">
      <span
        className={cn(
          "relative grid h-10 w-10 place-items-center rounded-xl transition-colors",
          variant === "dark" ? "bg-ink-950" : "bg-white"
        )}
      >
        {/* Stylised bid box: an open crate */}
        <svg viewBox="0 0 24 24" className="h-5.5 w-5.5" fill="none" aria-hidden="true">
          <path
            d="M4 9.5 12 5l8 4.5v8L12 22l-8-4.5v-8Z"
            stroke={variant === "dark" ? "#ffffff" : "#16181d"}
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path
            d="M4 9.5 12 14l8-4.5M12 14v8"
            stroke={variant === "dark" ? "#ffffff" : "#16181d"}
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path d="m8 7.2 8 4.5" stroke="#e8382a" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-brand-600 ring-2 ring-paper" />
      </span>
      <span className="leading-none">
        <span
          className={cn(
            "block font-display text-[17px] font-black tracking-[-0.01em]",
            variant === "dark" ? "text-ink-950" : "text-white"
          )}
        >
          THE BID BOX
        </span>
        <span
          className={cn(
            "mt-1 block font-code text-[8.5px] font-semibold tracking-[0.32em]",
            variant === "dark" ? "text-ink-500" : "text-ink-400"
          )}
        >
          CHALLENGE · AFRICA
        </span>
      </span>
    </span>
  );
}
