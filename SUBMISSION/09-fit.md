# 09 — Fit to the tender cycle: who, where, and how fast

*Companion to `03-solution.md` and `05-agent-architecture.md`. This page exists to be
checked: every claim about the cycle is named, and the timing section separates what
we measured from what we deliberately did not.*

---

## 1. Where Quorum sits in the cycle

Public procurement in Kenya (PPAD Act, 2015) and Rwanda runs: advertisement →
submission receipt → **opening → evaluation (technical, then financial) → award
notification → contract**. The evaluation desk is the segment Quorum targets:
the officer-stage where packs are read line by line, requirements are cross-checked
against each bid, and the award recommendation is written and justified.

Quorum does **not** advertise, receive bids, or sign contracts. It prepares the
evaluation file — requirements pinned, findings cited, redlines drafted — and stops
at a named human sign-off before anything irreversible happens.

## 2. Named target offices

| Office | Cycle segment | Why this office |
| --- | --- | --- |
| **Ministry of Health — Procurement Department (Kenya)** | Technical + financial evaluation | The sample packs are public-health tenders (pharmaceuticals, scanners, cold chain) built around Kenya's notice format |
| **KEMSA — Kenya Medical Supplies Authority** | Framework & repeat supply tenders | High-volume, compliance-heavy packs where the reading desk is the bottleneck |
| **County health procurement units (47 counties, Kenya)** | Devolved tender evaluation | Under-resourced desks; the strongest backlog case |
| **PPRA — Public Procurement Regulatory Authority (Kenya)** | Oversight & audit | Consumers of the audit trail: append-only tool log, sha-256 receipts, named signatures |
| **RPPA — Rwanda Public Procurement Regulatory Authority** | Evaluation standards & e-GP policy | The Rwandan sample pack (UMUCYO-format currency fields) demonstrates the multi-portal path |

Portals in scope for the (simulated) filing step: Kenya's PPIP e-GP and Rwanda's
UMUCYO — the transmission stub is labelled `egp-portal (simulated)` everywhere it
appears, including in receipts.

## 3. Timing benchmark — what we measured, and what we did not

**Agent time (measured, reproducible):**

- Rule path, per tender pack (all six sample packs, median of 5 runs): **0.25–0.91 ms**
  — published per tender with min–max spread in `mini-services/quorum-mcp/data/eval/report.json`.
- Full review graph, template mode (documents read over MCP → plan → extract → flag →
  verify → repair → 2 template drafts → gate raised): **~66 ms wall clock**, measured on
  a live run (`run_ca3ccb30`, 2026-10-16). With a live LLM endpoint configured, drafting
  adds one model call per drafted redline (~1–5 s each depending on the endpoint);
  every draft's latency is recorded on the run and in the sourced report.

**Human baseline: deliberately not claimed.** We have not run a controlled comparison
against a human desk, and we will not quote a number we did not measure. Published
rules-of-thumb vary too widely to be honest citations. The pilot (below) defines the
measurement protocol instead:

> *Baseline protocol (pilot, pre-registered):* the same published tender pack, given
> to two experienced evaluation officers with a stopwatch and a screen recording,
> instructed to produce a first-pass review at their normal desk pace. Both numbers —
> the officer minutes and the agent milliseconds — are then published side by side in
> this file, with the officers' consent, or the pilot reports that the comparison
> could not be run.

## 4. Pilot-intake channel (live in this build)

The landing page's "Run a pilot tender — unedited, on live notices" checklist posts to
**`POST /api/contact`** (pilot mode): name, work email, organisation, and the pilot
scope. Requests are stored in the workspace's JSON store (`db/quorum-store.json`,
written atomically) and surface alongside the other enquiries — no email provider is
required on either side. The promised response time is one working day.

A pilot pack of live notices is reviewed exactly like the samples: the documents are
dropped into the dossier, mirrored to Firebase Storage when available, and the agent
reads them over the sandboxed filesystem MCP server — nothing about the pilot path is
a second code path.

## 5. Honest boundaries of the fit claim

- The sample packs are realistic but synthetic; no live notice has been reviewed in
  anger yet.
- The e-GP transmission is a stub (labelled as such); sealing and receipts are real.
- The human-baseline number does not exist yet — by design, until the pilot measures
  it under the protocol above.
