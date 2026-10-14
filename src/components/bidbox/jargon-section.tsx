import { Bot, Braces, Hand, LockOpen, Network, ReceiptText } from "lucide-react";

const TERMS = [
  {
    icon: Network,
    iconColor: "text-primary",
    term: "MCP (Model Context Protocol)",
    definition:
      "An open specification developed to expose structured client-side and server-side tools, resources, and evaluation prompts to foundation models without brittle custom APIs.",
  },
  {
    icon: Bot,
    iconColor: "text-secondary",
    term: "Agentic AI (Not a Chatbot)",
    definition:
      "A software system that formulates a dynamic multi-step plan, calls deterministic external tools, analyzes execution feedback, checks its own work, and handles edge failures autonomously.",
  },
  {
    icon: Braces,
    iconColor: "text-tertiary",
    term: "OCDS Standard",
    definition:
      "Open Contracting Data Standard: the global open JSON schema used by 9 African sovereign procurement portals covering planning, tenders, awards, contracts, and implementation.",
  },
  {
    icon: ReceiptText,
    iconColor: "text-primary",
    term: "Tender vs. Bid",
    definition: (
      <>
        A <em>tender</em> is the public institution&apos;s solicitation of goods or civil works. A{" "}
        <em>bid</em> is an individual supplier&apos;s submitted commercial and technical proposition.
      </>
    ),
  },
  {
    icon: LockOpen,
    iconColor: "text-secondary",
    term: "Open-Weights Models",
    definition:
      "Downloadable foundation model weights (Qwen 2.5, Llama 3, Gemma, Mistral, Aya) deployable on sovereign African cloud or on-prem servers to maintain complete citizen data privacy.",
  },
  {
    icon: Hand,
    iconColor: "text-tertiary",
    term: "Human-in-the-Loop Gate",
    definition:
      "A non-bypassable programmatic pause where the autonomous agent halts before consequential milestones, presenting structured evidentiary diffs for human sign-off.",
  },
];

export function JargonSection() {
  return (
    <section className="w-full px-gutter py-space-xl bg-surface-container-lowest">
      <div className="max-w-7xl mx-auto flex flex-col gap-space-lg">
        <div className="flex flex-col gap-1 max-w-2xl">
          <span className="font-code text-label-telemetry text-secondary uppercase tracking-wider">
            Precise Terminology
          </span>
          <h2 className="font-display text-headline-lg text-on-surface">Jargon Defined Up Front</h2>
          <p className="font-body text-body-md text-on-surface-variant">
            Strict definitions enforced throughout the technical review. Misrepresenting these
            boundaries in your submission will penalize your architectural score.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
          {TERMS.map((item) => (
            <div key={item.term} className="p-space-md rounded-bb bg-surface-container-low flex flex-col gap-space-xs">
              <div className={`flex items-center gap-space-xs ${item.iconColor}`}>
                <item.icon className="size-[20px] shrink-0" aria-hidden="true" />
                <span className="font-code text-label-code font-bold">{item.term}</span>
              </div>
              <p className="font-body text-body-sm text-on-surface-variant">{item.definition}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
