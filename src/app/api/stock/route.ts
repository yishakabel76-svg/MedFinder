import { db } from "@/db";
import { pharmacies, stocks, type StockStatus } from "@/db/schema";
import { ensureDemoData } from "@/db/seed";
import { getCurrentUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const validStatuses = new Set<StockStatus>(["in_stock", "low_stock", "out_of_stock"]);

type StockUpdate = { medicineId: number; status: StockStatus; quantity: number };

export async function PATCH(request: Request) {
  try {
    await ensureDemoData();
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Please sign in to update stock." }, { status: 401 });
    }

    const body = await request.json() as { pharmacyId?: unknown; updates?: unknown };
    const pharmacyId = Number(body.pharmacyId);
    if (!Number.isInteger(pharmacyId) || pharmacyId < 1 || !Array.isArray(body.updates) || body.updates.length === 0 || body.updates.length > 100) {
      return Response.json({ error: "Choose a pharmacy and include at least one valid stock update." }, { status: 400 });
    }

    const [pharmacy] = await db
      .select({
        id: pharmacies.id,
        ownerId: pharmacies.ownerId,
        approvalStatus: pharmacies.approvalStatus,
      })
      .from(pharmacies)
      .where(eq(pharmacies.id, pharmacyId))
      .limit(1);
    if (!pharmacy) return Response.json({ error: "Pharmacy not found." }, { status: 404 });
    if (user.role !== "admin" && pharmacy.ownerId !== user.id) {
      return Response.json({ error: "You can only update stock for your own pharmacy." }, { status: 403 });
    }
    if (pharmacy.approvalStatus !== "approved") {
      return Response.json({ error: "Stock can be updated once the pharmacy is approved." }, { status: 403 });
    }

    const updates: StockUpdate[] = [];
    for (const value of body.updates) {
      if (!value || typeof value !== "object") {
        return Response.json({ error: "One of the stock updates is invalid." }, { status: 400 });
      }
      const entry = value as Record<string, unknown>;
      const medicineId = Number(entry.medicineId);
      const quantity = Number(entry.quantity);
      const status = entry.status;
      if (!Number.isInteger(medicineId) || medicineId < 1 || !validStatuses.has(status as StockStatus) || !Number.isInteger(quantity) || quantity < 0 || quantity > 100000) {
        return Response.json({ error: "Check the medicine, status, and quantity in your update." }, { status: 400 });
      }
      updates.push({
        medicineId,
        status: status as StockStatus,
        quantity: status === "out_of_stock" ? 0 : quantity,
      });
    }

    const uniqueUpdates = [...new Map(updates.map((entry) => [entry.medicineId, entry])).values()];
    const confirmedAt = new Date();
    await db.transaction(async (tx) => {
      for (const update of uniqueUpdates) {
        await tx
          .insert(stocks)
          .values({
            pharmacyId,
            medicineId: update.medicineId,
            status: update.status,
            quantity: update.quantity,
            lastConfirmedAt: confirmedAt,
            updatedAt: confirmedAt,
          })
          .onConflictDoUpdate({
            target: [stocks.pharmacyId, stocks.medicineId],
            set: {
              status: update.status,
              quantity: update.quantity,
              lastConfirmedAt: confirmedAt,
              updatedAt: confirmedAt,
            },
          });
      }
    });

    const saved = await db.select().from(stocks).where(eq(stocks.pharmacyId, pharmacyId));
    return Response.json({ ok: true, updatedCount: uniqueUpdates.length, confirmedAt, stocks: saved });
  } catch (error) {
    console.error("Stock update failed", error);
    return Response.json({ error: "The stock update could not be saved. Please try again." }, { status: 500 });
  }
}
