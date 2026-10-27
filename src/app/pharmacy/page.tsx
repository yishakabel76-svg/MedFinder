import { redirect } from "next/navigation";
import { PharmacyDashboard } from "@/components/pharmacy-dashboard";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PharmacyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/pharmacy");
  return <PharmacyDashboard />;
}
