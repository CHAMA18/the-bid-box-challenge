"use client";

import { useState } from "react";
import Link from "next/link";
import { Linkedin, Instagram, Facebook, Youtube, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GalinaLogo } from "@/components/galina/logo";
import { OFFICES, PARTNERS } from "@/lib/data";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Services",
    links: [
      { label: "Air & road freight", href: "#ecosystem" },
      { label: "Economy sea", href: "#network" },
      { label: "GRAND Guarantee escrow", href: "#ecosystem" },
      { label: "Customs & compliance", href: "#ecosystem" },
      { label: "Fulfilment", href: "#ecosystem" },
    ],
  },
  {
    title: "Network",
    links: [
      { label: "Türkiye corridor", href: "#network" },
      { label: "China corridor", href: "#network" },
      { label: "GCC corridor", href: "#network" },
      { label: "Europe corridor", href: "#network" },
      { label: "Delivery coverage", href: "#network" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Milestones", href: "#milestones" },
      { label: "Merchant stories", href: "#ecosystem" },
      { label: "FAQ", href: "#faq" },
      { label: "Contact", href: "#contact" },
      { label: "Track shipment", href: "#tracking" },
    ],
  },
];

const SOCIALS = [
  { icon: Linkedin, label: "LinkedIn" },
  { icon: Instagram, label: "Instagram" },
  { icon: Facebook, label: "Facebook" },
  { icon: Youtube, label: "YouTube" },
];

export function SiteFooter() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);

  function subscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      toast({ title: "Enter a valid email", variant: "destructive" });
      return;
    }
    setSubscribing(true);
    // Simulated subscribe — replace with API when a newsletter service is wired.
    setTimeout(() => {
      setSubscribing(false);
      setEmail("");
      toast({ title: "Subscribed", description: "Corridor updates land in your inbox monthly." });
    }, 700);
  }

  return (
    <footer className="mt-auto bg-ink-950 text-ink-300">
      <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-16 sm:px-6 lg:px-8 lg:pt-20">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Brand */}
          <div className="lg:col-span-4">
            <Link href="/" aria-label="Galina Express home">
              <GalinaLogo variant="light" />
            </Link>
            <p className="mt-5 max-w-xs text-[14.5px] leading-relaxed text-ink-400">
              Iraq's premier cross-border logistics and fintech enabler — connecting global
              sellers to local buyers with secure payments and a seamless experience.
            </p>
            {/* Newsletter */}
            <form onSubmit={subscribe} className="mt-7">
              <label htmlFor="footer-email" className="font-code text-[10px] tracking-[0.24em] text-ink-500">
                CORRIDOR UPDATES, MONTHLY
              </label>
              <div className="mt-2.5 flex gap-2">
                <input
                  id="footer-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="h-11 w-full min-w-0 rounded-xl border border-white/12 bg-white/[0.06] px-4 text-[14px] text-white placeholder:text-ink-500 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-600/20"
                />
                <button
                  type="submit"
                  disabled={subscribing}
                  aria-label="Subscribe to newsletter"
                  className="inline-flex h-11 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition-colors hover:bg-brand-500 disabled:opacity-60"
                >
                  {subscribing ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Send className="h-4.5 w-4.5" aria-hidden="true" />}
                </button>
              </div>
            </form>
            <div className="mt-7 flex gap-2.5">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href="#"
                  aria-label={`Galina Express on ${s.label}`}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/12 text-ink-300 transition-all hover:border-brand-500 hover:text-white"
                >
                  <s.icon className="h-4.5 w-4.5" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title} className="lg:col-span-2">
              <p className="font-code text-[10px] font-semibold tracking-[0.24em] text-ink-500">
                {col.title.toUpperCase()}
              </p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="text-[14px] text-ink-300 transition-colors hover:text-white">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* Offices */}
          <div className="lg:col-span-2">
            <p className="font-code text-[10px] font-semibold tracking-[0.24em] text-ink-500">
              OFFICES
            </p>
            <ul className="mt-4 space-y-3.5">
              {OFFICES.map((o) => (
                <li key={o.city}>
                  <p className="text-[14px] font-semibold text-white">
                    {o.city}
                    <span className="ml-1.5 font-normal text-ink-500">{o.country}</span>
                  </p>
                  <p className="text-[12px] text-ink-500">{o.role}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Partner wordmarks */}
        <div className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-white/8 pt-8">
          <span className="font-code text-[9.5px] tracking-[0.26em] text-ink-600">COLLECTION PARTNERS</span>
          {PARTNERS.map((p) => (
            <span key={p} className="font-display text-[15px] font-bold text-ink-600">
              {p}
            </span>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-white/8 pt-7 sm:flex-row sm:items-center">
          <p className="text-[12.5px] text-ink-500">
            © 2026 Galina Express. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-[12.5px] text-ink-500 transition-colors hover:text-ink-200">
              Privacy Policy
            </a>
            <a href="#" className="text-[12.5px] text-ink-500 transition-colors hover:text-ink-200">
              Terms of Service
            </a>
            <span className="font-code text-[10px] tracking-[0.18em] text-ink-600">
              BAGHDAD · GMT+3
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
