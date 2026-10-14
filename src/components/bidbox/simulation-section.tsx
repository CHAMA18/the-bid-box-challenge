"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, CircleCheck, Hand, Hourglass, Play, RefreshCw, RotateCcw, TriangleAlert } from "lucide-react";

type Phase = "idle" | "running" | "awaiting-signoff";
type Gate3State = "pending" | "auditing" | "flagged";

const INITIAL_LOGS: ReactNode[] = [
  <div key="l1" className="text-outline">
    [00:00:01] Initializing Sovereign Agent Planner (Qwen-2.5-72B-Instruct)...
  </div>,
  <div key="l2" className="text-on-surface-variant">
    [00:00:03] Binding MCP Server: <span className="text-primary">&quot;ocds-ppra-live-fetcher&quot;</span>
  </div>,
  <div key="l3" className="text-on-surface-variant">
    [00:00:04] Binding Custom MCP Server:{" "}
    <span className="text-secondary">&quot;tender-anomaly-detector&quot;</span>
  </div>,
  <div key="l4" className="text-outline">
    &gt; Ready for tool orchestration sequence.
  </div>,
  <div key="l5" className="text-tertiary flex items-center gap-1">
    <span className="inline-block w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
    Awaiting run trigger...
  </div>,
];

const BIDDERS = [
  {
    name: "AfriPharma Logistics Ltd",
    amount: "KES 478,500,000",
    variance: "-0.7%",
    varianceClasses: "text-primary",
    status: "CLEAR",
    statusClasses: "text-primary",
    striped: false,
  },
  {
    name: "Equator Health Consortia",
    amount: "KES 612,400,000",
    variance: "+27.1%",
    varianceClasses: "text-error",
    status: "CLEAR",
    statusClasses: "text-primary",
    striped: true,
  },
  {
    name: "Nile BioMed Sovereign",
    amount: "KES 465,000,000",
    variance: "-3.5% (FLAG)",
    varianceClasses: "text-tertiary font-bold",
    status: "DISCREPANCY",
    statusClasses: "text-tertiary",
    striped: false,
  },
];

export function SimulationSection() {
  const [logs, setLogs] = useState<ReactNode[]>(INITIAL_LOGS);
  const [phase, setPhase] = useState<Phase>("idle");
  const [gate3, setGate3] = useState<Gate3State>("pending");

  const logsRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Auto-scroll the trace inspector like the original terminal.
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  // Clear pending timers on unmount.
  useEffect(() => {
    return () => timersRef.current.forEach(clearTimeout);
  }, []);

  const appendLog = (node: ReactNode) => setLogs((prev) => [...prev, node]);

  const startSim = () => {
    if (phase === "running") return;
    setPhase("running");
    appendLog(
      <div key={`init-${Date.now()}`} className="text-primary font-bold pt-2">
        &gt;&gt; INITIATING AGENTIC CYCLE [GOV-EVAL-099]...
      </div>
    );

    const steps: Array<{ delay: number; log: ReactNode; effect?: () => void }> = [
      {
        delay: 1000,
        log: (
          <div key="s1" className="text-secondary">
            [MCP CALL] Invoking &quot;ocds_fetch_historical_awards&quot;(tender_type=&quot;pediatric_insulin&quot;,
            region=&quot;EA-CENTRAL&quot;)
          </div>
        ),
      },
      {
        delay: 2200,
        log: (
          <div key="s2" className="text-on-surface-variant">
            [MCP RESPONSE] Received 48 historical award units &bull; Median benchmark: KES 4,200 / unit
          </div>
        ),
      },
      {
        delay: 3500,
        log: (
          <div key="s3" className="text-tertiary">
            [MCP CALL] Invoking custom tool &quot;flag_unit_price_discrepancy&quot;(supplier=&quot;Nile BioMed
            Sovereign&quot;, item_id=&quot;INS-009&quot;)
          </div>
        ),
        effect: () => setGate3("auditing"),
      },
      {
        delay: 4800,
        log: (
          <div key="s4" className="text-error font-bold">
            [ANOMALY DETECTED] Line 43: Cold-chain storage surcharge billed at +340% above benchmark
            standard!
          </div>
        ),
        effect: () => setGate3("flagged"),
      },
      {
        delay: 6000,
        log: (
          <div key="s5" className="text-primary font-bold">
            [MANDATED HUMAN GATE] Consequential threshold reached. Halting autonomous cycle. Dossier saved
            to /reports/audit-8812.json. Awaiting human sign-off.
          </div>
        ),
        effect: () => setPhase("awaiting-signoff"),
      },
    ];

    steps.forEach(({ delay, log, effect }) => {
      timersRef.current.push(
        setTimeout(() => {
          appendLog(log);
          effect?.();
        }, delay)
      );
    });
  };

  const resetSim = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setLogs(INITIAL_LOGS);
    setPhase("idle");
    setGate3("pending");
  };

  const runButtonClasses =
    phase === "awaiting-signoff"
      ? "px-space-md py-space-xs rounded-bb bg-tertiary text-on-tertiary font-body text-label-ui uppercase tracking-wider hover:bg-primary-container transition-all flex items-center gap-1 shadow-md"
      : "px-space-md py-space-xs rounded-bb bg-primary text-on-primary font-body text-label-ui uppercase tracking-wider hover:bg-primary-container transition-all flex items-center gap-1 shadow-md";

  const gate3CardClasses = `p-space-sm rounded-bb flex items-center justify-between transition-all ${
    gate3 === "pending" ? "bg-surface-container" : "bg-surface-container-highest"
  }`;

  const gate3Badge =
    gate3 === "pending"
      ? {
          text: "PENDING",
          classes: "bg-surface-container-high text-on-surface-variant",
        }
      : gate3 === "auditing"
        ? { text: "AUDITING...", classes: "bg-tertiary/20 text-tertiary" }
        : { text: "FLAGGED", classes: "bg-error/20 text-error font-bold" };

  return (
    <section className="w-full px-gutter py-space-xl bg-background" id="sim-sandbox">
      <div className="max-w-7xl mx-auto flex flex-col gap-space-lg">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
          <div className="flex flex-col gap-1 max-w-2xl">
            <span className="font-code text-label-telemetry text-primary uppercase tracking-wider">
              Technical Demonstration
            </span>
            <h2 className="font-display text-headline-lg text-on-surface">
              Interactive Agent Run: 7-to-5 Workbench
            </h2>
            <p className="font-body text-body-md text-on-surface-variant">
              Experience the architectural layout required for your Stage 2 jury review. The 7-column
              dossier scorecard on the left, paired with the 5-column live streaming MCP trace inspector
              on the right.
            </p>
          </div>
          <div className="flex items-center gap-space-xs">
            <button
              className={runButtonClasses}
              id="run-sim-btn"
              onClick={startSim}
              type="button"
              disabled={phase === "running"}
            >
              {phase === "running" ? (
                <>
                  <RefreshCw className="size-[16px] shrink-0 animate-spin" aria-hidden="true" />
                  <span>Running...</span>
                </>
              ) : phase === "awaiting-signoff" ? (
                <>
                  <CircleCheck className="size-[16px] shrink-0" aria-hidden="true" />
                  <span>Human Sign-Off Required</span>
                </>
              ) : (
                <>
                  <Play className="size-[16px] shrink-0" aria-hidden="true" />
                  <span>Simulate Evaluation Run</span>
                </>
              )}
            </button>
            <button
              className="px-space-sm py-space-xs rounded-bb bg-surface-container-high text-on-surface-variant hover:text-on-surface font-body text-label-ui"
              onClick={resetSim}
              type="button"
              aria-label="Reset simulation"
            >
              <RotateCcw className="size-[16px]" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* 12-Column Responsive Workbench Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-start">
          {/* 7 Columns: Tender Dossier & Scorecard */}
          <div className="lg:col-span-7 flex flex-col gap-space-md bg-surface-container-low p-space-md rounded-bb-xl shadow-xl">
            {/* Active Tender Header */}
            <div className="flex flex-wrap items-center justify-between gap-space-xs pb-space-xs">
              <div className="flex items-center gap-space-xs">
                <span className="px-space-xs py-0.5 rounded-bb bg-surface-container-highest text-secondary font-code text-label-telemetry">
                  TENDER ID: KE-KEMSA-2025-MED-8812
                </span>
                <span className="font-code text-label-telemetry text-primary flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                  ACTIVE DOSSIER
                </span>
              </div>
              <span className="font-code text-label-code text-tertiary">EST. VALUE: KES 482,000,000</span>
            </div>

            <div className="p-space-sm rounded-bb bg-surface-container flex flex-col gap-1">
              <h4 className="font-display text-headline-sm text-on-surface">
                Procurement of Pediatric Cold-Chain Insulin Units
              </h4>
              <p className="font-body text-body-sm text-on-surface-variant">
                Buyer: Kenya Medical Supplies Authority (KEMSA) • 4 Registered Bidding Consortia
              </p>
            </div>

            {/* Evaluation Rubric Progress Items */}
            <div className="flex flex-col gap-space-sm">
              <div className="flex items-center justify-between font-code text-label-telemetry text-on-surface-variant">
                <span>EVALUATION CRITERIA GATES</span>
                <span className={gate3 === "flagged" ? "text-error" : undefined}>
                  {gate3 === "flagged" ? "STEP 3 OF 4: ANOMALY IDENTIFIED" : "STEP 2 OF 4 VERIFIED"}
                </span>
              </div>

              {/* Gate 1 */}
              <div className="p-space-sm rounded-bb bg-surface-container flex items-center justify-between">
                <div className="flex items-center gap-space-sm">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                    <Check className="size-[14px]" aria-hidden="true" />
                  </span>
                  <div className="flex flex-col">
                    <span className="font-body text-body-sm text-on-surface font-semibold">
                      Tax &amp; Statutory Debarment Verification
                    </span>
                    <span className="font-code text-label-telemetry text-on-surface-variant">
                      Cross-referenced against Kenya KRA &amp; PPRA Blacklist
                    </span>
                  </div>
                </div>
                <span className="px-space-xs py-0.5 rounded-bb bg-primary/20 text-primary font-code text-label-telemetry">
                  PASSED
                </span>
              </div>

              {/* Gate 2 */}
              <div className="p-space-sm rounded-bb bg-surface-container flex items-center justify-between">
                <div className="flex items-center gap-space-sm">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                    <Check className="size-[14px]" aria-hidden="true" />
                  </span>
                  <div className="flex flex-col">
                    <span className="font-body text-body-sm text-on-surface font-semibold">
                      Technical Specification Compliance (WHO PQ)
                    </span>
                    <span className="font-code text-label-telemetry text-on-surface-variant">
                      Insulin Glargine 100IU/ml cold-chain compliance (2°C - 8°C)
                    </span>
                  </div>
                </div>
                <span className="px-space-xs py-0.5 rounded-bb bg-primary/20 text-primary font-code text-label-telemetry">
                  PASSED
                </span>
              </div>

              {/* Gate 3: Flagged Gate */}
              <div className={gate3CardClasses} id="gate-3-card">
                <div className="flex items-center gap-space-sm">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      gate3 === "flagged" ? "bg-error/20 text-error" : "bg-tertiary/20 text-tertiary"
                    }`}
                    id="gate-3-icon"
                  >
                    {gate3 === "flagged" ? (
                      <TriangleAlert className="size-[14px]" aria-hidden="true" />
                    ) : (
                      <Hourglass className="size-[14px]" aria-hidden="true" />
                    )}
                  </span>
                  <div className="flex flex-col">
                    <span className="font-body text-body-sm text-on-surface font-semibold">
                      Unit Price Variance &amp; Benchmark Audit
                    </span>
                    <span
                      className={`font-code text-label-telemetry ${
                        gate3 === "flagged" ? "text-error" : "text-on-surface-variant"
                      }`}
                      id="gate-3-desc"
                    >
                      {gate3 === "flagged"
                        ? "Flag: Cold-chain line item variance (+340%)"
                        : "Awaiting MCP Tool Execution..."}
                    </span>
                  </div>
                </div>
                <span
                  className={`px-space-xs py-0.5 rounded-bb font-code text-label-telemetry ${gate3Badge.classes}`}
                  id="gate-3-badge"
                >
                  {gate3Badge.text}
                </span>
              </div>

              {/* Gate 4: Non-Award Human Review Rule */}
              <div className="p-space-sm rounded-bb bg-surface-container-high flex items-center justify-between">
                <div className="flex items-center gap-space-sm">
                  <span className="w-6 h-6 rounded-full bg-secondary/20 text-secondary flex items-center justify-center">
                    <Hand className="size-[14px]" aria-hidden="true" />
                  </span>
                  <div className="flex flex-col">
                    <span className="font-body text-body-sm text-on-surface font-semibold">
                      Final Human Statutory Committee Gate
                    </span>
                    <span className="font-code text-label-telemetry text-secondary">
                      Agent Halts Execution • Awaiting Human Signature
                    </span>
                  </div>
                </div>
                <span className="px-space-xs py-0.5 rounded-bb bg-secondary/20 text-secondary font-code text-label-telemetry">
                  MANDATED PAUSE
                </span>
              </div>
            </div>

            {/* Bidder Evaluation Matrix Extract */}
            <div className="p-space-sm rounded-bb bg-surface-container-lowest flex flex-col gap-space-xs">
              <span className="font-code text-label-telemetry text-on-surface-variant uppercase">
                EVALUATED BIDDERS (OCDS RELEASES)
              </span>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-body text-body-sm text-on-surface">
                  <thead>
                    <tr className="text-on-surface-variant font-code text-label-telemetry uppercase">
                      <th className="py-1">Bidder Legal Name</th>
                      <th className="py-1">Bid Amount</th>
                      <th className="py-1">Variance</th>
                      <th className="py-1 text-right">Debarment Status</th>
                    </tr>
                  </thead>
                  <tbody className="space-y-1">
                    {BIDDERS.map((bidder) => (
                      <tr key={bidder.name} className={bidder.striped ? "bg-surface-container/50" : undefined}>
                        <td className="py-1.5 font-semibold">{bidder.name}</td>
                        <td className="py-1.5 font-code text-label-code">{bidder.amount}</td>
                        <td className={`py-1.5 font-code text-label-telemetry ${bidder.varianceClasses}`}>
                          {bidder.variance}
                        </td>
                        <td
                          className={`py-1.5 text-right font-code text-label-telemetry ${bidder.statusClasses}`}
                        >
                          {bidder.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 5 Columns: Live Streaming MCP Trace Inspector */}
          <div className="lg:col-span-5 flex flex-col rounded-bb-xl bg-surface-container-lowest overflow-hidden shadow-2xl">
            {/* Terminal Header */}
            <div className="p-space-sm bg-surface-container-high flex items-center justify-between">
              <div className="flex items-center gap-space-xs font-code text-label-telemetry text-on-surface">
                <span className="w-2.5 h-2.5 rounded-full bg-error"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-tertiary"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                <span className="ml-2 text-primary font-bold">mcp-server-governance-eval</span>
              </div>
              <span className="font-code text-label-telemetry text-secondary">JSON-RPC 2.0</span>
            </div>

            {/* Trace Logs Container */}
            <div
              className="p-space-md font-code text-label-code text-on-surface-variant flex flex-col gap-space-xs h-96 overflow-y-auto"
              id="terminal-logs"
              ref={logsRef}
            >
              {logs}
            </div>

            {/* Terminal Status Bar */}
            <div className="p-space-xs bg-surface-container flex items-center justify-between font-code text-label-telemetry text-on-surface-variant">
              <span>Tokens: 1,420 / 8,192</span>
              <span className="text-primary">Open-Weights Compliant</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
