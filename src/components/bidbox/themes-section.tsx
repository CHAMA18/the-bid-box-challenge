import { ArrowRight, FolderOpen, Globe, HeartHandshake, Landmark, Stethoscope } from "lucide-react";

const THEMES = [
  {
    number: "Theme 01",
    icon: Stethoscope,
    iconClasses: "bg-primary/10 text-primary",
    numberClasses: "text-primary",
    arrowClasses: "text-primary",
    title: "Health & Life Sciences: Health Commodity Tenders",
    description:
      "Tenders for essential pharmaceuticals, cold-chain vaccines, and critical hospital diagnostic hardware across national healthcare ministries.",
    criticals: [
      "Cross-reference supplier bid specs against strict clinical formulary guidelines.",
      "Audit claimed delivery quantities against actual historical facility consumption.",
      "Compare active ingredient unit pricing against international WHO median benchmarks.",
    ],
    datasets: "OCDS Datasets: Kenya KEMSA / South Africa Health",
  },
  {
    number: "Theme 02",
    icon: Landmark,
    iconClasses: "bg-secondary/10 text-secondary",
    numberClasses: "text-secondary",
    arrowClasses: "text-secondary",
    title: "Financial Services: Value for Money & Fiscal Exposure",
    description:
      "Large-scale infrastructure works, provincial capital expenditures, and high-frequency recurring procurement.",
    criticals: [
      "Detect mathematical unit-rate anomalies and hidden cost front-loading.",
      "Automated budget line reconciliation against municipal treasury ceilings.",
      "Score bidder unpaid-invoice exposure and financial insolvency risk indicators.",
    ],
    datasets: "OCDS Datasets: Nigeria Federal BPP / South Africa Treasury",
  },
  {
    number: "Theme 03",
    icon: Globe,
    iconClasses: "bg-tertiary/10 text-tertiary",
    numberClasses: "text-tertiary",
    arrowClasses: "text-tertiary",
    title: "Digital Economy: Open Contracting & Citizen Transparency",
    description:
      "Transforming complex procurement portals into transparent, easily queried pipelines for civic watchdogs, investigative journalists, and MSMEs.",
    criticals: [
      "Parse tender notices, amendments, and deadlines into plain multilingual briefs.",
      "Flag restrictive, anti-competitive eligibility criteria embedded in RFPs.",
      "Identify single-bidder patterns across recurring municipal cycles.",
    ],
    datasets: "OCDS Datasets: Rwanda Umucyo / Uganda PPDA",
  },
  {
    number: "Theme 04",
    icon: HeartHandshake,
    iconClasses: "bg-primary/10 text-primary",
    numberClasses: "text-primary",
    arrowClasses: "text-primary",
    title: "Future of Work: Inclusion & Local Economic Impact",
    description:
      "Operationalizing affirmative procurement mandates such as Kenya's AGPO (Access to Government Procurement Opportunities for Youth, Women, PWD).",
    criticals: [
      "Audit statutory compliance with national reserved-procurement quota thresholds (e.g. 30%).",
      "Differentiate genuine local African suppliers from fronting shell entities.",
      "Model regional domestic employment and direct artisan impact projections.",
    ],
    datasets: "OCDS Datasets: Kenya PPRA / Ghana PPA",
  },
];

export function ThemesSection() {
  return (
    <section className="w-full px-gutter py-space-xl bg-surface-container-low" id="the-4-themes">
      <div className="max-w-7xl mx-auto flex flex-col gap-space-lg">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
          <div className="flex flex-col gap-1 max-w-2xl">
            <span className="font-code text-label-telemetry text-secondary uppercase tracking-wider">
              Strategic Tracks
            </span>
            <h2 className="font-display text-headline-lg text-on-surface">Choose One Governance Theme</h2>
            <p className="font-body text-body-md text-on-surface-variant">
              Select one primary domain to architect your MCP server and evaluation suite around. Each
              theme includes official African OCDS sample sets.
            </p>
          </div>
          <div className="font-code text-label-telemetry text-primary flex items-center gap-1.5">
            <FolderOpen className="size-[16px] shrink-0" aria-hidden="true" />
            <span>Sample Tender Packs Included</span>
          </div>
        </div>

        {/* Theme Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
          {THEMES.map((theme) => (
            <div
              key={theme.number}
              className="group p-space-lg rounded-bb-xl bg-surface-container hover:bg-surface-container-high transition-all flex flex-col justify-between gap-space-md shadow-lg"
            >
              <div className="flex flex-col gap-space-sm">
                <div className="flex items-center justify-between">
                  <span className={`w-10 h-10 rounded-bb flex items-center justify-center ${theme.iconClasses}`}>
                    <theme.icon className="size-[22px]" aria-hidden="true" />
                  </span>
                  <span className={`font-code text-label-telemetry uppercase ${theme.numberClasses}`}>
                    {theme.number}
                  </span>
                </div>
                <h3 className="font-display text-headline-sm text-on-surface">{theme.title}</h3>
                <p className="font-body text-body-sm text-on-surface-variant">{theme.description}</p>
                <div className="p-space-sm rounded-bb bg-surface-container-lowest flex flex-col gap-1">
                  <span className="font-code text-label-telemetry text-secondary uppercase">
                    Agent Mission Criticals
                  </span>
                  <ul className="text-body-sm font-body text-on-surface-variant space-y-1">
                    {theme.criticals.map((critical) => (
                      <li key={critical}>• {critical}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="flex items-center justify-between pt-space-xs font-code text-label-telemetry text-outline">
                <span>{theme.datasets}</span>
                <ArrowRight
                  className={`size-[16px] shrink-0 group-hover:translate-x-1 transition-transform ${theme.arrowClasses}`}
                  aria-hidden="true"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
