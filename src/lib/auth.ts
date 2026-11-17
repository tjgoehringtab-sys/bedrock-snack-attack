import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

/**
 * Organizer access.
 * The PIN lives only in the ORGANIZER_PIN environment variable on the server.
 * A correct PIN earns a signed, httpOnly cookie; every protected API route
 * checks that cookie on the server. Changing the PIN logs everyone out.
 */
export const ORGANIZER_COOKIE = "snack_organizer";
const SESSION_DAYS = 30;

function pin(): string | null {
  const p = process.env.ORGANIZER_PIN?.trim();
  return p ? p : null;
}

export function organizerConfigured(): boolean {
  return pin() !== null;
}

function signingKey(): Buffer {
  return createHash("sha256")
    .update(`snack-attack:${pin()}:${process.env.SESSION_SECRET ?? ""}`)
    .digest();
}

function sign(payload: string): string {
  return createHmac("sha256", signingKey()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function checkPin(candidate: unknown): boolean {
  const real = pin();
  if (!real || typeof candidate !== "string") return false;
  return safeEqual(candidate.trim(), real);
}

export function createSessionToken(): { token: string; maxAge: number } {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  const exp = Math.floor(Date.now() / 1000) + maxAge;
  const payload = `organizer.${exp}`;
  return { token: `${payload}.${sign(payload)}`, maxAge };
}

export function isOrganizer(req: NextRequest): boolean {
  return verifyOrganizerToken(req.cookies.get(ORGANIZER_COOKIE)?.value);
}

export function verifyOrganizerToken(token: string | undefined): boolean {
  if (!pin() || !token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "organizer") return false;
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || exp < Date.now() / 1000) return false;
  return safeEqual(parts[2], sign(`${parts[0]}.${parts[1]}`));
}

/* ---- Brute-force protection for PIN guesses (per IP, in memory) ---- */
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;

export function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

export function pinAttemptAllowed(ip: string): boolean {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || rec.resetAt < now) return true;
  return rec.count < MAX_ATTEMPTS;
}

export function recordFailedPin(ip: string): void {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || rec.resetAt < now) attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  else rec.count++;
}

export function clearPinAttempts(ip: string): void {
  attempts.delete(ip);
}
