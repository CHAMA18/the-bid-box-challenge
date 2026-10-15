import { state, toolLog, type Finding, type Gate } from "./store";

/**
 * GET /api/runs/:id/report — the sourced report as a downloadable Markdown file.
 *
 * Committee-facing and citations-first: every finding carries its source path
 * and evidence, drafts carry model attribution, and the human-gate decision is
 * part of the record. Content-Disposition: attachment so a browser click
 * downloads the file instead of navigating.
 */

function mdEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/`/g, "\\`").replace(/\n/g, " ");
}

function gateWord(g: Gate | undefined): string {
  if (!g) return "—";
  if (g.status === "EXECUTED") return `APPROVED by ${g.approver ?? "—"} → FILED (receipt ${g.receipt?.submissionId ?? "—"}, sha256 ${g.receipt?.hash ?? "—"})`;
  if (g.status === "APPROVED") return `APPROVED by ${g.approver ?? "—"} (filing in progress)`;
  if (g.status === "REJECTED") return `RETURNED by ${g.approver ?? "—"}${g.note ? ` — "${g.note}"` : ""}`;
  if (g.status === "PENDING") return `AWAITING NAMED SIGN-OFF (gate ${g.id})`;
  return g.status;
}

export function buildReport(runId: string): { filename: string; markdown: string } | null {
  const run = state.runs.find((r) => r.id === runId);
  if (!run) return null;

  const gate = state.gates.find((g) => g.runId === run.id);
  const audit = toolLog.filter((l) => l.runId === run.id);
  const lines: string[] = [];

  lines.push(`# Sourced report — tender ${run.tenderId}`);
  lines.push("");
  lines.push(`> Prepared by the quorum-agent (MCP tool registry, open-weights graphs).`);
  lines.push(`> The agent prepares the file; the committee awards the tender.`);
  lines.push("");
  lines.push("| Field | Value |");
  lines.push("| --- | --- |");
  lines.push(`| Run | ${run.id} |`);
  lines.push(`| Tender | ${run.tenderId} |`);
  lines.push(`| Status | ${run.status} |`);
  lines.push(`| Started | ${run.startedAt} |`);
  lines.push(`| Updated | ${run.updatedAt} |`);
  lines.push(`| Human gate | ${gateWord(gate)} |`);
  lines.push("");

  lines.push("## Review timeline");
  lines.push("");
  if (run.progress.length > 0) for (const step of run.progress) lines.push(`- ${step}`);
  else lines.push("_No progress recorded._");
  lines.push("");

  lines.push(`## Requirements pinned (${run.requirements.length})`);
  lines.push("");
  if (run.requirements.length > 0) {
    lines.push("| Req | Clause | Page |");
    lines.push("| --- | --- | --- |");
    for (const req of run.requirements) lines.push(`| ${req.id} | ${mdEscape(req.clause)} | ${req.page} |`);
  } else lines.push("_No SHALL/must clauses pinned._");
  lines.push("");

  lines.push(`## Findings (${run.findings.length}) — every claim cites its source`);
  lines.push("");
  if (run.findings.length > 0) {
    for (const f of run.findings) {
      lines.push(`### ${f.id} · ${f.rule} · ${f.severity}`);
      lines.push("");
      lines.push(`- **Issue:** ${f.item}`);
      lines.push(`- **Evidence:** ${f.evidence}`);
      lines.push(`- **Citation:** \`${f.citation}\``);
      const draft = run.drafts.find((d) => d.findingId === f.id);
      if (draft) {
        lines.push(`- **Original clause:** ${mdEscape(draft.original)}`);
        lines.push(`- **Proposed redline:** ${mdEscape(draft.proposed)}`);
        lines.push(`- **Rationale** (drafted by \`${draft.model}\`): ${mdEscape(draft.rationale)}`);
      }
      lines.push("");
    }
  } else lines.push("_No findings raised — the pack reviewed clean against the selected checks._");
  lines.push("");

  lines.push(`## Redline drafts (${run.drafts.length})`);
  lines.push("");
  if (run.drafts.length > 0) {
    for (const d of run.drafts) {
      lines.push(`### ${d.id} (finding ${d.findingId})`);
      lines.push("");
      lines.push(`- **Original:** ${mdEscape(d.original)}`);
      lines.push(`- **Proposed:** ${mdEscape(d.proposed)}`);
      lines.push(`- **Rationale:** ${mdEscape(d.rationale)}`);
      lines.push(`- **Model:** \`${d.model}\``);
      lines.push("");
    }
  } else lines.push("_No redlines drafted._");
  lines.push("");

  lines.push(`## Audit trail (${audit.length} logged calls for this run)`);
  lines.push("");
  if (audit.length > 0) {
    lines.push("| Time | Actor | Server | Tool | Kind | Status |");
    lines.push("| --- | --- | --- | --- | --- | --- |");
    for (const l of audit) {
      lines.push(
        `| ${l.ts} | ${mdEscape(l.actor)} | ${mdEscape(l.server)} | ${l.tool} | ${l.kind} | ${l.status} |`
      );
    }
  } else lines.push("_No audit entries reference this run._");
  lines.push("");

  lines.push("---");
  lines.push("");
  lines.push(
    `*Signed off per the standing rule: irreversible filing only after a named human approved (${
      gateWord(gate)
    }). Full ledger: tool-log.jsonl (append-only).*`
  );

  const filename = `quorum-report-${run.tenderId.replace(/[^A-Za-z0-9._-]+/g, "_")}-${run.id}.md`;
  return { filename, markdown: lines.join("\n") };
}

export function handleReportRequest(runId: string): Response {
  const report = buildReport(runId);
  if (!report) {
    return new Response(JSON.stringify({ error: "run not found" }), {
      status: 404,
      headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
    });
  }
  return new Response(report.markdown, {
    status: 200,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="${report.filename}"`,
      "access-control-allow-origin": "*",
    },
  });
}
