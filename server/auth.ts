/**
 * Admin authentication with real users.
 *
 * The Authority Desk uses one shared password; Premium Leads has users and
 * roles, so this keeps AD's shape (an HMAC-signed, http-only cookie verified
 * on every admin route) and adds a user id to the token. Passwords are bcrypt
 * hashes. A token is `<userId>.<issuedAt>.<hmac>` and is only honoured while
 * the user exists and has not changed their password since it was issued, so
 * a password change signs every other session out.
 *
 * Signing secret: SESSION_SECRET. In production it is required; in development
 * a constant stands in, with a warning.
 */
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "./schema";
import { roleAllows, type UserRecord, type UserRole } from "../shared/usersSchema";

export const COOKIE_NAME = "pl_admin";
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const BCRYPT_ROUNDS = 12;

let warnedSecret = false;
function signingSecret(): string {
  const s = (process.env.SESSION_SECRET || process.env.ADMIN_SESSION_SECRET || "").trim();
  if (s) return s;
  if (process.env.NODE_ENV === "production") return "";
  if (!warnedSecret) {
    warnedSecret = true;
    console.warn("[auth] SESSION_SECRET is not set — using a development signing key.");
  }
  return "dev-only-premiumleads-session-secret";
}

export function isAuthConfigured(): boolean {
  return signingSecret() !== "";
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", signingSecret()).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** A random temporary password for invites and resets ("Welcome" + 4 digits, as the design shows, plus entropy). */
export function temporaryPassword(): string {
  return `Welcome${Math.floor(1000 + Math.random() * 9000)}-${crypto.randomBytes(3).toString("hex")}`;
}

/** Create a signed session token for a user. */
export function createToken(userId: number): string {
  const issued = Date.now().toString();
  const payload = `${userId}.${issued}`;
  return `${payload}.${sign(payload)}`;
}

/** Verify a token's signature and freshness; returns the user id and issue time. */
export function parseToken(token: string | undefined): { userId: number; issuedAt: number } | null {
  if (!signingSecret() || !token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [id, issued, sig] = parts;
  if (!id || !issued || !sig) return null;
  if (!safeEqual(sig, sign(`${id}.${issued}`))) return null;
  const issuedAt = Number(issued);
  const userId = Number(id);
  if (!Number.isFinite(issuedAt) || !Number.isFinite(userId)) return null;
  if (Date.now() - issuedAt > MAX_AGE_MS) return null;
  return { userId, issuedAt };
}

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_MS,
    path: "/",
  };
}

type UserRow = typeof users.$inferSelect;

export function rowToUser(row: UserRow): UserRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role as UserRole,
    status: row.status as UserRecord["status"],
    mustChangePassword: row.mustChangePassword,
    lastLoginAt: row.lastLoginAt ? row.lastLoginAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const rows = await db().select().from(users).where(eq(users.email, email.trim().toLowerCase())).limit(1);
  return rows[0] ?? null;
}

export async function findUserById(id: number): Promise<UserRow | null> {
  const rows = await db().select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

/** The user behind a request's cookie, or null. Rejects tokens older than the user's last password change. */
export async function currentUser(req: Request): Promise<UserRow | null> {
  const token = (req as Request & { cookies?: Record<string, string> }).cookies?.[COOKIE_NAME];
  const parsed = parseToken(token);
  if (!parsed) return null;
  const user = await findUserById(parsed.userId);
  if (!user) return null;
  // A second of slack: the token is issued in the same transaction as a change.
  if (user.passwordChangedAt.getTime() - 1000 > parsed.issuedAt) return null;
  return user;
}

export type AuthedRequest = Request & { user: UserRow };

/**
 * Express middleware guarding admin routes. `panel` names the admin area the
 * route belongs to, so advisors (leads only) and admins (no users/integrations)
 * are refused server-side, not just hidden in the UI. A user who must change
 * their password may only reach the password route.
 */
export function requireAuth(panel?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.mustChangePassword && panel !== "password") {
      return res.status(403).json({ error: "Set a new password first.", mustChangePassword: true });
    }
    if (panel && panel !== "password" && !roleAllows(user.role as UserRole, panel)) {
      return res.status(403).json({ error: "Your role can't do that." });
    }
    (req as AuthedRequest).user = user;
    next();
  };
}

/**
 * Reject cross-site state-changing requests: if an Origin header is present it
 * must match the request host (same-origin). A light CSRF guard for mutations.
 */
export function requireSameOrigin(req: Request, res: Response, next: NextFunction) {
  const origin = req.get("origin");
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      const host = req.get("host");
      if (host && originHost !== host) {
        return res.status(403).json({ error: "Cross-origin request blocked" });
      }
    } catch {
      return res.status(403).json({ error: "Bad origin" });
    }
  }
  next();
}

/* ----------------------------------------------------------- login throttle */

const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 8;
const LOCK_MS = 10 * 60_000;

/** Returns seconds to wait when an email+IP pair has failed too often. */
export function loginThrottle(key: string): number {
  const a = attempts.get(key);
  if (!a) return 0;
  if (a.count >= MAX_ATTEMPTS && a.until > Date.now()) return Math.ceil((a.until - Date.now()) / 1000);
  if (a.until <= Date.now()) attempts.delete(key);
  return 0;
}

export function recordLoginFailure(key: string): void {
  const a = attempts.get(key) ?? { count: 0, until: 0 };
  a.count += 1;
  a.until = Date.now() + LOCK_MS;
  attempts.set(key, a);
}

export function clearLoginFailures(key: string): void {
  attempts.delete(key);
}
