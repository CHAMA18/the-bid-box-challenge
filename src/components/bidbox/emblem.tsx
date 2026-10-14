/**
 * The Bid Box Emblem — local inline SVG mark.
 * Replaces the original Google-hosted logo image so nothing is fetched
 * from external domains at runtime.
 */
export function BidBoxEmblem({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="The Bid Box Emblem"
    >
      {/* Hexagonal sovereign badge */}
      <path
        d="M24 2.5 43 13.25v21.5L24 45.5 5 34.75v-21.5L24 2.5Z"
        fill="#0a0e17"
        stroke="#68dba9"
        strokeWidth="2.5"
      />
      <path
        d="M24 8 37.5 15.6v16.8L24 40 10.5 32.4V15.6L24 8Z"
        stroke="#25a475"
        strokeWidth="1"
        opacity="0.55"
      />
      {/* Bid dossier */}
      <rect x="15" y="18" width="18" height="13" rx="1" fill="#1c1f29" stroke="#68dba9" strokeWidth="2" />
      <path d="M15 22.5h18" stroke="#68dba9" strokeWidth="1.5" />
      <path d="M19 26.5h7M19 29h10" stroke="#4cd7f6" strokeWidth="1.5" strokeLinecap="round" />
      {/* Award tick */}
      <circle cx="31.5" cy="31.5" r="5" fill="#0a0e17" stroke="#ffb95f" strokeWidth="1.75" />
      <path
        d="m29.4 31.6 1.5 1.5 2.7-2.9"
        stroke="#ffb95f"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
