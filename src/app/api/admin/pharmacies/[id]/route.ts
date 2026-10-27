import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pharmacies } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return { user: null, response: Response.json({ error: "Please sign in." }, { status: 401 }) };
  if (user.role !== "admin") {
    return { user: null, response: Response.json({ error: "Administrator access is required." }, { status: 403 }) };
  }
  return { user, response: null };
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    const { id } = await context.params;
    const pharmacyId = Number(id);
    if (!Number.isInteger(pharmacyId) || pharmacyId < 1) {
      return Response.json({ error: "Invalid pharmacy." }, { status: 400 });
    }

    const body = (await request.json()) as { action?: unknown };
    const action = body.action;
    if (action !== "approve" && action !== "reject") {
      return Response.json({ error: "Choose approve or reject." }, { status: 400 });
    }

    const [pharmacy] = await db
      .update(pharmacies)
      .set({
        approvalStatus: action === "approve" ? "approved" : "rejected",
        verified: action === "approve",
        reviewedAt: new Date(),
      })
      .where(eq(pharmacies.id, pharmacyId))
      .returning();

    if (!pharmacy) {
      return Response.json({ error: "Pharmacy not found." }, { status: 404 });
    }

    return Response.json({ pharmacy });
  } catch (error) {
    console.error("Admin pharmacy review failed", error);
    return Response.json({ error: "The pharmacy could not be updated." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    const { id } = await context.params;
    const pharmacyId = Number(id);
    if (!Number.isInteger(pharmacyId) || pharmacyId < 1) {
      return Response.json({ error: "Invalid pharmacy." }, { status: 400 });
    }

    const [deleted] = await db
      .delete(pharmacies)
      .where(eq(pharmacies.id, pharmacyId))
      .returning({ id: pharmacies.id, name: pharmacies.name });

    if (!deleted) {
      return Response.json({ error: "Pharmacy not found." }, { status: 404 });
    }

    return Response.json({ ok: true, pharmacy: deleted });
  } catch (error) {
    console.error("Admin pharmacy deletion failed", error);
    return Response.json({ error: "The pharmacy could not be removed." }, { status: 500 });
  }
}
