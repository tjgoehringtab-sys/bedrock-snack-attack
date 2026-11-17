import { getActiveStaff } from "@/lib/data";
import { json, serverError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return json({ staff: await getActiveStaff() });
  } catch (err) {
    return serverError(err);
  }
}
