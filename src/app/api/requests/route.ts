import type { NextRequest } from "next/server";
import { FALLBACK_CATEGORY, CATEGORIES } from "@config/snacks";
import { createRequest, getRequests } from "@/lib/data";
import { fail, json, readJson, sameOrigin, serverError } from "@/lib/http";
import { cleanText } from "@/lib/normalize";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return json({ requests: await getRequests() });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail("Cross-site request blocked.", 403);
  const body = await readJson(req);
  if (!body) return fail("Send JSON.");

  const staffId = cleanText(body.staffId, 64);
  const item = cleanText(body.item, 60);
  const details = cleanText(body.details, 140) || null;
  const categoryRaw = cleanText(body.category, 32);
  const category = CATEGORIES.some((c) => c.id === categoryRaw) ? categoryRaw : FALLBACK_CATEGORY;

  if (!staffId) return fail("Pick your photo first.");
  if (!item) return fail("Tell us what snack you want.");

  try {
    const result = await createRequest({ staffId, category, item, details });
    if (!result.ok) return fail(result.error, result.status);
    return json({ request: result.request, duplicate: result.duplicate }, result.duplicate ? 200 : 201);
  } catch (err) {
    return serverError(err);
  }
}
