import { describe, expect, test } from "bun:test";
import {
  approverAllowed,
  callLlama,
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

describe("drafting model: open-weights Llama, in-region endpoint", () => {
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
