import type { NextRequest } from "next/server";
import { resetRetreat } from "@/lib/data";
import { fail, json, readJson, requireOrganizer, serverError } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Organizer only: wipe every request and checkmark. Body must be { confirm: "SNACKS" }. */
export async function POST(req: NextRequest) {
  const denied = requireOrganizer(req);
  if (denied) return denied;
  const body = await readJson(req);
  if (body?.confirm !== "SNACKS") return fail('Type SNACKS to confirm the reset.');
  try {
    const removed = await resetRetreat();
    return json({ ok: true, removed });
  } catch (err) {
    return serverError(err);
  }
}
