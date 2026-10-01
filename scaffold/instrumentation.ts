import type { Instrumentation } from "next";

/**
 * Catches uncaught errors from Server Components, Route Handlers, and Server Actions
 * (routeType: 'render' | 'route' | 'action' | 'proxy' — confirmed in Next 16's own docs)
 * and persists them to `error_logs`. This is the single server-side catch-all; it does
 * NOT see errors an action already handles itself (e.g. a per-requirement scoring
 * failure that's recorded as a `failed` row rather than thrown) — those are expected
 * outcomes, not bugs, and aren't logged here on purpose.
 *
 * Dynamic import of `./lib/log` (rather than a static top-level import) because
 * `instrumentation.ts` is loaded in both the Node and Edge runtime; better-sqlite3 is
 * Node-only, and this file is skipped entirely when NEXT_RUNTIME is 'edge' before the
 * import ever happens.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME === "edge") return;

  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;

  const { logError } = await import("./lib/log");
  logError({
    source: "server",
    message,
    stack,
    context: {
      path: request.path,
      method: request.method,
      routerKind: context.routerKind,
      routePath: context.routePath,
      routeType: context.routeType,
    },
  });
};
