import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { clearedCookieOptions, SESSION_COOKIE } from "@/lib/auth";

/**
 * POST /api/auth/logout — revoke the current session and clear the cookie.
 */
export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { token } }).catch(() => undefined);
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", clearedCookieOptions());
  return res;
}
