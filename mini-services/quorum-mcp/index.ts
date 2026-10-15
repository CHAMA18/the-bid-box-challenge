/**
 * quorum-mcp — HTTP + MCP server (port 3031).
 *
 *  POST /mcp                      → JSON-RPC 2.0 (initialize · tools/list · tools/call · ping)
 *  GET  /api/health               → liveness + fs-mcp status + counts
 *  GET  /api/tools                → the five tools, with their kind (READ / WRITES / IRREVERSIBLE)
 *  GET  /api/architecture         → the stack, for the console UI
 *  GET  /api/log?limit=           → the audit log (every tool call, newest first)
 *  GET  /api/runs                 → orchestrated runs
 *  POST /api/runs {tenderId}      → launch a LangGraph review run
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
  type Run,
} from "./store";
import {
  approverAllowed,
  bindEngine,
  executeFiling,
  fetchRoster,
  fsMcp,
  initFsMcp,
  listTenderDocs,
  TOOLS,
} from "./engine";

const PORT = 3031;

/* Engine refs → durable state */
bindEngine({
  runs: state.runs,
  gates: state.gates,
  save: saveState,
  raiseGate(g) {
    state.gates.unshift(g);
    saveState();
  },
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
    case "draft_redline":
    case "flag_finding":
    case "extract_requirements":
      /* In the orchestrated path these run inside the LangGraph review graph
         (see engine.ts). Direct MCP calls route there too — kept minimal here. */
      return { status: "delegated", note: `Use POST /api/runs — ${name} executes inside the review graph.` };
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
        graphs: ["review_graph (5 nodes)", "filing_graph (2 nodes)"],
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
            detail: "Open-source graph runtime. review_graph halts at the gate by construction — the edge to filing does not exist.",
          },
          {
            layer: "MODEL",
            name: "Open-weights · Llama (in-region)",
            detail: "Procurement data cannot leave the country — drafting runs on open weights behind our own walls.",
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

    if (path === "/api/runs" && req.method === "POST") {
      const body = await readBody(req);
      const tenderId = String(body.tenderId ?? "").trim();
      if (!tenderId) return json({ error: "tenderId required" }, 422);
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
      };
      state.runs.unshift(run);
      saveState();
      void import("./engine").then((m) => m.runReview(run));
      return json({ run }, 201);
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
