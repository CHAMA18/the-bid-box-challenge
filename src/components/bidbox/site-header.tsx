import { Clock, Gauge, Globe, MessagesSquare, Shield, Terminal, User } from "lucide-react";
import { BidBoxEmblem } from "./emblem";

const NAV_LINKS = [
  { label: "Challenge Overview", active: true },
  { label: "The 4 Themes", active: false },
  { label: "Interactive Agent Run", active: false },
  { label: "MCP & Tech Stack", active: false },
  { label: "Judging Rubric (100 pts)", active: false },
  { label: "OCDS Portals & Data", active: false },
  { label: "Prizes & Nairobi Summit", active: false },
];

const TICKER_ITEMS = [
  { icon: Gauge, text: "26 Days Committee Work ➔ ~20 Mins Agent Run", className: "text-secondary" },
  { icon: Shield, text: "Strict Non-Negotiable: Agent Prepares File, Never Awards", className: "text-tertiary" },
  { icon: Terminal, text: "Open-Weights Sovereign Inference", className: "text-primary" },
  { icon: Globe, text: "OCDS Across 9 Nations", className: "text-on-surface-variant" },
];

export function SiteHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface-container-lowest/90 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.3)]">
      <div className="h-20 w-full px-gutter flex items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-md">
          <BidBoxEmblem className="h-8 w-auto object-contain" />
          <div className="flex flex-col">
            <div className="flex items-center gap-space-xs">
              <span className="font-display text-headline-sm text-on-surface tracking-tight uppercase">
                THE BID BOX CHALLENGE
              </span>
              <span className="px-space-xs py-0.5 rounded-bb bg-surface-container-high text-secondary font-code text-label-telemetry uppercase">
                Track — Governance: Public Tenders
              </span>
            </div>
            <div className="flex items-center gap-space-xs">
              <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span className="font-code text-label-telemetry text-primary">
                Submissions Open — Closes 15th Oct
              </span>
            </div>
          </div>
        </div>

        <nav className="hidden xl:flex items-center gap-space-sm" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href="#"
              aria-current={link.active ? "page" : undefined}
              className={
                link.active
                  ? "px-space-xs py-space-xs transition-colors bg-surface-container-highest text-primary font-bold rounded-bb"
                  : "px-space-xs py-space-xs font-body text-label-ui text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
              }
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-space-md">
          <div className="hidden md:flex items-center gap-space-xs px-space-sm py-space-xs rounded-bb bg-surface-container text-tertiary font-code text-label-telemetry">
            <Clock className="size-[14px] shrink-0" aria-hidden="true" />
            <span>Submission Deadline: 15 Oct</span>
          </div>
          <a
            className="hidden lg:flex items-center gap-space-xs font-body text-label-ui text-on-surface-variant hover:text-secondary transition-colors"
            href="https://discord.gg"
            target="_blank"
            rel="noreferrer"
          >
            <MessagesSquare className="size-[16px] shrink-0" aria-hidden="true" />
            <span>Community MCP Discord</span>
          </a>
          <button
            className="px-space-md py-space-xs rounded-bb bg-primary text-on-primary font-body text-label-ui tracking-wide hover:bg-primary-container hover:text-on-primary-container transition-all shadow-[0_0_12px_rgba(104,219,169,0.3)]"
            type="button"
          >
            Apply for Governance
          </button>
          <div className="w-8 h-8 rounded-[12px] bg-primary flex items-center justify-center">
            <User className="size-[18px] text-on-primary" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="h-9 bg-surface-container-lowest/95 overflow-hidden flex items-center px-gutter">
        <div className="flex items-center gap-space-xl whitespace-nowrap overflow-x-auto w-full">
          {TICKER_ITEMS.map(({ icon: Icon, text, className }) => (
            <div
              key={text}
              className={`flex items-center gap-space-xs font-code text-label-telemetry ${className}`}
            >
              <Icon className="size-[14px] shrink-0" aria-hidden="true" />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}

/** Top sovereign broadcast ticker — first element inside <main>. */
export function SovereignTicker() {
  return (
    <section className="w-full bg-surface-container-lowest px-gutter py-space-xs flex items-center justify-between">
      <div className="flex items-center gap-space-sm min-w-0">
        <span className="inline-flex items-center gap-1.5 px-space-xs py-0.5 rounded-bb bg-primary/10 text-primary font-code text-label-telemetry uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
          Sovereign Protocol 0.9.4
        </span>
        <p className="font-code text-label-telemetry text-on-surface-variant truncate">
          Pan-African Model Context Protocol Directive • 9 Sovereign Registries Monitored • Evaluation
          Window Active
        </p>
      </div>
      <div className="hidden lg:flex items-center gap-space-md font-code text-label-telemetry text-secondary">
        <span>Nairobi Summit Track #04</span>
        <span className="text-outline">•</span>
        <span>OCDS 1.1 JSON Strict</span>
      </div>
    </section>
  );
}
