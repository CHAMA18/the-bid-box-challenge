const SPRINT_DAYS = [
  {
    label: "DAY 01 • OCT 9",
    labelColor: "text-primary",
    title: "Kickoff & Ingestion",
    body: "Repository bootstrap, theme selection, and local OCDS 1.1 JSON parsing pipeline setup.",
    highlight: false,
  },
  {
    label: "DAYS 02-03 • OCT 10-11",
    labelColor: "text-secondary",
    title: "MCP Tooling",
    body: "Author 3 custom MCP tools + integrate external server. Implement the human-in-the-loop stop gate.",
    highlight: false,
  },
  {
    label: "DAYS 04-05 • OCT 12-13",
    labelColor: "text-tertiary",
    title: "Stress-Test & EVALS",
    body: "Execute EVALS.md with 8+ adversarial test tasks. Run benchmarks against open-weights models.",
    highlight: false,
  },
  {
    label: "DAY 06 • OCT 14",
    labelColor: "text-primary",
    title: "Audit Polish & Video",
    body: (
      <>
        Record unedited &lt;3-min demonstration video. Verify 1-command startup script (
        <code className="text-primary font-code">make run</code>).
      </>
    ),
    highlight: false,
  },
  {
    label: "DAY 07 • OCT 15",
    labelColor: "text-tertiary",
    title: "Final Submission",
    body: "Hard freeze at 23:59 EAT. Repositories locked for Stage 1 evaluation review.",
    highlight: true,
  },
];

export function TimelineSection() {
  return (
    <section className="w-full px-gutter py-space-xl bg-surface-container-low">
      <div className="max-w-7xl mx-auto flex flex-col gap-space-lg">
        <div className="flex flex-col gap-1 max-w-2xl">
          <span className="font-code text-label-telemetry text-tertiary uppercase tracking-wider">
            Sprint Velocity
          </span>
          <h2 className="font-display text-headline-lg text-on-surface">7-Day Execution Schedule</h2>
          <p className="font-body text-body-md text-on-surface-variant">
            From repo initialization to live defense before the ministerial panel.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-space-sm">
          {SPRINT_DAYS.map((day) => (
            <div
              key={day.label}
              className={`p-space-md rounded-bb flex flex-col gap-space-xs ${
                day.highlight ? "bg-surface-container-highest shadow-md" : "bg-surface-container"
              }`}
            >
              <span className={`font-code text-label-telemetry font-bold ${day.labelColor}`}>
                {day.label}
              </span>
              <h4 className="font-display text-headline-sm text-on-surface">{day.title}</h4>
              <p className="font-body text-body-sm text-on-surface-variant">{day.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
