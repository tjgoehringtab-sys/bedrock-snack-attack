import { NextResponse, type NextRequest } from "next/server";
import { isOrganizer } from "./auth";

export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function fail(message: string, status = 400): NextResponse {
  return json({ error: message }, status);
}

/**
 * Basic cross-site protection for state-changing requests: when the browser
 * sends an Origin header it must match this site's host.
 */
export function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin fetches from some browsers / curl
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function readJson(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Returns an error response if the caller is not a signed-in organizer, otherwise null. */
export function requireOrganizer(req: NextRequest): NextResponse | null {
  if (!sameOrigin(req)) return fail("Cross-site request blocked.", 403);
  if (!isOrganizer(req)) return fail("Organizer PIN required.", 401);
  return null;
}

export function serverError(err: unknown): NextResponse {
  console.error(err);
  return fail("The snack server tripped over something. Try again in a sec.", 500);
}
