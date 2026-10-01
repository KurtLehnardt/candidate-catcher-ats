import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { errorLogs } from "@/lib/db/schema";

function formatContext(context: string | null): string | null {
  if (!context) return null;
  try {
    return JSON.stringify(JSON.parse(context), null, 2);
  } catch {
    return context;
  }
}

export default async function LogsPage() {
  const db = getDb();
  const rows = await db.select().from(errorLogs).orderBy(desc(errorLogs.createdAt)).limit(200);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Error logs</h1>
        <p className="text-sm text-zinc-500">Most recent 200, newest first</p>
      </div>

      {rows.length === 0 && <p className="text-zinc-500">No errors logged. That&apos;s a good sign.</p>}

      <ul className="space-y-3">
        {rows.map((row) => (
          <li
            key={row.id}
            className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-zinc-500">{row.createdAt.toLocaleString()}</span>
              <span
                className={`rounded px-1.5 py-0.5 font-medium ${
                  row.level === "error"
                    ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                }`}
              >
                {row.level}
              </span>
              <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {row.source}
              </span>
            </div>
            <p className="mb-1 font-medium">{row.message}</p>
            {row.context && (
              <p className="mb-1 text-xs text-zinc-500">{formatContext(row.context)}</p>
            )}
            {row.stack && (
              <details>
                <summary className="cursor-pointer text-xs text-zinc-500 hover:underline">
                  Stack trace
                </summary>
                <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded bg-zinc-50 p-2 text-xs dark:bg-zinc-900">
                  {row.stack}
                </pre>
              </details>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
