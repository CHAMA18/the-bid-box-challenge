import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ORIGIN_RATES, DESTINATION_RATES, SERVICES } from "@/lib/data";

const QuoteSchema = z.object({
  origin: z.string().min(1),
  destination: z.string().min(1),
  weightKg: z.number().positive().max(25000),
  service: z.string().min(1),
  insurance: z.boolean().default(false),
});

/** POST /api/quote — instant lane pricing with a full cost breakdown. */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = QuoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid quote parameters." }, { status: 400 });
  }
  const { origin, destination, weightKg, service, insurance } = parsed.data;

  const o = ORIGIN_RATES[origin];
  const d = DESTINATION_RATES[destination];
  const svc = SERVICES.find((s) => s.id === service);
  if (!o || !d || !svc) {
    return NextResponse.json({ error: "Unknown lane or service." }, { status: 400 });
  }

  // Pricing model: (origin rate + destination add-on) × weight, service-adjusted,
  // with a fuel & security surcharge and optional insurance at 1.5% of estimate.
  const perKg = (o.perKg + d.perKg) * svc.multiplier;
  const freight = perKg * weightKg;
  const handling = o.handling;
  const surcharge = (freight + handling) * 0.09;
  const transitDays = Math.max(
    1,
    Math.round(o.days * (svc.id === "EXPRESS_AIR" ? 1 : svc.id === "STANDARD_ROAD" ? 3.2 : 9)) + d.extraDays
  );

  let subtotal = freight + handling + surcharge;
  const insuranceFee = insurance ? subtotal * 0.015 : 0;
  subtotal += insuranceFee;

  const priceMin = Math.round(subtotal * 0.94);
  const priceMax = Math.round(subtotal * 1.1);

  const breakdown = [
    { label: `Freight — ${weightKg.toLocaleString()} kg @ $${perKg.toFixed(2)}/kg`, amount: Math.round(freight * 100) / 100 },
    { label: "Handling & documentation", amount: Math.round(handling * 100) / 100 },
    { label: "Fuel & security surcharge", amount: Math.round(surcharge * 100) / 100 },
  ];
  if (insurance) {
    breakdown.push({ label: "Galina Shield insurance (1.5%)", amount: Math.round(insuranceFee * 100) / 100 });
  }

  try {
    await db.quoteRequest.create({
      data: { origin, destination, weightKg, service, insurance, priceMin, priceMax, transitDays },
    });
  } catch (err) {
    console.error("[api/quote] persist failed", err); // non-fatal
  }

  return NextResponse.json({ priceMin, priceMax, transitDays, breakdown });
}
