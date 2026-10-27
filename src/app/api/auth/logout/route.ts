import { cookies } from "next/headers";
import { clearSessionCookie, revokeSession, SESSION_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const cookieStore = await cookies();
    await revokeSession(cookieStore.get(SESSION_COOKIE)?.value);
    await clearSessionCookie();
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Logout failed", error);
    return Response.json({ error: "Could not sign out. Please try again." }, { status: 500 });
  }
}
