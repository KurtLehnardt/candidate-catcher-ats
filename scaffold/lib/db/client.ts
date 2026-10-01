import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

const DB_PATH = process.env.DATABASE_PATH ?? "data/clearmatch.db";
const MIGRATIONS_FOLDER = resolve(process.cwd(), "drizzle");

type Db = BetterSQLite3Database<typeof schema>;

// Cached on `globalThis` so Next.js dev's hot-reload doesn't reopen the file (and re-run
// migrations) on every request — the same pattern commonly used for a Prisma client.
declare global {
  var __clearmatchDb: Db | undefined;
}

function createDb(): Db {
  const absPath = resolve(process.cwd(), DB_PATH);
  mkdirSync(dirname(absPath), { recursive: true });

  const sqlite = new Database(absPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return db;
}

/** The one SQLite connection for this process, auto-migrated on first use. */
export function getDb(): Db {
  if (!globalThis.__clearmatchDb) {
    globalThis.__clearmatchDb = createDb();
  }
  return globalThis.__clearmatchDb;
}
