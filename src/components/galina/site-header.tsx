"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, PackageSearch, X, ArrowUpRight } from "lucide-react";
import { GalinaLogo } from "@/components/galina/logo";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Ecosystem", href: "#ecosystem" },
  { label: "Tracking", href: "#tracking" },
  { label: "Network", href: "#network" },
  { label: "Pricing", href: "#quote" },
  { label: "Milestones", href: "#milestones" },
  { label: "Company", href: "#contact" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when the mobile menu is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b bg-paper/85 backdrop-blur-xl transition-all duration-300",
        scrolled ? "border-ink-100 shadow-[0_1px_24px_rgba(11,12,15,0.07)]" : "border-transparent"
      )}
    >
      <div className="mx-auto flex h-[72px] w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Galina Express home" onClick={() => setOpen(false)}>
          <GalinaLogo />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="rounded-full px-3.5 py-2 text-[14px] font-medium text-ink-600 transition-colors hover:bg-ink-50 hover:text-ink-950"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2.5 lg:flex">
          <a
            href="#tracking"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-ink-200 bg-white px-4 text-[13.5px] font-semibold text-ink-800 transition-all hover:border-ink-300 hover:shadow-sm"
          >
            <PackageSearch className="h-4 w-4 text-brand-600" aria-hidden="true" />
            Track shipment
          </a>
          <a
            href="#contact"
            className="group inline-flex h-10 items-center gap-1.5 rounded-full bg-brand-600 px-5 text-[13.5px] font-semibold text-white shadow-[0_8px_20px_rgba(217,38,22,0.28)] transition-all hover:bg-brand-700 hover:shadow-[0_10px_26px_rgba(217,38,22,0.36)]"
          >
            Ship with us
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
          </a>
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-900 lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-ink-100 bg-paper lg:hidden"
          >
            <nav aria-label="Mobile" className="flex flex-col gap-1 px-4 py-4">
              {NAV.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between rounded-xl px-4 py-3.5 text-[16px] font-semibold text-ink-800 transition-colors hover:bg-ink-50"
                >
                  {item.label}
                  <ArrowUpRight className="h-4 w-4 text-ink-300" aria-hidden="true" />
                </a>
              ))}
              <a
                href="#contact"
                onClick={() => setOpen(false)}
                className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 text-[15px] font-semibold text-white"
              >
                Ship with us
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
