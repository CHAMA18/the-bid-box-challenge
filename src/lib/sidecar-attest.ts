import { createHmac } from "crypto";

/**
 * Gateway attestation — the web layer vouches for WHO acts.
 *
 * The Next.js server owns the session (httpOnly cookie). When it forwards a
 * state-changing request to the quorum-mcp sidecar it signs the request with
 * an HMAC over (method, path, actor, ts); the sidecar refuses any mutation
 * that arrives without this seal. The approving identity therefore cannot be
 * typed by the caller — it is derived from the verified session.
 *
 * The formula MUST mirror store.ts (attestSignature / attestVerify) exactly.
 * GATE_SECRET overrides the shipped development default on real deployments.
 */
export const ATTEST_SECRET = process.env.GATE_SECRET?.trim() || "quorum-dev-attest-secret";

export function attestSignature(method: string, path: string, actor: string, ts: number): string {
  return createHmac("sha256", ATTEST_SECRET).update(`${method}|${path}|${actor}|${ts}`).digest("hex");
}
