import { eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { applicants, referenceHires } from "../db/schema";
import { stripBias } from "../resume/bias-strip";
import { embedText, getEmbeddingsProvider } from "../llm/embeddings";
import type { EmbeddingsProvider } from "./reference-lookup";

export type ReferenceHireOutcome = "hired" | "top_pick" | "other";

export interface PromoteResult {
  ok: boolean;
  error?: string;
}

export interface EmbeddingsConfigStatus {
  configured: boolean;
  reason?: string;
}

function defaultEmbeddingsModel(provider: EmbeddingsProvider): string {
  if (process.env.EMBEDDINGS_MODEL) return process.env.EMBEDDINGS_MODEL;
  return provider === "ollama" ? "nomic-embed-text" : "text-embedding-3-small";
}

/**
 * Best-effort, synchronous check for the common "embeddings aren't set up yet" case (no
 * API key for the resolved provider) so the UI can show a clear disabled state instead of
 * only discovering the problem when a promote/scoring call actually fails mid-request.
 * Not exhaustive — e.g. an unreachable local Ollama daemon still only surfaces as a
 * runtime error from embedText() itself, not from this check.
 */
export function embeddingsConfigStatus(): EmbeddingsConfigStatus {
  let provider: EmbeddingsProvider;
  try {
    provider = getEmbeddingsProvider();
  } catch (e) {
    return { configured: false, reason: (e as Error).message };
  }
  if (provider === "openai" && !process.env.OPENAI_API_KEY) {
    return { configured: false, reason: "EMBEDDINGS_PROVIDER resolves to openai, but OPENAI_API_KEY is not set." };
  }
  return { configured: true };
}

/**
 * Adds (or updates) a reference-hire row for an applicant — used as grounding context when
 * scoring future candidates against the same job family (lib/embeddings/reference-lookup.ts).
 * Stores the bias-stripped text, never the raw resume, since this text is later fed straight
 * into an LLM prompt as a grounding example.
 *
 * `outcome` records WHY this became a reference example ("hired" is the strongest signal;
 * "top_pick" covers a deliberate judgment call short of an actual hire) — it's metadata for
 * the management UI, not currently used to change retrieval/grounding behavior.
 *
 * Idempotent per applicant: re-promoting the same applicant (e.g. to correct the job
 * family, or to change outcome from top_pick to hired once they're actually hired) updates
 * their existing row instead of inserting a duplicate. There's no unique DB constraint
 * enforcing this — the check-then-write below is the only guard, which is fine at
 * self-hosted single-process scale but isn't race-safe under concurrent calls.
 */
export async function promoteApplicantToReferenceHire(
  applicantId: string,
  jobFamily: string,
  outcome: ReferenceHireOutcome = "hired",
): Promise<PromoteResult> {
  const family = jobFamily.trim();
  if (!family) return { ok: false, error: "Job family is required." };

  const db = getDb();
  const applicant = await db.query.applicants.findFirst({
    where: eq(applicants.id, applicantId),
    with: { resume: true },
  });
  if (!applicant) return { ok: false, error: "Applicant not found." };
  if (!applicant.resume?.rawText) {
    return { ok: false, error: "This applicant has no parsed resume text to promote." };
  }

  const status = embeddingsConfigStatus();
  if (!status.configured) {
    return { ok: false, error: status.reason ?? "Embeddings are not configured." };
  }

  const strippedText = stripBias(applicant.resume.rawText, { candidateName: applicant.name });

  const embeddingsProvider = getEmbeddingsProvider();
  let embedding: number[];
  try {
    embedding = await embedText(strippedText);
  } catch (e) {
    return { ok: false, error: `Failed to generate an embedding: ${(e as Error).message}` };
  }

  const values = {
    jobFamily: family,
    resumeText: strippedText,
    embedding: JSON.stringify(embedding),
    embeddingProvider: embeddingsProvider,
    embeddingModel: defaultEmbeddingsModel(embeddingsProvider),
    outcome,
    promotedFromApplicantId: applicantId,
  };

  const existing = await db.query.referenceHires.findFirst({
    where: eq(referenceHires.promotedFromApplicantId, applicantId),
  });

  if (existing) {
    await db.update(referenceHires).set(values).where(eq(referenceHires.id, existing.id));
  } else {
    await db.insert(referenceHires).values(values);
  }

  return { ok: true };
}
