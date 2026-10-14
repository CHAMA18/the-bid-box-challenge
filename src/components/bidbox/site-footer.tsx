import { BidBoxEmblem } from "./emblem";

const PARTNERS = [
  "Kenya Public Procurement Regulatory Authority (PPRA)",
  "Nigeria Bureau of Public Procurement (BPP)",
  "South Africa National Treasury (e-Tender Portal)",
  "Ghana Public Procurement Authority (PPA)",
  "Rwanda E-Procurement System (Umucyo)",
];

const STANDARDS = [
  "Open Contracting Data Standard (OCDS 1.1)",
  "Model Context Protocol (MCP) Runtime",
  "Deterministic Audit Trail Non-Repudiation",
  "JSON Schema Verification Gates",
];

const GUARDRAILS = [
  "Human-in-the-Loop Intervene Mandate",
  "Agent Prepares Tender Dossiers, Never Awards",
  "Open-Weights Sovereign Infrastructure",
  "Anti-Collusion Ownership Cluster Analysis",
];

export function SiteFooter() {
  return (
    <footer className="w-full bg-surface-container-lowest py-space-xl mt-auto">
      <div className="w-full px-gutter flex flex-col gap-space-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-space-lg">
          <div className="space-y-space-xs">
            <div className="flex items-center gap-space-sm">
              <BidBoxEmblem className="h-6 w-auto object-contain" />
              <span className="font-display text-headline-sm text-on-surface">THE BID BOX</span>
            </div>
            <p className="font-body text-body-sm text-on-surface-variant">
              Pan-African civic intelligence accelerating transparent public governance through
              deterministic agent telemetry and verifiable OCDS protocols.
            </p>
          </div>

          <div className="space-y-space-xs">
            <h4 className="font-code text-label-telemetry text-primary uppercase">Sovereign African Partners</h4>
            <ul className="font-body text-body-sm text-on-surface-variant space-y-space-xs">
              {PARTNERS.map((partner) => (
                <li key={partner}>{partner}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-space-xs">
            <h4 className="font-code text-label-telemetry text-secondary uppercase">Protocol &amp; Standards</h4>
            <ul className="font-body text-body-sm text-on-surface-variant space-y-space-xs">
              {STANDARDS.map((standard) => (
                <li key={standard}>{standard}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-space-xs">
            <h4 className="font-code text-label-telemetry text-tertiary uppercase">Ethical Guardrails</h4>
            <ul className="font-body text-body-sm text-on-surface-variant space-y-space-xs">
              {GUARDRAILS.map((guardrail) => (
                <li key={guardrail}>{guardrail}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between pt-space-md gap-space-sm font-code text-label-telemetry text-outline">
          <p>© 2025 Agentic AI for Africa Innovation Challenge. Pan-African Civic Intelligence Initiative.</p>
          <p>Audited &amp; Defensible Civic Architecture • Nairobi Summit Execution Track</p>
        </div>
      </div>
    </footer>
  );
}
