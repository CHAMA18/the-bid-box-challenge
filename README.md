# Quorum — agentic tender review for public procurement

**The agent prepares the file. The committee awards the tender.**

Built by **CHAMA18** · Deployed at `quorum.chungu-chama.com` (AWS `af-south-1`, hosted on EC2) · Stack: Next.js 16 · Bun · LangGraph.js · MCP

Quorum reviews public-health tender packs with a tool-wielding agent: it reads every
document over MCP, extracts the requirements, flags findings with citations and drafts
committee-ready redlines (drafted by a configured LLM endpoint, or a deterministic template) — and then stops. Filing an award is
irreversible, so the agent cannot do it: a **named human signs the gate** first, and only
then is the bundle sealed, filed and receipted.

---

## Contents

1. [Problem statement](#problem-statement)
2. [Solution overview](#solution-overview)
3. [Target users](#target-users)
4. [Architecture](#architecture)
5. [Agent architecture](#agent-architecture)
6. [MCP implementation](#mcp-implementation)
7. [The five MCP tools](#the-five-mcp-tools)
8. [Human-in-the-loop workflow](#human-in-the-loop-workflow)
9. [Technology stack](#technology-stack)
10. [Setup / installation](#setup--installation)
11. [Usage instructions](#usage-instructions)
12. [Limitations](#limitations)
13. [Future improvements](#future-improvements)

---

## Problem statement

Public procurement consumes a large share of government spending across Africa, and it is where public money most often leaks. Evaluation committees — typically under-resourced officers in ministries of health and public works — must manually review tender packs that run to hundreds of pages: checking each bid against requirements, spotting price outliers and missing compliance documents, and drafting justifications for award decisions. The bottleneck is the review desk itself: backlogs delay hospitals waiting on critical supplies, and when officers are overwhelmed, compliance checks become spot-checks. Weak, inconsistent documentation of *why* a tender was awarded is precisely what enables procurement fraud to go unchallenged.

The people who feel this are (1) evaluation officers drowning in manual cross-checking, (2) procuring entities whose awards stall for months, and (3) citizens who fund public health through taxes but see procurement disputes, cancelled awards and audit queries instead of supplies.

Quorum attacks the review bottleneck directly: an agent reads every document, extracts requirements, flags findings with citations and drafts committee-ready redlines — while every irreversible award decision stays behind a named human sign-off with a full audit trail.

---

## Solution overview

**The agent prepares the file; the committee awards the tender.** Concretely:

- **Read everything.** The agent ingests the tender pack (notices, bids, OCDS records) through a sandboxed filesystem MCP server — path-jailed to the tender directory — so no document is skimmed or skipped.
- **Pin the requirements.** SHALL/must clauses, budget ceilings and deadlines are extracted into structured, page-referenced requirements.
- **Flag findings with citations.** Deterministic rules — price outliers (peer-median ×2), missing required documents, spec deviations — raise findings, each carrying its source file path and evidence excerpt. No citation, no finding: that rule is enforced by the test suite.
- **Draft redlines.** For flagged clauses, an LLM drafts a `{proposed, rationale}` committee redline through any OpenAI-compatible endpoint set in `LLM_BASE_URL`/`LLM_MODEL`. The intended setup is an open-weights model served in-region; the endpoint in `.env.local` is not (see Honest status). A deterministic template fallback keeps runs alive if inference is unreachable, and every draft records its source.
- **Stop at the gate.** The review graph ends at `propose_gate`. The edge from the gate to filing does not exist in the graph — no prompt, tool misuse or model turn can file an award. Only a *named* human on the committee roster can release the sealed filing.
- **Prove everything.** One append-only line per tool call lands in `tool-log.jsonl`, and each approved filing writes a sha-256-sealed receipt into `data/submissions/`.

The product surfaces this as **Mission Control** (live run register, human-gate queue, decision ledger, agent feed) and a **live stack console** on the landing page.

---

## Target users

| User | What they get |
| --- | --- |
| **Evaluation officers** (procurement desks, ministries/agencies) | The review desk work — reading, cross-checking, drafting — done for them, aims to cut first-pass review time; not yet timed against a real desk |
| **Evaluation committee members** | A clean HUMAN GATE queue: every irreversible decision framed, cited, and waiting for a named signature — never pre-made |
| **Oversight bodies / auditors** | The append-only audit log and sha-256 receipts — a tamper-evident record of exactly who decided what, and when |
| **Procuring entities** | Backlogs cleared faster; findings load-balanced against data sources (registries, portals) via the built-in source-request queue |
| **Citizens / public health** | Awards that can withstand audit scrutiny instead of health supplies stuck in disputes |

Invited teammates join a shared workspace via invite codes generated in Settings → Team Members (no email provider needed: an officer creates a code, the invitee pastes it during registration; codes expire after 14 days and can be revoked).

---

## Architecture

```
Browser (Next.js 16 · :3000)
   │  fetch /api/*?XTransformPort=3031   (same-origin gateway — no CORS)
   ▼
quorum-mcp (:3031 · Bun)  ── own MCP server (JSON-RPC 2.0) ── tools + gate
   │                          │
   │                          └── stdio ──▶ @modelcontextprotocol/server-filesystem
   │                                          (official third-party server, path-jailed)
   │  LangGraph.js (open source)
   ├── review_graph : load → extract_requirements → flag_findings
   │                  → verify_findings → draft_redlines (configured LLM endpoint)
   │                  → propose_gate ─▶ END (the edge to filing does NOT exist)
   └── filing_graph : seal_bundle (sha-256) → transmit_submission
                      (runs ONLY after a named human signs the gate)
   │
   ├── data/tool-log.jsonl                append-only audit: every tool call
   ├── data/state.json                    durable run/gate state (restored on boot)
   ├── data/submissions/*.json            receipts for executed (approved) filings
   └── data/tenders/<tender-ref>/         the tender documents the agent reads

JSON file store (db/quorum-store.json)     one file, no ORM, written atomically;
users · sessions · committee roster        path resolved from the web service's
settings · workspace invites               working directory
```

**Production deployment:** one `t4g.small` EC2 instance in `af-south-1` (Ubuntu 24.04) — nginx reverse proxy on :80 → Next.js standalone server on :3000; `quorum-web` and `quorum-mcp` run as systemd services (`Restart=always`). The MCP sidecar also auto-boots with the Next server (`src/instrumentation.ts`) and self-heals via `GET /api/mcp-ensure`.

---

## Agent architecture

**Agents.** One agentic runtime, `quorum-agent`, inside the `quorum-mcp` MCP server (Bun, port 3031) — an *agent-with-hands*, not a chatbot: it reads tender packs (via MCP), writes findings and redlines (via MCP), and may only *request* the irreversible filing.

**LLMs.** Any OpenAI-compatible endpoint set by `LLM_BASE_URL`/`LLM_MODEL`. The intended setup is an **open-weights** model served **in-region**. The endpoint currently in `.env.local` is GitHub Copilot's `gpt-4.1`, which is neither open-weights nor in-region. The model does exactly one job — redline prose (`draft_redline` → `llmDraft`: prompt → strict-JSON clause `{proposed, rationale}`) — with a deterministic template fallback. Every draft records its real source (`llm` or `template`), model, tokens and latency. All compliance logic is code, not model output.

**Memory.** No vector store — durable, structured state: `state.json` (runs, gates, receipts; restored on boot), per-run accumulators (requirements, findings, drafts, progress trail), and the append-only `tool-log.jsonl` audit file (which the UI streams live).

**Orchestration.** **LangGraph.js**. Review = 6 nodes (`load → extract_requirements → flag_findings → verify_findings → draft_redlines → propose_gate`), terminal at the gate; filing = a *separate, disconnected* 2-node graph (`filing_graph`) reachable only from the gate-decision endpoint. The halt is in the topology, not a prompt.

**Workflows.** Publish dossier → run review (every step audit-logged) → park at HUMAN GATE → named approver signs (422 without a name · 403 if not on the roster · 503 fail-closed if the roster can't be read) → sealed sha-256 filing → receipt → FILED. Rejected gates return the file to the agent.

Full detail: [`SUBMISSION/05-agent-architecture.md`](SUBMISSION/05-agent-architecture.md), [`SUBMISSION/07-agentic-system.md`](SUBMISSION/07-agentic-system.md).

---

## MCP implementation

Two MCP servers, each with a clear role:

| | **Server 1 — ours** | **Server 2 — official, third-party** |
| --- | --- | --- |
| Name | `quorum-mcp` | `@modelcontextprotocol/server-filesystem` |
| Transport | HTTP JSON-RPC 2.0 at `POST /mcp` (`initialize` · `tools/list` · `tools/call` · `ping`) | stdio, driven by our MCP **Client** (`@modelcontextprotocol/sdk` → `StdioClientTransport`) |
| Role | The agent's hands + the human gate — the 5-tool registry, findings ledger, gated filing | The agent's eyes — sandboxed reads of the tender pack via path-jail |
| State | Runs, gates, receipts, audit log | None — stateless reads |

**Connections to the agent:** (1) the LangGraph nodes call the same in-process tool registry that `tools/call` serves — one code path, one audit trail; (2) the agent holds a long-lived SDK MCP client session to the spawned filesystem server; (3) any external MCP client can `initialize`, list the tools and call them. Only `tender_documents_list` and `file_gate_submission` execute directly over `/mcp`. The other three (`extract_requirements`, `flag_finding`, `draft_redline`) return `delegated` and run only inside the review graph via `POST /api/runs`. A remote caller of `file_gate_submission` only ever produces `gate_pending` for a human to sign, never a filed award.

Resources: the tender pack (`data/tenders/<ref>/`) is the document surface, resolvable only through the filesystem server's path-jail; each read produces one audit line, which is what the "finding cites its file" guarantee maps to mechanically.

Full detail: [`SUBMISSION/06-mcp-implementation.md`](SUBMISSION/06-mcp-implementation.md) · architecture diagram: [`SUBMISSION/04-architecture.png`](SUBMISSION/04-architecture.png) (source in [`SUBMISSION/04-architecture.md`](SUBMISSION/04-architecture.md)).

---

## The five MCP tools

| Tool | Kind | What it does |
| --- | --- | --- |
| `tender_documents_list` | READ | Lists the tender pack via the official filesystem MCP server |
| `extract_requirements` | READ | Pins SHALL/must clauses, budget and deadline into structured requirements |
| `flag_finding` | WRITES | Flags a finding against deterministic rules — price outlier (peer-median ×2), missing required doc, spec deviation — each with a citation |
| `draft_redline` | WRITES | Drafts a committee-ready redline for a flagged clause (configured LLM endpoint, template fallback) |
| `file_gate_submission` | IRREVERSIBLE | Files the award submission. Execution is blocked until a named human signs the gate |

Every call that executes is audit-logged (READ / WRITES / IRREVERSIBLE) to `data/tool-log.jsonl`. The three graph-only tools are logged by the review graph, not by a direct `/mcp` call.

---

## Human-in-the-loop workflow

The standing rule: **the agent never holds the pen.** When the review graph finishes, the run parks in **AWAITING_GATE** and the submission appears in the HUMAN GATE queue.

1. The agent raises `file_gate_submission` → the tool returns `gate_pending` — nothing executes.
2. A **named** approver opens the gate and signs with a full name:
   - `422` — approval refused without a name,
   - `403` — refused if the name isn't on the PRESENT committee roster (or the signed-in officer),
   - `503` — fail-closed if the roster can't be read at all.
3. On APPROVE only, `filing_graph` runs: sha-256 seal → submit to the e-GP portal → receipt written to `data/submissions/` → run flips to FILED.
4. On REJECT, the bundle returns to the agent for revision — and the ledger records who returned it.

Full workflow detail (incl. supporting capabilities): [`SUBMISSION/03-solution.md`](SUBMISSION/03-solution.md), [`SUBMISSION/08-capabilities.md`](SUBMISSION/08-capabilities.md).

---

## Technology stack

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | Next.js 16 (App Router, TypeScript, standalone), React 19, Tailwind CSS 4, Radix/shadcn UI | One same-origin surface that wires the app and agent together without CORS |
| Runtime | **Bun** for both the web server and the MCP sidecar | One install, one TS toolchain, fast test loop |
| Orchestration | **LangGraph.js** (`@langchain/langgraph`, `@langchain/core`) | The halt-at-the-gate guarantee lives in the graph topology itself |
| Agent protocol | **MCP** — own JSON-RPC 2.0/HTTP server + the official `@modelcontextprotocol/server-filesystem` over stdio | Protocol-native tool registry; battle-tested, path-jailed document reads |
| LLM | Any OpenAI-compatible endpoint via `LLM_BASE_URL`/`LLM_MODEL`; template fallback | Data sovereignty holds only if the endpoint is open-weights and in-region. The current `.env.local` endpoint is not. |
| Databases | One dependency-free JSON file for the web app (users, sessions, committee roster, settings, workspace invites, pilot requests), written atomically; file-backed state + append-only audit JSONL on the agent side | Small, inspectable, zero native dependencies; append-only where auditable |
| Identity | Firebase Auth (email/passphrase + Google Sign-In) + Firebase Storage mirror | Real authentication without a homegrown password system |
| Infra | nginx, systemd, EC2 `t4g.small` in `af-south-1`, Route 53 zone, Elastic IP | Small, boring, reproducible from the repo |
| Tests | Bun test runner, `engine.test.ts` — 26 tests green | Safety rules enforced by tests, not just docs |

---

## Setup / installation

```bash
bun install

# terminal 1 — the product (Next.js, port 3000)
bun run dev

# terminal 2 — the agent runtime (MCP server, port 3031)
bun run mcp
```

> The sidecar also **auto-boots with the Next server** (`src/instrumentation.ts`)
> and self-heals via `GET /api/mcp-ensure` — terminal 2 is only needed for
> development on the MCP service itself.

Optional: set `LLM_BASE_URL` + `LLM_MODEL` (optionally `LLM_API_KEY`) to any OpenAI-compatible endpoint to switch redline drafting from the template fallback to a live open-weights model — e.g. a self-hosted vLLM/Ollama instance.

Open `http://localhost:3000`. Sign up or sign in — there is no demo workspace; every view reads the live MCP sidecar.

---

## Usage instructions

**The 90-second evaluator walkthrough**

1. **Landing page → the live stack console.** Health (incl. third-party fs-MCP status), the five tools with their READ/WRITES/IRREVERSIBLE kind, the architecture map, and the streaming audit log.
2. **Sign in** (or register) → Mission Control.
3. **New evaluation** (sidebar CTA) → step 02 DOCUMENTS: drop real tender files (they mirror to Firebase Storage) → pick the checks → launch.
4. Watch the orchestrated run: documents read over MCP → requirements pinned → findings flagged, each cited → redlines drafted by the configured LLM (or the template fallback).
5. The run parks at the **human gate**. Open the gate, sign as the named approver — only then is the bundle sealed (sha-256) and filed, with a receipt written to `data/submissions/`.
6. Every step above is one line in the audit log: `GET :3031/api/log`.
7. **Sourced report:** expand any completed run in the register → click **SOURCED REPORT** to download the full citations-first Markdown report (findings, evidence, drafts, audit trail, gate decision). **COPY AUDIT TRAIL** copies the run's audit line to the clipboard.
8. **Team:** Settings → Team Members → create an invite code (role: OFFICER or COMMITTEE; optional email note) → share it → your teammate pastes it during registration and joins the workspace; codes expire in 14 days and can be revoked.

**Try the MCP surface directly:**

```bash
curl -s localhost:3031/mcp -X POST -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

**API surface:**

- MCP (JSON-RPC 2.0): `POST :3031/mcp` — `initialize` · `ping` · `tools/list` · `tools/call`
- REST: `/api/health` · `/api/tools` · `/api/architecture` · `/api/log?limit=` · `GET|POST /api/runs` · `GET /api/runs/:id/report` (downloads the sourced report as `.md`) · `GET /api/gates` · `POST /api/gates/:id/decision` · `GET|POST|DELETE /api/team`
- Web-app routes: `/api/auth/*` (register/login/logout/me) · `/api/committee` (+ `/summon`) · `/api/contact` · `/api/agent-status` · `/api/mcp-ensure`

**Product surfaces:**

- **Landing** (`/`) — product story, live stack console, film.
- **Auth** (`/#/login`, `/#/register`) — email/passphrase + Google Sign-In (Firebase project `public-tender`; identity mirror + document storage), with the optional workspace invite code field.
- **Mission Control** (`/#/dashboard`) — flow guide, live stats, run register with SOURCED REPORT downloads, human-gate queue with named sign-off, decision ledger, agent feed, portal sync, committee roll-call, settings with team members.

---

## Limitations

**Deliberate, product-level boundaries (these are the design):**

- The agent cannot file an award by itself — by construction, not by policy. Everything irreversible is behind the named human gate.
- Committee *roles* are stored and displayed but not yet enforced as permission levels: the workspace is currently flat (all members read the same runs/gates/ledger).
- The compliance layer is deterministic rule-based (three rule families), not a general reasoning engine — it catches what the rules cover, and it is honest about that.

**Current state of the deployment:**

- With no `LLM_BASE_URL` configured, redline drafting runs on the deterministic template fallback rather than a live model — capabilities are unaffected; prose quality is. Wire an in-region endpoint to upgrade that layer.
- The e-GP portal receipt is labeled `egp-portal (simulated)` — sealing and receipts are real (sha-256, persisted), the transmission is a demo stub until wired to a live portal integration.
- Beneficial-ownership / registry matching is exposed via the source-request queue as a pending source, not yet a live connector.
- No HTTPS yet: the certbot step is staged but waits on the Route 53 A record for `quorum.chungu-chama.com` (blocked by the IAM permissions boundary on the deploying user; HTTP still works over the Elastic IP).
- Emails for invites/reports are not sent — invite codes are copy-paste; report downloads happen in-browser. No email provider is configured.

---

## Future improvements

- **An open-weights, in-region endpoint** on the deployed instance (set `LLM_BASE_URL`/`LLM_MODEL`; the current `.env.local` uses GitHub Copilot `gpt-4.1`), plus tracking model-attribution in every audit line it drafts.
- **Role enforcement** in the workspace (OFFICER vs COMMITTEE) — sticky to the invite codes that already carry the role.
- **Live e-GP / OCDS portal connectors** so filings and awards land on the real national portal, and sourced reports ingest live OCDS feeds rather than staged packages.
- **Registry integrations** from the source-request queue (beneficial ownership, supplier registries) with findings matched pre-award.
- **HTTPS + domain bring-up** the moment the Route 53 record is creatable (certbot staged; server already nginx-configured).
- **PDF/A export** of sourced reports for court-ready archival (currently Markdown).
- **Committee quorum analytics** in the ledger (median time-to-decision, repeat-approver patterns) — the data is already in the audit log.

---

## Attribution

Infrastructure, architecture, product code and deployment: **CHAMA18** — Quorum, agentic procurement for Africa.
Stack foundation: Next.js · Bun · LangGraph.js · Model Context Protocol (own server + official filesystem server) · JSON file store · Firebase · an OpenAI-compatible LLM endpoint for drafting.
