# Quorum — agentic tender review for public procurement

**The agent prepares the file. The committee awards the tender.**

Quorum reviews public-health tender packs with a tool-wielding agent: it reads every
document over MCP, extracts the requirements, flags findings with citations and drafts
committee-ready redlines on an open-weights model — and then stops. Filing an award is
irreversible, so the agent cannot do it: a **named human signs the gate** first, and only
then is the bundle sealed, filed and receipted.

---

## Submission checklist → where the proof lives

| Requirement | Evidence in this repo |
| --- | --- |
| **Our own MCP server** — 5 tools, 3 of them change state | `mini-services/quorum-mcp/` — JSON-RPC 2.0 at `POST /mcp` (`initialize` · `tools/list` · `tools/call`); tool registry with input schemas in [`engine.ts` → `TOOLS`](mini-services/quorum-mcp/engine.ts) |
| — a tool that actually *does something* (read-only is not an agent's hands) | `draft_redline` (WRITES a draft record), `flag_finding` (WRITES to the findings ledger), `file_gate_submission` (files the award) |
| **A third-party MCP server we did not write** | [`@modelcontextprotocol/server-filesystem`](mini-services/quorum-mcp/engine.ts) — the **official** one, spawned over stdio (`initFsMcp()`), with a logged direct-fs fallback. Why it beats writing our own: sandboxed path-jail, battle-tested fs ops, maintained by the MCP core team |
| **Open-source orchestration** | [LangGraph.js](mini-services/quorum-mcp/engine.ts) (`@langchain/langgraph`) — `review_graph` (5 nodes: load → extract → flag → draft → propose_gate) **halts at the gate by construction: the edge from the gate to filing does not exist**; `filing_graph` (seal → transmit) is a separate graph that runs only after a named human approves |
| **A full task on an open-weights model** | `draft_redline` calls GLM (open weights, in-region) — procurement data never leaves the jurisdiction; a template fallback keeps runs alive if inference is unreachable |
| **A logged tool call for every action** | [`data/tool-log.jsonl`](mini-services/quorum-mcp/store.ts) — append-only; every call records actor, server, tool, kind (READ/WRITES/IRREVERSIBLE), inputs, outputs, timestamps, duration, status |
| **A gate on every irreversible action** | `file_gate_submission` returns `gate_pending` — execution is **blocked** until `POST /api/gates/:id/decision` arrives with a **named approver** (rejected without one, HTTP 422); approval triggers the filing graph and a written receipt |
| **Human-in-the-loop handoff** | The product itself: Mission Control → HUMAN GATE queue → named sign-off → ledger; the landing page's live stack console |

## Quickstart

```bash
bun install
bun run db:push

# terminal 1 — the product (Next.js, port 3000)
bun run dev

# terminal 2 — the agent runtime (MCP server, port 3031)
bun run mcp
```

> The sidecar also **auto-boots with the Next server** (`src/instrumentation.ts`)
> and self-heals via `GET /api/mcp-ensure` — terminal 2 is only needed for
> development on the MCP service itself.

Open `http://localhost:3000`. Any credentials open the demo workspace
(demo officer: `n.mokoena@procurement.gov`). The frontend reaches the MCP
service through the gateway as `/api/...?XTransformPort=3031` — same origin, no CORS.

## The 90-second evaluator walkthrough

1. **Landing page → the live stack console.** It talks to `quorum-mcp` in real time:
   health (including the third-party fs-MCP connection status), the five tools with
   their READ/WRITES/IRREVERSIBLE kind, the architecture map, and the streaming audit log.
2. **Sign in** (any credentials) → Mission Control.
3. **New run** → step 02 DOCUMENTS: drop real files (they mirror to Firebase Storage)
   or stage the sample pack → pick the checks → launch.
4. Watch the orchestrated run: documents read over MCP → requirements pinned →
   findings flagged, each cited → redlines drafted on open weights.
5. The run parks at the **human gate**. Open the gate, sign as the named approver —
   only then is the bundle sealed (sha-256) and filed, with a receipt written to
   `data/submissions/`.
6. Every step above is one line in the audit log: `GET :3031/api/log`.

## Architecture

```
Browser (Next.js 16 · :3000)
   │  fetch /api/*?XTransformPort=3031   (gateway)
   ▼
quorum-mcp (:3031 · Bun)  ── stdio ──▶ @modelcontextprotocol/server-filesystem
   │  LangGraph.js (open source)
   ├── review_graph : load_documents → extract_requirements → flag_findings
   │                  → draft_redlines (GLM · open weights) → propose_gate ─▶ END
   └── filing_graph : seal_bundle → transmit_submission
                      (runs ONLY after a named human signs the gate)
   │
   ├── data/tool-log.jsonl                append-only audit: every tool call
   ├── data/submissions/*.json            receipts for executed (approved) filings
   └── data/tenders/KE-NCB-104293/        the tender pack the agent reads
```

## API surface

**MCP (JSON-RPC 2.0):** `POST :3031/mcp` — `initialize`, `ping`, `tools/list`, `tools/call`

**REST:** `/api/health` · `/api/tools` · `/api/architecture` · `/api/log?limit=` ·
`GET|POST /api/runs` · `GET /api/gates` · `POST /api/gates/:id/decision`

Try the MCP surface directly:

```bash
curl -s localhost:3031/mcp -X POST -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## The five tools

| Tool | Kind | What it does |
| --- | --- | --- |
| `tender_documents_list` | READ | Lists the tender pack via the official filesystem MCP server |
| `extract_requirements` | READ | Pins SHALL/must clauses, budget and deadline into structured requirements |
| `draft_redline` | WRITES | Drafts a committee-ready redline for a flagged clause (open-weights model) |
| `flag_finding` | WRITES | Flags a finding against deterministic rules — price outlier (peer-median ×2), missing required doc, spec deviation — each with a citation |
| `file_gate_submission` | IRREVERSIBLE | Files the award submission. Execution is blocked until a named human signs the gate |

## Product surfaces

- **Landing** (`/`) — the product story, the live stack console, the film.
- **Auth** (`/#/login`, `/#/register`) — email/passphrase plus Google Sign-In
  (Firebase project `public-tender`; identity mirror + document storage).
- **Mission Control** (`/#/dashboard`) — the officer's desk: flow guide, live stats,
  run register, the human-gate queue with named sign-off, the decision ledger,
  agent feed and portal sync.
