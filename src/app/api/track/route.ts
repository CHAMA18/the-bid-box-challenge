import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/** GET /api/track?code=GXL-4821-BGD — shipment + ordered journey events. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ error: "A tracking code is required." }, { status: 400 });
  }

  try {
    const shipment = await db.shipment.findUnique({
      where: { code },
      include: { events: { orderBy: { sortOrder: "asc" } } },
    });

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
    }

    return NextResponse.json({ shipment });
  } catch (err) {
    console.error("[api/track]", err);
    return NextResponse.json({ error: "Tracking service unavailable." }, { status: 500 });
  }
}
