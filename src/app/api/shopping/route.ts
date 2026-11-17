import type { NextRequest } from "next/server";
import { isOrganizer } from "@/lib/auth";
import { getShoppingList, setPurchased } from "@/lib/data";
import { fail, json, readJson, requireOrganizer, serverError } from "@/lib/http";
import { cleanText } from "@/lib/normalize";

export const dynamic = "force-dynamic";

/** Everyone can read the combined list. */
export async function GET(req: NextRequest) {
  try {
    return json({ items: await getShoppingList(), organizer: isOrganizer(req) });
  } catch (err) {
    return serverError(err);
  }
}

/** Only organizers can check items off. Body: { key: string, purchased: boolean } */
export async function PATCH(req: NextRequest) {
  const denied = requireOrganizer(req);
  if (denied) return denied;
  const body = await readJson(req);
  const key = cleanText(body?.key, 200);
  if (!key || typeof body?.purchased !== "boolean") return fail("Send { key, purchased }.");
  try {
    await setPurchased(key, body.purchased);
    return json({ ok: true, key, purchased: body.purchased });
  } catch (err) {
    return serverError(err);
  }
}
