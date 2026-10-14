import { Hammer, PackageCheck, TriangleAlert } from "lucide-react";
import { Eyebrow, Reveal } from "@/components/bidbox/reveal";

const BUILD = [
  {
    lead: "Your own MCP server.",
    body: "Three or more different tools, and at least one that does something; drafts, files, flags. Read-only is not an agent's hands.",
  },
  {
    lead: "One MCP server you did not write.",
    body: "Community, official, or vendor. One line on why it beats writing it yourself.",
  },
  {
    lead: "Open-source orchestration.",
    body: "LangGraph, CrewAI, Pydantic AI, smolagents, Letta, Goose, n8n or equivalent. No closed no-code builders.",
  },
  {
    lead: "One full task on an open-weights model.",
    body: "Procurement data often cannot leave the country. Show a frontier model alongside if you like.",
  },
  {
    lead: "A logged tool call for every action, and a gate on every irreversible one.",
    body: "Inputs, outputs, timestamps, and a named human approving.",
  },
  {
    lead: "New work, built during the submission period.",
    body: "Existing open-source libraries are fine; an existing project resubmitted is not.",
  },
];

const SUBMIT = [
  {
    lead: "A public code repository",
    body: "with an OSI-approved licence and a README that gets a stranger running in one command.",
  },
  {
    lead: "A demo video under 3 minutes,",
    body: "uploaded to YouTube or Vimeo and publicly visible. Show an unedited agent run with tool calls on screen, not slides.",
  },
  {
    lead: "A text description",
    body: "of what it does, which theme it fits, and which institution and workflow it serves. Around 300 words.",
  },
  {
    lead: "ARCHITECTURE.md — one page.",
    body: "Agent shape, MCP servers built versus borrowed, and why.",
  },
  {
    lead: "EVALS.md — eight or more test tasks",
    body: "with pass and fail results, plus one failure you did not fix and what you would try next.",
  },
];

/**
 * Requirements — the two eligibility lists, verbatim and unmissable.
 */
export function Requirements() {
  return (
    <section id="requirements" className="scroll-mt-20 bg-paper">
      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Reveal>
              <Eyebrow>Requirements</Eyebrow>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="mt-4 max-w-2xl font-display text-[34px] font-black leading-[1.06] tracking-[-0.025em] text-ink-950 sm:text-[44px]">
                Two lists. Every line. No exceptions.
              </h2>
            </Reveal>
          </div>
          <Reveal delay={0.12}>
            <p className="flex max-w-sm items-start gap-2.5 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3.5 text-[13.5px] font-semibold leading-snug text-brand-800">
              <TriangleAlert className="mt-0.5 h-4.5 w-4.5 shrink-0 text-brand-600" aria-hidden="true" />
              Projects missing any item in either list are ineligible for prizes.
            </p>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {/* What to build */}
          <Reveal className="h-full">
            <article className="flex h-full flex-col rounded-3xl border border-ink-100 bg-white p-6 shadow-[0_20px_50px_rgba(11,12,15,0.06)] sm:p-8">
              <header className="flex items-center gap-4 border-b border-ink-100 pb-5">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink-950">
                  <Hammer className="h-5.5 w-5.5 text-brand-400" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-code text-[10px] font-semibold tracking-[0.26em] text-ink-500">
                    LIST 01
                  </p>
                  <h3 className="font-display text-[22px] font-extrabold tracking-tight text-ink-950">
                    What to build
                  </h3>
                </div>
                <span className="ml-auto font-code text-[11px] font-semibold text-ink-400 tabular">
                  6 ITEMS
                </span>
              </header>
              <ol className="mt-2 divide-y divide-ink-100">
                {BUILD.map((item, i) => (
                  <li key={item.lead} className="flex gap-4 py-4">
                    <span className="mt-0.5 grid h-7 w-9 shrink-0 place-items-center rounded-lg bg-sand font-code text-[11px] font-bold text-brand-700">
                      B{i + 1}
                    </span>
                    <p className="text-[14.5px] leading-relaxed text-ink-600">
                      <span className="font-semibold text-ink-950">{item.lead}</span>{" "}
                      {item.body}
                    </p>
                  </li>
                ))}
              </ol>
            </article>
          </Reveal>

          {/* What to submit */}
          <Reveal delay={0.1} className="h-full">
            <article className="flex h-full flex-col rounded-3xl border border-ink-100 bg-white p-6 shadow-[0_20px_50px_rgba(11,12,15,0.06)] sm:p-8">
              <header className="flex items-center gap-4 border-b border-ink-100 pb-5">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-600">
                  <PackageCheck className="h-5.5 w-5.5 text-white" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-code text-[10px] font-semibold tracking-[0.26em] text-ink-500">
                    LIST 02
                  </p>
                  <h3 className="font-display text-[22px] font-extrabold tracking-tight text-ink-950">
                    What to submit
                  </h3>
                </div>
                <span className="ml-auto font-code text-[11px] font-semibold text-ink-400 tabular">
                  5 ITEMS
                </span>
              </header>
              <ol className="mt-2 divide-y divide-ink-100">
                {SUBMIT.map((item, i) => (
                  <li key={item.lead} className="flex gap-4 py-4">
                    <span className="mt-0.5 grid h-7 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 font-code text-[11px] font-bold text-brand-700">
                      S{i + 1}
                    </span>
                    <p className="text-[14.5px] leading-relaxed text-ink-600">
                      <span className="font-semibold text-ink-950">{item.lead}</span>{" "}
                      {item.body}
                    </p>
                  </li>
                ))}
              </ol>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
