/**
 * quorum-mcp engine — third-party MCP client, open-weights model call,
 * the five tools, and the two LangGraph.js state machines that drive them.
 */

import { join } from "node:path";
import { readdir } from "node:fs/promises";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { appendLog, shaOf, type Draft, type Finding, type Gate, type Requirement, type Run } from "./store";

export const TENDERS_DIR = new URL("./data/tenders/", import.meta.url).pathname;

/* ── 1. Third-party MCP server we did NOT write ────────────────────────────
   @modelcontextprotocol/server-filesystem (official). Why not hand-roll it:
   sandboxed path-jail, battle-tested fs ops, maintained by the MCP core team. */

interface FsClient {
  callTool(a: { name: string; arguments: Record<string, unknown> }): Promise<{ content?: { text?: string }[] }>;
  listTools(): Promise<{ tools: { name: string }[] }>;
}

export const fsMcp: { status: "connecting" | "connected" | "fallback"; tools: string[]; client: FsClient | null; transport: unknown } = {
  status: "connecting",
  tools: [],
  client: null,
  transport: null,
};

export async function initFsMcp() {
  try {
    const [{ Client }, { StdioClientTransport }] = await Promise.all([
      import("@modelcontextprotocol/sdk/client/index.js"),
      import("@modelcontextprotocol/sdk/client/stdio.js"),
    ]);
    const transport = new StdioClientTransport({
      command: "bun",
      args: ["x", "@modelcontextprotocol/server-filesystem", TENDERS_DIR],
    });
    const client = new Client({ name: "quorum-mcp", version: "1.0.0" });
    await Promise.race([
      (async () => {
        await client.connect(transport);
        const listed = await client.listTools();
        fsMcp.tools = listed.tools.map((t) => t.name);
      })(),
      new Promise((_, rej) => setTimeout(() => rej(new Error("fs-mcp connect timeout")), 15_000)),
    ]);
    fsMcp.client = client as unknown as FsClient;
    fsMcp.transport = transport;
    fsMcp.status = "connected";
    console.log(`[fs-mcp] connected · tools: ${fsMcp.tools.join(", ")}`);
  } catch (err) {
    fsMcp.status = "fallback";
    fsMcp.client = null;
    console.log(`[fs-mcp] unavailable (${(err as Error).message}) — direct-fs fallback engaged`);
  }
}

async function readTenderFile(rel: string, runId: string): Promise<string> {
  const t0 = performance.now();
  if (fsMcp.client) {
    for (const name of ["read_text_file", "read_file"]) {
      if (!fsMcp.tools.includes(name)) continue;
      try {
        const res = await fsMcp.client.callTool({ name, arguments: { path: join(TENDERS_DIR, rel) } });
        const text = res.content?.map((c) => c.text ?? "").join("\n") ?? "";
        appendLog({
          actor: "quorum-agent",
          server: "@modelcontextprotocol/server-filesystem",
          tool: name,
          kind: "READ",
          runId,
          inputs: { path: rel },
          outputs: { bytes: text.length, excerpt: text.slice(0, 120) },
          status: "OK",
          durationMs: Math.round(performance.now() - t0),
        });
        return text;
      } catch {
        /* try next tool name, then fall back */
      }
    }
  }
  const text = await Bun.file(join(TENDERS_DIR, rel)).text();
  appendLog({
    actor: "quorum-agent",
    server: fsMcp.status === "fallback" ? "fs-direct (server-filesystem offline)" : "fs-direct",
    tool: "read_file",
    kind: "READ",
    runId,
    inputs: { path: rel },
    outputs: { bytes: text.length, excerpt: text.slice(0, 120) },
    status: "OK",
    durationMs: Math.round(performance.now() - t0),
  });
  return text;
}

/* ── 2. Open-weights model call (GLM via in-region inference) ──────────────
   Procurement data cannot leave the jurisdiction — the drafting tool calls an
   open-weights model rather than a closed frontier endpoint. */

let zai: { chat: { completions: { create(a: unknown): Promise<ChatCompletion> } } } | null = null;
interface ChatCompletion {
  model?: string;
  choices?: { message?: { content?: string } }[];
}

async function getZai() {
  if (!zai) {
    const mod = await import("z-ai-web-dev-sdk");
    const ZAI = (mod as { default: { create(): Promise<unknown> } }).default;
    zai = (await ZAI.create()) as typeof zai;
  }
  return zai;
}

async function llmDraft(original: string, anomaly: string, runId: string): Promise<Draft> {
  const t0 = performance.now();
  let model = "glm (open weights)";
  let proposed = `Insert: "The Buyer reserves the right to seek written clarification of ${anomaly} prior to award, and to disqualify bids left unclarified after five (5) working days."`;
  let rationale = `Template guard added in-region: ${anomaly}.`;
  try {
    const z = await getZai();
    const completion = await z.chat.completions.create({
      messages: [
        {
          role: "assistant",
          content:
            'You are a public-procurement review officer. Given a flagged evidence line and the anomaly, write the text of ONE new clarifying clause the review committee could adopt before award. Do NOT repeat or echo the evidence. Reply with STRICT JSON only: {"proposed":"...","rationale":"..."} — no markdown, no extra keys.',
        },
        {
          role: "user",
          content: `EVIDENCE (do not echo):\n${original}\n\nANOMALY RULE:\n${anomaly}\n\nExample of the expected shape: {"proposed":"The Buyer reserves the right to seek written clarification of any line-item price exceeding the peer median by more than 100% prior to award; bids left unclarified after five (5) working days shall be disqualified.","rationale":"..."}\n\nDraft the redline now.`,
        },
      ],
      thinking: { type: "disabled" },
    });
    if (completion.model) model = completion.model;
    const raw = completion.choices?.[0]?.message?.content ?? "";
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      const parsed = JSON.parse(m[0]) as { proposed?: string; rationale?: string };
      if (parsed.proposed) proposed = parsed.proposed;
      if (parsed.rationale) rationale = parsed.rationale;
    }
  } catch (err) {
    model = "glm (unreachable — template fallback)";
    rationale = `LLM call failed (${(err as Error).message}); template guard applied so the run never stalls.`;
  }
  appendLog({
    actor: "quorum-agent",
    server: "open-weights · glm",
    tool: "draft_redline",
    kind: "WRITES",
    runId,
    inputs: { clause: original.slice(0, 200), anomaly },
    outputs: { proposed: proposed.slice(0, 260), rationale: rationale.slice(0, 200), model },
    status: "OK",
    durationMs: Math.round(performance.now() - t0),
  });
  return {
    id: `draft_${Math.random().toString(36).slice(2, 8)}`,
    findingId: "",
    original,
    proposed,
    rationale,
    model,
  };
}

/* ── 3. The five tools of the quorum-mcp server ──────────────────────────── */

export const TOOLS = [
  {
    name: "tender_documents_list",
    kind: "READ" as const,
    description: "List tender files for a reference via the official filesystem MCP server.",
    inputSchema: { type: "object", properties: { tenderId: { type: "string" } }, required: ["tenderId"] },
  },
  {
    name: "extract_requirements",
    kind: "READ" as const,
    description: "Parse SHALL/must clauses, budget and deadline from tender documents into structured requirements.",
    inputSchema: { type: "object", properties: { tenderId: { type: "string" } }, required: ["tenderId"] },
  },
  {
    name: "draft_redline",
    kind: "WRITES" as const,
    description: "DRAFTS a committee-ready redline for a flagged clause using an open-weights model. Writes a draft record.",
    inputSchema: {
      type: "object",
      properties: { clause: { type: "string" }, anomaly: { type: "string" } },
      required: ["clause", "anomaly"],
    },
  },
  {
    name: "flag_finding",
    kind: "WRITES" as const,
    description: "FLAGS a finding against a deterministic rule (price outlier, missing doc, spec deviation). Writes to the findings ledger.",
    inputSchema: {
      type: "object",
      properties: {
        rule: { type: "string" },
        severity: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
        item: { type: "string" },
        evidence: { type: "string" },
        citation: { type: "string" },
      },
      required: ["rule", "severity", "item", "evidence", "citation"],
    },
  },
  {
    name: "file_gate_submission",
    kind: "IRREVERSIBLE" as const,
    description:
      "FILES the award submission bundle. Irreversible: execution is BLOCKED until a named human approves at the gate. Returns gate_pending.",
    inputSchema: {
      type: "object",
      properties: {
        tenderId: { type: "string" },
        bundle: { type: "object", properties: { bidder: { type: "string" }, value: { type: "string" }, attachments: { type: "number" } } },
        required: ["tenderId", "bundle"],
      },
      required: ["tenderId", "bundle"],
    },
  },
] as const;

export async function listTenderDocs(tenderId: string, runId: string): Promise<string[]> {
  try {
    return (await readdir(join(TENDERS_DIR, tenderId))).sort();
  } catch {
    appendLog({
      actor: "quorum-agent",
      server: "quorum-mcp",
      tool: "tender_documents_list",
      kind: "READ",
      runId,
      inputs: { tenderId },
      outputs: { error: "tender directory not found" },
      status: "ERROR",
      durationMs: 0,
    });
    return [];
  }
}

function extractRequirements(text: string): Requirement[] {
  const out: Requirement[] = [];
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    const m = line.match(/(?:^|\s)(SHALL|must|MUST)\s+(.{24,}?)(?:\.|$)/);
    if (m) {
      out.push({ id: `REQ-${String(out.length + 1).padStart(2, "0")}`, clause: `${m[1]} ${m[2]}`.trim(), page: Math.floor(i / 38) + 1 });
    }
  });
  return out.slice(0, 12);
}

interface LineItem {
  bidder: string;
  item: string;
  qty: number;
  unit: number;
}

function parseBid(text: string, bidder: string): LineItem[] {
  const items: LineItem[] = [];
  for (const line of text.split("\n")) {
    const m = line.match(/^\|\s*([^|]+?)\s*\|\s*([\d,]+)\s*\|\s*KES\s*([\d,]+(?:\.\d+)?)\s*\|/);
    if (m) {
      items.push({
        bidder,
        item: m[1].trim(),
        qty: Number(m[2].replace(/,/g, "")),
        unit: Number(m[3].replace(/,/g, "")),
      });
    }
  }
  return items;
}

function runRules(bids: { bidder: string; text: string }[], notice: string): Finding[] {
  const findings: Finding[] = [];
  const all = bids.flatMap((b) => parseBid(b.text, b.bidder));
  const byItem = new Map<string, LineItem[]>();
  for (const li of all) {
    const key = li.item.split(" ").slice(0, 3).join(" ").toLowerCase();
    byItem.set(key, [...(byItem.get(key) ?? []), li]);
  }
  for (const [key, items] of byItem) {
    for (const li of items) {
      /* peer median — this bidder's own quote excluded, so a lone high bid stands out */
      const peers = items.filter((o) => o.bidder !== li.bidder).map((o) => o.unit).sort((a, b) => a - b);
      if (!peers.length) continue;
      const mid = Math.floor(peers.length / 2);
      const median = peers.length % 2 ? peers[mid] : (peers[mid - 1] + peers[mid]) / 2;
      if (median > 0 && li.unit > median * 2) {
        findings.push({
          id: "",
          rule: "R-PRICE-OUTLIER",
          severity: "HIGH",
          item: `${li.item} × ${li.qty} — ${li.bidder}`,
          evidence: `Unit price KES ${li.unit.toLocaleString()} vs peer median KES ${median.toLocaleString()} (${(li.unit / median).toFixed(1)}×) on line item "${key}".`,
          citation: `bid-${li.bidder.toLowerCase().replace(/[^a-z]+/g, "-")}.md, price schedule`,
        });
      }
    }
  }
  const requiredDocs = [...notice.matchAll(/^- \[REQUIRED\]\s*(.+)$/gm)].map((m) => m[1].trim().toLowerCase());
  for (const bid of bids) {
    for (const req of requiredDocs) {
      if (!bid.text.toLowerCase().includes(req.split(" ")[0])) {
        findings.push({
          id: "",
          rule: "R-DOC-MISSING",
          severity: "MEDIUM",
          item: `${bid.bidder} — ${req}`,
          evidence: `Tender notice lists "${req}" as REQUIRED; the bid does not reference it.`,
          citation: "01-tender-notice.md, eligibility checklist",
        });
      }
    }
  }
  for (const bid of bids) {
    for (const line of bid.text.split("\n")) {
      if (/^\s*no\s+(?:deviations?|alternative)/i.test(line)) continue;
      if (/(alternative offered|deviation requested|does not comply)/i.test(line)) {
        findings.push({
          id: "",
          rule: "R-SPEC-DEVIATION",
          severity: "HIGH",
          item: `${bid.bidder}`,
          evidence: line.trim().slice(0, 220),
          citation: `bid file — specifications matrix`,
        });
        break;
      }
    }
  }
  return findings.slice(0, 6);
}

/* ── 4. LangGraph.js — review graph (halts at the gate) ──────────────────── */

const ReviewState = Annotation.Root({
  runId: Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
  tenderId: Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
  bids: Annotation<{ bidder: string; text: string }[]>({ reducer: (_, b) => b, default: () => [] }),
  requirements: Annotation<Requirement[]>({ reducer: (_, b) => b, default: () => [] }),
  findings: Annotation<Finding[]>({ reducer: (_, b) => b, default: () => [] }),
  drafts: Annotation<Draft[]>({ reducer: (_, b) => b, default: () => [] }),
  gateId: Annotation<string | null>({ reducer: (_, b) => b, default: () => null }),
});

export interface EngineRefs {
  runs: Run[];
  gates: Gate[];
  save(): void;
  raiseGate(g: Gate): void;
}

let refs: EngineRefs;
export function bindEngine(r: EngineRefs) {
  refs = r;
}

function progress(runId: string, line: string) {
  const run = refs.runs.find((r) => r.id === runId);
  if (run) {
    run.progress.push(line);
    run.updatedAt = new Date().toISOString();
    refs.save();
  }
}

async function nodeLoadDocuments(s: typeof ReviewState.State) {
  progress(s.runId, "▸ tender_documents_list — via server-filesystem MCP");
  const files = await listTenderDocs(s.tenderId, s.runId);
  const bids: { bidder: string; text: string }[] = [];
  let notice = "";
  for (const f of files) {
    const text = await readTenderFile(`${s.tenderId}/${f}`, s.runId);
    if (f.startsWith("01-")) notice = text;
    else {
      const bidder = f.replace(/^\d+-bid-/, "").replace(/\.md$/, "").replace(/-/g, " ").toUpperCase();
      bids.push({ bidder, text });
    }
  }
  progress(s.runId, `▸ ${files.length} documents read · ${bids.length} bids parsed`);
  return { bids: bids, tenderId: s.tenderId };
}

async function nodeExtract(s: typeof ReviewState.State) {
  const t0 = performance.now();
  const noticeFile = (await listTenderDocs(s.tenderId, s.runId)).find((f) => f.startsWith("01-"));
  const notice = noticeFile ? await readTenderFile(`${s.tenderId}/${noticeFile}`, s.runId) : "";
  const requirements = extractRequirements(notice);
  appendLog({
    actor: "quorum-agent",
    server: "quorum-mcp",
    tool: "extract_requirements",
    kind: "READ",
    runId: s.runId,
    inputs: { tenderId: s.tenderId },
    outputs: { count: requirements.length, sample: requirements[0]?.clause },
    status: "OK",
    durationMs: Math.round(performance.now() - t0),
  });
  progress(s.runId, `▸ extract_requirements — ${requirements.length} SHALL/must clauses pinned`);
  return { requirements };
}

async function nodeFlag(s: typeof ReviewState.State) {
  const noticeFile = (await listTenderDocs(s.tenderId, s.runId)).find((f) => f.startsWith("01-"));
  const notice = noticeFile ? await readTenderFile(`${s.tenderId}/${noticeFile}`, s.runId) : "";
  const merged = runRules(s.bids, notice).map((f, i) => ({ ...f, id: `F-${String(i + 1).padStart(2, "0")}` }));
  for (const f of merged) {
    appendLog({
      actor: "quorum-agent",
      server: "quorum-mcp",
      tool: "flag_finding",
      kind: "WRITES",
      runId: s.runId,
      inputs: { rule: f.rule, item: f.item },
      outputs: { severity: f.severity, citation: f.citation },
      status: "OK",
      durationMs: 1,
    });
  }
  progress(s.runId, `▸ flag_finding — ${merged.length} findings flagged, each cited`);
  return { findings: merged };
}

async function nodeDraft(s: typeof ReviewState.State) {
  const top = s.findings.filter((f) => f.severity === "HIGH").slice(0, 2);
  const drafts: Draft[] = [];
  for (const f of top) {
    progress(s.runId, `▸ draft_redline — open-weights model drafting for ${f.rule}`);
    const d = await llmDraft(f.evidence, `${f.rule} on ${f.item}`, s.runId);
    drafts.push({ ...d, findingId: f.id });
  }
  progress(s.runId, `▸ ${drafts.length} redline drafts ready for committee`);
  return { drafts };
}

async function nodeGate(s: typeof ReviewState.State) {
  const t0 = performance.now();
  const gateId = `gate_${Math.random().toString(36).slice(2, 8)}`;
  const lead = s.bids[0]?.bidder ?? "bidder";
  const gate: Gate = {
    id: gateId,
    runId: s.runId,
    tenderId: s.tenderId,
    tool: "file_gate_submission",
    inputs: {
      bidder: lead,
      value: "KES 412,600,000",
      attachments: s.drafts.length + s.findings.length + 1,
      findings: s.findings.map((f) => f.id),
      drafts: s.drafts.map((d) => d.id),
    },
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };
  appendLog({
    actor: "quorum-agent",
    server: "quorum-mcp",
    tool: "file_gate_submission",
    kind: "IRREVERSIBLE",
    runId: s.runId,
    inputs: gate.inputs,
    outputs: { gate: gateId, note: "EXECUTION BLOCKED — named human required" },
    status: "PENDING_GATE",
    durationMs: Math.round(performance.now() - t0),
  });
  refs.raiseGate(gate);
  progress(s.runId, `⏸ human gate raised (${gateId}) — filing blocked until a named human signs`);
  return { gateId };
}

function buildReviewGraph() {
  const g = new StateGraph(ReviewState)
    .addNode("load_documents", nodeLoadDocuments)
    .addNode("extract_requirements", nodeExtract)
    .addNode("flag_findings", nodeFlag)
    .addNode("draft_redlines", nodeDraft)
    .addNode("propose_gate", nodeGate)
    .addEdge(START, "load_documents")
    .addEdge("load_documents", "extract_requirements")
    .addEdge("extract_requirements", "flag_findings")
    .addEdge("flag_findings", "draft_redlines")
    .addEdge("draft_redlines", "propose_gate")
    .addEdge("propose_gate", END);
  return g.compile();
}

let reviewGraph: ReturnType<typeof buildReviewGraph> | null = null;

export async function runReview(run: Run) {
  if (!reviewGraph) reviewGraph = buildReviewGraph();
  try {
    const out = (await reviewGraph.invoke({
      runId: run.id,
      tenderId: run.tenderId,
    })) as typeof ReviewState.State;
    run.requirements = out.requirements ?? [];
    run.findings = out.findings ?? [];
    run.drafts = out.drafts ?? [];
    run.gateId = out.gateId ?? undefined;
    run.status = "AWAITING_GATE";
    run.updatedAt = new Date().toISOString();
    progress(run.id, "✓ review graph complete — the graph itself stops at the gate");
  } catch (err) {
    run.status = "FAILED";
    run.error = (err as Error).message;
    run.updatedAt = new Date().toISOString();
    appendLog({
      actor: "orchestrator",
      server: "langgraph.js",
      tool: "review_run",
      kind: "READ",
      runId: run.id,
      inputs: { tenderId: run.tenderId },
      outputs: { error: (err as Error).message },
      status: "ERROR",
      durationMs: 0,
    });
  }
  refs.save();
}

/* ── 5. Filing graph — runs ONLY after a named human approves ────────────── */

const FileState = Annotation.Root({
  gateId: Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
  hash: Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
  receipt: Annotation<Gate["receipt"]>({ reducer: (_, b) => b, default: () => undefined }),
});

async function nodeSeal(s: typeof FileState.State) {
  const gate = refs.gates.find((g) => g.id === s.gateId);
  const hash = shaOf({ gate: gate?.inputs, approvedBy: gate?.approver, at: gate?.decidedAt });
  appendLog({
    actor: "quorum-mcp",
    server: "quorum-mcp",
    tool: "seal_bundle",
    kind: "READ",
    inputs: { gateId: s.gateId },
    outputs: { hash },
    status: "OK",
    durationMs: 1,
  });
  return { hash };
}

async function nodeTransmit(s: typeof FileState.State) {
  const gate = refs.gates.find((g) => g.id === s.gateId);
  const submissionId = `SUB-${Date.now().toString(36).toUpperCase()}`;
  const receipt = { submissionId, hash: s.hash, portal: "egp-portal (simulated)" };
  await Bun.write(
    new URL(`./data/submissions/${submissionId}.json`, import.meta.url).pathname,
    JSON.stringify({ gate, receipt }, null, 2)
  );
  appendLog({
    actor: "quorum-mcp",
    server: "quorum-mcp",
    tool: "file_gate_submission",
    kind: "IRREVERSIBLE",
    runId: gate?.runId,
    inputs: { gateId: s.gateId, approver: gate?.approver },
    outputs: receipt,
    status: "OK",
    durationMs: 3,
  });
  appendLog({
    actor: gate?.approver ?? "named human",
    server: "quorum-mcp",
    tool: "gate_decision",
    kind: "GATE_DECISION",
    runId: gate?.runId,
    inputs: { gateId: s.gateId, decision: "APPROVE", approver: gate?.approver, note: gate?.note },
    outputs: { receipt },
    status: "OK",
    durationMs: 0,
  });
  return { receipt };
}

function buildFilingGraph() {
  const g = new StateGraph(FileState)
    .addNode("seal_bundle", nodeSeal)
    .addNode("transmit_submission", nodeTransmit)
    .addEdge(START, "seal_bundle")
    .addEdge("seal_bundle", "transmit_submission")
    .addEdge("transmit_submission", END);
  return g.compile();
}

let filingGraph: ReturnType<typeof buildFilingGraph> | null = null;

export async function executeFiling(gateId: string): Promise<Gate["receipt"] | null> {
  if (!filingGraph) filingGraph = buildFilingGraph();
  const out = await filingGraph.invoke({ gateId });
  return out.receipt ?? null;
}
