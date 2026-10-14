const RUBRIC_ROWS = [
  {
    dimension: "Agentic Depth & MCP Craft",
    subtitle: "Autonomous tool invocation, non-trivial schemas, drafting abilities",
    weight: "30 pts",
    weightColor: "text-primary",
    standard:
      "Evaluates whether the agent plans multi-step trajectories, invokes custom + external MCP tools intelligently, and recovers from schema malformations.",
    bandColor: "text-primary",
  },
  {
    dimension: "Open-Source Rigour",
    subtitle: "Sovereign open-weights model, 1-command startup, clean architecture",
    weight: "20 pts",
    weightColor: "text-secondary",
    standard:
      "Full functionality running against open-weights models (Qwen, Llama 3, etc.) on self-hosted instances with pristine reproducibility.",
    bandColor: "text-secondary",
  },
  {
    dimension: "Fit to Tender Lifecycle",
    subtitle: "Adherence to real statutory procurement stages (OCDS 1.1)",
    weight: "20 pts",
    weightColor: "text-tertiary",
    standard:
      "Real understanding of African procurement thresholds, bidder eligibility checks, bill of quantities (BOQ) validation, and statutory timelines.",
    bandColor: "text-tertiary",
  },
  {
    dimension: "Evaluation & Reliability (EVALS.md)",
    subtitle: "8+ systematic tests + 1 honest analyzed failure",
    weight: "15 pts",
    weightColor: "text-primary",
    standard:
      "Rigour of automated test scenarios against synthetic adversarial bids, pricing anomalies, and honest documentation of agent blindspots.",
    bandColor: "text-primary",
  },
  {
    dimension: "Defensibility & Audit Trail",
    subtitle: "Document citations, no unsourced claims, human gate",
    weight: "10 pts",
    weightColor: "text-secondary",
    standard:
      "Zero hallucinations permitted. Every flag or recommendation cites page number, release hash, and statute clause with forced human signoff.",
    bandColor: "text-secondary",
  },
  {
    dimension: "Demo Quality & Presentation",
    subtitle: "Concise <3 min video, clear telemetry display",
    weight: "5 pts",
    weightColor: "text-outline",
    standard:
      "Paced, intelligible walkthrough highlighting technical execution rather than commercial marketing fluff.",
    bandColor: "text-outline",
  },
];

export function RubricSection() {
  return (
    <section className="w-full px-gutter py-space-xl bg-surface-container-lowest" id="judging-rubric">
      <div className="max-w-7xl mx-auto flex flex-col gap-space-lg">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
          <div className="flex flex-col gap-1 max-w-2xl">
            <span className="font-code text-label-telemetry text-tertiary uppercase tracking-wider">
              Evaluation Framework
            </span>
            <h2 className="font-display text-headline-lg text-on-surface">Judging Rubric (100 Points)</h2>
            <p className="font-body text-body-md text-on-surface-variant">
              Submissions are scrutinized by a Pan-African jury of senior procurement regulators,
              distributed systems engineers, and open-source civic technologists.
            </p>
          </div>
          <div className="p-space-sm rounded-bb bg-surface-container-high flex items-center gap-space-sm">
            <span className="font-display text-headline-lg text-primary leading-none">100</span>
            <div className="flex flex-col">
              <span className="font-code text-label-telemetry text-on-surface uppercase">MAXIMUM SCORE</span>
              <span className="font-body text-body-sm text-on-surface-variant">
                Stage 1 + Stage 2 Combined
              </span>
            </div>
          </div>
        </div>

        {/* Rubric Table */}
        <div className="w-full overflow-hidden rounded-bb-xl bg-surface-container shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body text-body-sm">
              <thead className="bg-surface-container-high text-on-surface font-code text-label-telemetry uppercase tracking-wider">
                <tr>
                  <th className="p-space-md">Assessment Dimension</th>
                  <th className="p-space-md">Weight</th>
                  <th className="p-space-md">Technical Verification Standard</th>
                  <th className="p-space-md text-right">Scoring Band</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-highest/20 text-on-surface">
                {RUBRIC_ROWS.map((row) => (
                  <tr key={row.dimension} className="hover:bg-surface-container-high/40 transition-colors">
                    <td className="p-space-md">
                      <div className="flex flex-col">
                        <span className="font-bold text-on-surface">{row.dimension}</span>
                        <span className="font-body text-on-surface-variant">{row.subtitle}</span>
                      </div>
                    </td>
                    <td className={`p-space-md font-code text-label-code font-bold ${row.weightColor}`}>
                      {row.weight}
                    </td>
                    <td className="p-space-md text-on-surface-variant font-body">{row.standard}</td>
                    <td className={`p-space-md text-right font-code text-label-telemetry ${row.bandColor}`}>
                      0 — {parseInt(row.weight, 10)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* The Two-Stage Evaluation Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md pt-space-xs">
          <div className="p-space-md rounded-bb bg-surface-container-low flex flex-col gap-space-xs">
            <div className="flex items-center gap-space-xs">
              <span className="w-7 h-7 rounded-bb bg-surface-container-high flex items-center justify-center font-code text-label-code text-primary font-bold">
                1
              </span>
              <span className="font-code text-label-telemetry text-primary uppercase">
                Stage 1: Written Dossier Audit
              </span>
            </div>
            <p className="font-body text-body-sm text-on-surface-variant">
              Technical review committee clones all eligible repositories, checks the 1-command startup,
              inspects MCP schemas, and scores EVALS.md across standard OCDS benchmarks.
            </p>
          </div>
          <div className="p-space-md rounded-bb bg-surface-container-low flex flex-col gap-space-xs">
            <div className="flex items-center gap-space-xs">
              <span className="w-7 h-7 rounded-bb bg-surface-container-high flex items-center justify-center font-code text-label-code text-secondary font-bold">
                2
              </span>
              <span className="font-code text-label-telemetry text-secondary uppercase">
                Stage 2: Live 20-Min Technical Defense
              </span>
            </div>
            <p className="font-body text-body-sm text-on-surface-variant">
              The top 20 finalists are summoned to a live defense. The jury injects a{" "}
              <strong>surprise adversarial tender scenario</strong> live on camera to test the
              agent&apos;s real-time recovery.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
