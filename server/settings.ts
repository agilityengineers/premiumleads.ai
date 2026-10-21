/**
 * Admin-editable site settings — one JSONB document per key in `site_settings`.
 * Copied from The Authority Desk's server/settings.ts: the bundled default is
 * the floor, validation runs on the way in and on the way out, and the keys
 * read on every public request are memoized for 30s and cleared on write.
 */
import { eq } from "drizzle-orm";
import { db } from "./db";
import { siteSettings } from "./schema";
import { SETTING_SCHEMAS, type SettingKey } from "../shared/settingsSchema";
import { DEFAULT_PREQUAL_FORM, prequalFormSchema } from "../shared/prequalificationSchema";
import { DEFAULT_DOOR_SECTIONS, type DoorSections } from "../shared/doorSections";
import { DEFAULT_ROUTING, type RoutingSettings } from "../shared/routingSchema";
import type { FormDefinition } from "../shared/formSchema";
import {
  DEFAULT_SITE_SETTINGS, DEFAULT_SECTIONS, DEFAULT_CAPABILITIES, DEFAULT_PRICING, DEFAULT_INTEGRATIONS,
  type SiteSettings, type SectionsSettings, type CapabilitiesSettings, type PricingSettings, type IntegrationsSettings,
} from "../shared/siteSettingsSchema";

/** The value type behind each settings key. */
export type SettingValues = {
  site: SiteSettings;
  sections: SectionsSettings;
  capabilities: CapabilitiesSettings;
  pricing: PricingSettings;
  integrations: IntegrationsSettings;
  prequalForm: FormDefinition;
  doorSections: DoorSections;
  routing: RoutingSettings;
};

const DEFAULTS: SettingValues = {
  site: DEFAULT_SITE_SETTINGS,
  sections: DEFAULT_SECTIONS,
  capabilities: DEFAULT_CAPABILITIES,
  pricing: DEFAULT_PRICING,
  integrations: DEFAULT_INTEGRATIONS,
  prequalForm: DEFAULT_PREQUAL_FORM,
  doorSections: DEFAULT_DOOR_SECTIONS,
  routing: DEFAULT_ROUTING,
};

/** A setting plus the context the admin panel needs to describe it. */
export type SettingMeta<K extends SettingKey> = {
  key: K;
  value: SettingValues[K];
  /** Null while the bundled default is being served. */
  updatedAt: string | null;
  isDefault: boolean;
};

const MEMO_MS = 30_000;
const MEMOIZED: SettingKey[] = ["site", "sections", "capabilities", "integrations", "pricing"];
const memos = new Map<SettingKey, { value: unknown; readAt: number }>();

async function readRow(key: SettingKey): Promise<{ value: unknown; updatedAt: Date } | null> {
  const rows = await db().select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1);
  return rows[0] ?? null;
}

function parseOrDefault<K extends SettingKey>(key: K, value: unknown): SettingValues[K] {
  const parsed = SETTING_SCHEMAS[key].safeParse(value);
  if (parsed.success) return parsed.data as SettingValues[K];
  console.error(
    `[settings] stored "${key}" failed validation — serving the bundled default.`,
    parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
  );
  return DEFAULTS[key];
}

/** The live value for a key (stored row, else the bundled default). */
export async function readSetting<K extends SettingKey>(key: K): Promise<SettingValues[K]> {
  const memo = memos.get(key);
  if (memo && Date.now() - memo.readAt < MEMO_MS) return memo.value as SettingValues[K];
  let value: SettingValues[K];
  try {
    const row = await readRow(key);
    value = row ? parseOrDefault(key, row.value) : DEFAULTS[key];
  } catch (err) {
    console.error(`[settings] read failed for "${key}"`, err);
    value = DEFAULTS[key];
  }
  if (MEMOIZED.includes(key)) memos.set(key, { value, readAt: Date.now() });
  return value;
}

/** The live value plus whether it has ever been saved (for the admin panel). */
export async function readSettingMeta<K extends SettingKey>(key: K): Promise<SettingMeta<K>> {
  const row = await readRow(key);
  return {
    key,
    value: row ? parseOrDefault(key, row.value) : DEFAULTS[key],
    updatedAt: row?.updatedAt?.toISOString() ?? null,
    isDefault: row === null,
  };
}

/** Thrown when a submitted setting fails its schema (answered as a 400). */
export class SettingsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettingsValidationError";
  }
}

/**
 * Validates and stores a setting. Returns the normalized value that was
 * actually written, so the admin UI shows exactly what the server kept.
 */
export async function writeSetting<K extends SettingKey>(key: K, value: unknown): Promise<SettingMeta<K>> {
  const parsed = SETTING_SCHEMAS[key].safeParse(value);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((i) => (i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message))
      .join("; ");
    throw new SettingsValidationError(message);
  }
  const normalized = parsed.data as SettingValues[K];
  const rows = await db()
    .insert(siteSettings)
    .values({ key, value: normalized })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value: normalized, updatedAt: new Date() } })
    .returning({ updatedAt: siteSettings.updatedAt });
  memos.delete(key);
  return { key, value: normalized, updatedAt: rows[0]?.updatedAt?.toISOString() ?? null, isDefault: false };
}

/** Removes a stored setting so the bundled default serves again. */
export async function resetSetting(key: SettingKey): Promise<void> {
  await db().delete(siteSettings).where(eq(siteSettings.key, key));
  memos.delete(key);
}

export function clearSettingsMemo(): void {
  memos.clear();
}

/** The active pre-qualification form (the one the visitor fills in is the one that validates their answers). */
export function readPrequalForm(): Promise<FormDefinition> {
  return readSetting("prequalForm");
}

/** Validates a definition without storing it (used by the admin preflight). */
export function checkPrequalForm(value: unknown) {
  return prequalFormSchema.safeParse(value);
}
