import { NextResponse, type NextRequest } from "next/server";
import { createOrgPasswordReset, findOrganizationByEmail } from "@/lib/db";
import {
  clientKey,
  CODE_TTL_MS,
  generateResetCode,
  hashResetCode,
  rateLimit,
} from "@/lib/org-auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * POST /api/org/auth/forgot-password — issue a one-time passphrase reset
 * code for an organization account.
 * Body: { email }
 * 200 → { issued: true, code, expiresAt }  the code is shown IN THE PORTAL
 *       (the supplier door has no outbound mail — nothing goes to spam,
 *       nothing depends on a third-party inbox)
 * 200 → { issued: false }                  no organization holds that address
 * 400 → invalid email                      429 → rate limited
 *
 * This door is honest where the rest of the portal is honest: it says
 * plainly when an address is not on the register, the same way sign-in
 * says "Incorrect email or password." The codes themselves are the
 * security story — single-use, 15-minute expiry, only their SHA-256 is
 * stored, and a fresh issuance retires the previous code.
 */
export async function POST(req: NextRequest) {
  if (!rateLimit(clientKey(req, "org-forgot"), 4, 15 * 60_000)) {
    return NextResponse.json(
      { error: "Too many reset requests. For security, wait a few minutes before trying again." },
      { status: 429 }
    );
  }

  const body = (await req.json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Check the highlighted fields.", errors: { email: "Enter the organization's account email." } },
      { status: 400 }
    );
  }

  const org = findOrganizationByEmail(email);
  if (!org) {
    return NextResponse.json({ issued: false });
  }

  const code = generateResetCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);
  createOrgPasswordReset(org.id, hashResetCode(code), expiresAt);

  return NextResponse.json({ issued: true, code, expiresAt: expiresAt.toISOString() });
}
