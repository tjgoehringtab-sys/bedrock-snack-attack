import { cookies } from "next/headers";
import { ORGANIZER_COOKIE, verifyOrganizerToken } from "./auth";

/** For server components: is the current visitor a signed-in organizer? */
export async function organizerFromCookies(): Promise<boolean> {
  const jar = await cookies();
  return verifyOrganizerToken(jar.get(ORGANIZER_COOKIE)?.value);
}
