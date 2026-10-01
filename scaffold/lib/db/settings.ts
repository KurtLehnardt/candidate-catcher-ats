import { eq } from "drizzle-orm";
import { getDb } from "./client";
import { settings } from "./schema";

const SINGLETON_ID = "singleton";

export interface AppSettings {
  llmProvider: string | null;
  llmModel: string | null;
  embeddingsProvider: string | null;
  embeddingsModel: string | null;
}

const EMPTY: AppSettings = {
  llmProvider: null,
  llmModel: null,
  embeddingsProvider: null,
  embeddingsModel: null,
};

/** The user's in-app provider/model choice, or all-null if they haven't set one yet (falls back to env). */
export function getSettings(): AppSettings {
  const row = getDb().select().from(settings).where(eq(settings.id, SINGLETON_ID)).get();
  if (!row) return EMPTY;
  return {
    llmProvider: row.llmProvider,
    llmModel: row.llmModel,
    embeddingsProvider: row.embeddingsProvider,
    embeddingsModel: row.embeddingsModel,
  };
}

/** Upserts the singleton settings row, merging `partial` over whatever's already stored. */
export function updateSettings(partial: Partial<AppSettings>): void {
  const db = getDb();
  const existing = db.select().from(settings).where(eq(settings.id, SINGLETON_ID)).get();
  if (existing) {
    db.update(settings)
      .set({ ...partial, updatedAt: new Date() })
      .where(eq(settings.id, SINGLETON_ID))
      .run();
  } else {
    db.insert(settings)
      .values({ id: SINGLETON_ID, ...EMPTY, ...partial, updatedAt: new Date() })
      .run();
  }
}
