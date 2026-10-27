import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/password";

let seedPromise: Promise<void> | undefined;

async function seedAdminAccount() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@medfinder.local").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "Admin123!";
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) return;

  const passwordHash = await hashPassword(password);
  await db
    .insert(users)
    .values({
      name: "MedFinder Admin",
      email,
      passwordHash,
      role: "admin",
    })
    .onConflictDoNothing();
}

export async function ensureSeedAccounts() {
  if (!seedPromise) {
    seedPromise = seedAdminAccount().catch((error: unknown) => {
      seedPromise = undefined;
      throw error;
    });
  }
  await seedPromise;
}
