"use client";

import { useState } from "react";
import { CircleX, CodeXml, FileText, ListChecks, Video } from "lucide-react";

type TabId = "what-to-build" | "what-to-submit" | "disqualifications";

const BUILD_RULES = [
  {
    tag: "RULE 01 • CUSTOM MCP SERVER",
    tagColor: "text-primary",
    title: "3+ Sovereign Tools",
    body: (
      <>
        Write your own MCP server exposing at least 3 tools. Crucially, at least one tool must{" "}
        <strong>draft, file, or flag</strong>. Read-only query endpoints are not an agent&apos;s hands.
      </>
    ),
  },
  {
    tag: "RULE 02 • THIRD-PARTY MCP",
    tagColor: "text-secondary",
    title: "External Server Justification",
    body: "Integrate at least one MCP server you did not write (e.g. SQLite, GitHub, Filesystem, Brave Search, PostgreSQL) with explicit written rationale for why it is essential.",
  },
  {
    tag: "RULE 03 • FRAMEWORK CHOICE",
    tagColor: "text-tertiary",
    title: "Open-Source Orchestration",
    body: "Build using recognized open-source orchestration libraries: LangGraph, CrewAI, Pydantic AI, smolagents, or clean Python/TypeScript native loops.",
  },
  {
    tag: "RULE 04 • DATA SOVEREIGNTY",
    tagColor: "text-primary",
    title: "Open-Weights Execution",
    body: "The entire end-to-end evaluation must execute cleanly against an open-weights foundation model (e.g., Qwen 2.5, Llama 3, Mistral, Gemma, Aya) to guarantee local data residency.",
  },
  {
    tag: "RULE 05 • DEFENSIVE TELEMETRY",
    tagColor: "text-secondary",
    title: "Structured Logging & Human Gate",
    body: "Every tool call must output exact timestamps, raw tool arguments, and returned schemas. Execution must pause at consequential thresholds for named human signoff.",
  },
  {
    tag: "RULE 06 • NEW WORK CLAUSE",
    tagColor: "text-tertiary",
    title: "Fresh 5-Day Sprint Code",
    body: "All submitted code must be built within the official challenge period. Pre-existing proprietary agency software will be detected via Git commit verification.",
  },
];

const SUBMIT_ARTIFACTS = [
  {
    icon: CodeXml,
    iconColor: "text-primary",
    title: "Public Repository",
    body: (
      <>
        GitHub/GitLab repo under an OSI-approved license with a bulletproof 1-command startup script (
        <code className="text-primary font-code">docker compose up</code> or{" "}
        <code className="text-primary font-code">make run</code>).
      </>
    ),
  },
  {
    icon: Video,
    iconColor: "text-secondary",
    title: "< 3-Min Unedited Video",
    body: "Continuous uncut screen recording capturing the terminal or workbench showing live MCP tool invocations, token logs, and the human intervention pause.",
  },
  {
    icon: FileText,
    iconColor: "text-tertiary",
    title: "ARCHITECTURE.md",
    body: "Single-page markdown document detailing data flow, state machine topology, MCP schema definitions, and model orchestration boundaries.",
  },
  {
    icon: ListChecks,
    iconColor: "text-primary",
    title: "EVALS.md (8+ Tests)",
    body: (
      <>
        Documented benchmark suite featuring 8+ deterministic test tasks and at least{" "}
        <strong>1 honest unfixed failure</strong> analyzed with clear post-mortem clarity.
      </>
    ),
  },
];

const DISQUALIFICATIONS = [
  {
    title: "Chatbot Wrappers",
    body: "A single LLM prompt without an autonomous planning loop or dynamic tool orchestration is an instant disqualification.",
  },
  {
    title: "Agent Awarding Tenders",
    body: "Any system that executes a final award or issues a contract without an intentional human review sign-off violates procurement law.",
  },
  {
    title: "Unsourced Flags & Leaks",
    body: "Flagging a supplier without citing specific document page numbers and releasing sensitive private procurement records or personal identity data.",
  },
];

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "what-to-build", label: "1. What to Build (6 Rules)" },
  { id: "what-to-submit", label: "2. What to Submit (Artifacts)" },
  { id: "disqualifications", label: "3. Instant Disqualifications (Hall of Shame)" },
];

export function RequirementsSection() {
  const [activeTab, setActiveTab] = useState<TabId>("what-to-build");
  const [touched, setTouched] = useState(false);

  const switchTab = (tabId: TabId) => {
    setActiveTab(tabId);
    setTouched(true);
  };

  const tabButtonClasses = (id: TabId) => {
    const base =
      "px-space-md py-space-xs rounded-bb font-body text-label-ui uppercase tracking-wider transition-all";
    if (activeTab === id) return `${base} bg-surface-container-highest text-primary`;
    if (id === "disqualifications" && !touched) return `${base} text-error hover:bg-error/10`;
    return `${base} text-on-surface-variant hover:text-on-surface`;
  };

  return (
    <section className="w-full px-gutter py-space-xl bg-surface-container-low" id="mcp-tech-stack">
      <div className="max-w-7xl mx-auto flex flex-col gap-space-lg">
        <div className="flex flex-col gap-1 max-w-2xl">
          <span className="font-code text-label-telemetry text-primary uppercase tracking-wider">
            Engineering Blueprint
          </span>
          <h2 className="font-display text-headline-lg text-on-surface">
            Hard Requirements &amp; Submission Criteria
          </h2>
          <p className="font-body text-body-md text-on-surface-variant">
            Strict technical constraints to guarantee authentic, Sovereign African agentic software
            rather than superficial chatbot wrappers.
          </p>
        </div>

        {/* Tabbed Container */}
        <div className="flex flex-col gap-space-md">
          {/* Tab Bar */}
          <div className="flex flex-wrap gap-space-xs bg-surface-container-lowest p-1 rounded-bb" role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={tabButtonClasses(tab.id)}
                id={`btn-tab-${tab.id}`}
                onClick={() => switchTab(tab.id)}
                role="tab"
                aria-selected={activeTab === tab.id}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: What to Build */}
          {activeTab === "what-to-build" && (
            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md"
              id="tab-what-to-build"
              role="tabpanel"
            >
              {BUILD_RULES.map((rule) => (
                <div key={rule.tag} className="p-space-md rounded-bb bg-surface-container flex flex-col gap-space-xs">
                  <span className={`font-code text-label-telemetry ${rule.tagColor}`}>{rule.tag}</span>
                  <h4 className="font-display text-headline-sm text-on-surface">{rule.title}</h4>
                  <p className="font-body text-body-sm text-on-surface-variant">{rule.body}</p>
                </div>
              ))}
            </div>
          )}

          {/* Tab 2: What to Submit */}
          {activeTab === "what-to-submit" && (
            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md"
              id="tab-what-to-submit"
              role="tabpanel"
            >
              {SUBMIT_ARTIFACTS.map((artifact) => (
                <div
                  key={artifact.title}
                  className="p-space-md rounded-bb bg-surface-container flex flex-col gap-space-xs"
                >
                  <artifact.icon className={`size-[28px] shrink-0 ${artifact.iconColor}`} aria-hidden="true" />
                  <h4 className="font-display text-headline-sm text-on-surface">{artifact.title}</h4>
                  <p className="font-body text-body-sm text-on-surface-variant">{artifact.body}</p>
                </div>
              ))}
            </div>
          )}

          {/* Tab 3: Disqualifications */}
          {activeTab === "disqualifications" && (
            <div
              className="grid grid-cols-1 md:grid-cols-3 gap-space-md"
              id="tab-disqualifications"
              role="tabpanel"
            >
              {DISQUALIFICATIONS.map((violation, index) => (
                <div
                  key={violation.title}
                  className="p-space-md rounded-bb bg-surface-container-lowest flex flex-col gap-space-xs"
                >
                  <div className="flex items-center gap-space-xs text-error font-code text-label-telemetry">
                    <CircleX className="size-[18px] shrink-0" aria-hidden="true" />
                    <span>VIOLATION 0{index + 1}</span>
                  </div>
                  <h4 className="font-display text-headline-sm text-on-surface">{violation.title}</h4>
                  <p className="font-body text-body-sm text-on-surface-variant">{violation.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
