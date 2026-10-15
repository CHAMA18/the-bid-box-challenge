/**
 * quorum-mcp engine — third-party MCP client, open-weights model call,
 * the five tools, and the two LangGraph.js state machines that drive them.
 */

import { join } from "node:path";
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { appendLog, shaOf, type Draft, type Finding, type Gate, type Requirement, type Run } from "./store";

export const TENDERS_DIR = fileURLToPath(new URL("./data/tenders/", import.meta.url));

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

/* ── 2. Open-weights model call (Llama, served in-region) ──────────────────
   Procurement data cannot leave the jurisdiction. Llama runs on infrastructure
   we host, behind an OpenAI-compatible /chat/completions endpoint (vLLM, TGI,
   Ollama, …). Nothing is sent to a closed frontier API. */

export interface LlmConfig {
  baseUrl: string;
  model: string;
  apiKey?: string;
}

/* The one fetch signature the sidecar injects (tests pass fakes of this shape). */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

export function llmConfigFromEnv(env: Record<string, string | undefined> = process.env): LlmConfig | null {
  const baseUrl = env.LLM_BASE_URL?.trim();
  const model = env.LLM_MODEL?.trim();
  if (!baseUrl || !model) return null;
  return { baseUrl, model, apiKey: env.LLM_API_KEY?.trim() || undefined };
}

/* One chat completion from the in-region Llama endpoint. Throws on any failure; the caller falls back. */
export async function callLlama(
  cfg: LlmConfig,
  messages: ChatMessage[],
  fetchImpl: FetchLike = fetch,
): Promise<{ model: string; content: string }> {
  const res = await fetchImpl(`${cfg.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cfg.apiKey ? { authorization: `Bearer ${cfg.apiKey}` } : {}),
    },
    body: JSON.stringify({ model: cfg.model, messages, temperature: 0.2 }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`llm endpoint answered ${res.status}`);
  const data = (await res.json()) as { model?: string; choices?: { message?: { content?: string } }[] };
  return { model: data.model ?? cfg.model, content: data.choices?.[0]?.message?.content ?? "" };
}

async function llmDraft(original: string, anomaly: string, runId: string): Promise<Draft> {
  const t0 = performance.now();
  const cfg = llmConfigFromEnv();
  let model = cfg ? `llama (${cfg.model})` : "llama (not configured)";
  let proposed = `Insert: "The Buyer reserves the right to seek written clarification of ${anomaly} prior to award, and to disqualify bids left unclarified after five (5) working days."`;
  let rationale = `Template guard added in-region: ${anomaly}.`;
  try {
    if (!cfg) throw new Error("LLM_BASE_URL and LLM_MODEL are not set");
    const completion = await callLlama(cfg, [
        {
          role: "system",
          content:
            'You are a public-procurement review officer. Given a flagged evidence line and the anomaly, write the text of ONE new clarifying clause the review committee could adopt before award. Do NOT repeat or echo the evidence. Reply with STRICT JSON only: {"proposed":"...","rationale":"..."} — no markdown, no extra keys.',
        },
        {
          role: "user",
          content: `EVIDENCE (do not echo):\n${original}\n\nANOMALY RULE:\n${anomaly}\n\nExample of the expected shape: {"proposed":"The Buyer reserves the right to seek written clarification of any line-item price exceeding the peer median by more than 100% prior to award; bids left unclarified after five (5) working days shall be disqualified.","rationale":"..."}\n\nDraft the redline now.`,
        },
    ]);
    model = completion.model;
    const raw = completion.content;
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      const parsed = JSON.parse(m[0]) as { proposed?: string; rationale?: string };
      if (parsed.proposed) proposed = parsed.proposed;
      if (parsed.rationale) rationale = parsed.rationale;
    }
  } catch (err) {
    model = cfg ? `llama (${cfg.model}) · unreachable — template fallback` : "llama (not configured) — template fallback";
    rationale = `LLM call failed (${(err as Error).message}); template guard applied so the run never stalls.`;
  }
  appendLog({
    actor: "quorum-agent",
    server: "open-weights · llama",
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

export async function listTenderDocs(tenderId: string, runId?: string): Promise<string[]> {
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
  source: string;
}

/* A bid as read from one tender file. `source` is the real filename it came from — the citation. */
export interface BidDoc {
  bidder: string;
  text: string;
  source: string;
  /* OCDS only: the bid's value and where in the record it sits (e.g. "ocid …, bids.details[0].value"). */
  value?: number;
  currency?: string;
  ref?: string;
}

interface OcdsValue {
  amount?: number;
  currency?: string;
}

interface OcdsRelease {
  ocid?: string;
  tender?: {
    title?: string;
    description?: string;
    value?: OcdsValue;
    documents?: { title?: string; documentType?: string }[];
  };
  bids?: {
    details?: { tenderers?: { name?: string }[]; value?: OcdsValue; documents?: { title?: string }[] }[];
  };
  awards?: { suppliers?: { name?: string }[]; value?: OcdsValue }[];
}

export interface AwardDoc {
  supplier: string;
  value: number;
  currency?: string;
  ref: string;
}

/* Everything one OCDS release says about a tender, read from the record itself. */
export interface OcdsRecord {
  ocid: string;
  source: string;
  /* Notice text in the shape of a markdown notice (title, description, one REQUIRED line per
     eligibility document), so the same requirement rules apply to it. */
  notice: string;
  tenderValue?: { amount: number; currency?: string };
  bids: BidDoc[];
  awards: AwardDoc[];
}

function ocdsRelease(release: OcdsRelease, source: string): OcdsRecord {
  const ocid = release.ocid ?? "unknown";
  const bids: BidDoc[] = [];
  (release.bids?.details ?? []).forEach((d, i) => {
    const bidder = d.tenderers?.[0]?.name;
    if (!bidder) return;
    bids.push({
      bidder,
      text: (d.documents ?? []).map((doc) => doc.title ?? "").filter(Boolean).join("\n"),
      source,
      value: d.value?.amount,
      currency: d.value?.currency,
      ref: `ocid ${ocid}, bids.details[${i}].value`,
    });
  });
  const awards: AwardDoc[] = [];
  (release.awards ?? []).forEach((a, i) => {
    const supplier = a.suppliers?.[0]?.name;
    const amount = a.value?.amount;
    if (!supplier || amount === undefined) return;
    awards.push({ supplier, value: amount, currency: a.value?.currency, ref: `ocid ${ocid}, awards[${i}].value` });
  });
  /* OCDS documents typed eligibilityCriteria are the notice's REQUIRED documents. */
  const requiredDocs = (release.tender?.documents ?? []).flatMap((d) =>
    d.documentType === "eligibilityCriteria" && d.title ? [d.title] : [],
  );
  const notice = [
    release.tender?.title ?? "",
    release.tender?.description ?? "",
    ...requiredDocs.map((t) => `- [REQUIRED] ${t}`),
  ].join("\n");
  const tenderAmount = release.tender?.value?.amount;
  return {
    ocid,
    source,
    notice,
    tenderValue: tenderAmount === undefined ? undefined : { amount: tenderAmount, currency: release.tender?.value?.currency },
    bids,
    awards,
  };
}

/* OCDS 1.1 JSON → one record per release. Accepts a single release or a `releases` package.
   Names, values, documents and locations come from the record; nothing is inferred. */
export function parseOcdsRecords(text: string, source: string): OcdsRecord[] {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return [];
  }
  if (!json || typeof json !== "object") return [];
  const root = json as { releases?: OcdsRelease[] } & OcdsRelease;
  const releases = Array.isArray(root.releases) ? root.releases : [root];
  return releases.map((r) => ocdsRelease(r, source));
}

/* Supplier bids only, from every release in the file. */
export function parseOcdsBids(text: string, source: string): BidDoc[] {
  return parseOcdsRecords(text, source).flatMap((r) => r.bids);
}

export function parseBid(text: string, bidder: string, source: string): LineItem[] {
  const items: LineItem[] = [];
  for (const line of text.split("\n")) {
    const m = line.match(/^\|\s*([^|]+?)\s*\|\s*([\d,]+)\s*\|\s*KES\s*([\d,]+(?:\.\d+)?)\s*\|/);
    if (m) {
      items.push({
        bidder,
        source,
        item: m[1].trim(),
        qty: Number(m[2].replace(/,/g, "")),
        unit: Number(m[3].replace(/,/g, "")),
      });
    }
  }
  return items;
}

/* Citation gate: a finding must name a document that actually exists in this tender. */
export function citesKnownDocument(citation: string, files: string[]): boolean {
  return citation.trim().length > 0 && files.some((f) => citation.startsWith(f));
}

/* Self-check: a finding is kept only if its anchor text can be found in the document it cites. */
export function verifyFinding(f: Finding, sources: Record<string, string>): boolean {
  const file = f.citation.split(",")[0].trim();
  const text = sources[file];
  if (text === undefined) return false;
  const lower = text.toLowerCase();
  switch (f.rule) {
    case "R-PRICE-OUTLIER": {
      const itemName = f.item.split(" × ")[0].trim().toLowerCase();
      return itemName.length > 0 && lower.includes(itemName);
    }
    case "R-VALUE-OUTLIER":
    case "R-AWARD-OVER-BUDGET": {
      const ocid = f.citation.match(/ocid ([^,]+)/)?.[1]?.trim();
      return !!ocid && text.includes(ocid) && text.includes(f.item);
    }
    case "R-SPEC-DEVIATION":
      return f.evidence.length > 0 && text.includes(f.evidence);
    case "R-DOC-MISSING": {
      const req = f.evidence.match(/"(.+?)" as REQUIRED/)?.[1]?.toLowerCase();
      return !!req && lower.includes(req);
    }
    default:
      return false;
  }
}

/* Required documents named in a notice ("- [REQUIRED] …") that a bid does not reference. */
export function docMissingFindings(bids: BidDoc[], notice: string, noticeFile: string): Finding[] {
  const findings: Finding[] = [];
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
          citation: `${noticeFile}, eligibility checklist`,
        });
      }
    }
  }
  return findings;
}

/* OCDS awards above the tender's published value are flagged, citing the record and path. */
export function runAwardRules(records: OcdsRecord[]): Finding[] {
  const findings: Finding[] = [];
  for (const rec of records) {
    const ceiling = rec.tenderValue?.amount;
    if (ceiling === undefined || ceiling <= 0) continue;
    for (const a of rec.awards) {
      if (a.value <= ceiling) continue;
      findings.push({
        id: "",
        rule: "R-AWARD-OVER-BUDGET",
        severity: "HIGH",
        item: a.supplier,
        evidence: `Award ${a.currency ?? ""} ${a.value.toLocaleString()} exceeds the published tender value ${rec.tenderValue?.currency ?? ""} ${ceiling.toLocaleString()}.`.replace(/\s+/g, " "),
        citation: `${rec.source}, ${a.ref}`,
      });
    }
  }
  return findings;
}

export function runRules(bids: BidDoc[], notice: string, noticeFile: string): Finding[] {
  const findings: Finding[] = [];
  const all = bids.flatMap((b) => parseBid(b.text, b.bidder, b.source));
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
          citation: `${li.source}, price schedule`,
        });
      }
    }
  }
  findings.push(...docMissingFindings(bids, notice, noticeFile));
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
          citation: `${bid.source}, specifications matrix`,
        });
        break;
      }
    }
  }
  /* OCDS bid values: a bid more than twice the median of its peers is flagged, citing the record and path. */
  const valued = bids.filter((b) => b.value !== undefined && b.value > 0);
  for (const b of valued) {
    const value = b.value as number;
    const peers = valued.filter((o) => o !== b).map((o) => o.value as number).sort((x, y) => x - y);
    if (!peers.length) continue;
    const mid = Math.floor(peers.length / 2);
    const median = peers.length % 2 ? peers[mid] : (peers[mid - 1] + peers[mid]) / 2;
    if (median > 0 && value > median * 2) {
      findings.push({
        id: "",
        rule: "R-VALUE-OUTLIER",
        severity: "HIGH",
        item: b.bidder,
        evidence: `Bid value ${b.currency ?? ""} ${value.toLocaleString()} vs peer median ${median.toLocaleString()} (${(value / median).toFixed(1)}×).`,
        citation: `${b.source}, ${b.ref ?? "bid value"}`,
      });
    }
  }
  return findings.slice(0, 6);
}

/* ── 4. LangGraph.js — review graph (halts at the gate) ──────────────────── */

const ReviewState = Annotation.Root({
  runId: Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
  tenderId: Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
  bids: Annotation<BidDoc[]>({ reducer: (_, b) => b, default: () => [] }),
  sources: Annotation<Record<string, string>>({ reducer: (_, b) => b, default: () => ({}) }),
  /* Every tender notice in play: the markdown notice, and each OCDS release's notice. */
  notices: Annotation<{ file: string; text: string }[]>({ reducer: (_, b) => b, default: () => [] }),
  records: Annotation<OcdsRecord[]>({ reducer: (_, b) => b, default: () => [] }),
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
  const bids: BidDoc[] = [];
  const sources: Record<string, string> = {};
  const records: OcdsRecord[] = [];
  for (const f of files) {
    const text = await readTenderFile(`${s.tenderId}/${f}`, s.runId);
    sources[f] = text;
    if (f.endsWith(".json")) {
      /* OCDS release — the notice, bids, documents and awards all come from the record itself. */
      for (const rec of parseOcdsRecords(text, f)) {
        records.push(rec);
        bids.push(...rec.bids);
      }
    } else if (f.startsWith("01-")) {
      /* markdown notice — read below via sources */
    } else {
      const bidder = f.replace(/^\d+-bid-/, "").replace(/\.md$/, "").replace(/-/g, " ").toUpperCase();
      bids.push({ bidder, text, source: f });
    }
  }
  const mdNotice = files.find((f) => f.startsWith("01-") && f.endsWith(".md"));
  const notices = [
    ...(mdNotice ? [{ file: mdNotice, text: sources[mdNotice] }] : []),
    ...records.map((r) => ({ file: r.source, text: r.notice })),
  ];
  const awardCount = records.reduce((n, r) => n + r.awards.length, 0);
  progress(
    s.runId,
    `▸ ${files.length} documents read · ${bids.length} bids · ${awardCount} awards · ${records.length} OCDS records`,
  );
  return { bids, tenderId: s.tenderId, sources, notices, records };
}

async function nodeExtract(s: typeof ReviewState.State) {
  const t0 = performance.now();
  const requirements = extractRequirements(s.notices.map((n) => n.text).join("\n"));
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
  const files = Object.keys(s.sources);
  const merged = [
    ...runRules(s.bids, "", ""),
    ...s.notices.flatMap((n) => docMissingFindings(s.bids, n.text, n.file)),
    ...runAwardRules(s.records),
  ]
    .filter((f) => {
      const ok = citesKnownDocument(f.citation, files);
      if (!ok) {
        /* Uncited flags never reach the ledger — logged as rejected instead. */
        appendLog({
          actor: "quorum-agent",
          server: "quorum-mcp",
          tool: "flag_finding",
          kind: "WRITES",
          runId: s.runId,
          inputs: { rule: f.rule, item: f.item },
          outputs: { rejected: "no source document in this tender", citation: f.citation },
          status: "ERROR",
          durationMs: 0,
        });
      }
      return ok;
    })
    .map((f, i) => ({ ...f, id: `F-${String(i + 1).padStart(2, "0")}` }));
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

/* Self-check: findings whose anchor text is not in their cited document are dropped and logged, then IDs are renumbered. */
async function nodeVerify(s: typeof ReviewState.State) {
  const kept: Finding[] = [];
  for (const f of s.findings) {
    if (verifyFinding(f, s.sources)) {
      kept.push(f);
    } else {
      appendLog({
        actor: "quorum-agent",
        server: "quorum-mcp",
        tool: "verify_finding",
        kind: "READ",
        runId: s.runId,
        inputs: { rule: f.rule, item: f.item },
        outputs: { rejected: "anchor text not found in cited document", citation: f.citation },
        status: "ERROR",
        durationMs: 0,
      });
    }
  }
  const findings = kept.map((f, i) => ({ ...f, id: `F-${String(i + 1).padStart(2, "0")}` }));
  progress(s.runId, `▸ verify_findings — ${findings.length}/${s.findings.length} confirmed in their cited document`);
  return { findings };
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
  /* The bid value is read from the lead bidder's own filing, never assumed. */
  const lead0 = s.bids[0];
  const leadValue =
    lead0?.value !== undefined
      ? `${lead0.currency ?? ""} ${lead0.value.toLocaleString()}`.trim()
      : (lead0?.text.match(/\*\*Bid value:\*\*\s*(KES[^\n]+)/)?.[1]?.trim() ?? "NOT STATED IN BID");
  const gate: Gate = {
    id: gateId,
    runId: s.runId,
    tenderId: s.tenderId,
    tool: "file_gate_submission",
    inputs: {
      bidder: lead,
      value: leadValue,
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
    .addNode("verify_findings", nodeVerify)
    .addNode("draft_redlines", nodeDraft)
    .addNode("propose_gate", nodeGate)
    .addEdge(START, "load_documents")
    .addEdge("load_documents", "extract_requirements")
    .addEdge("extract_requirements", "flag_findings")
    .addEdge("flag_findings", "verify_findings")
    .addEdge("verify_findings", "draft_redlines")
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

/* ── Approver check — an APPROVE needs a name on the committee roster, or the signed-in officer ── */

export const WEB_URL = process.env.QUORUM_WEB_URL ?? "http://127.0.0.1:3000";

export interface RosterMember {
  name: string;
  status: "PRESENT" | "EXCUSED";
}

const normName = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

/* The stored committee roster from the Next.js app. Null when it cannot be read, so approval fails closed. */
export async function fetchRoster(fetchImpl: FetchLike = fetch, base = WEB_URL): Promise<RosterMember[] | null> {
  try {
    const res = await fetchImpl(`${base}/api/committee`, { signal: AbortSignal.timeout(5_000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { members?: RosterMember[] };
    return Array.isArray(data.members) ? data.members : null;
  } catch {
    return null;
  }
}

export function approverAllowed(
  approver: string,
  signedInAs: string | undefined,
  roster: RosterMember[],
): { ok: true } | { ok: false; reason: string } {
  const who = normName(approver);
  if (signedInAs && normName(signedInAs) === who) return { ok: true };
  if (roster.some((m) => m.status === "PRESENT" && normName(m.name) === who)) return { ok: true };
  return {
    ok: false,
    reason:
      roster.length === 0
        ? "The committee roster is empty — only the signed-in officer can approve."
        : `${approver.trim()} is not a PRESENT member of the committee roster and is not the signed-in officer.`,
  };
}

/* ── 5. Filing graph — runs ONLY after a named human approves ──────────── */

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
    fileURLToPath(new URL(`./data/submissions/${submissionId}.json`, import.meta.url)),
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
