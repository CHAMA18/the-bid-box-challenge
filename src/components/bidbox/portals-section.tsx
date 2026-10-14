import { Globe, Info } from "lucide-react";

const PORTALS = [
  {
    country: "Kenya (PPRA)",
    dot: "bg-primary animate-pulse",
    body: "~260,000 tenders • 109,000 awards. Complete procurement lifecycle with daily delta feeds.",
    cadence: "DAILY UPDATE STREAM",
    cadenceColor: "text-primary",
  },
  {
    country: "Rwanda (RPPA)",
    dot: "bg-primary animate-pulse",
    body: "Umucyo e-Procurement. End-to-end paperless municipal records with electronic invoicing linkage.",
    cadence: "LIVE REAL-TIME STREAM",
    cadenceColor: "text-primary",
  },
  {
    country: "Tanzania (TANPS)",
    dot: "bg-primary animate-pulse",
    body: "National electronic portal publishing comprehensive works & consulting service dossiers.",
    cadence: "DAILY UPDATE STREAM",
    cadenceColor: "text-primary",
  },
  {
    country: "Nigeria (Federal BPP)",
    dot: "bg-secondary",
    body: "NOCOPO portal + sub-national releases from Anambra, Ebonyi, Osun, and Plateau states.",
    cadence: "WEEKLY RELEASES",
    cadenceColor: "text-secondary",
  },
  {
    country: "South Africa",
    dot: "bg-secondary",
    body: "National Treasury e-Tender portal covering municipal, provincial, and state-owned entities.",
    cadence: "WEEKLY AGGREGATE",
    cadenceColor: "text-secondary",
  },
  {
    country: "Liberia (PPCC)",
    dot: "bg-secondary",
    body: "Public Procurement & Concessions Commission. Natural resources and public works data.",
    cadence: "BI-WEEKLY PACKAGES",
    cadenceColor: "text-secondary",
  },
  {
    country: "Ghana (PPA)",
    dot: "bg-tertiary",
    body: "GHANEPS digital platform. Extensive records on national education & agriculture projects.",
    cadence: "MONTHLY DIGESTS",
    cadenceColor: "text-tertiary",
  },
  {
    country: "Zambia (ZPPA)",
    dot: "bg-tertiary",
    body: "Electronic Government Procurement System (e-GP) with cross-sector energy procurement.",
    cadence: "MONTHLY DIGESTS",
    cadenceColor: "text-tertiary",
  },
  {
    country: "Uganda (PPDA)",
    dot: "bg-tertiary",
    body: "Government Procurement Portal (GPP) releasing contract performance audits and award digests.",
    cadence: "MONTHLY DIGESTS",
    cadenceColor: "text-tertiary",
  },
];

export function PortalsSection() {
  return (
    <section className="w-full px-gutter py-space-xl bg-surface-container-lowest" id="ocds-portals-data">
      <div className="max-w-7xl mx-auto flex flex-col gap-space-lg">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
          <div className="flex flex-col gap-1 max-w-2xl">
            <span className="font-code text-label-telemetry text-primary uppercase tracking-wider">
              Sovereign Data Infrastructure
            </span>
            <h2 className="font-display text-headline-lg text-on-surface">
              African OCDS Data Portals (9 Nations)
            </h2>
            <p className="font-body text-body-md text-on-surface-variant">
              Nine sovereign authorities actively publish verifiable public contracting data using the
              Open Contracting Data Standard. Hackers can fetch live endpoints or use our offline
              snapshots.
            </p>
          </div>
          <span className="font-code text-label-telemetry text-secondary flex items-center gap-1">
            <Globe className="size-[16px] shrink-0" aria-hidden="true" />
            <span>Unified OCDS 1.1 JSON Protocol</span>
          </span>
        </div>

        {/* Interactive Map & Registry Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
          {/* Interactive Map Visual Element (3 cols) */}
          <div className="lg:col-span-4 rounded-bb-xl bg-surface-container p-space-md flex flex-col gap-space-md">
            <span className="font-code text-label-telemetry text-on-surface-variant uppercase">
              CONTINENTAL REGISTRY MAP
            </span>
            <div
              className="w-full h-72 bg-cover bg-center rounded-bb flex items-end p-space-sm relative overflow-hidden"
              data-location="Nairobi, Kenya"
              style={{ backgroundImage: "url('/images/africa-registry-map.png')" }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/40 to-transparent"></div>
              <div className="relative z-10 w-full p-space-xs rounded-bb bg-surface-container-lowest/90 backdrop-blur-sm flex items-center justify-between">
                <span className="font-code text-label-telemetry text-primary">PORTAL NODE: NAIROBI</span>
                <span className="font-code text-label-code text-secondary font-bold">LIVE HTTP 200</span>
              </div>
            </div>
            <div className="flex flex-col gap-space-xs text-on-surface-variant font-body text-body-sm">
              <div className="flex items-center justify-between">
                <span>Standard:</span>
                <span className="font-code text-label-code text-on-surface">OCDS Release Package 1.1</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Combined Records:</span>
                <span className="font-code text-label-code text-primary font-bold">1,450,000+ Tenders</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Update Cadence:</span>
                <span className="font-code text-label-code text-secondary">Daily Webhooks</span>
              </div>
            </div>
          </div>

          {/* 8 Columns: 9 Sovereign Registries Table/Cards */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-space-sm">
            {PORTALS.map((portal) => (
              <div
                key={portal.country}
                className="p-space-sm rounded-bb bg-surface-container flex flex-col justify-between gap-space-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-headline-sm text-on-surface">{portal.country}</span>
                  <span className={`w-2 h-2 rounded-full ${portal.dot}`}></span>
                </div>
                <p className="font-body text-body-sm text-on-surface-variant">{portal.body}</p>
                <span className={`font-code text-label-telemetry ${portal.cadenceColor}`}>
                  {portal.cadence}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Critical Hackers Note: Tenders vs Raw Bids Callout */}
        <div className="p-space-md rounded-bb-xl bg-surface-container border-l-4 border-secondary flex flex-col md:flex-row items-start gap-space-md">
          <Info className="size-[24px] shrink-0 text-secondary mt-1" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <span className="font-code text-label-telemetry text-secondary uppercase font-bold">
              IMPORTANT GUIDANCE FOR HACKERS: HISTORICAL RELEASES VS. SYNTHETIC BIDS
            </span>
            <p className="font-body text-body-sm text-on-surface-variant">
              Public OCDS portals legally publish <strong>tenders, awards, and contracts</strong>, but
              rarely publish raw un-awarded supplier bids (due to commercial trade secret protections).
              For your evaluation agent, we recommend pairing real historical tender requirements from
              PPRA or BPP with either: (a) synthetic test bidder submissions generated with LLMs, or (b)
              sanitized historical bid PDFs provided in the <em>Bid Box Starter Repo</em>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
