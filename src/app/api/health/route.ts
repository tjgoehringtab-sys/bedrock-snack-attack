import { query } from "@/lib/db";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Health check for Railway: 200 when the app can reach Postgres. */
export async function GET() {
  try {
    await query("SELECT 1");
    return json({ ok: true, db: "connected" });
  } catch (err) {
    console.error("Health check failed:", err);
    return json({ ok: false, db: "unreachable" }, 503);
  }
}
