/**
 * Landing pages (the `variants` table). A row stores a PARTIAL content
 * override; `resolve()` lays it over the bundled base so a blank field inherits
 * the default copy — the prototype's `overrides` / `customVariants` rule.
 */
import { asc, eq, sql } from "drizzle-orm";
import { db, query } from "./db";
import { variants } from "./schema";
import { readSetting } from "./settings";
import { resolveCtaMode, type CtaMode } from "../shared/ctaMode";
import {
  contentSchema, RESERVED_SLUGS, type Content, type ContentInput, type PublicVariant, type VariantRecord,
} from "../shared/variantSchema";
import { BUILTIN_BY_SLUG, BUILTIN_VARIANTS, CUSTOM_BASE_SLUG, baseContentFor, stripEmpty } from "../src/content/variants";

type Row = typeof variants.$inferSelect;

/** The base a page inherits from: its own bundled copy, or sales re-labelled for a custom page. */
export function baseFor(row: Pick<Row, "slug" | "label" | "audience" | "builtin">): Content {
  if (row.builtin && BUILTIN_BY_SLUG[row.slug]) return BUILTIN_BY_SLUG[row.slug].content;
  const sales = baseContentFor(CUSTOM_BASE_SLUG);
  return { ...sales, short: row.label, kicker: "Custom", desc: `Tailored for ${row.audience}.` };
}

function parseOverride(raw: unknown): ContentInput {
  const parsed = contentSchema.safeParse(raw ?? {});
  if (parsed.success) return parsed.data;
  console.error("[variants] stored content failed validation — serving the base copy", parsed.error.issues.slice(0, 3));
  return {};
}

export function rowToRecord(row: Row): VariantRecord {
  return {
    slug: row.slug,
    label: row.label,
    audience: row.audience,
    builtin: row.builtin,
    bookingUrl: row.bookingUrl,
    ctaMode: (row.ctaMode as CtaMode | null) ?? null,
    content: parseOverride(row.content),
    base: baseFor(row),
    published: row.published,
    generatedBy: row.generatedBy,
    hasOgImage: Boolean(row.ogImageType),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const COLUMNS = {
  slug: variants.slug, label: variants.label, audience: variants.audience, builtin: variants.builtin,
  bookingUrl: variants.bookingUrl, ctaMode: variants.ctaMode, content: variants.content, published: variants.published,
  generatedBy: variants.generatedBy, ogImageType: variants.ogImageType, createdAt: variants.createdAt, updatedAt: variants.updatedAt,
};
type SelectedRow = Omit<Row, "ogImage">;

/** Built-ins first in their bundled order, then custom pages by creation. */
function orderRows(rows: SelectedRow[]): SelectedRow[] {
  const order = new Map(BUILTIN_VARIANTS.map((v, i) => [v.slug, i]));
  return [...rows].sort((a, b) => {
    const ai = order.get(a.slug) ?? 1000 + a.createdAt.getTime() / 1e9;
    const bi = order.get(b.slug) ?? 1000 + b.createdAt.getTime() / 1e9;
    return ai - bi;
  });
}

export async function listVariants(): Promise<VariantRecord[]> {
  const rows = await db().select(COLUMNS).from(variants).orderBy(asc(variants.createdAt));
  return orderRows(rows).map((r) => rowToRecord({ ...r, ogImage: null } as Row));
}

export async function getVariant(slug: string): Promise<VariantRecord | null> {
  const rows = await db().select(COLUMNS).from(variants).where(eq(variants.slug, slug)).limit(1);
  return rows[0] ? rowToRecord({ ...rows[0], ogImage: null } as Row) : null;
}

/** Resolved copy for one page. */
export function resolveRecord(rec: VariantRecord): Content {
  return { ...rec.base, ...stripEmpty(rec.content as Record<string, unknown>) } as Content;
}

/**
 * The page a visitor sees. Unpublished pages 404 publicly unless `preview` is
 * set (an admin previewing a draft). The site default rides along so the
 * client resolves CTA targets from one fetch.
 */
export async function getPublicVariant(slug: string, preview = false): Promise<PublicVariant | null> {
  const site = await readSetting("site");
  const rec = await getVariant(slug);
  if (!rec || (!rec.published && !preview)) return null;
  return {
    slug: rec.slug,
    label: rec.label,
    audience: rec.audience,
    content: resolveRecord(rec),
    bookingUrl: rec.bookingUrl || site.bookingUrl,
    ctaMode: resolveCtaMode(rec.ctaMode, site.ctaMode),
    isHome: site.defaultVariant === rec.slug,
  };
}

/** Slug → identity for the use-case cards and variant pills (published only). */
export async function listPublishedPages(): Promise<{ slug: string; label: string; short: string; kicker: string; desc: string }[]> {
  const all = await listVariants();
  return all
    .filter((v) => v.published)
    .map((v) => {
      const c = resolveRecord(v);
      return { slug: v.slug, label: v.label, short: c.short, kicker: c.kicker, desc: c.desc };
    });
}

export class VariantError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export async function slugTaken(slug: string): Promise<boolean> {
  if (RESERVED_SLUGS.includes(slug)) return true;
  const r = await db().select({ slug: variants.slug }).from(variants).where(eq(variants.slug, slug)).limit(1);
  return r.length > 0;
}

/** A free slug: `base`, else `base-2`, `base-3`… */
export async function freeSlug(base: string): Promise<string> {
  let candidate = base || "page";
  for (let i = 2; await slugTaken(candidate); i++) candidate = `${base}-${i}`;
  return candidate;
}

export async function createVariant(input: {
  slug: string; label: string; audience: string; content?: ContentInput; generatedBy?: string | null; published?: boolean;
}): Promise<VariantRecord> {
  if (await slugTaken(input.slug)) throw new VariantError("That slug is already taken.", 409);
  await db().insert(variants).values({
    slug: input.slug,
    label: input.label,
    audience: input.audience,
    builtin: false,
    content: (input.content ?? {}) as Record<string, unknown>,
    published: input.published ?? false,
    generatedBy: input.generatedBy ?? null,
  });
  return (await getVariant(input.slug))!;
}

export async function updateVariant(
  slug: string,
  patch: { label?: string; audience?: string; bookingUrl?: string | null; ctaMode?: CtaMode | null; content?: ContentInput; published?: boolean },
): Promise<VariantRecord> {
  const existing = await getVariant(slug);
  if (!existing) throw new VariantError("Page not found.", 404);
  const set: Partial<typeof variants.$inferInsert> = { updatedAt: new Date() };
  if (patch.label !== undefined) set.label = patch.label;
  if (patch.audience !== undefined) set.audience = patch.audience;
  if (patch.bookingUrl !== undefined) set.bookingUrl = patch.bookingUrl || null;
  if (patch.ctaMode !== undefined) set.ctaMode = patch.ctaMode;
  if (patch.content !== undefined) set.content = stripEmpty(patch.content as Record<string, unknown>) as Record<string, unknown>;
  if (patch.published !== undefined) set.published = patch.published;
  await db().update(variants).set(set).where(eq(variants.slug, slug));
  return (await getVariant(slug))!;
}

/** Custom pages can move to a new slug; built-ins cannot. */
export async function renameVariant(slug: string, next: string): Promise<VariantRecord> {
  const existing = await getVariant(slug);
  if (!existing) throw new VariantError("Page not found.", 404);
  if (existing.builtin) throw new VariantError("Built-in pages keep their address.");
  if (next === slug) return existing;
  if (await slugTaken(next)) throw new VariantError("That slug is already taken.", 409);
  await query(`UPDATE variants SET slug = $2, updated_at = now() WHERE slug = $1`, [slug, next]);
  await query(`UPDATE prequalification_submissions SET variant_slug = $2 WHERE variant_slug = $1`, [slug, next]);
  await query(`UPDATE traffic_events SET slug = $2 WHERE slug = $1`, [slug, next]);
  return (await getVariant(next))!;
}

export async function deleteVariant(slug: string): Promise<void> {
  const existing = await getVariant(slug);
  if (!existing) throw new VariantError("Page not found.", 404);
  if (existing.builtin) throw new VariantError("Built-in pages can't be deleted — unpublish them instead.");
  await db().delete(variants).where(eq(variants.slug, slug));
}

export async function setOgImage(slug: string, bytes: Buffer | null, type: string | null): Promise<void> {
  await db().update(variants).set({ ogImage: bytes, ogImageType: type, updatedAt: new Date() }).where(eq(variants.slug, slug));
}

export async function getOgImage(slug: string): Promise<{ bytes: Buffer; type: string } | null> {
  const r = await db().select({ ogImage: variants.ogImage, ogImageType: variants.ogImageType }).from(variants).where(eq(variants.slug, slug)).limit(1);
  const row = r[0];
  return row?.ogImage && row.ogImageType ? { bytes: row.ogImage, type: row.ogImageType } : null;
}

/** Published page count / total, for the overview tile. */
export async function pageCounts(): Promise<{ live: number; total: number }> {
  const r = await db().select({ live: sql<string>`count(*) FILTER (WHERE published)`, total: sql<string>`count(*)` }).from(variants);
  return { live: Number(r[0]?.live ?? 0), total: Number(r[0]?.total ?? 0) };
}
