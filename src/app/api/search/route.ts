import { db } from "@/db";
import { medicines, pharmacies, stocks } from "@/db/schema";
import { ensureDemoData } from "@/db/seed";
import { eq } from "drizzle-orm";
import {
  distanceKm,
  getAvailabilityStatus,
  medicineMatchScore,
} from "@/lib/search-utils";

export const dynamic = "force-dynamic";

const DEFAULT_LOCATION = { latitude: 9.02497, longitude: 38.74686 };
const ALLOWED_RADIUS_KM = [3, 5, 8, 12, 20];

export async function GET(request: Request) {
  try {
    await ensureDemoData();
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") ?? "").trim().slice(0, 100);
    const latitudeParam = searchParams.get("lat");
    const longitudeParam = searchParams.get("lng");
    const parsedLatitude = latitudeParam ? Number(latitudeParam) : Number.NaN;
    const parsedLongitude = longitudeParam ? Number(longitudeParam) : Number.NaN;
    const latitude = Number.isFinite(parsedLatitude) && Math.abs(parsedLatitude) <= 90 ? parsedLatitude : DEFAULT_LOCATION.latitude;
    const longitude = Number.isFinite(parsedLongitude) && Math.abs(parsedLongitude) <= 180 ? parsedLongitude : DEFAULT_LOCATION.longitude;
    const requestedRadius = Number(searchParams.get("radius"));
    const radiusKm = ALLOWED_RADIUS_KM.includes(requestedRadius) ? requestedRadius : 8;

    if (!query) {
      return Response.json({ query, medicines: [], results: [], demo: true, radiusKm });
    }

    const catalog = await db.select().from(medicines);
    const rankedMedicines = catalog
      .map((medicine) => ({
        ...medicine,
        matchScore: medicineMatchScore(query, medicine),
      }))
      .filter((medicine) => medicine.matchScore >= (query.length < 3 ? 0.7 : 0.62))
      .sort((left, right) => right.matchScore - left.matchScore)
      .slice(0, 5);

    if (rankedMedicines.length === 0) {
      const suggestions = catalog
        .map((medicine) => ({
          id: medicine.id,
          genericName: medicine.genericName,
          brandNames: medicine.brandNames,
          nameAmharic: medicine.nameAmharic,
          strength: medicine.strength,
          form: medicine.form,
          category: medicine.category,
          matchScore: medicineMatchScore(query, medicine),
        }))
        .sort((left, right) => right.matchScore - left.matchScore)
        .slice(0, 4);
      return Response.json({ query, medicines: [], results: [], suggestions, demo: true, radiusKm });
    }

    const matchingIds = new Set(rankedMedicines.map((medicine) => medicine.id));
    const scoreByMedicine = new Map(rankedMedicines.map((medicine) => [medicine.id, medicine.matchScore]));
    const rows = await db
      .select({
        stockId: stocks.id,
        medicineId: medicines.id,
        genericName: medicines.genericName,
        brandNames: medicines.brandNames,
        nameAmharic: medicines.nameAmharic,
        strength: medicines.strength,
        form: medicines.form,
        category: medicines.category,
        pharmacyId: pharmacies.id,
        pharmacyName: pharmacies.name,
        area: pharmacies.area,
        address: pharmacies.address,
        phone: pharmacies.phone,
        latitude: pharmacies.latitude,
        longitude: pharmacies.longitude,
        verified: pharmacies.verified,
        hours: pharmacies.hours,
        status: stocks.status,
        quantity: stocks.quantity,
        priceBirr: stocks.priceBirr,
        lastConfirmedAt: stocks.lastConfirmedAt,
      })
      .from(stocks)
      .innerJoin(medicines, eq(stocks.medicineId, medicines.id))
      .innerJoin(pharmacies, eq(stocks.pharmacyId, pharmacies.id))
      .where(eq(pharmacies.approvalStatus, "approved"));

    const now = Date.now();
    const results = rows
      .filter((row) => matchingIds.has(row.medicineId))
      .map((row) => {
        const distance = distanceKm(latitude, longitude, row.latitude, row.longitude);
        const availability = getAvailabilityStatus(row.status, row.lastConfirmedAt, now);
        const ageHours = Math.max(0, (now - new Date(row.lastConfirmedAt).getTime()) / 3600000);
        const statusRank = availability === "in_stock" ? 0 : availability === "low_stock" ? 1 : availability === "unconfirmed" ? 2 : 3;
        const score = statusRank * 3 + distance + Math.min(ageHours, 168) * 0.045 - (scoreByMedicine.get(row.medicineId) ?? 0) * 0.2;
        return {
          ...row,
          distanceKm: Math.round(distance * 10) / 10,
          availability,
          matchScore: Math.round((scoreByMedicine.get(row.medicineId) ?? 0) * 100),
          rankingScore: score,
        };
      })
      .filter((row) => row.distanceKm <= radiusKm)
      .sort((left, right) => left.rankingScore - right.rankingScore)
      .slice(0, 60)
      .map(({ rankingScore: _rankingScore, ...row }) => row);

    return Response.json({
      query,
      medicines: rankedMedicines.map(({ matchScore, ...medicine }) => ({
        ...medicine,
        matchScore: Math.round(matchScore * 100),
      })),
      results,
      radiusKm,
      demo: true,
      freshnessWindowHours: 24,
    });
  } catch (error) {
    console.error("Medicine search failed", error);
    return Response.json({ error: "Search is temporarily unavailable. Please try again." }, { status: 500 });
  }
}
