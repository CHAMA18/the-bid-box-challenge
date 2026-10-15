import { NextResponse, type NextRequest } from "next/server";
import { getUserFromToken, SESSION_COOKIE } from "@/lib/auth";
import { recordSummons } from "@/lib/committee";

/**
 * POST /api/committee/summon — issue a real quorum call: the summons is
 * persisted (SystemSetting.committee_last_summons_at) and the recomputed
 * state — with the actual number of seats still pending — is returned.
 */
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    const user = await getUserFromToken(token).catch(() => null);
    const state = await recordSummons(user);
    return NextResponse.json(state);
  } catch (err) {
    console.error("[api/committee/summon] failed:", err);
    return NextResponse.json({ error: "summons could not be recorded" }, { status: 500 });
  }
}
