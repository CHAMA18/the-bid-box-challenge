/**
 * quorum-mcp — the agent's hands.
 *
 * A real MCP server (JSON-RPC 2.0 over HTTP) with five tools. Three of them
 * change state: draft_redline DRAFTS, flag_finding FLAGS, file_gate_submission
 * FILES — and filing is irreversible, so it halts behind a named-human gate.
 *
 * Every tool call is appended to data/tool-log.jsonl with inputs, outputs,
 * timestamps, actor and status. Nothing happens twice, nothing happens silently.
 */

import { createHash, createHmac, randomUUID } from "node:crypto";
import { appendFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export type ToolKind = "READ" | "WRITES" | "IRREVERSIBLE" | "GATE_DECISION";

export interface LogEntry {
  seq: number;
  id: string;
  ts: string;
  actor: string;
  server: string;
  tool: string;
  kind: ToolKind;
  runId?: string;
  inputs: unknown;
  outputs: unknown;
  status: "OK" | "ERROR" | "PENDING_GATE" | "GATED";
  durationMs: number;
  /* Tamper-evidence: each line's `self` hash covers the line itself, and `prev`
     points at the previous line's hash — genesis is the literal "genesis". */
  prev?: string;
  self?: string;
}

export interface Requirement {
  id: string;
  clause: string;
  page: number;
}

export interface Finding {
  id: string;
  rule: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  item: string;
  evidence: string;
  citation: string;
  /* Set when the bounded repair loop re-anchored this finding to a verified line of its cited document. */
  repaired?: boolean;
}

export interface Draft {
  id: string;
  findingId: string;
  original: string;
  proposed: string;
  rationale: string;
  model: string;
  /* "llm" only when the model's reply was used; "template" when the fallback text is the proposal. */
  source?: "llm" | "template";
  usage?: { promptTokens: number; completionTokens: number };
  latencyMs?: number;
}

export interface Gate {
  id: string;
  runId: string;
  tenderId: string;
  tool: string;
  inputs: unknown;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXECUTED";
  createdAt: string;
  decidedAt?: string;
  approver?: string;
  note?: string;
  executedAt?: string;
  receipt?: { submissionId: string; hash: string; portal: string };
}

/* The review plan: decided before any rule runs, by the configured LLM when one is set
   and by a deterministic pack inspection otherwise. Every field changes downstream
   behaviour (which parsers run, which rule families are drafted first, how many drafts). */
export interface ReviewPlan {
  pack: { files: number; bids: number; ocdsRecords: number; markdownValueBids: number; ocdsValueBids: number };
  /* Deep value parsing: markdown "**Bid value:**" lines join OCDS values for outlier/budget rules. */
  parseMarkdownValues: boolean;
  focusRules: string[];
  maxDrafts: number;
  note: string;
  source: "heuristic" | "llm";
  model?: string;
}

export interface Run {
  id: string;
  tenderId: string;
  status: "RUNNING" | "AWAITING_GATE" | "REJECTED" | "FILED" | "FAILED";
  startedAt: string;
  updatedAt: string;
  progress: string[];
  requirements: Requirement[];
  findings: Finding[];
  drafts: Draft[];
  gateId?: string;
  error?: string;
  /* The plan this run was reviewed under (plan_review node output). */
  plan?: ReviewPlan;
  /* Drafting cost for this run: how many drafts came from the model and the tokens it used. */
  usage?: { drafts: number; llmDrafts: number; promptTokens: number; completionTokens: number };
  /* Tender detail typed by the officer at launch (manual entry). Persisted for
     the register and surfaced on runs/gates; the review engine's rules stay
     deterministic — this rides alongside, never inside, the rule set. */
  detail?: Record<string, unknown>;
}

/* fileURLToPath decodes %20 etc. — .pathname breaks on paths with spaces. */
const DATA = fileURLToPath(new URL("./data/", import.meta.url));

function cap(value: unknown, max = 420): unknown {
  const s = typeof value === "string" ? value : JSON.stringify(value);
  if (s === undefined) return value;
  if (s.length <= max) return s;
  return s.slice(0, max) + " …[truncated]";
}

/* ── Tool log — append-only JSONL, hash-chained, the audit spine ─────────── */

let seq = 0;
export const toolLog: LogEntry[] = [];

function hashOfEntry(entry: Omit<LogEntry, "self">): string {
  return createHash("sha256").update(JSON.stringify(entry)).digest("hex").slice(0, 16);
}

export function appendLog(e: Omit<LogEntry, "seq" | "id" | "ts" | "prev" | "self">): LogEntry {
  seq += 1;
  const prev = toolLog.length ? toolLog[toolLog.length - 1].self ?? toolLog[toolLog.length - 1].id : "genesis";
  const entry: LogEntry = {
    seq,
    id: `tl_${seq.toString().padStart(5, "0")}_${randomUUID().slice(0, 8)}`,
    ts: new Date().toISOString(),
    ...e,
    inputs: cap(e.inputs),
    outputs: cap(e.outputs),
    prev,
  };
  const self = hashOfEntry(entry);
  const logged: LogEntry = { ...entry, self };
  toolLog.push(logged);
  if (toolLog.length > 600) toolLog.splice(0, toolLog.length - 600);
  try {
    /* appendFileSync creates the file on first write — never lose the spine. */
    appendFileSync(DATA + "tool-log.jsonl", JSON.stringify(logged) + "\n");
  } catch {
    /* append failures never break the tool itself */
  }
  return logged;
}

/* Verifies the prev/self hash chain of in-memory or parsed-from-disk entries. */
export function verifyLogChain(entries: LogEntry[]): { ok: boolean; brokenAt: number | null; checked: number } {
  let expected = "genesis";
  for (let i = 0; i < entries.length; i++) {
    const { self, ...rest } = entries[i];
    const h = hashOfEntry(rest as Omit<LogEntry, "self">);
    if (!self || self !== h || entries[i].prev !== expected) return { ok: false, brokenAt: i, checked: i + 1 };
    expected = self;
  }
  return { ok: true, brokenAt: null, checked: entries.length };
}

export async function verifyToolLogFile(): Promise<{ ok: boolean; brokenAt: number | null; checked: number; lines: number; error?: string }> {
  try {
    const raw = await readFile(DATA + "tool-log.jsonl", "utf8");
    const lines = raw
      .split("\n")
      .filter((l) => l.trim().length > 0)
      .map((l) => JSON.parse(l) as LogEntry);
    return { ...verifyLogChain(lines), lines: lines.length };
  } catch {
    return { ok: true, brokenAt: null, checked: 0, lines: 0, error: "no log file yet" };
  }
}

/* ── Named-human gate signature ───────────────────────────────────────────
   When GATE_SECRET is set on the sidecar, the web layer must attest WHO is
   approving with an HMAC over (gateId, approver, signedInAs). Without it the
   approver name stays caller-declared — logged as exactly that. */
export const GATE_SECRET = process.env.GATE_SECRET?.trim() ?? "";

export function gateSignature(gateId: string, approver: string, signedInAs = "", secret = GATE_SECRET): string {
  return createHmac("sha256", secret).update(`${gateId}|${approver}|${signedInAs ?? ""}`).digest("hex");
}

/* ── Durable state (gates + runs + source requests survive reloads) ─────── */

export interface SourceRequest {
  id: string;
  name: string;
  kind: string;
  note?: string;
  requestedBy: string;
  createdAt: string;
  status: "PENDING" | "CONNECTED" | "DISMISSED";
}

/* A supplier on the platform register. Registration fields mirror what Zambia's
   public-procurement regime asks bidders to hold: PATENTS registrar number,
   ZRA tax clearance, NCC/NHCC/graders' registration where the category needs
   it, plus the purchuring reference the entity assigns on onboarding. */
export interface Supplier {
  id: string;
  name: string;
  /* Legal identity */
  registrationNo: string;
  /* Tax: ZRA tax clearance certificate number + expiry (Zambia) */
  taxPin?: string;
  taxClearanceNo?: string;
  taxClearanceExpiry?: string;
  /* Sector registration where the category requires one */
  regulator?: string;   /* e.g. "NCC", "NHCC", "ERB", "ZPPA" */
  regulatorNo?: string;
  /* Contact */
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  /* Procurement profile */
  categories: string[];   /* what they supply / works they execute */
  metadata: Record<string, string>;  /* free-form extras, legal form etc. */
  status: "ACTIVE" | "SUSPENDED" | "BLACKLISTED";
  addedBy: string;
  createdAt: string;
  updatedAt?: string;
}

/* The tunable guards — the thresholds the agent obeys inside a run. The Rules &
   guards page writes them by name; the engine reads them at flag time, so the
   very next run is reviewed under the settings on the page. Defaults are the
   settings as first carved: 25% variance, STANDARD checklist, cross-check ON. */
export interface Guards {
  priceVariancePct: 15 | 25 | 40;
  checklist: "STANDARD" | "STRICT";
  registryCrossCheck: boolean;
  /* Who last moved a guard, and when — the audit line on the page. */
  updatedAt: string | null;
  updatedBy: string | null;
}

export const DEFAULT_GUARDS: Guards = {
  priceVariancePct: 25,
  checklist: "STANDARD",
  registryCrossCheck: true,
  updatedAt: null,
  updatedBy: null,
};

interface PersistShape {
  gates: Gate[];
  runs: Run[];
  sourceRequests: SourceRequest[];
  suppliers: Supplier[];
  guards: Guards;
}

export const state: PersistShape = {
  gates: [],
  runs: [],
  sourceRequests: [],
  suppliers: [],
  guards: { ...DEFAULT_GUARDS },
};

export async function loadState() {
  try {
    const raw = await Bun.file(DATA + "state.json").json();
    /* mutate in place — engine.ts holds references to these exact arrays */
    state.gates.length = 0;
    state.gates.push(...(raw.gates ?? []));
    state.runs.length = 0;
    state.runs.push(...(raw.runs ?? []));
    state.sourceRequests.length = 0;
    state.sourceRequests.push(...(raw.sourceRequests ?? []));
    state.suppliers.length = 0;
    state.suppliers.push(...(raw.suppliers ?? []));
    /* Merged over the defaults so a store written before the guards existed
       still boots with the carved settings. */
    const g = (raw.guards ?? {}) as Partial<Guards>;
    state.guards = {
      priceVariancePct: ([15, 25, 40] as const).includes(g.priceVariancePct as 15 | 25 | 40)
        ? (g.priceVariancePct as Guards["priceVariancePct"])
        : DEFAULT_GUARDS.priceVariancePct,
      checklist: g.checklist === "STRICT" ? "STRICT" : "STANDARD",
      registryCrossCheck: typeof g.registryCrossCheck === "boolean" ? g.registryCrossCheck : DEFAULT_GUARDS.registryCrossCheck,
      updatedAt: typeof g.updatedAt === "string" ? g.updatedAt : null,
      updatedBy: typeof g.updatedBy === "string" ? g.updatedBy : null,
    };
    seq = raw.seq ?? 0;
  } catch {
    /* first boot */
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
export function saveState() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void Bun.write(DATA + "state.json", JSON.stringify({ ...state, seq }, null, 2));
  }, 120);
}

export function shaOf(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 32);
}
