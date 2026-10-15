import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  clientKey,
  createSession,
  hashPassword,
  publicUser,
  rateLimit,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * POST /api/auth/register — create an account and open a session.
 * Body: { name, email, password, organization? }
 * 201 → { user } + httpOnly session cookie
 * 400 → { error, errors? }  409 → email taken  429 → rate limited
 */
export async function POST(req: NextRequest) {
  if (!rateLimit(clientKey(req, "register"), 10, 15 * 60_000)) {
    return NextResponse.json(
      { error: "Too many attempts from this network. Try again in a few minutes." },
      { status: 429 }
    );
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const organization =
    typeof body.organization === "string" ? body.organization.trim() : "";

  const errors: Record<string, string> = {};
  if (name.length < 2 || name.length > 80) errors.name = "Enter your full name (2–80 characters).";
  if (!EMAIL_RE.test(email)) errors.email = "Enter a valid work email.";
  if (password.length < 8) errors.password = "Use at least 8 characters.";
  else if (password.length > 128) errors.password = "Maximum 128 characters.";
  if (organization.length > 120) errors.organization = "Keep it under 120 characters.";
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: "Check the highlighted fields.", errors }, { status: 400 });
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      {
        error: "An account with this email already exists.",
        errors: { email: "This email already has an account — sign in instead." },
      },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);
  const user = await db.user.create({
    data: { name, email, password: passwordHash, organization: organization || null },
  });

  const { token, expiresAt } = await createSession(user.id, true);
  const res = NextResponse.json({ user: publicUser(user) }, { status: 201 });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  return res;
}
