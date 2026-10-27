import { redirect } from "next/navigation";
import { PharmacyRegisterForm } from "@/components/pharmacy-register-form";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PharmacyRegisterPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/pharmacy/register");
  return <PharmacyRegisterForm />;
}
