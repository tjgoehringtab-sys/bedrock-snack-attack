import type { NextRequest } from "next/server";
import { PHOTO_PATTERN, updateStaff } from "@/lib/data";
import { fail, json, readJson, requireOrganizer, serverError } from "@/lib/http";
import { cleanText } from "@/lib/normalize";

export const dynamic = "force-dynamic";

/**
 * Organizer: edit a person. Body may include firstName, lastName,
 * photo (path or null for initials), active (false = hidden from the app).
 * People are hidden rather than deleted so their requests stay attributed.
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = requireOrganizer(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  const body = await readJson(req);
  if (!body) return fail("Send JSON.");

  const patch: { firstName?: string; lastName?: string; photo?: string | null; active?: boolean } = {};
  if ("firstName" in body) {
    const v = cleanText(body.firstName, 40);
    if (!v) return fail("First name can't be blank.");
    patch.firstName = v;
  }
  if ("lastName" in body) patch.lastName = cleanText(body.lastName, 40);
  if ("photo" in body) {
    const v = body.photo === null ? "" : cleanText(body.photo, 120);
    if (v && !PHOTO_PATTERN.test(v)) return fail("Photo must be a file in public/staff.");
    patch.photo = v || null;
  }
  if ("active" in body) {
    if (typeof body.active !== "boolean") return fail("active must be true or false.");
    patch.active = body.active;
  }

  try {
    const person = await updateStaff(cleanText(id, 64), patch);
    return person ? json({ staff: person }) : fail("Person not found.", 404);
  } catch (err) {
    return serverError(err);
  }
}
