/**
 * MCP sidecar boot — shared by instrumentation (server start) and the
 * /api/mcp-ensure route (self-heal on first use).
 *
 * The Next.js server process is long-lived in this environment; the
 * quorum-mcp sidecar is spawned detached from it, so the live agent stack
 * (MCP surface, audit log, human gate) is always up for evaluators.
 */

export type McpBootResult = "running" | "spawned" | "unavailable";

const PORT = 3031;

async function portInUse(): Promise<boolean> {
  try {
    const net = await import("node:net");
    return await new Promise<boolean>((resolve) => {
      const s = net.createConnection({ port: PORT, host: "127.0.0.1" });
      s.once("connect", () => {
        s.destroy();
        resolve(true);
      });
      s.once("error", () => resolve(false));
      setTimeout(() => {
        s.destroy();
        resolve(false);
      }, 1200);
    });
  } catch {
    return false;
  }
}

export async function ensureMcpSidecar(): Promise<McpBootResult> {
  if (process.env.NEXT_RUNTIME === "edge") return "unavailable";
  try {
    if (await portInUse()) return "running";

    const { spawn } = await import("node:child_process");
    const child = spawn("bun", ["mini-services/quorum-mcp/index.ts"], {
      cwd: process.cwd(),
      detached: true,
      stdio: "ignore",
      env: process.env,
    });
    child.unref();

    /* Give the sidecar a moment, then confirm it took the port. */
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 400));
      if (await portInUse()) return "spawned";
    }
    return "unavailable";
  } catch {
    return "unavailable";
  }
}
