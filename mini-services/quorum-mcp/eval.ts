/**
 * Offline evaluation of the deterministic review path.
 *
 * For every tender pack it runs the same functions the review graph uses
 * (buildPack → flagPack → verifyFinding), scores the findings against the
 * hand-written labels in data/eval/gold.json, repeats the run to measure
 * variation, and writes data/eval/report.json.
 *
 * Two scores are reported. "original" uses only labels written before the
 * engine was first run. "adjudicated" also counts labels marked postHoc,
 * which were added after reading the engine's unlabelled output.
 *
 * Not covered here: the LLM redline stage and the human gate. Neither runs in
 * this loop, so this measures the rule path only.
 *
 * Usage: bun eval.ts [--runs 5]
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPack, flagPack, runRules, TENDERS_DIR, verifyFinding } from "./engine";
import type { Finding } from "./store";

interface GoldItem {
  rule: string;
  file: string;
  match: string;
  covered: boolean;
  note: string;
  postHoc?: boolean;
}

interface Gold {
  labeller: string;
  covered_means: string;
  tenders: Record<string, GoldItem[]>;
  heldOut: string[];
  heldOutNote: string;
  data_quality_notes: string[];
}

const EVAL_DIR = fileURLToPath(new URL("./data/eval/", import.meta.url));
const runsFlag = process.argv.indexOf("--runs");
const RUNS = runsFlag >= 0 ? Number(process.argv[runsFlag + 1]) : 5;
/* runRules() truncates its output at this many findings. Hitting it means findings may be silently dropped. */
const RULE_CAP = 6;

async function runOnce(tenderId: string) {
  const dir = join(TENDERS_DIR, tenderId);
  const files = (await readdir(dir)).filter((f) => /\.(md|json)$/.test(f)).sort();
  const sources: Record<string, string> = {};
  for (const f of files) sources[f] = await readFile(join(dir, f), "utf8");

  const started = performance.now();
  const pack = buildPack(files, sources);
  const { kept, rejected } = flagPack(pack, files);
  const findings = kept.filter((f) => verifyFinding(f, sources));
  const ms = performance.now() - started;

  return {
    findings,
    ms,
    rejectedCount: rejected.length,
    droppedBySelfCheck: kept.length - findings.length,
    ruleCapHit: runRules(pack.bids, "", "").length >= RULE_CAP,
  };
}

/* A bid file's bidder name, as the engine writes it in finding items: "02-bid-mediqueast.md" → "mediqueast". */
function bidderKey(file: string): string {
  return file.replace(/^\d+-bid-/, "").replace(/\.md$/, "").replace(/-/g, " ").toLowerCase();
}

/* A finding matches a label when the rule agrees, it names the bid (directly or via the bidder), and the anchor text appears. */
function matches(f: Finding, g: GoldItem): boolean {
  if (f.rule !== g.rule) return false;
  const item = f.item.toLowerCase();
  const named = f.citation.includes(g.file) || (g.file.includes("-bid-") && item.includes(bidderKey(g.file)));
  return named && `${f.item} ${f.evidence}`.toLowerCase().includes(g.match.toLowerCase());
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const gold: Gold = JSON.parse(await readFile(join(EVAL_DIR, "gold.json"), "utf8"));
const tenderIds = Object.keys(gold.tenders).sort();

/* Scores one variant. "original" ignores postHoc labels, so a post-hoc match counts as unlabelled. */
function score(variant: "original" | "adjudicated", ids: string[] = tenderIds) {
  let goldTotal = 0;
  let coveredTotal = 0;
  let goldHits = 0;
  let coveredHits = 0;
  let findingsTotal = 0;
  let findingsMatched = 0;
  const per: Record<string, { missed: GoldItem[]; unlabelled: Finding[]; goldHit: number; gold: number }> = {};
  for (const id of ids) {
    const gl = gold.tenders[id].filter((g) => variant === "adjudicated" || !g.postHoc);
    const f = results[id].findings;
    const hits = gl.map((g) => f.some((x) => matches(x, g)));
    const unlabelled = f.filter((x) => !gl.some((g) => matches(x, g)));
    goldTotal += gl.length;
    coveredTotal += gl.filter((g) => g.covered).length;
    goldHits += hits.filter(Boolean).length;
    coveredHits += gl.filter((g, i) => g.covered && hits[i]).length;
    findingsTotal += f.length;
    findingsMatched += f.length - unlabelled.length;
    per[id] = {
      missed: gl.filter((_, i) => !hits[i]),
      unlabelled,
      goldHit: hits.filter(Boolean).length,
      gold: gl.length,
    };
  }
  return {
    per,
    summary: {
      goldLabels: goldTotal,
      coveredLabels: coveredTotal,
      recallCovered: coveredTotal ? Math.round((coveredHits / coveredTotal) * 1000) / 10 : null,
      recallAll: goldTotal ? Math.round((goldHits / goldTotal) * 1000) / 10 : null,
      precision: findingsTotal ? Math.round((findingsMatched / findingsTotal) * 1000) / 10 : null,
      findingsTotal,
      findingsUnlabelled: findingsTotal - findingsMatched,
    },
  };
}

/* Run once per tender, then repeat to measure variation. */
const results: Record<string, Awaited<ReturnType<typeof runOnce>> & { identical: boolean; medianMs: number }> = {};
for (const tenderId of tenderIds) {
  const first = await runOnce(tenderId);
  const serial = JSON.stringify(first.findings);
  const timings = [first.ms];
  let identical = true;
  for (let i = 1; i < RUNS; i++) {
    const again = await runOnce(tenderId);
    timings.push(again.ms);
    if (JSON.stringify(again.findings) !== serial) identical = false;
  }
  results[tenderId] = { ...first, identical, medianMs: Math.round(median(timings) * 100) / 100 };
}

const original = score("original");
const adjudicated = score("adjudicated");
const identicalRuns = tenderIds.filter((id) => results[id].identical).length;

const summary = {
  runsPerTender: RUNS,
  tenders: tenderIds.length,
  original: original.summary,
  adjudicated: adjudicated.summary,
  identicalAcrossRuns: `${identicalRuns}/${tenderIds.length} tenders`,
  llmCallsPerRun: 0,
  heldOut: {
    tenders: gold.heldOut,
    labelsWrittenBeforeRun: true,
    original: score("original", gold.heldOut).summary,
  },
};

const tenders = tenderIds.map((id) => {
  const r = results[id];
  const a = adjudicated.per[id];
  return {
    tender: id,
    findings: r.findings.length,
    gold: a.gold,
    goldHit: a.goldHit,
    missed: a.missed.map((g) => ({ rule: g.rule, file: g.file, match: g.match, covered: g.covered, postHoc: !!g.postHoc, note: g.note })),
    unlabelled: a.unlabelled.map((f) => ({ rule: f.rule, item: f.item, citation: f.citation, evidence: f.evidence })),
    rejectedUncited: r.rejectedCount,
    droppedBySelfCheck: r.droppedBySelfCheck,
    ruleCapHit: r.ruleCapHit,
    identicalAcrossRuns: r.identical,
    medianMs: r.medianMs,
  };
});

const report = {
  generatedAt: new Date().toISOString(),
  labeller: gold.labeller,
  covered_means: gold.covered_means,
  summary,
  tenders,
  data_quality_notes: gold.data_quality_notes,
};

await writeFile(join(EVAL_DIR, "report.json"), JSON.stringify(report, null, 2) + "\n");

console.log(JSON.stringify(summary, null, 2));
for (const t of tenders) {
  console.log(
    `${t.tender}: findings=${t.findings} gold=${t.goldHit}/${t.gold} unlabelled=${t.unlabelled.length} missed=${t.missed.length} identical=${t.identicalAcrossRuns} ms=${t.medianMs}`,
  );
}
