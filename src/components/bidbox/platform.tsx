import { Database } from "lucide-react";
import { Eyebrow, Reveal } from "@/components/bidbox/reveal";

const CONCEPTS = [
  {
    term: "MCP",
    full: "Model Context Protocol",
    body: "An open standard for exposing tools to an AI model. Bid Box runs a small server; any agent can call its tools.",
  },
  {
    term: "AGENTIC",
    full: null,
    body: "Plans a multi-step task, calls tools, checks itself, recovers from failure. Not a chatbot.",
  },
  {
    term: "OCDS",
    full: "Open Contracting Data Standard",
    body: "The shared JSON schema every procurement portal below publishes in.",
  },
  {
    term: "TENDER / BID",
    full: null,
    body: "A public invitation to supply something; a bid is one supplier's response.",
  },
  {
    term: "OPEN-WEIGHTS",
    full: null,
    body: "A model you can download and run yourself. Qwen, Llama, Gemma, Mistral, Aya.",
  },
  {
    term: "HUMAN IN THE LOOP",
    full: null,
    body: "The agent pauses, and a named person approves before anything consequential.",
  },
];

const PORTALS = [
  { name: "NOCOPO", country: "Nigeria" },
  { name: "GPP", country: "Uganda" },
  { name: "PPIP", country: "Kenya" },
  { name: "Umucyo", country: "Rwanda" },
];

/**
 * Platform — the concepts under the hood, plus the OCDS portals
 * the data comes from.
 */
export function Platform() {
  return (
    <section id="platform" className="scroll-mt-20 border-y border-ink-100 bg-sand/60">
      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Reveal>
              <Eyebrow>Under the hood</Eyebrow>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="mt-4 max-w-2xl font-display text-[34px] font-black leading-[1.06] tracking-[-0.025em] text-ink-950 sm:text-[44px]">
                Say it once. Mean it everywhere.
              </h2>
            </Reveal>
          </div>
          <Reveal delay={0.12}>
            <p className="max-w-sm text-[15px] leading-relaxed text-ink-500">
              No buzzword soup: these are the words behind every finding, so the report reads the
              same to auditors, suppliers and citizens.
            </p>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CONCEPTS.map((t, i) => (
            <Reveal key={t.term} delay={0.06 * (i % 3)} className="h-full">
              <article className="flex h-full flex-col rounded-2xl border border-ink-100 bg-white p-6 transition-all duration-300 hover:border-brand-300 hover:shadow-[0_16px_36px_rgba(11,12,15,0.08)]">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="font-code text-[15px] font-bold tracking-[0.08em] text-brand-700">{t.term}</h3>
                  {t.full && (
                    <span className="text-[12px] font-medium text-ink-400">— {t.full}</span>
                  )}
                </div>
                <p className="mt-3 text-[14.5px] leading-relaxed text-ink-700">{t.body}</p>
              </article>
            </Reveal>
          ))}
        </div>

        {/* OCDS portals strip */}
        <Reveal delay={0.1}>
          <div className="mt-10 flex flex-col gap-5 rounded-3xl border border-ink-100 bg-white p-6 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink-950">
                <Database className="h-5 w-5 text-brand-400" aria-hidden="true" />
              </span>
              <div>
                <p className="font-code text-[10px] font-semibold tracking-[0.24em] text-ink-500">
                  PUBLISHING IN OCDS TODAY — WHERE THE DATA COMES FROM
                </p>
                <p className="mt-1.5 max-w-md text-[13.5px] leading-relaxed text-ink-600">
                  National e-procurement portals, open by default. Notices, awards and contracts —
                  the JSON Bid Box reads.
                </p>
              </div>
            </div>
            <ul className="flex flex-wrap gap-2.5" aria-label="Procurement portals publishing in OCDS">
              {PORTALS.map((p) => (
                <li
                  key={p.name}
                  className="inline-flex items-baseline gap-2 rounded-full border border-ink-100 bg-paper px-4 py-2"
                >
                  <span className="font-code text-[12px] font-bold tracking-[0.1em] text-ink-950">{p.name}</span>
                  <span className="text-[11.5px] text-ink-500">{p.country}</span>
                </li>
              ))}
              <li className="inline-flex items-center rounded-full border border-dashed border-ink-200 px-4 py-2">
                <span className="text-[11.5px] text-ink-400">+ every portal that speaks OCDS</span>
              </li>
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
