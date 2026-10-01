// Runs after the HTML loads, before React hydrates (see instrumentation-client.js docs).
// Catches errors that never reach the server at all — a thrown exception in an event
// handler, a rejected promise nobody awaited, a React render error outside any
// error.tsx boundary. Posts to /api/logs, which writes into the same error_logs table
// server-side errors land in, so /logs shows both in one place.

function report(message: string, stack: string | null, context: Record<string, unknown>) {
  try {
    void fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, stack, context }),
      // Don't let a logging call keep the page alive on unload.
      keepalive: true,
    });
  } catch {
    // Reporting a client error must never itself throw.
  }
}

window.addEventListener("error", (event: ErrorEvent) => {
  report(event.message || "Unknown window error", event.error?.stack ?? null, {
    path: window.location.pathname,
    kind: "window.onerror",
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? (reason.stack ?? null) : null;
  report(message, stack, {
    path: window.location.pathname,
    kind: "unhandledrejection",
  });
});
