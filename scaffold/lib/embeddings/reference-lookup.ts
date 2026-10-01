import { and, eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { referenceHires } from "../db/schema";

export type EmbeddingsProvider = "openai" | "ollama";

export interface ReferenceHireMatch {
  id: string;
  resumeText: string;
  similarity: number;
}

export interface ReferenceHireLookupParams {
  jobFamily: string;
  embedding: number[];
  embeddingsProvider: EmbeddingsProvider;
  /** How many reference hires to return. Default 3. */
  k?: number;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return -1;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  if (normA === 0 || normB === 0) return -1;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Top-k most similar reference-hire resumes for a job family. No ANN index — these
 * corpora run tens to low-hundreds of rows for a self-hosted single user, so brute-force
 * cosine similarity in JS is simpler and keeps the install free of a native vector
 * extension. Always filtered to `embeddingsProvider` first — never compare vectors
 * produced by different providers/dimensions against each other.
 */
export async function getTopReferenceHires(params: ReferenceHireLookupParams): Promise<ReferenceHireMatch[]> {
  const db = getDb();
  const rows = await db
    .select({ id: referenceHires.id, resumeText: referenceHires.resumeText, embedding: referenceHires.embedding })
    .from(referenceHires)
    .where(
      and(eq(referenceHires.jobFamily, params.jobFamily), eq(referenceHires.embeddingProvider, params.embeddingsProvider)),
    );

  return rows
    .filter((r): r is typeof r & { embedding: string } => r.embedding != null)
    .map((r) => ({
      id: r.id,
      resumeText: r.resumeText,
      similarity: cosineSimilarity(JSON.parse(r.embedding) as number[], params.embedding),
    }))
    .filter((r) => r.similarity > -1)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, params.k ?? 3);
}
