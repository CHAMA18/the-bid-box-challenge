import { Hotel, Medal, Mic, PlaneTakeoff, Users } from "lucide-react";

const TIERED_AWARDS = [
  {
    place: "FIRST PLACE",
    placeColor: "text-tertiary",
    title: "Pan-African Champion",
    body: "$25,000 Non-dilutive grant + Pilot contract deployment advisory with Kenya PPRA.",
    grant: "$25,000 GRANT",
    grantColor: "text-tertiary",
  },
  {
    place: "SECOND PLACE",
    placeColor: "text-secondary",
    title: "Distinguished Runner-Up",
    body: "$15,000 Non-dilutive grant + 12 months dedicated open-weights sovereign GPU cluster access.",
    grant: "$15,000 GRANT",
    grantColor: "text-secondary",
  },
  {
    place: "THIRD PLACE",
    placeColor: "text-primary",
    title: "Technical Excellence",
    body: "$10,000 Non-dilutive grant + Open-source maintainer fellowship allocation.",
    grant: "$10,000 GRANT",
    grantColor: "text-primary",
  },
  {
    place: "SPECIAL COMMENDATION",
    placeColor: "text-tertiary",
    title: "Best Women-Led Team",
    body: "$10,000 Dedicated Innovation Award + Executive engineering sponsorship.",
    grant: "$10,000 AWARD",
    grantColor: "text-tertiary",
  },
];

const PRIZE_PERKS = [
  { icon: PlaneTakeoff, text: "Roundtrip Flights Included", color: "text-primary" },
  { icon: Hotel, text: "Full Nairobi Residency", color: "text-secondary" },
  { icon: Mic, text: "Mainstage Architecture Keynote", color: "text-tertiary" },
];

export function PrizesSection() {
  return (
    <section className="w-full px-gutter py-space-xl bg-surface-container-low" id="prizes-nairobi-summit">
      <div className="max-w-7xl mx-auto flex flex-col gap-space-lg">
        <div className="flex flex-col gap-1 max-w-2xl">
          <span className="font-code text-label-telemetry text-tertiary uppercase tracking-wider">
            Summit Accelerator
          </span>
          <h2 className="font-display text-headline-lg text-on-surface">
            Prizes &amp; Nairobi Summit Accelerator
          </h2>
          <p className="font-body text-body-md text-on-surface-variant">
            Moving exceptional open-source agentic engineering directly into sovereign implementation
            across African capitals.
          </p>
        </div>

        {/* Grand Prize Spotlight Card */}
        <div className="relative w-full rounded-bb-xl overflow-hidden bg-gradient-to-r from-surface-container-lowest via-surface-container to-surface-container-lowest p-space-xl shadow-2xl">
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-center">
            <div className="lg:col-span-8 flex flex-col gap-space-sm">
              <span className="px-space-xs py-1 rounded-bb bg-tertiary/20 text-tertiary font-code text-label-telemetry uppercase tracking-wider w-fit">
                GRAND PRIZE SPOTLIGHT • TOP 10 TEAMS
              </span>
              <h3 className="font-display text-headline-lg text-on-surface">
                Fully Funded Delegation to the Model Context Protocol (MCP) Conference • Nairobi, Kenya
              </h3>
              <p className="font-body text-body-md text-on-surface-variant">
                All travel expenses, 5-star lodging, visa facilitation, and VIP delegate access fully
                covered for the Top 10 teams. Present your agent architecture directly to African
                ministers of ICT, public procurement directors, and lead engineers from the global MCP
                working group this November.
              </p>
              <div className="flex flex-wrap items-center gap-space-md pt-space-xs">
                {PRIZE_PERKS.map(({ icon: Icon, text, color }) => (
                  <span key={text} className={`flex items-center gap-1.5 font-code text-label-telemetry ${color}`}>
                    <Icon className="size-[16px] shrink-0" aria-hidden="true" />
                    {text}
                  </span>
                ))}
              </div>
            </div>
            <div className="lg:col-span-4 flex flex-col items-center justify-center p-space-md rounded-bb bg-surface-container-lowest/80 backdrop-blur-md">
              <Medal className="size-[64px] shrink-0 text-tertiary mb-2" aria-hidden="true" />
              <span className="font-code text-label-telemetry text-tertiary uppercase">
                TOTAL ACCELERATOR VALUE
              </span>
              <span className="font-display text-headline-lg text-on-surface font-bold">$125,000+</span>
              <span className="font-body text-body-sm text-on-surface-variant text-center mt-1">
                In flights, residency, compute grants, and deployment stipends
              </span>
            </div>
          </div>
        </div>

        {/* Tiered Awards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-space-md">
          {TIERED_AWARDS.map((award) => (
            <div
              key={award.place}
              className="p-space-md rounded-bb bg-surface-container flex flex-col justify-between gap-space-sm shadow-md"
            >
              <div className="flex flex-col gap-1">
                <span className={`font-code text-label-telemetry ${award.placeColor}`}>{award.place}</span>
                <h4 className="font-display text-headline-sm text-on-surface">{award.title}</h4>
                <p className="font-body text-body-sm text-on-surface-variant">{award.body}</p>
              </div>
              <span className={`font-code text-label-code font-bold ${award.grantColor}`}>{award.grant}</span>
            </div>
          ))}
        </div>

        {/* Top 40 Mentorship Strip */}
        <div className="p-space-md rounded-bb bg-surface-container-high flex flex-col sm:flex-row items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-sm">
            <Users className="size-[28px] shrink-0 text-primary" aria-hidden="true" />
            <div className="flex flex-col">
              <span className="font-body text-body-md text-on-surface font-semibold">
                The Top 40 Builder Accelerator Cohort
              </span>
              <span className="font-body text-body-sm text-on-surface-variant">
                All Top 40 teams receive $2,500 sovereign cloud compute credits + 1-on-1 MCP systems
                mentorship
              </span>
            </div>
          </div>
          <span className="font-code text-label-telemetry text-primary font-bold uppercase shrink-0">
            40 TEAMS SUPPORTED
          </span>
        </div>
      </div>
    </section>
  );
}
