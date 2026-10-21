/**
 * Postgres access: a lazily-created pg Pool, a Drizzle instance over it, and
 * `query()` for the raw SQL the lead-pipeline modules need (advisory locks,
 * ON CONFLICT merges, SKIP LOCKED sweeps). Migrations generated from
 * server/schema.ts are applied at boot by `migrateDatabase()`, so a fresh
 * database works on first run — the same "idempotent on every boot" rule The
 * Authority Desk's ensureSchema follows.
 */
import pg from "pg";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import * as schema from "./schema";

const { Pool } = pg;

let pool: pg.Pool | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  return url;
}

/** Lazily-created singleton Postgres pool (reads DATABASE_URL). */
export function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrl(),
      max: Number(process.env.PG_POOL_MAX) || 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
    pool.on("error", (err) => {
      console.error("[db] Unexpected idle client error:", err);
    });
  }
  return pool;
}

/** The Drizzle instance (typed queries over `server/schema.ts`). */
export function db() {
  if (!dbInstance) dbInstance = drizzle(getPool(), { schema });
  return dbInstance;
}

/** Raw parameterised SQL for the places Drizzle's builder gets in the way. */
export function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> {
  return getPool().query<T>(text, params as never[]);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Applies every pending migration in ./drizzle. Safe to run on every boot. */
export async function migrateDatabase(): Promise<void> {
  await migrate(db(), { migrationsFolder: path.resolve(__dirname, "..", "drizzle") });
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    dbInstance = null;
  }
}

export { schema };
