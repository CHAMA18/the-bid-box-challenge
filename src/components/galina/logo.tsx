import { cn } from "@/lib/utils";

/** Galina Express logo — abstract "G" wing mark + wordmark. */
export function GalinaLogo({
  className,
  variant = "dark",
}: {
  className?: string;
  variant?: "dark" | "light";
}) {
  const ink = variant === "dark" ? "text-ink-950" : "text-white";
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        viewBox="0 0 44 44"
        fill="none"
        aria-hidden="true"
        className="h-9 w-9 shrink-0"
      >
        <rect width="44" height="44" rx="12" className="fill-brand-600" />
        {/* G wing mark */}
        <path
          d="M32 15.5C29.9 12.6 26.7 11 23 11c-6.1 0-11 4.9-11 11s4.9 11 11 11c5.2 0 9.5-3.6 10.7-8.4.2-.7-.3-1.4-1-1.4H23.5c-.6 0-1 .4-1 1v2.3c0 .6.4 1 1 1h4.2"
          stroke="white"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M13 22h18" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 4" />
      </svg>
      <span className={cn("flex flex-col leading-none", ink)}>
        <span className="font-display text-[19px] font-extrabold tracking-tight">
          GALINA
        </span>
        <span className="font-code text-[9px] font-medium tracking-[0.42em] text-brand-600">
          EXPRESS
        </span>
      </span>
    </span>
  );
}
