import { getDb } from "@/lib/db/client";
import { errorLogs } from "@/lib/db/schema";

export type LogSource = "server" | "client";
export type LogLevel = "error" | "warn";

export interface LogErrorInput {
  source: LogSource;
  level?: LogLevel;
  message: string;
  stack?: string | null;
  /** Small, non-sensitive metadata only (route, action name, a job/applicant id) — never
   * resume text, request bodies, or secrets. Serialized as-is via JSON.stringify. */
  context?: Record<string, unknown> | null;
}

/**
 * Writes one row to `error_logs`. Server-side only (uses the SQLite connection directly)
 * — client-side callers go through `POST /api/logs` instead, which calls this.
 *
 * Deliberately swallows its own failures (falling back to console.error) rather than
 * throwing: a logging call must never be what takes down the request it's trying to
 * record the failure of.
 */
export function logError(input: LogErrorInput): void {
  try {
    const db = getDb();
    db.insert(errorLogs)
      .values({
        source: input.source,
        level: input.level ?? "error",
        message: input.message.slice(0, 4000),
        stack: input.stack ? input.stack.slice(0, 8000) : null,
        context: input.context ? JSON.stringify(input.context).slice(0, 2000) : null,
      })
      .run();
  } catch (err) {
    // Logging must never throw into the caller's error path.
    console.error("logError: failed to write error_logs row", err);
  }
}
