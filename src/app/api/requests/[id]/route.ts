import type { NextRequest } from "next/server";
import { isOrganizer } from "@/lib/auth";
import { deleteRequest } from "@/lib/data";
import { fail, json, readJson, sameOrigin, serverError } from "@/lib/http";
import { cleanText } from "@/lib/normalize";

export const dynamic = "force-dynamic";

/**
 * Remove a request.
 * - Organizers (valid cookie) can remove any request.
 * - Everyone else can only remove a request made under the staffId they send
 *   (the same honor system as picking your photo).
 */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return fail("Cross-site request blocked.", 403);
  const { id: rawId } = await ctx.params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) return fail("Bad request id.");

  try {
    if (isOrganizer(req)) {
      const ok = await deleteRequest(id, null);
      return ok ? json({ ok: true }) : fail("That request is already gone.", 404);
    }
    const body = await readJson(req);
    const staffId = cleanText(body?.staffId, 64);
    if (!staffId) return fail("Pick your photo first.", 401);
    const ok = await deleteRequest(id, staffId);
    return ok ? json({ ok: true }) : fail("You can only remove your own requests.", 403);
  } catch (err) {
    return serverError(err);
  }
}
