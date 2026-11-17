import { ShoppingList } from "@/components/ShoppingList";
import { organizerConfigured } from "@/lib/auth";
import { organizerFromCookies } from "@/lib/auth-token";
import { getShoppingList } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ShoppingPage() {
  const [items, organizer] = await Promise.all([getShoppingList().catch(() => []), organizerFromCookies()]);
  return <ShoppingList initialItems={items} initialOrganizer={organizer} organizerEnabled={organizerConfigured()} />;
}
