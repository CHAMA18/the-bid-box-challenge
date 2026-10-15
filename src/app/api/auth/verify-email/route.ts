import { NextResponse, type NextRequest } from "next/server";
import { findUserByEmail, markUserVerified } from "@/lib/db";
import {
  clientKey,
  createSession,
  publicUser,
  rateLimit,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth";
import { verifyFirebaseIdToken } from "@/lib/firebase-identity";

/**
 * POST /api/auth/verify-email — the user clicked the Firebase verification link.
 * Body: { idToken } (fresh Firebase ID token for the verified address)
 * 200 → { user } + httpOnly session cookie
 * 401 → token rejected  403 → address not verified yet  404 → no account for it
 */
export async function POST(req: NextRequest) {
  if (!rateLimit(clientKey(req, "verify-email"), 20, 15 * 60_000)) {
    return NextResponse.json({ error: "Too many checks. Wait a few minutes." }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as { idToken?: unknown } | null;
  const idToken = typeof body?.idToken === "string" ? body.idToken : "";
  const identity = await verifyFirebaseIdToken(idToken);
  if (!identity) {
    return NextResponse.json(
      { error: "We could not confirm your session. Sign in again and retry." },
      { status: 401 }
    );
  }
  if (!identity.emailVerified) {
    return NextResponse.json(
      { code: "NOT_VERIFIED", error: "Your email isn't verified yet. Open the link we sent, then try again." },
      { status: 403 }
    );
  }

  let user = findUserByEmail(identity.email);
  if (!user) {
    return NextResponse.json(
      { error: "No Quorum account exists for this email. Create one first." },
      { status: 404 }
    );
  }
  if (!user.emailVerified) {
    user = markUserVerified(user.id) ?? user;
  }

  const { token, expiresAt } = await createSession(user.id, true);
  const res = NextResponse.json({ user: publicUser(user) });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  return res;
}
