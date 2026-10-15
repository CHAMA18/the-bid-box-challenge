import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  clientKey,
  createSession,
  publicUser,
  rateLimit,
  sessionCookieOptions,
  SESSION_COOKIE,
  verifyPassword,
} from "@/lib/auth";

/**
 * POST /api/auth/login — verify credentials and open a session.
 * Body: { email, password, remember? }
 * 200 → { user } + httpOnly session cookie (30 days, or 1 day without remember)
 * 400 → { error, errors? }  401 → bad credentials  429 → rate limited
 */
export async function POST(req: NextRequest) {
  if (!rateLimit(clientKey(req, "login"), 8, 15 * 60_000)) {
    return NextResponse.json(
      { error: "Too many attempts. For security, wait a few minutes before trying again." },
      { status: 429 }
    );
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const remember = body.remember !== false;

  const errors: Record<string, string> = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = "Enter a valid work email.";
  if (password.length === 0) errors.password = "Enter your password.";
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: "Check the highlighted fields.", errors }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.password))) {
    return NextResponse.json(
      { error: "Incorrect email or password. Check your credentials and try again." },
      { status: 401 }
    );
  }

  const { token, expiresAt } = await createSession(user.id, remember);
  const res = NextResponse.json({ user: publicUser(user) });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  return res;
}
