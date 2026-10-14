"use client";

import { useRef, useState } from "react";
import { UserCheck } from "lucide-react";

const COUNTRIES = [
  "Kenya",
  "Nigeria",
  "South Africa",
  "Rwanda",
  "Ghana",
  "Uganda",
  "Tanzania",
  "Ethiopia",
  "Egypt",
  "Senegal",
  "Other African Sovereign State",
];

const THEMES = [
  "Theme 1: Health Commodity Tenders (WHO PQ & Formulary)",
  "Theme 2: Value for Money & Fiscal Exposure",
  "Theme 3: Open Contracting & Citizen Transparency",
  "Theme 4: Future of Work & Local Affirmative Quotas",
];

const FRAMEWORKS = [
  "LangGraph (StateGraph)",
  "CrewAI (Multi-Agent Flows)",
  "Pydantic AI (Strict Types)",
  "smolagents (Hugging Face)",
  "Native Python / TypeScript Custom Loop",
];

const selectClasses =
  "px-space-sm py-space-xs rounded-bb bg-surface-container-lowest text-on-surface font-body focus:outline-none focus:ring-1 focus:ring-primary";
const inputClasses =
  "px-space-sm py-space-xs rounded-bb bg-surface-container-lowest text-on-surface font-body focus:outline-none focus:ring-1 focus:ring-primary";
const labelClasses = "font-code text-label-telemetry text-on-surface-variant uppercase";

export function ApplySection() {
  const [submitted, setSubmitted] = useState(false);
  const feedbackRef = useRef<HTMLDivElement>(null);

  const handleApply = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      feedbackRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  return (
    <section className="w-full px-gutter py-space-xl bg-surface-container-lowest" id="apply-drawer">
      <div className="max-w-4xl mx-auto flex flex-col gap-space-lg">
        <div className="flex flex-col items-center text-center gap-1">
          <span className="px-space-xs py-0.5 rounded-bb bg-primary/20 text-primary font-code text-label-telemetry uppercase tracking-wider">
            Official Intake Form
          </span>
          <h2 className="font-display text-headline-lg text-on-surface">Apply for the Governance Track</h2>
          <p className="font-body text-body-md text-on-surface-variant max-w-xl">
            Register your team before submissions close on 15th October. Solo builders and teams of up
            to 3 residents anywhere in Africa are welcome.
          </p>
        </div>

        {/* Application Form Card */}
        <form
          className="p-space-lg rounded-bb-xl bg-surface-container shadow-2xl flex flex-col gap-space-md"
          onSubmit={handleApply}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            <div className="flex flex-col gap-1">
              <label className={labelClasses} htmlFor="team-name">
                Team Name / Builder Handle *
              </label>
              <input
                className={inputClasses}
                id="team-name"
                name="teamName"
                placeholder="e.g. SovereignAudit-AI"
                required
                type="text"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClasses} htmlFor="country">
                Country of Residence in Africa *
              </label>
              <select className={selectClasses} id="country" name="country" required defaultValue="">
                <option value="">Select Sovereign State...</option>
                {COUNTRIES.map((country) => (
                  <option key={country}>{country}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            <div className="flex flex-col gap-1">
              <label className={labelClasses} htmlFor="theme">
                Theme Selection *
              </label>
              <select className={selectClasses} id="theme" name="theme" required defaultValue="">
                <option value="">Select Primary Track Theme...</option>
                {THEMES.map((theme) => (
                  <option key={theme}>{theme}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClasses} htmlFor="framework">
                Orchestration Framework *
              </label>
              <select className={selectClasses} id="framework" name="framework" required defaultValue="">
                <option value="">Select Primary Architecture...</option>
                {FRAMEWORKS.map((framework) => (
                  <option key={framework}>{framework}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            <div className="flex flex-col gap-1">
              <label className={labelClasses} htmlFor="email">
                Lead Builder Email *
              </label>
              <input
                className={inputClasses}
                id="email"
                name="email"
                placeholder="builder@sovereign-node.africa"
                required
                type="email"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClasses} htmlFor="repo-url">
                Public GitHub Repository URL (Optional at start)
              </label>
              <input
                className={inputClasses}
                id="repo-url"
                name="repoUrl"
                placeholder="https://github.com/org/bid-box-agent"
                type="url"
              />
            </div>
          </div>

          {/* Open-Weights Confirmation Checkbox */}
          <div className="p-space-sm rounded-bb bg-surface-container-lowest flex items-start gap-space-xs">
            <input className="mt-1 accent-primary" id="sovereign-confirm" name="sovereignConfirm" required type="checkbox" />
            <label className="font-body text-body-sm text-on-surface-variant" htmlFor="sovereign-confirm">
              I confirm that this project will execute its full task against an open-weights foundation
              model (e.g. Qwen 2.5, Llama 3, Mistral) to maintain citizen privacy, adheres to the
              Non-Negotiable Human-in-the-Loop award mandate, and includes structured MCP tool logging.
            </label>
          </div>

          {/* Submit Button */}
          <button
            className={`w-full py-space-sm rounded-bb bg-primary text-on-primary font-body text-label-ui uppercase tracking-wider hover:bg-primary-container transition-all shadow-[0_0_24px_rgba(104,219,169,0.3)] flex items-center justify-center gap-space-xs ${
              submitted ? "opacity-50 pointer-events-none" : ""
            }`}
            id="submit-btn"
            type="submit"
            disabled={submitted}
            aria-disabled={submitted}
          >
            <UserCheck className="size-[18px] shrink-0" aria-hidden="true" />
            <span>Submit Governance Application</span>
          </button>

          <div
            className={`p-space-sm rounded-bb bg-primary/20 text-primary font-code text-label-telemetry text-center ${
              submitted ? "" : "hidden"
            }`}
            id="submit-feedback"
            ref={feedbackRef}
            role="status"
          >
            ✓ APPLICATION CONFIRMED • WELCOME BUILDER • CHECK YOUR INBOX FOR THE STARTER DOCKER REPO
          </div>
        </form>
      </div>
    </section>
  );
}
