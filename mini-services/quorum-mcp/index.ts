/**
 * quorum-mcp — HTTP + MCP server (port 3031).
 *
 *  POST /mcp                      → JSON-RPC 2.0 (initialize · tools/list · tools/call · ping)
 *  GET  /api/health               → liveness + fs-mcp status + counts
 *  GET  /api/tools                → the five tools, with their kind (READ / WRITES / IRREVERSIBLE)
 *  GET  /api/architecture         → the stack, for the console UI
 *  GET  /api/log?limit=           → the audit log (every tool call, newest first)
 *  GET  /api/runs                 → orchestrated runs
 *  POST /api/runs {tenderId, detail?} → launch a LangGraph review run
 *                                     (detail = the tender's typed record:
 *                                      method, supplierSelection, invitesIssued,
 *                                      preQualDate, publishedDate, deadlineDate,
 *                                      buyer, category, currency, ceiling,
 *                                      specification, awardCriteria,
 *                                      evaluationChecks, sourceUrl, noticeRef)
 *  POST /api/tenders/:ref/docs    → stage manual tender documents for the
 *                                   review to read ({ docs: [{ name, text }] });
 *                                   written as 9x-*.md so buildPack treats
 *                                   typed entries exactly like uploaded text
 *  GET  /api/gates                → gate queue + decisions
 *  POST /api/gates/:id/decision   → { decision: "APPROVE"|"REJECT", approver, note, signedInAs }
 *                                   APPROVE is refused (403) unless approver is a PRESENT committee member
 *                                   or the signed-in officer; if the roster can't be read, it is refused (503).
 */

import { randomUUID } from "node:crypto";
import {
  appendLog,
  loadState,
  saveState,
  shaOf,
  state,
  toolLog,
  type Gate,
  type Guards,
  type Run,
  type Supplier,
} from "./store";
import { handleReportRequest } from "./report";
import { listSampleTenders, readSampleDocument } from "./samples";
import { ZAMBIA_METHODS } from "./methods";
import { ZPPA_ROLL, ZPPA_SOURCE } from "./zppa";
import { OCP_AFRICA, OCP_AFRICA_SOURCE } from "./ocp-africa";
import { rollupAfrica } from "./ocp-africa-roll";
import { connectMany, loadPortalLinks } from "./portal-links";
import { disabledPortalIds, loadPortalState, setPortalsEnabled } from "./portal-state";
import { mkdirSync, writeFileSync } from "node:fs";
import { TENDERS_DIR } from "./engine";
import {
  approverAllowed,
  bindEngine,
  executeFiling,
  fetchRoster,
  fsMcp,
  initFsMcp,
  listTenderDocs,
  mcpDraftRedline,
  mcpExtractRequirements,
  mcpFlagFinding,
  TOOLS,
} from "./engine";

const PORT = 3031;

/* An optional string field — trims, caps, and collapses empty to undefined. */
function strOpt(v: unknown): string | undefined {
  const s = String(v ?? "").trim().slice(0, 200);
  return s.length > 0 ? s : undefined;
}

/* Engine refs → durable state */
bindEngine({
  runs: state.runs,
  gates: state.gates,
  save: saveState,
  raiseGate(g) {
    state.gates.unshift(g);
    saveState();
  },
  guards: () => state.guards,
  registry: () => state.suppliers.map((s) => ({ name: s.name, status: s.status })),
});

/* ── MCP tool dispatch (shared by /mcp and the orchestrator) ─────────────── */

async function raiseGateTool(args: { tenderId: string; bundle: Record<string, unknown> }, runId?: string) {
  const gateId = `gate_${Math.random().toString(36).slice(2, 8)}`;
  const gate: Gate = {
    id: gateId,
    runId: runId ?? "mcp-direct",
    tenderId: args.tenderId,
    tool: "file_gate_submission",
    inputs: args.bundle,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };
  const t0 = performance.now();
  appendLog({
    actor: "external-mcp-client",
    server: "quorum-mcp",
    tool: "file_gate_submission",
    kind: "IRREVERSIBLE",
    runId,
    inputs: args.bundle,
    outputs: { gate: gateId, note: "EXECUTION BLOCKED — named human required" },
    status: "PENDING_GATE",
    durationMs: Math.round(performance.now() - t0),
  });
  state.gates.unshift(gate);
  saveState();
  return { gate: gateId, status: "gate_pending", note: "Irreversible action held for a named human. POST /api/gates/:id/decision." };
}

async function callOwnTool(name: string, args: Record<string, unknown>, runId?: string): Promise<unknown> {
  switch (name) {
    case "tender_documents_list": {
      const t0 = performance.now();
      const files = await listTenderDocs(String(args.tenderId ?? ""), runId);
      appendLog({
        actor: "external-mcp-client",
        server: "quorum-mcp",
        tool: name,
        kind: "READ",
        runId,
        inputs: args,
        outputs: { files },
        status: "OK",
        durationMs: Math.round(performance.now() - t0),
      });
      return { files };
    }
    case "extract_requirements":
      return mcpExtractRequirements(args, runId);
    case "flag_finding":
      return mcpFlagFinding({ ...args, runId: args.runId ?? runId });
    case "draft_redline":
      return mcpDraftRedline({ ...args, runId: args.runId ?? runId });
    case "file_gate_submission":
      return raiseGateTool(
        args as { tenderId: string; bundle: Record<string, unknown> },
        runId
      );
    default:
      throw new Error(`unknown tool: ${name}`);
  }
}

/* ── JSON-RPC 2.0 (MCP surface) ──────────────────────────────────────────── */

const SERVER_INFO = { name: "quorum-mcp", version: "1.0.0" };

async function handleRpc(body: {
  id?: unknown;
  method: string;
  params?: { name?: string; arguments?: Record<string, unknown> };
}) {
  switch (body.method) {
    case "initialize":
      return {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      };
    case "ping":
      return {};
    case "tools/list":
      return { tools: TOOLS.map(({ name, description, inputSchema, kind }) => ({ name, description, inputSchema, _x_kind: kind })) };
    case "tools/call": {
      const name = body.params?.name ?? "";
      const args = body.params?.arguments ?? {};
      try {
        const out = await callOwnTool(name, args);
        return { content: [{ type: "text", text: JSON.stringify(out, null, 2) }] };
      } catch (err) {
        return { isError: true, content: [{ type: "text", text: (err as Error).message }] };
      }
    }
    default:
      throw new Error(`method not found: ${body.method}`);
  }
}

/* ── Gate decisions — the named human, logged ────────────────────────────── */

async function decideGate(id: string, decision: string, approver: string, note?: string, signedInAs?: string) {
  const gate = state.gates.find((g) => g.id === id);
  if (!gate) return { error: "gate not found", code: 404 };
  if (gate.status !== "PENDING") return { error: `gate already ${gate.status}`, code: 409 };
  const name = approver?.trim();
  if (!name || name.length < 3) return { error: "A named human is required — provide the approving officer's full name.", code: 422 };

  /* Approval only by a name on the committee roster (or the signed-in officer). Checked before anything changes. */
  if (decision !== "REJECT") {
    const roster = await fetchRoster();
    if (!roster) {
      appendLog({ actor: "quorum-mcp", server: "quorum-mcp", tool: "gate_decision", kind: "GATE_DECISION", runId: gate.runId, inputs: { gateId: id, decision, approver: name }, outputs: { refused: "committee roster unavailable" }, status: "ERROR", durationMs: 0 });
      return { error: "The committee roster could not be read — approval refused.", code: 503 };
    }
    const verdict = approverAllowed(name, signedInAs?.trim(), roster);
    if (!verdict.ok) {
      appendLog({ actor: "quorum-mcp", server: "quorum-mcp", tool: "gate_decision", kind: "GATE_DECISION", runId: gate.runId, inputs: { gateId: id, decision, approver: name }, outputs: { refused: verdict.reason }, status: "ERROR", durationMs: 0 });
      return { error: verdict.reason, code: 403 };
    }
  }

  gate.approver = name;
  gate.note = note?.trim() || undefined;
  gate.decidedAt = new Date().toISOString();

  if (decision === "REJECT") {
    gate.status = "REJECTED";
    appendLog({
      actor: name,
      server: "quorum-mcp",
      tool: "gate_decision",
      kind: "GATE_DECISION",
      runId: gate.runId,
      inputs: { gateId: id, decision, note: gate.note },
      outputs: { status: "REJECTED — submission returned to the agent" },
      status: "OK",
      durationMs: 0,
    });
    const run = state.runs.find((r) => r.id === gate.runId);
    if (run) {
      run.status = "REJECTED";
      run.updatedAt = gate.decidedAt;
      run.progress.push(`✗ ${name} returned the submission — back to the agent`);
    }
    saveState();
    return { gate };
  }

  /* APPROVE → and only now does the irreversible thing happen */
  gate.status = "APPROVED";
  const receipt = await executeFiling(id);
  gate.status = "EXECUTED";
  gate.executedAt = new Date().toISOString();
  gate.receipt = receipt ?? undefined;
  const run = state.runs.find((r) => r.id === gate.runId);
  if (run) {
    run.status = "FILED";
    run.updatedAt = gate.executedAt;
    run.progress.push(`✓ ${name} signed the gate — bundle filed · ${receipt?.submissionId ?? "receipt pending"}`);
  }
  saveState();
  return { gate };
}

/* ── HTTP server ─────────────────────────────────────────────────────────── */

const json = (data: unknown, code = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status: code,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type",
      "access-control-allow-methods": "GET,POST,OPTIONS",
    },
  });

async function readBody(req: Request): Promise<Record<string, unknown>> {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

Bun.serve({
  port: PORT,
  idleTimeout: 120,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type", "access-control-allow-methods": "GET,POST,OPTIONS" } });

    /* MCP surface */
    if (path === "/mcp" && req.method === "POST") {
      const body = (await readBody(req)) as { id?: unknown; method?: string; params?: never };
      try {
        const result = await handleRpc(body as { method: string; params?: { name?: string; arguments?: Record<string, unknown> } });
        return json({ jsonrpc: "2.0", id: body.id ?? null, result });
      } catch (err) {
        return json({ jsonrpc: "2.0", id: body.id ?? null, error: { code: -32603, message: (err as Error).message } });
      }
    }

    /* REST surface */
    if (path === "/api/health") {
      return json({
        ok: true,
        service: "quorum-mcp",
        version: "1.0.0",
        uptimeSec: Math.round(performance.now() / 1000),
        fsMcp: { status: fsMcp.status, tools: fsMcp.tools },
        graphs: ["review_graph (8 nodes)", "filing_graph (2 nodes)"],
        counts: { toolCalls: toolLog.length, runs: state.runs.length, gates: state.gates.length, pendingGates: state.gates.filter((g) => g.status === "PENDING").length },
      });
    }

    if (path === "/api/tools") return json({ tools: TOOLS });

    if (path === "/api/architecture") {
      return json({
        stack: [
          {
            layer: "OWN MCP SERVER",
            name: "quorum-mcp",
            detail: "5 tools over JSON-RPC 2.0 · 3 change state (draft, flag, file). Read-only is not an agent's hands.",
          },
          {
            layer: "THIRD-PARTY MCP",
            name: "@modelcontextprotocol/server-filesystem",
            detail: "Official, not ours. Sandboxed path-jail + maintained fs ops beat hand-rolling document reads.",
          },
          {
            layer: "ORCHESTRATION",
            name: "LangGraph.js (StateGraph)",
            detail: "Open-source graph runtime. review_graph: plan → load → extract → flag → verify ⇄ bounded repair → draft → gate. Halts at the gate by construction — the edge to filing does not exist.",
          },
          {
            layer: "MODEL",
            name: "OpenAI-compatible endpoint (LLM_BASE_URL)",
            detail: "Designed for open weights served in-region, so procurement data stays in-country. The current build uses a hosted endpoint or the template fallback."
          },
          {
            layer: "AUDIT",
            name: "tool-log.jsonl",
            detail: "Every call: inputs, outputs, timestamps, actor, status. Append-only.",
          },
          {
            layer: "GATE",
            name: "file_gate_submission",
            detail: "The only irreversible tool. Returns gate_pending until a named human signs.",
          },
        ],
      });
    }

    if (path === "/api/log") {
      const limit = Math.min(Number(url.searchParams.get("limit") ?? 80), 300);
      return json({ entries: [...toolLog].reverse().slice(0, limit), total: toolLog.length });
    }

    if (path === "/api/runs" && req.method === "GET") {
      return json({ runs: [...state.runs].reverse() });
    }

    /* Sourced report — downloadable Markdown, one file per run */
    if (/^\/api\/runs\/[^/]+\/report$/.test(path) && req.method === "GET") {
      const id = decodeURIComponent(path.match(/^\/api\/runs\/([^/]+)\/report$/)![1]);
      return handleReportRequest(id);
    }

    if (path === "/api/runs" && req.method === "POST") {
      const body = await readBody(req);
      const tenderId = String(body.tenderId ?? "").trim();
      if (!tenderId) return json({ error: "tenderId required" }, 422);
      /* A tender with no staged pack has nothing to review — refuse the
         launch here instead of running a graph that could only end in a
         placeholder gate for a tender nothing was read about. */
      try {
        const files = await listTenderDocs(tenderId);
        if (files.length === 0)
          return json(
            { error: `no staged documents for tender "${tenderId}" — stage the pack before launching a review` },
            422,
          );
      } catch {
        return json({ error: `tender "${tenderId}" could not be read` }, 500);
      }
      /* Optional typed tender record — capped, never trusted as findings.
         Keys are normalised to a fixed set so stray fields can't ride in. */
      const DETAIL_KEYS = [
        "method",
        "supplierSelection",
        "invitesIssued",
        "preQualDate",
        "publishedDate",
        "deadlineDate",
        "buyer",
        "category",
        "currency",
        "ceiling",
        "specification",
        "awardCriteria",
        "evaluationChecks",
        "sourceUrl",
        "noticeRef",
      ] as const;
      let detail: Record<string, unknown> | undefined;
      if (body.detail && typeof body.detail === "object") {
        const raw = body.detail as Record<string, unknown>;
        detail = {};
        for (const k of DETAIL_KEYS) {
          const v = raw[k];
          if (v === undefined || v === null) continue;
          if (Array.isArray(v)) detail[k] = v.map(String).slice(0, 12);
          else if (typeof v === "string" || typeof v === "number") detail[k] = v;
        }
        if (Object.keys(detail).length === 0) detail = undefined;
      }
      const run: Run = {
        id: `run_${randomUUID().slice(0, 8)}`,
        tenderId,
        status: "RUNNING",
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        progress: [`▸ review_graph invoked — langgraph.js · tender ${tenderId}`],
        requirements: [],
        findings: [],
        drafts: [],
        ...(detail ? { detail } : {}),
      };
      state.runs.unshift(run);
      saveState();
      appendLog({
        actor: "web-app",
        server: "quorum-mcp",
        tool: "run_launch",
        kind: "WRITES",
        runId: run.id,
        inputs: { tenderId, detail: detail ?? "none (files-only launch)" },
        outputs: { runId: run.id },
        status: "OK",
        durationMs: 0,
      });
      void import("./engine").then((m) => m.runReview(run));
      return json({ run }, 201);
    }

    /* Stage manual tender documents — the typed entries become real files the
       review graph reads, exactly like uploaded packs. Notice-type entries
       merge into one 01-manual-notice.md (the file buildPack reads as the
       notice); bid-type entries each become 9X-bid-<slug>.md so buildPack
       derives the bidder name from the filename, matching the pack convention. */
    if (/^\/api\/tenders\/[A-Za-z0-9._-]+\/docs$/.test(path) && req.method === "POST") {
      const tenderId = decodeURIComponent(path.match(/^\/api\/tenders\/([A-Za-z0-9._-]+)\/docs$/)![1]);
      const body = await readBody(req);
      const docs = Array.isArray(body.docs) ? body.docs : [];
      if (docs.length === 0) return json({ error: "docs required" }, 422);
      try {
        mkdirSync(TENDERS_DIR + tenderId, { recursive: true });
      } catch {
        return json({ error: "tender directory could not be created" }, 500);
      }
      const written: string[] = [];
      const noticeParts: string[] = [];
      let bidIndex = 0;
      docs.slice(0, 12).forEach((raw) => {
        const d = raw as { name?: unknown; text?: unknown; kind?: unknown };
        const name = String(d.name ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, 120);
        const text = String(d.text ?? "").slice(0, 60_000);
        if (!name || !text.trim()) return;
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "entry";
        const kind = String(d.kind ?? "bid").toLowerCase();
        if (kind === "notice") {
          noticeParts.push(`# ${name}\n\n${text}\n`);
          return;
        }
        bidIndex += 1;
        const file = `9${bidIndex}-bid-${slug}.md`;
        try {
          writeFileSync(TENDERS_DIR + tenderId + "/" + file, text);
          written.push(file);
        } catch {
          /* one bad entry never blocks the rest */
        }
      });
      if (noticeParts.length > 0) {
        try {
          writeFileSync(TENDERS_DIR + tenderId + "/01-manual-notice.md", noticeParts.join("\n---\n\n"));
          written.unshift("01-manual-notice.md");
        } catch {
          /* fall through — bids may still have landed */
        }
      }
      if (written.length === 0) return json({ error: "no valid docs" }, 422);
      appendLog({
        actor: "web-app",
        server: "quorum-mcp",
        tool: "tender_documents_stage",
        kind: "WRITES",
        inputs: { tenderId, count: written.length },
        outputs: { files: written },
        status: "OK",
        durationMs: 0,
      });
      return json({ files: written }, 201);
    }

    if (path === "/api/sample-tenders") {
      return json({ samples: await listSampleTenders() });
    }

    if (path.startsWith("/api/sample-tenders/") && req.method === "GET") {
      const match = path.match(/^\/api\/sample-tenders\/([^/]+)\/docs\/([^/]+)$/);
      if (match) {
        const doc = await readSampleDocument(match[1], match[2]);
        if (!doc) return json({ error: "not found" }, 404);
        return json({ doc });
      }
      const ref = path.match(/^\/api\/sample-tenders\/([^/]+)$/)?.[1];
      if (ref) {
        const sample = (await listSampleTenders()).find((s) => s.ref === ref);
        if (!sample) return json({ error: "not found" }, 404);
        return json({ sample });
      }
      return json({ error: "not found" }, 404);
    }

    /* ── Procurement methods — the regimes the engine reviews against ───── */
    if (path === "/api/methods") {
      return json({ ZM: ZAMBIA_METHODS });
    }

    /* ── The ZPPA roll — the published e-GP record, read in at intake ───── */
    if (path === "/api/zppa-roll") {
      return json({ source: ZPPA_SOURCE, roll: ZPPA_ROLL });
    }

    /* ── The OCP Data Registry, read for Africa — as published, nothing added */
    if (path === "/api/ocp-africa") {
      return json({
        source: OCP_AFRICA_SOURCE,
        countries: rollupAfrica(OCP_AFRICA),
        datasets: OCP_AFRICA,
        links: loadPortalLinks(),
        state: loadPortalState(),
      });
    }

    /* ── Portal enable/disable — the committee's switch, persisted and logged */
    if (path === "/api/portal-state" && req.method === "POST") {
      const body = await readBody(req);
      const rawIds = body.publicationIds;
      if (!Array.isArray(rawIds) || rawIds.length === 0) {
        return json({ error: "publicationIds must be a non-empty array of the registry's publication ids" }, 422);
      }
      const ids = [...new Set(rawIds.map((x: unknown) => Number(x)).filter((n: number) => Number.isInteger(n)))];
      const known = new Set(OCP_AFRICA.map((d) => d.publicationId));
      if (ids.length === 0 || ids.some((n: number) => !known.has(n))) {
        return json({ error: "publicationIds must name portals from the registry" }, 422);
      }
      if (typeof body.enabled !== "boolean") {
        return json({ error: "enabled must be a boolean" }, 422);
      }
      const actor = (strOpt(body.actor) ?? strOpt(req.headers.get("x-quorum-actor")) ?? "unknown").slice(0, 80);
      const file = setPortalsEnabled(ids, body.enabled, actor);
      appendLog({
        actor,
        server: "quorum-mcp",
        tool: "toggle_portals",
        kind: "WRITES",
        inputs: { publicationIds: ids, enabled: body.enabled },
        outputs: {
          toggled: ids.length,
          state: body.enabled ? "ENABLED" : "DISABLED",
          disabledTotal: disabledPortalIds(file).size,
        },
        status: "OK",
        durationMs: 0,
      });
      return json({ state: file });
    }

    /* ── Portal connections — a real handshake per dataset, dated ───────── */
    if (path === "/api/portal-links") {
      return json(loadPortalLinks());
    }

    if (path === "/api/portal-connect" && req.method === "POST") {
      const body = await readBody(req);
      let ids: number[] | null = null;
      if (body.publicationIds !== undefined) {
        if (!Array.isArray(body.publicationIds) || body.publicationIds.length === 0) {
          return json({ error: "publicationIds must be a non-empty array of the registry's publication ids" }, 422);
        }
        ids = body.publicationIds.map((x: unknown) => Number(x)).filter((n: number) => Number.isInteger(n));
        if (ids.length === 0) {
          return json({ error: "publicationIds must be a non-empty array of the registry's publication ids" }, 422);
        }
      }
      const actor = (strOpt(body.actor) ?? strOpt(req.headers.get("x-quorum-actor")) ?? "unknown").slice(0, 80);
      /* A portal the committee switched off is never probed — a bulk pass
         covers the portals still in use, and an explicit id list loses the
         disabled ones. Every skip is reported, never silent. */
      const disabled = disabledPortalIds();
      let skippedDisabled: number[] = [];
      if (ids === null) {
        skippedDisabled = [...disabled];
        ids = disabled.size > 0 ? OCP_AFRICA.filter((d) => !disabled.has(d.publicationId)).map((d) => d.publicationId) : null;
      } else if (disabled.size > 0) {
        skippedDisabled = ids.filter((n) => disabled.has(n));
        ids = ids.filter((n) => !disabled.has(n));
      }
      const started = Date.now();
      /* connectMany treats a null id list as "everything" — an empty enabled
         list must skip the pass entirely, not probe the world. */
      const file = ids !== null && ids.length === 0 ? loadPortalLinks() : await connectMany(ids, fetch);
      const touched = Object.values(file.links).filter(
        (l) => (ids === null || ids.includes(l.publicationId)) && !disabled.has(l.publicationId),
      );
      const linked = touched.filter((l) => l.registry.ok).length;
      const portalsUp = touched.filter((l) => l.portal.ok).length;
      appendLog({
        actor,
        server: "quorum-mcp",
        tool: "connect_portals",
        kind: "READ",
        inputs: { publicationIds: ids === null ? "every portal in use" : ids },
        outputs: {
          checked: touched.length,
          linked,
          portalsUp,
          failed: touched.filter((l) => !l.registry.ok).map((l) => l.publicationId),
          skippedDisabled,
        },
        status: "OK",
        durationMs: Date.now() - started,
      });
      return json(file);
    }

    /* ── The tunable guards — written here by name, obeyed by the engine ─── */
    if (path === "/api/guards" && req.method === "GET") {
      return json({ guards: state.guards });
    }

    if (path === "/api/guards" && (req.method === "PATCH" || req.method === "PUT")) {
      const body = await readBody(req);
      if (body.priceVariancePct === undefined && body.checklist === undefined && body.registryCrossCheck === undefined) {
        return json({ error: "no guard fields supplied" }, 422);
      }
      const actor = (strOpt(body.actor) ?? strOpt(req.headers.get("x-quorum-actor")) ?? "unknown").slice(0, 80);
      const before = {
        priceVariancePct: state.guards.priceVariancePct,
        checklist: state.guards.checklist,
        registryCrossCheck: state.guards.registryCrossCheck,
      };
      const next = { ...before };
      if (body.priceVariancePct !== undefined) {
        const pct = Number(body.priceVariancePct);
        if (![15, 25, 40].includes(pct)) return json({ error: "priceVariancePct must be 15, 25 or 40" }, 422);
        next.priceVariancePct = pct as Guards["priceVariancePct"];
      }
      if (body.checklist !== undefined) {
        if (body.checklist !== "STANDARD" && body.checklist !== "STRICT") return json({ error: "checklist must be STANDARD or STRICT" }, 422);
        next.checklist = body.checklist;
      }
      if (body.registryCrossCheck !== undefined) {
        if (typeof body.registryCrossCheck !== "boolean") return json({ error: "registryCrossCheck must be true or false" }, 422);
        next.registryCrossCheck = body.registryCrossCheck;
      }
      /* A no-op is not a change — nothing moves, nothing is logged. */
      const touched =
        before.priceVariancePct !== next.priceVariancePct ||
        before.checklist !== next.checklist ||
        before.registryCrossCheck !== next.registryCrossCheck;
      if (touched) {
        state.guards = { ...next, updatedAt: new Date().toISOString(), updatedBy: actor };
        saveState();
        appendLog({
          actor,
          server: "quorum-mcp",
          tool: "set_guards",
          kind: "WRITES",
          inputs: { before },
          outputs: { after: next },
          status: "OK",
          durationMs: 0,
        });
      }
      return json({ guards: state.guards, changed: touched });
    }

    /* ── Supplier register — the platform's named bidders ───────────────── */
    if (path === "/api/suppliers" && req.method === "GET") {
      return json({ suppliers: [...state.suppliers].reverse() });
    }

    if (path === "/api/suppliers" && req.method === "POST") {
      const body = await readBody(req);
      const name = String(body.name ?? "").trim().slice(0, 160);
      const registrationNo = String(body.registrationNo ?? "").trim().slice(0, 80);
      if (!name) return json({ error: "name required" }, 422);
      if (!registrationNo) return json({ error: "registrationNo required" }, 422);
      const dup = state.suppliers.find(
        (s) => s.name.toLowerCase() === name.toLowerCase() || s.registrationNo.toLowerCase() === registrationNo.toLowerCase(),
      );
      if (dup) return json({ error: `supplier already on the register: ${dup.id}` }, 409);
      const categories = Array.isArray(body.categories)
        ? body.categories.map((c: unknown) => String(c).trim().slice(0, 80)).filter(Boolean).slice(0, 12)
        : [];
      const supplier: Supplier = {
        id: `sup_${randomUUID().slice(0, 8)}`,
        name,
        registrationNo,
        taxPin: strOpt(body.taxPin),
        taxClearanceNo: strOpt(body.taxClearanceNo),
        taxClearanceExpiry: strOpt(body.taxClearanceExpiry),
        regulator: strOpt(body.regulator),
        regulatorNo: strOpt(body.regulatorNo),
        contactName: strOpt(body.contactName),
        email: strOpt(body.email),
        phone: strOpt(body.phone),
        address: strOpt(body.address),
        categories,
        metadata: body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
          ? Object.fromEntries(
              Object.entries(body.metadata as Record<string, unknown>)
                .slice(0, 12)
                .map(([k, v]) => [k.slice(0, 40), String(v).slice(0, 200)]),
            )
          : {},
        status: "ACTIVE",
        addedBy: String(body.addedBy ?? "").trim().slice(0, 80) || "unknown",
        createdAt: new Date().toISOString(),
      };
      state.suppliers.push(supplier);
      saveState();
      appendLog({
        actor: supplier.addedBy,
        server: "quorum-mcp",
        tool: "supplier_add",
        kind: "WRITES",
        inputs: { name: supplier.name, registrationNo: supplier.registrationNo },
        outputs: { id: supplier.id, status: supplier.status },
        status: "OK",
        durationMs: 0,
      });
      return json({ supplier }, 201);
    }

    if (/^\/api\/suppliers\/[A-Za-z0-9._-]+$/.test(path) && (req.method === "PATCH" || req.method === "PUT")) {
      const id = decodeURIComponent(path.split("/")[3] ?? "");
      const supplier = state.suppliers.find((s) => s.id === id);
      if (!supplier) return json({ error: "supplier not found" }, 404);
      const body = await readBody(req);
      const before = { status: supplier.status };
      if (typeof body.status === "string" && ["ACTIVE", "SUSPENDED", "BLACKLISTED"].includes(body.status)) {
        supplier.status = body.status as Supplier["status"];
      }
      for (const k of [
        "taxPin", "taxClearanceNo", "taxClearanceExpiry", "regulator", "regulatorNo",
        "contactName", "email", "phone", "address",
      ] as const) {
        if (k in body) supplier[k] = strOpt(body[k]);
      }
      if (body.name) supplier.name = String(body.name).trim().slice(0, 160) || supplier.name;
      if (body.registrationNo) supplier.registrationNo = String(body.registrationNo).trim().slice(0, 80) || supplier.registrationNo;
      if (Array.isArray(body.categories)) {
        supplier.categories = body.categories.map((c: unknown) => String(c).trim().slice(0, 80)).filter(Boolean).slice(0, 12);
      }
      supplier.updatedAt = new Date().toISOString();
      saveState();
      appendLog({
        actor: String(body.actor ?? supplier.addedBy ?? "").trim().slice(0, 80) || "unknown",
        server: "quorum-mcp",
        tool: "supplier_update",
        kind: "WRITES",
        runId: undefined,
        inputs: { id: supplier.id, name: supplier.name, registrationNo: supplier.registrationNo },
        outputs: { before, after: { status: supplier.status } },
        status: "OK",
        durationMs: 0,
      });
      return json({ supplier });
    }

    if (/^\/api\/suppliers\/[A-Za-z0-9._-]+$/.test(path) && req.method === "DELETE") {
      const id = decodeURIComponent(path.split("/")[3] ?? "");
      const idx = state.suppliers.findIndex((s) => s.id === id);
      if (idx === -1) return json({ error: "supplier not found" }, 404);
      const removed = state.suppliers[idx];
      state.suppliers.splice(idx, 1);
      saveState();
      appendLog({
        actor: String(req.headers.get("x-quorum-actor") ?? req.headers.get("x-quorum-actor") ?? "unknown"),
        server: "quorum-mcp",
        tool: "supplier_remove",
        kind: "WRITES",
        inputs: { id: removed.id, name: removed.name, registrationNo: removed.registrationNo },
        outputs: { removed: true },
        status: "OK",
        durationMs: 0,
      });
      return json({ removed: true });
    }

    if (path === "/api/source-requests" && req.method === "GET") {
      return json({ requests: [...state.sourceRequests].reverse() });
    }

    if (path === "/api/source-requests" && req.method === "POST") {
      const body = await readBody(req);
      const name = String(body.name ?? "").trim();
      const requestedBy = String(body.requestedBy ?? "").trim();
      if (!name) return json({ error: "name required" }, 422);
      if (!requestedBy) return json({ error: "requestedBy required" }, 422);
      const request = {
        id: `srq_${randomUUID().slice(0, 8)}`,
        name,
        kind: String(body.kind ?? "").trim() || "DATA SOURCE",
        note: String(body.note ?? "").trim() || undefined,
        requestedBy,
        createdAt: new Date().toISOString(),
        status: "PENDING" as const,
      };
      state.sourceRequests.push(request);
      saveState();
      appendLog({
        actor: requestedBy,
        server: "quorum-mcp",
        tool: "request_source",
        kind: "WRITES",
        inputs: { name, kind: request.kind },
        outputs: { id: request.id, status: "PENDING" },
        status: "OK",
        durationMs: 1,
      });
      return json({ request }, 201);
    }

    if (path.startsWith("/api/gates/") && req.method === "POST") {
      const id = path.match(/^\/api\/gates\/([^/]+)/)?.[1] ?? "";
      const body = await readBody(req);
      const out = await decideGate(
        id,
        String(body.decision ?? ""),
        String(body.approver ?? ""),
        body.note ? String(body.note) : undefined,
        body.signedInAs ? String(body.signedInAs) : undefined,
      );
      if (out.error) return json(out, out.code ?? 400);
      return json(out);
    }

    if (path === "/api/gates") {
      return json({ gates: state.gates });
    }

    return json({ error: "not found" }, 404);
  },
});

await loadState();
void initFsMcp();
console.log(`quorum-mcp listening on :${PORT} — MCP surface POST /mcp · audit ${toolLog.length} calls restored`);
