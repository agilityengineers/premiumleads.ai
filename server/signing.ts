/**
 * Signed integration messages — the one scheme every partner call uses, in
 * both directions, exactly as The Authority Desk's Brand Voice feed does:
 *
 *   X-Timestamp:  unix seconds
 *   X-Signature:  hex HMAC-SHA256 over `${timestamp}.${raw body}`
 *
 * Requests older than five minutes are refused, so a captured request cannot
 * be replayed later. Pure functions, no I/O — tests import this directly.
 */
import crypto from "node:crypto";

/** How far a request's timestamp may be from now. */
export const MAX_SKEW_SECONDS = 5 * 60;

/** The hex signature for a body at a timestamp. */
export function signPayload(secret: string, timestamp: string, body: string | Buffer): string {
  return crypto.createHmac("sha256", secret).update(`${timestamp}.`).update(body).digest("hex");
}

/** Headers for an outbound signed POST. */
export function signedHeaders(secret: string, body: string, nowSeconds = Math.floor(Date.now() / 1000)): Record<string, string> {
  const timestamp = String(nowSeconds);
  return {
    "Content-Type": "application/json",
    "X-Timestamp": timestamp,
    "X-Signature": signPayload(secret, timestamp, body),
    // The Authority Desk's Brand Voice onboarding endpoint reads this header
    // name; sending both lets AD verify with either check.
    "X-Premium-Leads-Signature": signPayload(secret, timestamp, body),
  };
}

export type SignatureVerdict = "ok" | "no-secret" | "missing" | "stale" | "mismatch";

export function verifySignature(
  rawBody: Buffer | undefined,
  timestamp: string | undefined,
  signature: string | undefined,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): SignatureVerdict {
  if (!secret) return "no-secret";
  if (!rawBody || !timestamp || !signature) return "missing";
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSeconds - ts) > MAX_SKEW_SECONDS) return "stale";
  const expected = signPayload(secret, timestamp, rawBody);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature.trim().toLowerCase(), "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? "ok" : "mismatch";
}

/**
 * Plain HMAC over the raw body alone (no timestamp) — what SmartScheduler's
 * callback secret produces today for Brand Voice. Accepted alongside the
 * timestamped form on the scheduler webhook only.
 */
export function verifyBodySignature(rawBody: Buffer | undefined, signature: string | undefined, secret: string): boolean {
  if (!secret || !rawBody || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature.trim().toLowerCase().replace(/^sha256=/, ""), "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
