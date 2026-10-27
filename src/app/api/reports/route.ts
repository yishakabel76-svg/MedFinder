import { db } from "@/db";
import { stockReports, stocks } from "@/db/schema";
import { ensureDemoData } from "@/db/seed";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const reportReasons = new Set([
  "The pharmacy says this is out of stock",
  "The medicine or strength is different",
  "The pharmacy could not be reached",
  "Other availability issue",
]);

export async function POST(request: Request) {
  try {
    await ensureDemoData();
    const body = await request.json() as { stockId?: unknown; reason?: unknown };
    const stockId = Number(body.stockId);
    const reason = typeof body.reason === "string" ? body.reason : "";
    if (!Number.isInteger(stockId) || stockId < 1 || !reportReasons.has(reason)) {
      return Response.json({ error: "Choose an availability issue to report." }, { status: 400 });
    }

    const [stock] = await db.select({ id: stocks.id }).from(stocks).where(eq(stocks.id, stockId)).limit(1);
    if (!stock) return Response.json({ error: "Availability listing not found." }, { status: 404 });

    const [report] = await db
      .insert(stockReports)
      .values({ stockId, reporterType: "patient", reason })
      .returning({ id: stockReports.id, createdAt: stockReports.createdAt });
    return Response.json({ ok: true, report }, { status: 201 });
  } catch (error) {
    console.error("Availability report failed", error);
    return Response.json({ error: "Your report could not be sent. Please try again." }, { status: 500 });
  }
}
