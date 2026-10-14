import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BidBoxLogo } from "@/components/bidbox/logo";

const CHALLENGE_LINKS = [
  { label: "Overview", href: "#overview" },
  { label: "Themes", href: "#themes" },
  { label: "Jargon, defined", href: "#jargon" },
  { label: "Requirements", href: "#requirements" },
  { label: "Submit your build", href: "#submit" },
];

const DATA_LINKS = [
  { label: "NOCOPO — Nigeria", href: "#jargon" },
  { label: "GPP — Uganda", href: "#jargon" },
  { label: "PPIP — Kenya", href: "#jargon" },
  { label: "Umucyo — Rwanda", href: "#jargon" },
];

const ORCHESTRATION = [
  "LangGraph",
  "CrewAI",
  "Pydantic AI",
  "smolagents",
  "Letta",
  "Goose",
  "n8n",
];

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-ink-950 text-ink-300">
      <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-16 sm:px-6 lg:px-8 lg:pt-20">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Brand */}
          <div className="lg:col-span-5">
            <Link href="/" aria-label="The Bid Box Challenge home">
              <BidBoxLogo variant="light" />
            </Link>
            <p className="mt-5 max-w-sm text-[14.5px] leading-relaxed text-ink-400">
              Agentic AI for Africa — an innovation challenge for agents that read public
              procurement end to end, cite every finding, and stop exactly where the law says a
              human decides.
            </p>
            <p className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-white/12 px-4 py-2 text-[13px] font-semibold text-ink-200">
              Prize — a ticket to the MCP Conference, Nairobi
            </p>
          </div>

          {/* Link columns */}
          <nav aria-label="Challenge" className="lg:col-span-3">
            <p className="font-code text-[10px] font-semibold tracking-[0.24em] text-ink-500">
              THE CHALLENGE
            </p>
            <ul className="mt-4 space-y-2.5">
              {CHALLENGE_LINKS.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className="group inline-flex items-center gap-1.5 text-[14px] text-ink-300 transition-colors hover:text-white"
                  >
                    {l.label}
                    <ArrowUpRight
                      className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100"
                      aria-hidden="true"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Open data" className="lg:col-span-2">
            <p className="font-code text-[10px] font-semibold tracking-[0.24em] text-ink-500">
              OCDS PORTALS
            </p>
            <ul className="mt-4 space-y-2.5">
              {DATA_LINKS.map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="text-[14px] text-ink-300 transition-colors hover:text-white">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="lg:col-span-2">
            <p className="font-code text-[10px] font-semibold tracking-[0.24em] text-ink-500">
              ORCHESTRATION
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {ORCHESTRATION.map((o) => (
                <li
                  key={o}
                  className="rounded-full border border-white/10 px-3 py-1 font-code text-[10.5px] text-ink-400"
                >
                  {o}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-[12.5px] leading-relaxed text-ink-500">
              Open-source stacks only. No closed no-code builders.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-white/8 pt-7 sm:flex-row sm:items-center">
          <p className="text-[12.5px] text-ink-500">
            © 2026 The Bid Box Challenge · Agentic AI for Africa
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="font-code text-[10px] tracking-[0.18em] text-ink-600">
              AGENTS PREPARE · COMMITTEES DECIDE
            </span>
            <span className="font-code text-[10px] tracking-[0.18em] text-ink-600">NAIROBI · EAT</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
