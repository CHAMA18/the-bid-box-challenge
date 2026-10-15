import { describe, expect, test } from "bun:test";
import {
  approverAllowed,
  bidLineNamingDocument,
  bidNamesDocument,
  budgetFindings,
  docMissingFindings,
  callLlama,
  draftClause,
  expiredLicenceFindings,
  markdownBidValue,
  citesKnownDocument,
  fetchRoster,
  llmConfigFromEnv,
  type FetchLike,
  parseOcdsBids,
  parseOcdsRecords,
  runAwardRules,
  runRules,
  verifyFinding,
  type BidDoc,
  type RosterMember,
} from "./engine";

const FILES = ["01-tender-notice.md", "02-bid-acme.md", "03-bid-zeta.md", "ocds-release.json"];

describe("citation gate", () => {
  test("accepts a citation that names a real document in the tender", () => {
    expect(citesKnownDocument("02-bid-acme.md, price schedule", FILES)).toBe(true);
  });

  test("rejects an empty citation", () => {
    expect(citesKnownDocument("", FILES)).toBe(false);
    expect(citesKnownDocument("   ", FILES)).toBe(false);
  });

  test("rejects a citation to a document that is not in the tender", () => {
    expect(citesKnownDocument("bid-acme.md, price schedule", FILES)).toBe(false);
    expect(citesKnownDocument("01-tender-notice.md, eligibility checklist", ["02-bid-acme.md"])).toBe(false);
  });
});

const OCDS = JSON.stringify({
  ocid: "ocds-test-0001",
  bids: {
    details: [
      { tenderers: [{ name: "Acme Medical Ltd" }], value: { amount: 1_000_000, currency: "KES" } },
      { tenderers: [{ name: "Zeta Supplies" }], value: { amount: 1_100_000, currency: "KES" } },
      { tenderers: [{ name: "Outlier Pharma" }], value: { amount: 3_500_000, currency: "KES" } },
      { tenderers: [], value: { amount: 900_000, currency: "KES" } },
    ],
  },
});

describe("OCDS ingestion", () => {
  test("reads one bid per tenderer, with value and record path", () => {
    const bids = parseOcdsBids(OCDS, "ocds-release.json");
    expect(bids.map((b) => b.bidder)).toEqual(["Acme Medical Ltd", "Zeta Supplies", "Outlier Pharma"]);
    expect(bids[0].value).toBe(1_000_000);
    expect(bids[0].currency).toBe("KES");
    expect(bids[0].ref).toBe("ocid ocds-test-0001, bids.details[0].value");
    expect(bids[0].source).toBe("ocds-release.json");
  });

  test("reads a release wrapped in a releases array", () => {
    const wrapped = JSON.stringify({ releases: [JSON.parse(OCDS)] });
    expect(parseOcdsBids(wrapped, "ocds-release.json")).toHaveLength(3);
  });

  test("returns nothing for text that is not JSON", () => {
    expect(parseOcdsBids("not json", "x.json")).toEqual([]);
  });
});

describe("self-check against the cited document", () => {
  const base = { id: "", severity: "HIGH" as const };

  test("keeps a price finding whose line item appears in the cited bid", () => {
    const f = { ...base, rule: "R-PRICE-OUTLIER", item: "Paracetamol 500mg × 100 — OUTLIER", evidence: "", citation: "04-bid-outlier.md, price schedule" };
    expect(verifyFinding(f, { "04-bid-outlier.md": "| Paracetamol 500mg | 100 | KES 300 |" })).toBe(true);
    expect(verifyFinding(f, { "04-bid-outlier.md": "| Amoxicillin | 10 | KES 300 |" })).toBe(false);
  });

  test("drops a value finding whose ocid is not in the cited release", () => {
    const f = { ...base, rule: "R-VALUE-OUTLIER", item: "Outlier Pharma", evidence: "", citation: "ocds-release.json, ocid ocds-test-0001, bids.details[2].value" };
    expect(verifyFinding(f, { "ocds-release.json": OCDS })).toBe(true);
    expect(verifyFinding(f, { "ocds-release.json": OCDS.replace("ocds-test-0001", "other") })).toBe(false);
  });

  test("drops a finding whose cited document is absent from the sources", () => {
    const f = { ...base, rule: "R-SPEC-DEVIATION", item: "Acme", evidence: "alternative offered", citation: "missing.md, specifications matrix" };
    expect(verifyFinding(f, { "02-bid-acme.md": "alternative offered" })).toBe(false);
  });

  test("keeps a missing-document finding only if the required document is named in the notice", () => {
    const f = { ...base, rule: "R-DOC-MISSING", item: "Acme — tax clearance", evidence: 'Tender notice lists "tax clearance certificate" as REQUIRED; the bid does not reference it.', citation: "01-tender-notice.md, eligibility checklist" };
    expect(verifyFinding(f, { "01-tender-notice.md": "- [REQUIRED] Tax clearance certificate" })).toBe(true);
    expect(verifyFinding(f, { "01-tender-notice.md": "no requirements" })).toBe(false);
  });

  test("drops an unknown rule", () => {
    const f = { ...base, rule: "R-MADE-UP", item: "x", evidence: "x", citation: "01-tender-notice.md, x" };
    expect(verifyFinding(f, { "01-tender-notice.md": "x" })).toBe(false);
  });
});

describe("drafting model: OpenAI-compatible LLM endpoint", () => {
  const cfg = { baseUrl: "http://llama.internal:8000/v1/", model: "llama-3.1-70b-instruct", apiKey: "k" };

  test("reads the endpoint from LLM_* env and needs both URL and model", () => {
    expect(llmConfigFromEnv({ LLM_BASE_URL: "http://llama.internal:8000/v1", LLM_MODEL: "llama-3.1-70b-instruct" })).toEqual({
      baseUrl: "http://llama.internal:8000/v1",
      model: "llama-3.1-70b-instruct",
      apiKey: undefined,
    });
    expect(llmConfigFromEnv({ LLM_BASE_URL: "http://llama.internal:8000/v1" })).toBeNull();
    expect(llmConfigFromEnv({})).toBeNull();
  });

  test("posts an OpenAI-compatible chat request to the configured endpoint only", async () => {
    let url = "";
    let body: { model?: string } = {};
    let auth: string | undefined;
    const fake = (async (u: string, init: RequestInit) => {
      url = String(u);
      body = JSON.parse(String(init.body));
      auth = (init.headers as Record<string, string>).authorization;
      return new Response(JSON.stringify({ model: "llama-3.1-70b-instruct", choices: [{ message: { content: '{"proposed":"x","rationale":"y"}' } }] }));
    }) as FetchLike;
    const out = await callLlama(cfg, [{ role: "user", content: "hi" }], fake);
    expect(url).toBe("http://llama.internal:8000/v1/chat/completions");
    expect(body.model).toBe("llama-3.1-70b-instruct");
    expect(auth).toBe("Bearer k");
    expect(out.model).toBe("llama-3.1-70b-instruct");
    expect(out.content).toBe('{"proposed":"x","rationale":"y"}');
  });

  test("throws when the endpoint is unavailable, so the caller can fall back", async () => {
    const down: FetchLike = async () => new Response("busy", { status: 503 });
    await expect(callLlama(cfg, [{ role: "user", content: "hi" }], down)).rejects.toThrow("503");
  });
});

describe("drafting falls back to the template and never stalls a run", () => {
  const ANOMALY = "R-PRICE-OUTLIER on MRI 1.5T scanner — MEDIQUEAST";

  /* Runs fn with LLM env and globalThis.fetch replaced, then restores both. */
  async function withLlm<T>(
    env: { LLM_BASE_URL?: string; LLM_MODEL?: string },
    fetchStub: (input: string | URL | Request, init?: RequestInit) => Promise<Response>,
    fn: () => Promise<T>,
  ): Promise<T> {
    const saved = { base: process.env.LLM_BASE_URL, model: process.env.LLM_MODEL, fetch: globalThis.fetch };
    delete process.env.LLM_BASE_URL;
    delete process.env.LLM_MODEL;
    if (env.LLM_BASE_URL) process.env.LLM_BASE_URL = env.LLM_BASE_URL;
    if (env.LLM_MODEL) process.env.LLM_MODEL = env.LLM_MODEL;
    globalThis.fetch = fetchStub as unknown as typeof fetch; // test stub; only the call shape matters
    try {
      return await fn();
    } finally {
      if (saved.base === undefined) delete process.env.LLM_BASE_URL;
      else process.env.LLM_BASE_URL = saved.base;
      if (saved.model === undefined) delete process.env.LLM_MODEL;
      else process.env.LLM_MODEL = saved.model;
      globalThis.fetch = saved.fetch;
    }
  }

  test("no model configured: template clause, and no network call is made", async () => {
    let calls = 0;
    const out = await withLlm({}, (async () => {
      calls++;
      return new Response("{}");
    }), () => draftClause("clause text", ANOMALY));
    expect(calls).toBe(0);
    expect(out.source).toBe("template");
    expect(out.proposed).toContain(ANOMALY);
    expect(out.model).toBe("template (no model configured)");
  });

  test("endpoint unreachable: template clause, with the failure recorded in the rationale", async () => {
    const out = await withLlm(
      { LLM_BASE_URL: "http://llama.internal:8000/v1", LLM_MODEL: "llama-3.1-70b-instruct" },
      (async () => {
        throw new TypeError("fetch failed");
      }),
      () => draftClause("clause text", ANOMALY),
    );
    expect(out.source).toBe("template");
    expect(out.proposed).toContain(ANOMALY);
    expect(out.rationale).toContain("fetch failed");
    expect(out.model).toBe("llama-3.1-70b-instruct (llm) · failed — template used");
  });

  test("model reply with no JSON object: template clause, not a crash", async () => {
    const out = await withLlm(
      { LLM_BASE_URL: "http://llama.internal:8000/v1", LLM_MODEL: "llama-3.1-70b-instruct" },
      (async () =>
        new Response(JSON.stringify({ choices: [{ message: { content: "I cannot help with that." } }] }))),
      () => draftClause("clause text", ANOMALY),
    );
    expect(out.source).toBe("template");
    expect(out.rationale).toContain("no JSON object");
  });

  test("healthy endpoint: the model's clause is used and its source is recorded as llm", async () => {
    const out = await withLlm(
      { LLM_BASE_URL: "http://llama.internal:8000/v1", LLM_MODEL: "llama-3.1-70b-instruct" },
      (async () =>
        new Response(
          JSON.stringify({
            model: "llama-3.1-70b-instruct",
            choices: [{ message: { content: '{"proposed":"Clause X","rationale":"Because Y"}' } }],
            usage: { prompt_tokens: 10, completion_tokens: 5 },
          }),
        )),
      () => draftClause("clause text", ANOMALY),
    );
    expect(out.source).toBe("llm");
    expect(out.proposed).toBe("Clause X");
    expect(out.rationale).toBe("Because Y");
    expect(out.model).toBe("llama-3.1-70b-instruct (llm)");
    expect(out.usage).toEqual({ promptTokens: 10, completionTokens: 5 });
  });
});

describe("approver check against the committee roster", () => {
  const roster: RosterMember[] = [
    { name: "Wanjiru Kamau", status: "PRESENT" },
    { name: "Otieno Mwangi", status: "EXCUSED" },
  ];

  test("allows a PRESENT member, ignoring case and extra spacing", () => {
    expect(approverAllowed("  wanjiru   KAMAU ", undefined, roster).ok).toBe(true);
  });

  test("refuses an EXCUSED member and a name not on the roster", () => {
    expect(approverAllowed("Otieno Mwangi", undefined, roster).ok).toBe(false);
    expect(approverAllowed("Jane Doe", undefined, roster).ok).toBe(false);
  });

  test("allows the signed-in officer even when not on the roster", () => {
    expect(approverAllowed("Jane Doe", "Jane Doe", roster).ok).toBe(true);
  });

  test("an empty roster lets only the signed-in officer approve", () => {
    expect(approverAllowed("Wanjiru Kamau", undefined, []).ok).toBe(false);
    expect(approverAllowed("Jane Doe", "Jane Doe", []).ok).toBe(true);
  });

  test("reads members from /api/committee", async () => {
    let url = "";
    const ok = (async (u: string) => {
      url = String(u);
      return new Response(JSON.stringify({ members: roster }));
    }) as FetchLike;
    expect(await fetchRoster(ok, "http://web")).toEqual(roster);
    expect(url).toBe("http://web/api/committee");
  });

  test("fails closed (null) when the roster cannot be read", async () => {
    const refused: FetchLike = async () => {
      throw new Error("ECONNREFUSED");
    };
    expect(await fetchRoster(refused, "http://web")).toBeNull();
    const broken: FetchLike = async () => new Response("err", { status: 500 });
    expect(await fetchRoster(broken, "http://web")).toBeNull();
  });
});

describe("OCDS tender notice and awards", () => {
  const RECORD = JSON.stringify({
    ocid: "ocds-test-0002",
    tender: {
      title: "Supply of essential medicines",
      value: { amount: 2_000_000, currency: "KES" },
      documents: [{ title: "Tax clearance certificate", documentType: "eligibilityCriteria" }],
    },
    awards: [
      { suppliers: [{ name: "Acme Medical Ltd" }], value: { amount: 1_900_000, currency: "KES" } },
      { suppliers: [{ name: "Outlier Pharma" }], value: { amount: 2_600_000, currency: "KES" } },
    ],
  });

  test("reads the notice, required documents and awards from the record", () => {
    const [rec] = parseOcdsRecords(RECORD, "ocds-award.json");
    expect(rec.notice).toContain("Supply of essential medicines");
    expect(rec.notice).toContain("- [REQUIRED] Tax clearance certificate");
    expect(rec.awards.map((a) => a.supplier)).toEqual(["Acme Medical Ltd", "Outlier Pharma"]);
    expect(rec.tenderValue?.amount).toBe(2_000_000);
  });

  test("flags an award above the published tender value, citing the path", () => {
    const findings = runAwardRules(parseOcdsRecords(RECORD, "ocds-award.json"));
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe("R-AWARD-OVER-BUDGET");
    expect(findings[0].citation).toBe("ocds-award.json, ocid ocds-test-0002, awards[1].value");
  });

  test("the award finding passes the self-check against its record", () => {
    const [f] = runAwardRules(parseOcdsRecords(RECORD, "ocds-award.json"));
    expect(verifyFinding(f, { "ocds-award.json": RECORD })).toBe(true);
  });
});

describe("rules cite real sources only", () => {
  test("a value outlier is flagged, cites the OCDS file and path, and passes the gate", () => {
    const bids: BidDoc[] = parseOcdsBids(OCDS, "ocds-release.json");
    const findings = runRules(bids, "", "");
    const outlier = findings.find((f) => f.rule === "R-VALUE-OUTLIER");
    expect(outlier).toBeDefined();
    expect(outlier?.item).toBe("Outlier Pharma");
    expect(outlier?.citation).toBe("ocds-release.json, ocid ocds-test-0001, bids.details[2].value");
    expect(citesKnownDocument(outlier?.citation ?? "", ["ocds-release.json"])).toBe(true);
  });

  test("a price outlier cites the bid file it came from", () => {
    const bids: BidDoc[] = [
      { bidder: "Acme", source: "02-bid-acme.md", text: "| Paracetamol 500mg | 100 | KES 50 | " },
      { bidder: "Zeta", source: "03-bid-zeta.md", text: "| Paracetamol 500mg | 100 | KES 60 | " },
      { bidder: "Outlier", source: "04-bid-outlier.md", text: "| Paracetamol 500mg | 100 | KES 300 | " },
    ];
    const findings = runRules(bids, "", "01-tender-notice.md");
    const price = findings.find((f) => f.rule === "R-PRICE-OUTLIER");
    expect(price?.citation).toBe("04-bid-outlier.md, price schedule");
  });

  test("no rule emits a finding without a citation", () => {
    const findings = runRules(parseOcdsBids(OCDS, "ocds-release.json"), "", "");
    for (const f of findings) {
      expect(f.citation.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("markdown bid values and budget ceiling", () => {
  const NOTICE = "# TENDER\n**Budget ceiling:** KES 1,000,000 (VAT inclusive)";
  const bidText = (value: string) => `# BID\n**Bid value:** ${value}\n`;

  test("reads the stated bid value from a markdown bid", () => {
    expect(markdownBidValue(bidText("KES 3,940,000,000"))).toEqual({ currency: "KES", value: 3940000000 });
    expect(markdownBidValue("no value here")).toBeUndefined();
  });

  test("flags a markdown bid above the ceiling and cites the bid file", () => {
    const bids: BidDoc[] = [{ bidder: "Big", source: "02-bid-big.md", text: bidText("KES 1,200,000"), value: 1200000, currency: "KES" }];
    const f = budgetFindings(bids, NOTICE, "01-tender-notice.md");
    expect(f).toHaveLength(1);
    expect(f[0].rule).toBe("R-OVER-BUDGET");
    expect(f[0].citation).toBe("02-bid-big.md, bid value");
    expect(verifyFinding(f[0], { "02-bid-big.md": bidText("KES 1,200,000") })).toBe(true);
  });

  test("does not flag a bid at or under the ceiling", () => {
    const bids: BidDoc[] = [{ bidder: "Ok", source: "02-bid-ok.md", text: bidText("KES 1,000,000"), value: 1000000, currency: "KES" }];
    expect(budgetFindings(bids, NOTICE, "01-tender-notice.md")).toHaveLength(0);
  });

  test("a markdown value outlier is flagged and passes the self-check against its bid", () => {
    const text = (v: string) => bidText(v);
    const bids: BidDoc[] = [
      { bidder: "A", source: "02-bid-a.md", text: text("KES 500,000"), value: 500000, currency: "KES" },
      { bidder: "B", source: "03-bid-b.md", text: text("KES 520,000"), value: 520000, currency: "KES" },
      { bidder: "C", source: "04-bid-c.md", text: text("KES 1,400,000"), value: 1400000, currency: "KES" },
    ];
    const f = runRules(bids, "", "01-tender-notice.md").find((x) => x.rule === "R-VALUE-OUTLIER" && x.item === "C");
    expect(f).toBeDefined();
    expect(f?.citation).toBe("04-bid-c.md, bid value");
    expect(verifyFinding(f!, { "04-bid-c.md": text("KES 1,400,000") })).toBe(true);
  });
});

describe("licences and pending approvals", () => {
  test("flags a bid line stating a licence as expired, and passes the self-check", () => {
    const text = "# BID\n- PPB wholesaler licence \u2014 licence issued January 2025\u2013expired\n";
    const bids: BidDoc[] = [{ bidder: "Eq", source: "03-bid-eq.md", text }];
    const f = expiredLicenceFindings(bids);
    expect(f).toHaveLength(1);
    expect(f[0].rule).toBe("R-LICENCE-EXPIRED");
    expect(verifyFinding(f[0], { "03-bid-eq.md": text })).toBe(true);
  });

  test("does not flag an expired line that is not about a credential", () => {
    const bids: BidDoc[] = [{ bidder: "Eq", source: "03-bid-eq.md", text: "The offer expired last week." }];
    expect(expiredLicenceFindings(bids)).toHaveLength(0);
  });

  test("a document still in review does not count as provided", () => {
    expect(bidNamesDocument("- Radiation Protection Board type-approval \u2014 submitted, approval in review", "Radiation Protection Board")).toBe(false);
    expect(bidNamesDocument("- Radiation Protection Board type-approval \u2014 attached", "Radiation Protection Board")).toBe(true);
  });

  test("a required document named but pending is reported as named-not-provided, quoting the bid line", () => {
    const notice = "- [REQUIRED] PPB wholesaler licence\n";
    const bids: BidDoc[] = [
      { bidder: "Eq", source: "03-bid-eq.md", text: "- PPB wholesaler licence — application pending" },
      { bidder: "Other", source: "03-bid-other.md", text: "- Tax certificate — attached" },
    ];
    const [eq, other] = docMissingFindings(bids, notice, "01-tender-notice.md");
    expect(eq.evidence).toContain("names it but does not provide it");
    expect(eq.evidence).toContain("application pending");
    expect(other.evidence).toContain("does not reference it");
    expect(bidLineNamingDocument("- Tax certificate — attached", "ppb wholesaler licence")).toBeNull();
  });

  test("rule findings are not truncated: more than six are returned", () => {
    const bids: BidDoc[] = Array.from({ length: 8 }, (_, i) => ({
      bidder: `Bidder ${i}`,
      source: `0${i + 2}-bid-${i}.md`,
      text: "| Item A | 1 | KES 10 |\n" + "Alternative offered for item.\n",
    }));
    const specs = runRules(bids, "", "01-tender-notice.md").filter((f) => f.rule === "R-SPEC-DEVIATION");
    expect(specs.length).toBe(8);
  });
});
