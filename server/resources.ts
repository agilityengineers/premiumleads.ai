/**
 * Resources: storage, the public list, and the paste-a-URL pipeline
 * (HANDOFF-resources.md): normalize → snapshot with Playwright → extract →
 * AI blurb (validated, one retry, plain-extracted fallback) → a draft row the
 * admin edits and publishes.
 */
import { asc, eq, sql } from "drizzle-orm";
import { db, query } from "./db";
import { resources } from "./schema";
import { resourceInitials, type ResourceDraft, type ResourceInput, type ResourceRecord } from "../shared/resourceSchema";
import { extractPage, fetchHtml, normalizeUrl, assertPublicHost, FetchPageError } from "./extract";
import { screenshotPage } from "./snapshot";
import { AiError, availableProviders, generateResourceBlurb, type Provider } from "./ai";

type Row = typeof resources.$inferSelect;

const PUBLIC_COLUMNS = {
  id: resources.id, name: resources.name, url: resources.url, category: resources.category, tagline: resources.tagline,
  description: resources.description, highlights: resources.highlights, featured: resources.featured, draft: resources.draft,
  position: resources.position, snapshotType: resources.snapshotType, snapshotAt: resources.snapshotAt, updatedAt: resources.updatedAt,
};
type SelectedRow = Omit<Row, "snapshot" | "createdAt">;

export function rowToRecord(row: SelectedRow): ResourceRecord & { draft: boolean } {
  const version = row.snapshotAt ? row.snapshotAt.getTime() : 0;
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    category: row.category,
    tagline: row.tagline,
    description: row.description,
    highlights: row.highlights ?? [],
    featured: row.featured,
    draft: row.draft,
    snapshot: row.snapshotType ? `/api/resources/${encodeURIComponent(row.id)}/snapshot?v=${version}` : null,
    snapshotAt: row.snapshotAt ? row.snapshotAt.toISOString() : null,
    order: row.position,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Every resource in order (admin view includes drafts). */
export async function listResources(options: { includeDrafts: boolean }): Promise<(ResourceRecord & { draft: boolean })[]> {
  const rows = await db().select(PUBLIC_COLUMNS).from(resources).orderBy(asc(resources.position), asc(resources.updatedAt));
  return rows.filter((r) => options.includeDrafts || !r.draft).map(rowToRecord);
}

/** Up to three featured resources for the landing-page section. */
export async function featuredResources(limit = 3): Promise<ResourceRecord[]> {
  const all = await listResources({ includeDrafts: false });
  return all.filter((r) => r.featured).slice(0, limit);
}

export async function getSnapshot(id: string): Promise<{ bytes: Buffer; type: string; at: Date | null } | null> {
  const r = await db().select({ snapshot: resources.snapshot, snapshotType: resources.snapshotType, snapshotAt: resources.snapshotAt }).from(resources).where(eq(resources.id, id)).limit(1);
  const row = r[0];
  return row?.snapshot && row.snapshotType ? { bytes: row.snapshot, type: row.snapshotType, at: row.snapshotAt } : null;
}

/**
 * Save & publish from the admin: the full ordered list. Rows not in the list
 * are deleted; everything listed loses its draft flag. Snapshots are kept.
 */
export async function saveResources(list: ResourceInput[]): Promise<(ResourceRecord & { draft: boolean })[]> {
  const ids = list.map((r) => r.id);
  await db().transaction(async (tx) => {
    for (const [i, r] of list.entries()) {
      await tx
        .insert(resources)
        .values({ ...r, position: i, draft: false })
        .onConflictDoUpdate({
          target: resources.id,
          set: { name: r.name, url: r.url, category: r.category, tagline: r.tagline, description: r.description, highlights: r.highlights, featured: r.featured, position: i, draft: false, updatedAt: new Date() },
        });
    }
    if (ids.length) await tx.delete(resources).where(sql`id <> ALL(${ids}::text[])`);
    else await tx.delete(resources);
  });
  return listResources({ includeDrafts: true });
}

export async function removeResource(id: string): Promise<void> {
  await db().delete(resources).where(eq(resources.id, id));
}

/** A free id from a hostname ("theauthoritydesk.com" → "theauthoritydesk-com"). */
async function freeId(base: string): Promise<string> {
  let candidate = base || "resource";
  for (let i = 2; ; i++) {
    const r = await query<{ id: string }>(`SELECT id FROM resources WHERE id = $1`, [candidate]);
    if (!r.rows[0]) return candidate;
    candidate = `${base}-${i}`;
  }
}

function nameFromHost(host: string): string {
  return host.split(".")[0].replace(/[-_]/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
}

/**
 * The paste-a-URL pipeline. With `id` set it re-snapshots that resource (the
 * admin's "Re-snapshot" button) and keeps the copy; otherwise it creates a
 * draft row. A snapshot failure is a warning, never an error: the card falls
 * back to the branded gradient.
 */
export async function draftFromUrl(input: { url: string; id?: string; force?: boolean; notes?: string; provider?: Provider }): Promise<ResourceDraft> {
  const url = normalizeUrl(input.url);
  const warnings: string[] = [];
  const existing = input.id ? await db().select(PUBLIC_COLUMNS).from(resources).where(eq(resources.id, input.id)).limit(1) : [];
  const existingRow = existing[0];
  if (input.id && !existingRow) throw new FetchPageError("That resource no longer exists.", 404);

  // 1. Read the page (also the SSRF check for the screenshot's URL).
  let page: ReturnType<typeof extractPage> | null = null;
  let finalUrl = url;
  try {
    const fetched = await fetchHtml(url);
    finalUrl = fetched.finalUrl;
    page = extractPage(finalUrl, fetched.html);
  } catch (err) {
    if (err instanceof FetchPageError && !existingRow) throw err;
    warnings.push(`Could not read the page: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 2. Snapshot.
  let snapshot: Buffer | null = null;
  try {
    snapshot = await screenshotPage(finalUrl);
  } catch (err) {
    warnings.push(`Snapshot failed, showing the gradient placeholder instead: ${err instanceof Error ? err.message.split("\n")[0] : String(err)}`);
  }

  const host = (() => { try { return new URL(finalUrl).hostname.replace(/^www\./, ""); } catch { return finalUrl; } })();

  // 3. Blurb (skipped on a re-snapshot: the admin's copy is kept).
  let blurb = existingRow
    ? { name: existingRow.name, category: existingRow.category, tagline: existingRow.tagline, description: existingRow.description, highlights: existingRow.highlights ?? [] }
    : null;
  let blurbSource: ResourceDraft["blurbSource"] = "extracted";
  if (!existingRow) {
    const fallback = {
      name: page?.ogTitle || page?.title || nameFromHost(host),
      category: "Partner app",
      tagline: (page?.ogDescription || page?.description || `Pulled from ${host} — edit this tagline.`).slice(0, 90),
      description: (page?.description || page?.ogDescription || `Page title and meta description from ${host} land here once fetched. Describe what the application does and how it supports a Premium Leads client.`).slice(0, 320),
      highlights: [] as string[],
    };
    const providers = await availableProviders();
    const provider = input.provider && providers.includes(input.provider) ? input.provider : providers[0];
    if (page && provider) {
      try {
        blurb = await generateResourceBlurb(page, input.notes ?? "", provider);
        blurbSource = "ai";
      } catch (err) {
        warnings.push(err instanceof AiError ? err.message : `AI blurb failed: ${err instanceof Error ? err.message : String(err)}`);
        blurb = fallback;
      }
    } else {
      if (!provider) warnings.push("No AI provider is configured — the draft uses the page's own title and description.");
      blurb = fallback;
    }
  }

  // 4. Store: update the existing row, or insert a draft.
  const id = existingRow?.id ?? (await freeId(host.replace(/[^a-z0-9]+/gi, "-").toLowerCase().replace(/^-+|-+$/g, "")));
  const now = new Date();
  if (existingRow) {
    await db().update(resources).set({
      url: finalUrl,
      ...(snapshot ? { snapshot, snapshotType: "image/png", snapshotAt: now } : {}),
      updatedAt: now,
    }).where(eq(resources.id, id));
  } else {
    const count = await db().select({ n: sql<string>`count(*)` }).from(resources);
    const position = Number(count[0]?.n ?? 0);
    await db().insert(resources).values({
      id, name: blurb!.name, url: finalUrl, category: blurb!.category, tagline: blurb!.tagline, description: blurb!.description,
      highlights: blurb!.highlights, featured: position < 3, draft: true, position,
      ...(snapshot ? { snapshot, snapshotType: "image/png", snapshotAt: now } : {}),
    });
  }
  const saved = (await db().select(PUBLIC_COLUMNS).from(resources).where(eq(resources.id, id)).limit(1))[0];
  const record = rowToRecord(saved);
  return { id, name: record.name, url: record.url, category: record.category, tagline: record.tagline, description: record.description, highlights: record.highlights, snapshot: record.snapshot, blurbSource, warnings };
}

export { resourceInitials };

/**
 * Best-effort, once per boot: screenshot any resource that has a URL but no
 * stored snapshot yet (the three seeded tools, say). Never blocks startup and
 * never throws — a page that can't be rendered keeps the gradient placeholder.
 */
export function backfillSnapshots(delayMs = 8_000): void {
  const timer = setTimeout(async () => {
    try {
      const rows = await db().select({ id: resources.id, url: resources.url }).from(resources).where(sql`url <> '' AND snapshot IS NULL`);
      for (const r of rows) {
        try {
          const url = normalizeUrl(r.url);
          await assertPublicHost(new URL(url));
          const png = await screenshotPage(url);
          await db().update(resources).set({ snapshot: png, snapshotType: "image/png", snapshotAt: new Date() }).where(eq(resources.id, r.id));
          console.log(`[resources] snapshot stored for ${r.id}`);
        } catch (err) {
          console.log(`[resources] snapshot skipped for ${r.id}: ${err instanceof Error ? err.message.split("\n")[0] : String(err)}`);
        }
      }
    } catch (err) {
      console.error("[resources] snapshot backfill failed", err);
    }
  }, delayMs);
  timer.unref?.();
}
