import { NextRequest, NextResponse } from "next/server";

/**
 * Same-origin gateway.
 *
 * The frontend calls the quorum-mcp sidecar as `/api/*?XTransformPort=3031`,
 * relying on the Caddy gateway (:81) to rewrite the port. When that gateway
 * is not running the request lands here on the Next.js server — so we do the
 * forwarding ourselves instead of 404ing.
 *
 * Only requests that carry an explicit `XTransformPort` are proxied, and only
 * to the sidecar port — anything else falls through with a 404, exactly as
 * before, so existing Next API routes (/api/auth, /api/contact, …) keep
 * working untouched.
 */

const ALLOWED_PORTS = new Set(["3031"]);
const UPSTREAM_HOST = "127.0.0.1";

async function proxy(req: NextRequest) {
  const port = req.nextUrl.searchParams.get("XTransformPort");
  if (!port || !ALLOWED_PORTS.has(port)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const url = new URL(req.url);
  url.searchParams.delete("XTransformPort");
  const search = url.searchParams.toString();
  const target = `http://${UPSTREAM_HOST}:${port}${url.pathname}${search ? `?${search}` : ""}`;

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers: req.headers.get("content-type")
        ? { "content-type": req.headers.get("content-type") as string }
        : undefined,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer(),
      cache: "no-store",
    });
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    return NextResponse.json(
      { error: `sidecar on :${port} not reachable` },
      { status: 502 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
