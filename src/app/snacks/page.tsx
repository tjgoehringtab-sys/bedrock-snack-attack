import { MySnacks } from "@/components/MySnacks";
import { getRequests } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SnacksPage() {
  const requests = await getRequests().catch(() => []);
  return <MySnacks initialRequests={requests} />;
}
