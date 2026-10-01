import { NextResponse } from "next/server";
import { logError } from "@/lib/log";

/**
 * Write path for client-captured errors (instrumentation-client.ts, app/error.tsx).
 * The browser has no direct DB access, so this is the one hop a client-side error takes
 * to land in the same `error_logs` table as server-side ones.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || !("message" in body) || typeof body.message !== "string") {
    return NextResponse.json({ ok: false, error: "message (string) is required" }, { status: 400 });
  }

  const stack = "stack" in body && typeof body.stack === "string" ? body.stack : null;
  const context = "context" in body && typeof body.context === "object" && body.context !== null
    ? (body.context as Record<string, unknown>)
    : null;

  logError({ source: "client", message: body.message, stack, context });

  return NextResponse.json({ ok: true });
}
