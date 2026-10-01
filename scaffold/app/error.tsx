"use client";

import { useEffect } from "react";

/**
 * Route-segment error boundary (App Router convention). Covers React render-time
 * errors that `instrumentation-client.ts`'s window.onerror/unhandledrejection listeners
 * do NOT see — React intercepts render errors itself before they'd ever reach `window`.
 * Reports to the same /api/logs endpoint so these land in /logs alongside everything else.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack ?? null,
        context: {
          path: window.location.pathname,
          kind: "react-error-boundary",
          digest: error.digest,
        },
      }),
      keepalive: true,
    }).catch(() => {
      // Reporting a client error must never itself throw.
    });
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="mb-2 text-xl font-semibold">Something went wrong</h1>
      <p className="mb-4 text-sm text-zinc-500">
        The error has been logged. See{" "}
        <a href="/logs" className="underline">
          /logs
        </a>{" "}
        for details.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
      >
        Try again
      </button>
    </div>
  );
}
