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

import { createHash, randomUUID } from "node:crypto";
import { appendFileSync } from "node:fs";
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
  /* Drafting cost for this run: how many drafts came from the model and the tokens it used. */
  usage?: { drafts: number; llmDrafts: number; promptTokens: number; completionTokens: number };
}

/* fileURLToPath decodes %20 etc. — .pathname breaks on paths with spaces. */
const DATA = fileURLToPath(new URL("./data/", import.meta.url));

function cap(value: unknown, max = 420): unknown {
  const s = typeof value === "string" ? value : JSON.stringify(value);
  if (s === undefined) return value;
  if (s.length <= max) return s;
  return s.slice(0, max) + " …[truncated]";
}

/* ── Tool log — append-only JSONL, the audit spine ───────────────────────── */

let seq = 0;
export const toolLog: LogEntry[] = [];

export function appendLog(e: Omit<LogEntry, "seq" | "id" | "ts">): LogEntry {
  seq += 1;
  const entry: LogEntry = {
    seq,
    id: `tl_${seq.toString().padStart(5, "0")}_${randomUUID().slice(0, 8)}`,
    ts: new Date().toISOString(),
    ...e,
    inputs: cap(e.inputs),
    outputs: cap(e.outputs),
  };
  toolLog.push(entry);
  if (toolLog.length > 600) toolLog.splice(0, toolLog.length - 600);
  try {
    /* appendFileSync creates the file on first write — never lose the spine. */
    appendFileSync(DATA + "tool-log.jsonl", JSON.stringify(entry) + "\n");
  } catch {
    /* append failures never break the tool itself */
  }
  return entry;
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

interface PersistShape {
  gates: Gate[];
  runs: Run[];
  sourceRequests: SourceRequest[];
}

export const state: PersistShape = { gates: [], runs: [], sourceRequests: [] };

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
