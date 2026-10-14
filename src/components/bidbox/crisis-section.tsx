import { CircleCheck, Gavel, X } from "lucide-react";

const LEGACY_PAIN_POINTS = [
  "Manually sorting hundreds of PDF submissions and verifying notary stamps.",
  "Context-switching between 4 offline databases to check supplier debarment.",
  "Manual cross-comparison of line-item unit prices against historical procurement catalogs.",
  "Hand-drafting 80-page committee reports vulnerable to clerical inconsistency.",
];

const AGENTIC_CAPABILITIES = [
  "Autonomous multi-step planner triggers OCDS schema parsing across registered portals.",
  "Simultaneous invocation of custom debarment check and beneficial ownership tools.",
  "Deterministic outlier detection comparing unit prices with past 3-year averages.",
  "Immediate audit dossier output citing page, line, and schema release ID for every finding.",
];

export function CrisisSection() {
  return (
    <section className="w-full px-gutter py-space-xl bg-surface-container-lowest">
      <div className="max-w-7xl mx-auto flex flex-col gap-space-lg">
        <div className="flex flex-col gap-1 max-w-3xl">
          <span className="font-code text-label-telemetry text-tertiary uppercase tracking-wider">
            The Operational Crisis
          </span>
          <h2 className="font-display text-headline-lg text-on-surface">
            The 26-Day Workbench vs. The ~20-Minute Agent
          </h2>
          <p className="font-body text-body-md text-on-surface-variant">
            Across public procurement agencies in Africa, evaluation committees drown in manual
            administrative fatigue, leading to delayed citizen infrastructure, overlooked tax
            debarments, and tender capture.
          </p>
        </div>

        {/* Split Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
          {/* Legacy 26-Day Box */}
          <div className="p-space-lg rounded-bb-xl bg-surface-container-low flex flex-col justify-between gap-space-md relative overflow-hidden">
            <div className="flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <span className="px-space-xs py-1 rounded-bb bg-error-container text-error font-code text-label-telemetry uppercase tracking-wider">
                  Status Quo
                </span>
                <span className="font-code text-label-telemetry text-error">
                  Average: 26.4 Calendar Days
                </span>
              </div>
              <h3 className="font-display text-headline-sm text-on-surface">Human Committee Manual Work</h3>
              <p className="font-body text-body-sm text-on-surface-variant">
                Exhaustive paper dossier collation, clerical verification across disparate national
                registries, and delayed forensic reporting.
              </p>
              <ul className="space-y-space-xs pt-space-xs font-body text-body-sm text-on-surface-variant">
                {LEGACY_PAIN_POINTS.map((point) => (
                  <li key={point} className="flex items-start gap-space-xs">
                    <X className="size-[18px] shrink-0 text-error mt-0.5" aria-hidden="true" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-space-sm rounded-bb bg-surface-container-high flex items-center justify-between text-on-surface-variant font-code text-label-telemetry">
              <span>Committee Fatigue: HIGH</span>
              <span className="text-error">Audit Trail: Fragmented</span>
            </div>
          </div>

          {/* Modern Agentic MCP Box */}
          <div className="p-space-lg rounded-bb-xl bg-surface-container flex flex-col justify-between gap-space-md relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex flex-col gap-space-sm relative z-10">
              <div className="flex items-center justify-between">
                <span className="px-space-xs py-1 rounded-bb bg-primary/20 text-primary font-code text-label-telemetry uppercase tracking-wider">
                  Agentic MCP State
                </span>
                <span className="font-code text-label-telemetry text-primary">Execution: ~20 Minutes</span>
              </div>
              <h3 className="font-display text-headline-sm text-on-surface">Autonomous MCP Orchestration</h3>
              <p className="font-body text-body-sm text-on-surface-variant">
                Autonomous task planning with strict tool gating, continuous cross-referencing, and
                instantaneous cryptographic audit trail compilation.
              </p>
              <ul className="space-y-space-xs pt-space-xs font-body text-body-sm text-on-surface">
                {AGENTIC_CAPABILITIES.map((point) => (
                  <li key={point} className="flex items-start gap-space-xs">
                    <CircleCheck className="size-[18px] shrink-0 text-primary mt-0.5" aria-hidden="true" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-space-sm rounded-bb bg-surface-container-highest flex items-center justify-between font-code text-label-telemetry relative z-10">
              <span className="text-secondary">MCP Tool Invocations: 14 Calls</span>
              <span className="text-primary font-bold">Evidentiary Score: 99.8%</span>
            </div>
          </div>
        </div>

        {/* The Immutable Iron Rule Banner */}
        <div className="p-space-md rounded-bb-xl bg-tertiary-container/20 text-on-surface flex flex-col md:flex-row items-start md:items-center gap-space-md shadow-md">
          <div className="w-12 h-12 rounded-bb bg-tertiary flex items-center justify-center shrink-0">
            <Gavel className="size-[26px] text-on-tertiary" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-code text-label-telemetry text-tertiary uppercase tracking-wider font-bold">
              THE IMMUTABLE IRON RULE • NON-NEGOTIABLE
            </span>
            <p className="font-body text-body-md text-on-surface">
              <strong>Your agent prepares the file, it NEVER awards the tender.</strong> Procurement law
              across all 54 African states strictly mandates that final awards rest solely with a
              statutory human tender committee. Every finding your agent generates must rigorously cite
              the source document, page, and release hash. An unsourced flag against a supplier is worse
              than no flag at all.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
