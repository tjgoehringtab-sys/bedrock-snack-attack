import { SnackWall } from "@/components/SnackWall";
import { getRequests } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function WallPage() {
  const requests = await getRequests().catch(() => []);
  return <SnackWall initialRequests={requests} />;
}
