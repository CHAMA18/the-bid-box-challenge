import { TopTicker } from "@/components/bidbox/top-ticker";
import { SiteHeader } from "@/components/bidbox/site-header";
import { Hero } from "@/components/bidbox/hero";
import { Overview } from "@/components/bidbox/overview";
import { RuleBand } from "@/components/bidbox/rule-band";
import { Themes } from "@/components/bidbox/themes";
import { Jargon } from "@/components/bidbox/jargon";
import { Requirements } from "@/components/bidbox/requirements";
import { Closing } from "@/components/bidbox/closing";
import { SiteFooter } from "@/components/bidbox/site-footer";

/**
 * The Bid Box Challenge — Agentic AI for Africa Innovation Challenge.
 * A world-class, fully native Next.js experience: an animated MCP agent-run
 * terminal, the 26-days-vs-20-minutes clock, four challenge themes, the
 * shared jargon, and both eligibility lists — with the non-negotiable rule
 * front and centre: agents prepare the file, committees award the tender.
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
        <Themes />
        <Jargon />
        <Requirements />
        <Closing />
      </main>
      <SiteFooter />
    </div>
  );
}
