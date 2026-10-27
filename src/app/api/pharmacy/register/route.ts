import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { pharmacies } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { findArea } from "@/lib/addis-areas";

export const dynamic = "force-dynamic";

function readText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Please sign in to register a pharmacy." }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const name = readText(body.name);
    const areaName = readText(body.area);
    const address = readText(body.address);
    const licenseNumber = readText(body.licenseNumber).toUpperCase();
    const phone = readText(body.phone);
    const hours = readText(body.hours) || "08:00–20:00";
    const area = findArea(areaName);

    if (name.length < 2 || name.length > 120) {
      return Response.json({ error: "Enter the pharmacy name (2–120 characters)." }, { status: 400 });
    }
    if (!area) {
      return Response.json({ error: "Choose the area where the pharmacy is located." }, { status: 400 });
    }
    if (address.length < 5 || address.length > 240) {
      return Response.json({ error: "Enter a street address (5–240 characters)." }, { status: 400 });
    }
    if (licenseNumber.length < 3 || licenseNumber.length > 60) {
      return Response.json({ error: "Enter the pharmacy licence number (3–60 characters)." }, { status: 400 });
    }
    if (phone.length < 7 || phone.length > 40) {
      return Response.json({ error: "Enter a contact phone number." }, { status: 400 });
    }
    if (hours.length > 60) {
      return Response.json({ error: "Enter the opening hours in 60 characters or fewer." }, { status: 400 });
    }

    const [existingOwner] = await db
      .select({
        id: pharmacies.id,
        approvalStatus: pharmacies.approvalStatus,
      })
      .from(pharmacies)
      .where(eq(pharmacies.ownerId, user.id))
      .limit(1);

    if (existingOwner && existingOwner.approvalStatus !== "rejected") {
      return Response.json(
        {
          error:
            existingOwner.approvalStatus === "pending"
              ? "Your pharmacy application is already awaiting admin approval."
              : "This account is already linked to an approved pharmacy.",
        },
        { status: 409 },
      );
    }

    const licenseConflict = existingOwner
      ? and(eq(pharmacies.licenseNumber, licenseNumber), ne(pharmacies.id, existingOwner.id))
      : eq(pharmacies.licenseNumber, licenseNumber);
    const [duplicateLicense] = await db
      .select({ id: pharmacies.id })
      .from(pharmacies)
      .where(licenseConflict)
      .limit(1);
    if (duplicateLicense) {
      return Response.json({ error: "A pharmacy with this licence number is already registered." }, { status: 409 });
    }

    const values = {
      name,
      area: area.name,
      address,
      licenseNumber,
      phone,
      hours,
      latitude: area.latitude,
      longitude: area.longitude,
      ownerId: user.id,
      approvalStatus: "pending" as const,
      verified: false,
      reviewedAt: null,
    };

    const [pharmacy] = existingOwner
      ? await db
          .update(pharmacies)
          .set({ ...values, createdAt: new Date() })
          .where(eq(pharmacies.id, existingOwner.id))
          .returning()
      : await db.insert(pharmacies).values(values).returning();

    return Response.json(
      {
        pharmacy,
        message: "Your pharmacy application was submitted. A MedFinder administrator will review it.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Pharmacy registration failed", error);
    return Response.json({ error: "Your application could not be submitted. Please try again." }, { status: 500 });
  }
}
