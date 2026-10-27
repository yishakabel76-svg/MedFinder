import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { medicines, pharmacies, stocks } from "@/db/schema";
import { ensureDemoData } from "@/db/seed";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await ensureDemoData();

    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Please sign in to manage a pharmacy." }, { status: 401 });
    }

    const pharmaciesList = await db
      .select({
        id: pharmacies.id,
        name: pharmacies.name,
        area: pharmacies.area,
        address: pharmacies.address,
        licenseNumber: pharmacies.licenseNumber,
        verified: pharmacies.verified,
        phone: pharmacies.phone,
        hours: pharmacies.hours,
        approvalStatus: pharmacies.approvalStatus,
        reviewedAt: pharmacies.reviewedAt,
        createdAt: pharmacies.createdAt,
      })
      .from(pharmacies)
      .where(
        user.role === "admin"
          ? eq(pharmacies.approvalStatus, "approved")
          : eq(pharmacies.ownerId, user.id),
      )
      .orderBy(desc(pharmacies.createdAt));

    const { searchParams } = new URL(request.url);
    const requestedId = Number(searchParams.get("pharmacyId"));
    const selectedPharmacy =
      pharmaciesList.find((pharmacy) => pharmacy.id === requestedId) ??
      pharmaciesList.find((pharmacy) => pharmacy.approvalStatus === "approved") ??
      pharmaciesList[0] ??
      null;

    const catalog = await db.select().from(medicines).orderBy(medicines.category, medicines.genericName);
    const inventory =
      selectedPharmacy && selectedPharmacy.approvalStatus === "approved"
        ? await db.select().from(stocks).where(eq(stocks.pharmacyId, selectedPharmacy.id))
        : [];

    return Response.json({
      pharmacies: pharmaciesList,
      pharmacy: selectedPharmacy,
      medicines: catalog,
      stocks: inventory,
      user,
      demo: true,
    });
  } catch (error) {
    console.error("Pharmacy workspace load failed", error);
    return Response.json({ error: "Could not load the pharmacy workspace." }, { status: 500 });
  }
}
