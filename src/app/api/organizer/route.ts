import type { NextRequest } from "next/server";
import {
  ORGANIZER_COOKIE,
  checkPin,
  clearPinAttempts,
  clientIp,
  createSessionToken,
  isOrganizer,
  organizerConfigured,
  pinAttemptAllowed,
  recordFailedPin,
} from "@/lib/auth";
import { fail, json, readJson, sameOrigin } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Is this browser signed in as an organizer? */
export async function GET(req: NextRequest) {
  return json({ organizer: isOrganizer(req), configured: organizerConfigured() });
}

/** Sign in with the organizer PIN. Body: { pin } */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail("Cross-site request blocked.", 403);
  if (!organizerConfigured()) {
    return fail("Organizer mode is off. Set ORGANIZER_PIN in Railway's variables to turn it on.", 503);
  }
  const ip = clientIp(req);
  if (!pinAttemptAllowed(ip)) return fail("Too many wrong guesses. Take a snack break and try again in 10 minutes.", 429);

  const body = await readJson(req);
  if (!checkPin(body?.pin)) {
    recordFailedPin(ip);
    return fail("That's not the PIN. Nice try though.", 401);
  }
  clearPinAttempts(ip);

  const { token, maxAge } = createSessionToken();
  const res = json({ organizer: true });
  res.cookies.set(ORGANIZER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // HTTPS on Railway (TLS ends at Railway's proxy); plain http on localhost.
    secure: req.headers.get("x-forwarded-proto") === "https" || req.nextUrl.protocol === "https:",
    path: "/",
    maxAge,
  });
  return res;
}

/** Sign out. */
export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) return fail("Cross-site request blocked.", 403);
  const res = json({ organizer: false });
  res.cookies.set(ORGANIZER_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}
