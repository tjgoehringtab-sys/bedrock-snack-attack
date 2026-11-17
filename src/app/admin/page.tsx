import { AdminPanel } from "@/components/AdminPanel";
import { organizerConfigured } from "@/lib/auth";
import { organizerFromCookies } from "@/lib/auth-token";

export const dynamic = "force-dynamic";

export const metadata = { title: "Organizer tools · Snack Attack" };

export default async function AdminPage() {
  return <AdminPanel initialOrganizer={await organizerFromCookies()} configured={organizerConfigured()} />;
}
