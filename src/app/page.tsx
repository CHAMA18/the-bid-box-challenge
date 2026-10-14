import { SiteHeader, SovereignTicker } from "@/components/bidbox/site-header";
import { HeroSection } from "@/components/bidbox/hero-section";
import { CrisisSection } from "@/components/bidbox/crisis-section";
import { ThemesSection } from "@/components/bidbox/themes-section";
import { JargonSection } from "@/components/bidbox/jargon-section";
import { SimulationSection } from "@/components/bidbox/simulation-section";
import { RequirementsSection } from "@/components/bidbox/requirements-section";
import { RubricSection } from "@/components/bidbox/rubric-section";
import { PrizesSection } from "@/components/bidbox/prizes-section";
import { PortalsSection } from "@/components/bidbox/portals-section";
import { TimelineSection } from "@/components/bidbox/timeline-section";
import { ApplySection } from "@/components/bidbox/apply-section";
import { SiteFooter } from "@/components/bidbox/site-footer";

/**
 * The Bid Box Challenge — Agentic AI for Africa Innovation Challenge.
 *
 * Fully native Next.js implementation of the original source: design tokens
 * ported to Tailwind v4 @theme, fonts self-hosted via next/font, icons via
 * lucide-react, and all imagery served locally. No external CDNs — the page
 * renders instantly and can never hang on third-party resources.
 */
export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface font-body antialiased">
      <SiteHeader />
      <main className="w-full pt-20 bg-background flex-1">
        <div className="flex flex-col w-full">
          <SovereignTicker />
          <HeroSection />
          <CrisisSection />
          <ThemesSection />
          <JargonSection />
          <SimulationSection />
          <RequirementsSection />
          <RubricSection />
          <PrizesSection />
          <PortalsSection />
          <TimelineSection />
          <ApplySection />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
