"use client";

import Image from "next/image";
import { ArrowRight, Download, Gavel, ShieldCheck, Terminal } from "lucide-react";

const TELEMETRY = [
  { label: "STATUS", value: "Submissions Open", accent: "text-primary", dot: true },
  { label: "DEADLINE", value: "15th October 2025", accent: "text-tertiary", dot: false },
  { label: "ELIGIBILITY", value: "Africa Residents (1-3)", accent: "text-secondary", dot: false },
  { label: "STACK MANDATE", value: "MCP + Open-Weights", accent: "text-on-surface-variant", dot: false },
];

export function HeroSection() {
  const scrollToSimulation = () => {
    document.getElementById("sim-sandbox")?.scrollIntoView({ behavior: "smooth" });
  };

  const downloadStarterPack = () => {
    window.alert(
      "Downloading The Bid Box OCDS Starter Specification Package (JSON Schema 1.1 + Mock PPRA Releases + Local Dockerfile)..."
    );
  };

  return (
    <section className="relative w-full px-gutter py-space-xl overflow-hidden bg-gradient-to-b from-surface-container-lowest via-surface-container-low to-background">
      {/* Ambient sovereign glow behind hero content */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/3 -right-32 w-96 h-96 rounded-full bg-secondary/10 blur-3xl pointer-events-none"></div>

      <div className="relative z-10 max-w-7xl mx-auto flex flex-col gap-space-lg">
        {/* Super-Badge Tagline */}
        <div className="inline-flex flex-wrap items-center gap-space-xs">
          <span className="px-space-sm py-1 rounded-bb bg-surface-container-high text-primary font-code text-label-telemetry uppercase tracking-wider shadow-sm">
            AGENTIC AI FOR AFRICA INNOVATION CHALLENGE
          </span>
          <span className="text-outline">•</span>
          <span className="px-space-sm py-1 rounded-bb bg-secondary/10 text-secondary font-code text-label-telemetry uppercase tracking-wider">
            TRACK: GOVERNANCE (HEALTHCARE • AGRICULTURE • EDUCATION)
          </span>
        </div>

        {/* Main Asymmetric Grid: Title & Live Metrics Deck */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
          <div className="lg:col-span-7 flex flex-col gap-space-md">
            <h1 className="font-display text-display-hero text-on-surface tracking-tight">
              The Bid Box <br className="hidden sm:inline" />
              <span className="italic text-primary font-display">Challenge.</span>
            </h1>
            <p className="font-body text-body-lg text-on-surface-variant max-w-2xl">
              Build an agentic AI that evaluates public tenders. Five days to build in your preferred
              sovereign environment, then twenty minutes live in your own code before an expert
              Pan-African jury.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-space-md pt-space-sm">
              <a
                className="px-space-lg py-space-sm rounded-bb bg-primary text-on-primary font-body text-label-ui uppercase tracking-wider shadow-[0_0_24px_rgba(104,219,169,0.35)] hover:bg-primary-container hover:text-on-primary-container transition-all flex items-center gap-space-xs group"
                href="#apply-drawer"
              >
                <span>Apply for Governance</span>
                <ArrowRight
                  className="size-[16px] shrink-0 group-hover:translate-x-1 transition-transform"
                  aria-hidden="true"
                />
              </a>
              <button
                className="px-space-md py-space-sm rounded-bb bg-surface-container-high hover:bg-surface-container-highest text-secondary font-body text-label-ui uppercase tracking-wider transition-all flex items-center gap-space-xs"
                onClick={scrollToSimulation}
              >
                <Terminal className="size-[16px] shrink-0" aria-hidden="true" />
                <span>Live Agent Simulation</span>
              </button>
              <button
                className="px-space-md py-space-sm rounded-bb bg-surface-container text-on-surface-variant hover:text-on-surface font-body text-label-ui uppercase tracking-wider transition-all flex items-center gap-space-xs"
                onClick={downloadStarterPack}
              >
                <Download className="size-[16px] shrink-0" aria-hidden="true" />
                <span>Download OCDS Starter Spec</span>
              </button>
            </div>

            {/* Highlight Telemetry Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm pt-space-md">
              {TELEMETRY.map((item) => (
                <div key={item.label} className="p-space-sm rounded-bb bg-surface-container/70 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    {item.dot && <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>}
                    <span className={`font-code text-label-telemetry ${item.accent}`}>{item.label}</span>
                  </div>
                  <span className="font-body text-body-sm text-on-surface font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side: Cinematic Sovereign Visual Component */}
          <div className="lg:col-span-5 flex flex-col gap-space-sm">
            <div className="relative w-full rounded-bb-xl overflow-hidden bg-surface-container shadow-2xl">
              <div className="h-80 w-full relative">
                <Image
                  src="/images/hero-command-center.png"
                  alt="High-angle editorial photograph of pan-African civic intelligence operators working in a high-tech procurement command center in Nairobi with glowing holographic green analytical charts showing tender data streams"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-surface-container/40 to-transparent"></div>

                {/* Floating Audit Capsule on Top of Image */}
                <div className="absolute bottom-4 left-4 right-4 p-space-sm rounded-bb bg-surface-container-lowest/90 backdrop-blur-md shadow-lg flex items-center justify-between">
                  <div className="flex items-center gap-space-xs">
                    <ShieldCheck className="size-[20px] shrink-0 text-primary" aria-hidden="true" />
                    <div className="flex flex-col">
                      <span className="font-code text-label-telemetry text-primary">
                        AUDIT COMPLIANCE PASS
                      </span>
                      <span className="font-body text-body-sm text-on-surface">
                        KE-PPRA-2025-99411 Verified
                      </span>
                    </div>
                  </div>
                  <span className="font-code text-label-code text-secondary font-bold">SHA256:8b4f...</span>
                </div>
              </div>

              {/* Mini Terminal Telemetry Bar below Image */}
              <div className="p-space-sm bg-surface-container-lowest flex items-center justify-between text-on-surface-variant font-code text-label-telemetry">
                <span className="flex items-center gap-1">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-[14px] shrink-0 text-tertiary"
                    aria-hidden="true"
                  >
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                    <rect x="9" y="9" width="6" height="6" />
                    <path d="M15 2v2M15 20v2M2 15h2M2 9h2M20 15h2M20 9h2M9 2v2M9 20v2" />
                  </svg>
                  Qwen-2.5-72B • vLLM Sovereign Node
                </span>
                <span className="text-primary">Latency: 142ms</span>
              </div>
            </div>

            {/* Quick Quote / Sovereign Law Excerpt */}
            <div className="p-space-sm rounded-bb bg-surface-container-low flex items-start gap-space-xs">
              <Gavel className="size-[18px] shrink-0 text-tertiary mt-0.5" aria-hidden="true" />
              <p className="font-body text-body-sm text-on-surface-variant italic">
                &quot;Public procurement represents up to 17% of African GDP. Defensible agentic
                automation protects both sovereign capital and citizen trust.&quot;
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
