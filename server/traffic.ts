/**
 * First-party traffic, no third-party tracker: page views recorded server-side
 * in the HTML handler, primary-CTA clicks from a beacon, and completed
 * pre-qualifications recorded on submission (never from the client). `visitor`
 * is a salted, daily-rotating SHA-256 of IP + UA: approximate uniques, not
 * reversible, no cross-day tracking. Same approach as The Authority Desk.
 */
import crypto from "node:crypto";
import type { Request } from "express";
import { sql } from "drizzle-orm";
import { db, query } from "./db";
import { trafficEvents } from "./schema";
import type { TrafficReport } from "../shared/variantSchema";

const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|pingdom|monitor|curl|wget|python-requests|httpclient|go-http-client|java\//i;

function isBot(req: Request): boolean {
  const ua = req.get("user-agent") || "";
  return !ua || BOT_RE.test(ua);
}

function visitorHash(req: Request): string {
  const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() || req.socket.remoteAddress || "";
  const ua = req.get("user-agent") || "";
  const day = new Date().toISOString().slice(0, 10);
  const salt = process.env.TRAFFIC_SALT || process.env.SESSION_SECRET || "premiumleads";
  return crypto.createHash("sha256").update(`${salt}|${day}|${ip}|${ua}`).digest("hex").slice(0, 32);
}

function referrerHost(req: Request): string | null {
  const ref = req.get("referer");
  if (!ref) return null;
  try {
    const host = new URL(ref).hostname.replace(/^www\./, "");
    const own = (req.get("host") || "").replace(/^www\./, "").split(":")[0];
    return host && host !== own ? host : null;
  } catch {
    return null;
  }
}

async function record(kind: "view" | "cta" | "prequal", req: Request, slug: string, path?: string): Promise<void> {
  await db().insert(trafficEvents).values({
    kind,
    slug: slug || "",
    path: (path ?? req.path).slice(0, 300),
    referrer: kind === "view" ? referrerHost(req) : null,
    visitor: visitorHash(req),
  });
}

/** A human page view of a landing page. Bots are dropped. */
export async function recordPageView(req: Request, slug: string): Promise<void> {
  if (isBot(req)) return;
  await record("view", req, slug);
}

/** A primary-CTA click (from the beacon). */
export async function recordCta(req: Request, slug: string): Promise<void> {
  await record("cta", req, slug, "/beacon");
}

/** A completed pre-qualification, counted against the door that sent them. */
export async function recordPrequal(req: Request, slug: string): Promise<void> {
  await record("prequal", req, slug, "/get-started");
}

type Row = { slug: string; kind: string; n: string };

/** Per-page counts for the admin Traffic panel (all time) plus a 7-day lead count for the overview. */
export async function trafficCounts(): Promise<Record<string, { views: number; ctaClicks: number; prequals: number }>> {
  const r = await query<Row>(`SELECT slug, kind, count(*)::text AS n FROM traffic_events GROUP BY slug, kind`);
  const out: Record<string, { views: number; ctaClicks: number; prequals: number }> = {};
  for (const row of r.rows) {
    const e = (out[row.slug] ??= { views: 0, ctaClicks: 0, prequals: 0 });
    const n = Number(row.n);
    if (row.kind === "view") e.views += n;
    else if (row.kind === "cta") e.ctaClicks += n;
    else if (row.kind === "prequal") e.prequals += n;
  }
  return out;
}

export async function buildTrafficReport(pages: { slug: string; label: string; published: boolean }[]): Promise<TrafficReport> {
  const counts = await trafficCounts();
  const rows = pages.map((p) => ({ slug: p.slug, label: p.label, published: p.published, ...(counts[p.slug] ?? { views: 0, ctaClicks: 0, prequals: 0 }) }));
  const totals = Object.values(counts).reduce(
    (acc, c) => ({ views: acc.views + c.views, ctaClicks: acc.ctaClicks + c.ctaClicks, prequals: acc.prequals + c.prequals }),
    { views: 0, ctaClicks: 0, prequals: 0 },
  );
  return { rows, totals, generatedAt: new Date().toISOString() };
}

/** CTA clicks in the last `days` days (overview tile). */
export async function ctaClicksSince(days: number): Promise<number> {
  const r = await db()
    .select({ n: sql<string>`count(*)` })
    .from(trafficEvents)
    .where(sql`kind = 'cta' AND created_at > now() - make_interval(days => ${days})`);
  return Number(r[0]?.n ?? 0);
}
