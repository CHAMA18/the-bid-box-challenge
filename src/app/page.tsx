import { TopTicker } from "@/components/bidbox/top-ticker";
import { SiteHeader } from "@/components/bidbox/site-header";
import { Hero } from "@/components/bidbox/hero";
import { Overview } from "@/components/bidbox/overview";
import { RuleBand } from "@/components/bidbox/rule-band";
import { UseCases } from "@/components/bidbox/use-cases";
import { Platform } from "@/components/bidbox/platform";
import { InsideBox } from "@/components/bidbox/inside-box";
import { ReportMock } from "@/components/bidbox/report-mock";
import { ProofBand } from "@/components/bidbox/proof-band";
import { Pricing } from "@/components/bidbox/pricing";
import { GetStarted } from "@/components/bidbox/get-started";
import { SiteFooter } from "@/components/bidbox/site-footer";

/**
 * Bid Box — agentic tender review for public procurement.
 * A world-class, fully native Next.js experience: an animated MCP agent-run
 * terminal, the to-scale 26-days-vs-20-minutes clock, four sector use cases,
 * the platform concepts, everything inside the box, an interactive annotated
 * sourced report, pilot telemetry with testimonials, pricing, and an
 * API-backed pilot request — with the non-negotiable rule front and centre:
 * Bid Box prepares the file, the committee awards the tender.
 */
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-paper font-body text-ink-900 antialiased">
      <TopTicker />
      <SiteHeader />
      <main className="w-full flex-1">
        <Hero />
        <Overview />
        <RuleBand />
        <UseCases />
        <Platform />
        <InsideBox />
        <ReportMock />
        <ProofBand />
        <Pricing />
        <GetStarted />
      </main>
      <SiteFooter />
    </div>
  );
}
