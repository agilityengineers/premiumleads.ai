/**
 * Integration secrets (API keys, shared secrets) — write-only from the admin.
 *
 * Stored AES-256-GCM encrypted in `integration_secrets`, keyed by
 * "<integration>.<field>". The browser only ever learns whether a secret is
 * set. The server reads a secret through `getSecret()`, which prefers the
 * stored value and falls back to the integration's env var (so Replit Secrets
 * keep working, and nothing is configured twice).
 *
 * The encryption key is SECRETS_KEY (32 bytes as 64 hex chars or base64).
 * Without it, in development a key is derived from SESSION_SECRET (or a
 * constant, with a loud warning); in production saving a secret is refused.
 */
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { integrationSecrets } from "./schema";
import { INTEGRATION_DEFS, SECRET_FIELD_IDS } from "../shared/siteSettingsSchema";

const isProd = process.env.NODE_ENV === "production";
let warned = false;

function keyMaterial(): Buffer | null {
  const raw = (process.env.SECRETS_KEY || "").trim();
  if (raw) {
    if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
    const b64 = Buffer.from(raw, "base64");
    if (b64.length === 32) return b64;
    // Any other string: stretch it. Still a real secret, just not pre-sized.
    return crypto.scryptSync(raw, "premiumleads-secrets", 32);
  }
  if (isProd) return null;
  const fallback = process.env.SESSION_SECRET || "dev-only-premiumleads-secrets-key";
  if (!warned) {
    warned = true;
    console.warn("[secrets] SECRETS_KEY is not set — deriving a development key. Set SECRETS_KEY in production.");
  }
  return crypto.scryptSync(fallback, "premiumleads-secrets", 32);
}

export function secretsConfigured(): boolean {
  return keyMaterial() !== null;
}

export class SecretsUnavailableError extends Error {}

export function encryptSecret(plain: string): { ciphertext: string; iv: string; tag: string } {
  const key = keyMaterial();
  if (!key) throw new SecretsUnavailableError("SECRETS_KEY is not configured.");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return { ciphertext: ciphertext.toString("base64"), iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64") };
}

export function decryptSecret(row: { ciphertext: string; iv: string; tag: string }): string {
  const key = keyMaterial();
  if (!key) throw new SecretsUnavailableError("SECRETS_KEY is not configured.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(row.iv, "base64"));
  decipher.setAuthTag(Buffer.from(row.tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(row.ciphertext, "base64")), decipher.final()]).toString("utf8");
}

/** Env var that stands in for a secret field when nothing is stored. */
function envFor(id: string): string | undefined {
  const [integration, field] = id.split(".");
  const def = INTEGRATION_DEFS.find((g) => g.key === integration)?.fields.find((f) => f.key === field);
  return def?.env;
}

const cache = new Map<string, { value: string | null; at: number }>();
const CACHE_MS = 15_000;

/** The usable value for a secret: stored (decrypted) first, env fallback second, "" when neither. */
export async function getSecret(id: string): Promise<string> {
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < CACHE_MS && hit.value !== null) return hit.value;
  let stored: string | null = null;
  try {
    const rows = await db().select().from(integrationSecrets).where(eq(integrationSecrets.id, id)).limit(1);
    if (rows[0]) stored = decryptSecret(rows[0]);
  } catch (err) {
    if (!(err instanceof SecretsUnavailableError)) console.error(`[secrets] read failed for ${id}`, err);
  }
  const env = envFor(id);
  const value = stored ?? (env ? (process.env[env] || "").trim() : "");
  cache.set(id, { value, at: Date.now() });
  return value;
}

export async function setSecret(id: string, plain: string, actor: string | null): Promise<void> {
  if (!SECRET_FIELD_IDS.includes(id)) throw new Error(`Unknown secret ${id}`);
  const enc = encryptSecret(plain);
  await db()
    .insert(integrationSecrets)
    .values({ id, ...enc, updatedBy: actor })
    .onConflictDoUpdate({ target: integrationSecrets.id, set: { ...enc, updatedBy: actor, updatedAt: new Date() } });
  cache.delete(id);
}

export async function clearSecret(id: string): Promise<void> {
  await db().delete(integrationSecrets).where(eq(integrationSecrets.id, id));
  cache.delete(id);
}

/** Which secrets have a usable value (stored or env), for the admin's "set" markers. */
export async function secretsStatus(): Promise<Record<string, { stored: boolean; env: boolean }>> {
  const out: Record<string, { stored: boolean; env: boolean }> = {};
  let storedIds = new Set<string>();
  try {
    const rows = await db().select({ id: integrationSecrets.id }).from(integrationSecrets);
    storedIds = new Set(rows.map((r) => r.id));
  } catch (err) {
    console.error("[secrets] status read failed", err);
  }
  for (const id of SECRET_FIELD_IDS) {
    const env = envFor(id);
    out[id] = { stored: storedIds.has(id), env: Boolean(env && (process.env[env] || "").trim()) };
  }
  return out;
}
