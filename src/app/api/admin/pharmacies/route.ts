import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { pharmacies, users } from "@/db/schema";
import { ensureSeedAccounts } from "@/db/auth-seed";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeedAccounts();

    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Please sign in." }, { status: 401 });
    }
    if (user.role !== "admin") {
      return Response.json({ error: "Administrator access is required." }, { status: 403 });
    }

    const list = await db
      .select({
        id: pharmacies.id,
        name: pharmacies.name,
        area: pharmacies.area,
        address: pharmacies.address,
        licenseNumber: pharmacies.licenseNumber,
        phone: pharmacies.phone,
        hours: pharmacies.hours,
        verified: pharmacies.verified,
        approvalStatus: pharmacies.approvalStatus,
        reviewedAt: pharmacies.reviewedAt,
        createdAt: pharmacies.createdAt,
        ownerId: pharmacies.ownerId,
        ownerName: users.name,
        ownerEmail: users.email,
      })
      .from(pharmacies)
      .leftJoin(users, eq(pharmacies.ownerId, users.id))
      .orderBy(sql`case when ${pharmacies.approvalStatus} = 'pending' then 0 else 1 end`, desc(pharmacies.createdAt));

    const stats = {
      pending: list.filter((pharmacy) => pharmacy.approvalStatus === "pending").length,
      approved: list.filter((pharmacy) => pharmacy.approvalStatus === "approved").length,
      rejected: list.filter((pharmacy) => pharmacy.approvalStatus === "rejected").length,
      total: list.length,
      owners: list.filter((pharmacy) => pharmacy.ownerId !== null).length,
    };

    return Response.json({ pharmacies: list, stats, admin: user });
  } catch (error) {
    console.error("Admin pharmacy list failed", error);
    return Response.json({ error: "Could not load pharmacy applications." }, { status: 500 });
  }
}
