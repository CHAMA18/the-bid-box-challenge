import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const ContactSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(200),
  company: z.string().max(160).optional().or(z.literal("")),
  message: z.string().min(10).max(4000),
});

/** POST /api/contact — merchant enquiry intake. */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = ContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please provide a name, a valid email and a message of at least 10 characters." },
      { status: 400 }
    );
  }

  const { name, email, company, message } = parsed.data;

  try {
    await db.contactMessage.create({
      data: { name, email, company: company || null, message },
    });
  } catch (err) {
    console.error("[api/contact]", err);
    return NextResponse.json({ error: "Could not save your message." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
