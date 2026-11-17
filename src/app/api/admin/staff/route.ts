import type { NextRequest } from "next/server";
import { PHOTO_PATTERN, createStaff, getAllStaff, listStaffPhotos } from "@/lib/data";
import { fail, json, readJson, requireOrganizer, serverError } from "@/lib/http";
import { cleanText } from "@/lib/normalize";

export const dynamic = "force-dynamic";

/** Organizer: everyone (including hidden people) + the photo files available. */
export async function GET(req: NextRequest) {
  const denied = requireOrganizer(req);
  if (denied) return denied;
  try {
    const [staff, photos] = await Promise.all([getAllStaff(), listStaffPhotos()]);
    return json({ staff, photos });
  } catch (err) {
    return serverError(err);
  }
}

/** Organizer: add a person. Body: { firstName, lastName?, photo? } */
export async function POST(req: NextRequest) {
  const denied = requireOrganizer(req);
  if (denied) return denied;
  const body = await readJson(req);
  const firstName = cleanText(body?.firstName, 40);
  const lastName = cleanText(body?.lastName, 40);
  const photoRaw = cleanText(body?.photo, 120);
  if (!firstName) return fail("A first name is required.");
  if (photoRaw && !PHOTO_PATTERN.test(photoRaw)) return fail("Photo must be a file in public/staff.");
  try {
    const person = await createStaff({ firstName, lastName, photo: photoRaw || null });
    return json({ staff: person }, 201);
  } catch (err) {
    return serverError(err);
  }
}
