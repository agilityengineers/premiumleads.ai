/** The admin Overview's "Recent activity": saves, sign-ins, new leads. */
import { desc } from "drizzle-orm";
import { db } from "./db";
import { activityLog } from "./schema";

export async function logActivity(actor: string | null, text: string): Promise<void> {
  try {
    await db().insert(activityLog).values({ actor, text: text.slice(0, 500) });
  } catch (err) {
    console.error("[activity] could not log", err);
  }
}

export async function recentActivity(limit = 30): Promise<{ text: string; actor: string | null; at: string }[]> {
  const rows = await db().select().from(activityLog).orderBy(desc(activityLog.createdAt), desc(activityLog.id)).limit(limit);
  return rows.map((r) => ({ text: r.text, actor: r.actor, at: r.createdAt.toISOString() }));
}
