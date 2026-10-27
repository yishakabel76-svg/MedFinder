import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { medicines, pharmacies, stocks, type StockStatus } from "@/db/schema";
import { ensureDemoData } from "@/db/seed";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const validStatuses = new Set<StockStatus>(["in_stock", "low_stock", "out_of_stock"]);

function readText(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function readBrandNames(value: unknown) {
  const list = Array.isArray(value)
    ? value.map((entry) => readText(entry))
    : readText(value).split(",").map((entry) => entry.trim());
  return [...new Set(list.filter(Boolean))].slice(0, 8);
}

export async function POST(request: Request) {
  try {
    await ensureDemoData();

    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Please sign in to add a product." }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const pharmacyId = Number(body.pharmacyId);
    const name = readText(body.name);
    const strength = readText(body.strength);
    const form = readText(body.form);
    const category = readText(body.category);
    const nameAmharic = readText(body.nameAmharic);
    const brandNames = readBrandNames(body.brandNames);
    const status = body.status;
    const quantityProvided = body.quantity !== null && body.quantity !== undefined && body.quantity !== "";
    const quantity = quantityProvided ? Number(body.quantity) : Number.NaN;

    if (!Number.isInteger(pharmacyId) || pharmacyId < 1) {
      return Response.json({ error: "Choose the pharmacy for this product." }, { status: 400 });
    }
    if (name.length < 2 || name.length > 120) {
      return Response.json({ error: "Enter a medicine name (2–120 characters)." }, { status: 400 });
    }
    if (strength.length < 1 || strength.length > 40) {
      return Response.json({ error: "Enter the strength, for example 500 mg." }, { status: 400 });
    }
    if (form.length < 2 || form.length > 40) {
      return Response.json({ error: "Enter the medicine form, for example Tablet." }, { status: 400 });
    }
    if (category.length < 2 || category.length > 60) {
      return Response.json({ error: "Enter a category (2–60 characters)." }, { status: 400 });
    }
    if (nameAmharic.length > 120) {
      return Response.json({ error: "The Amharic name must be 120 characters or fewer." }, { status: 400 });
    }
    if (brandNames.some((brand) => brand.length > 60)) {
      return Response.json({ error: "Each brand name must be 60 characters or fewer." }, { status: 400 });
    }
    if (!validStatuses.has(status as StockStatus)) {
      return Response.json({ error: "Choose a valid availability status." }, { status: 400 });
    }
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 100000) {
      return Response.json({ error: "Enter a quantity between 0 and 100000." }, { status: 400 });
    }

    let priceBirr: number | null = null;
    if (body.priceBirr !== null && body.priceBirr !== undefined && body.priceBirr !== "") {
      priceBirr = Number(body.priceBirr);
      if (!Number.isFinite(priceBirr) || priceBirr < 0 || priceBirr > 100000) {
        return Response.json({ error: "Enter a valid price in birr, or leave it blank." }, { status: 400 });
      }
      priceBirr = Math.round(priceBirr * 100) / 100;
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
      return Response.json({ error: "You can only add products to your own pharmacy." }, { status: 403 });
    }
    if (pharmacy.approvalStatus !== "approved") {
      return Response.json({ error: "Products can be added once the pharmacy is approved." }, { status: 403 });
    }

    const [existing] = await db
      .select()
      .from(medicines)
      .where(
        and(
          sql`lower(${medicines.genericName}) = ${name.toLowerCase()}`,
          sql`lower(${medicines.strength}) = ${strength.toLowerCase()}`,
          sql`lower(${medicines.form}) = ${form.toLowerCase()}`,
        ),
      )
      .limit(1);

    let medicine = existing;
    if (medicine) {
      const mergedBrands = [...new Set([...medicine.brandNames, ...brandNames])].slice(0, 8);
      const nextAmharic = medicine.nameAmharic || nameAmharic;
      if (mergedBrands.length !== medicine.brandNames.length || nextAmharic !== medicine.nameAmharic) {
        [medicine] = await db
          .update(medicines)
          .set({ brandNames: mergedBrands, nameAmharic: nextAmharic })
          .where(eq(medicines.id, medicine.id))
          .returning();
      }
    } else {
      [medicine] = await db
        .insert(medicines)
        .values({
          genericName: name,
          brandNames,
          nameAmharic,
          strength,
          form,
          category,
        })
        .returning();
    }

    const confirmedAt = new Date();
    const safeQuantity = status === "out_of_stock" ? 0 : quantity;
    const [stock] = await db
      .insert(stocks)
      .values({
        pharmacyId,
        medicineId: medicine.id,
        status: status as StockStatus,
        quantity: safeQuantity,
        priceBirr,
        lastConfirmedAt: confirmedAt,
        updatedAt: confirmedAt,
      })
      .onConflictDoUpdate({
        target: [stocks.pharmacyId, stocks.medicineId],
        set: {
          status: status as StockStatus,
          quantity: safeQuantity,
          priceBirr,
          lastConfirmedAt: confirmedAt,
          updatedAt: confirmedAt,
        },
      })
      .returning();

    return Response.json(
      {
        ok: true,
        medicine,
        stock,
        message: `${medicine.genericName} ${medicine.strength} was added to your inventory.`,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Product creation failed", error);
    return Response.json({ error: "The product could not be added. Please try again." }, { status: 500 });
  }
}
