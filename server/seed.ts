/**
 * Seeds the database the first time the app runs: the five bundled landing
 * pages, the three default resources and the super admin. Everything uses
 * ON CONFLICT DO NOTHING / "only when empty", so admin edits are never
 * overwritten on a restart. The default pre-qualification form and routing
 * rules are not seeded as rows: the bundled default serves until an admin
 * saves their own (the same floor-and-overlay rule as The Authority Desk).
 */
import { sql } from "drizzle-orm";
import { db } from "./db";
import { users, variants, resources } from "./schema";
import { hashPassword } from "./auth";
import { BUILTIN_VARIANTS } from "../src/content/variants";
import { DEFAULT_RESOURCES } from "../src/content/resources";

export const SEED_ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL || "emailme@clarencewilliams.com").trim().toLowerCase();
const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "Success2026";
const SEED_ADMIN_NAME = process.env.SEED_ADMIN_NAME || "Clarence Williams";

export async function seedVariants(): Promise<void> {
  for (const v of BUILTIN_VARIANTS) {
    await db()
      .insert(variants)
      .values({ slug: v.slug, label: v.label, audience: v.audience, builtin: true, content: {}, published: true })
      .onConflictDoNothing();
  }
}

export async function seedResources(): Promise<void> {
  const count = await db().select({ n: sql<string>`count(*)` }).from(resources);
  if (Number(count[0]?.n ?? 0) > 0) return;
  for (const [i, r] of DEFAULT_RESOURCES.entries()) {
    await db()
      .insert(resources)
      .values({ ...r, position: i, draft: false })
      .onConflictDoNothing();
  }
  console.log(`[seed] inserted ${DEFAULT_RESOURCES.length} default resource(s)`);
}

/**
 * The first super admin, with a forced password change on first login. Only
 * runs when the users table is empty, so removing or renaming this account
 * later sticks.
 */
export async function seedSuperAdmin(): Promise<void> {
  const count = await db().select({ n: sql<string>`count(*)` }).from(users);
  if (Number(count[0]?.n ?? 0) > 0) return;
  await db().insert(users).values({
    email: SEED_ADMIN_EMAIL,
    name: SEED_ADMIN_NAME,
    passwordHash: await hashPassword(SEED_ADMIN_PASSWORD),
    role: "super",
    status: "active",
    mustChangePassword: true,
  });
  console.log(`[seed] created super admin ${SEED_ADMIN_EMAIL} (password change required on first login)`);
}

export async function seedAll(): Promise<void> {
  await seedVariants();
  await seedResources();
  await seedSuperAdmin();
}
