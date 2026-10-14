import { TopTicker } from "@/components/galina/top-ticker";
import { SiteHeader } from "@/components/galina/site-header";
import { Hero } from "@/components/galina/hero";
import { Ecosystem } from "@/components/galina/ecosystem";
import { Tracking } from "@/components/galina/tracking";
import { Network } from "@/components/galina/network";
import { QuoteCalculator } from "@/components/galina/quote-calculator";
import { Impact } from "@/components/galina/impact";
import { Milestones } from "@/components/galina/milestones";
import { Testimonials } from "@/components/galina/testimonials";
import { Faq } from "@/components/galina/faq";
import { CallToAction } from "@/components/galina/cta";
import { SiteFooter } from "@/components/galina/site-footer";

/**
 * Galina Express — cross-border e-commerce enabler in Iraq.
 * Inspired by galinaexpress.com, rebuilt as a world-class, fully native
 * Next.js experience: no external CDNs, live shipment tracking, an instant
 * quote engine and an animated corridor network.
 */
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-paper font-body text-ink-900 antialiased">
      <TopTicker />
      <SiteHeader />
      <main className="w-full flex-1">
        <Hero />
        <Ecosystem />
        <Tracking />
        <Network />
        <QuoteCalculator />
        <Impact />
        <Milestones />
        <Testimonials />
        <Faq />
        <CallToAction />
      </main>
      <SiteFooter />
    </div>
  );
}
