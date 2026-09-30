import type { SupabaseClient } from "@supabase/supabase-js";

export type EmbeddingsProvider = "openai" | "ollama";

export interface ReferenceHireMatch {
  id: string;
  resumeText: string;
  similarity: number;
}

export interface ReferenceHireLookupParams {
  orgId: string;
  jobFamily: string;
  embedding: number[];
  embeddingsProvider: EmbeddingsProvider;
  /** How many reference hires to return. Default 3. */
  k?: number;
}

interface MatchReferenceHiresRow {
  id: string;
  resume_text: string;
  similarity: number;
}

/**
 * Top-k most similar reference-hire resumes for an org + job family, via the
 * match_reference_hires_openai / match_reference_hires_ollama RPCs defined in
 * 0002_embedding_dims.sql. Which RPC (and therefore which embedding column/dimension)
 * runs is picked by `embeddingsProvider` — never mix openai- and ollama-dimensioned
 * vectors in one lookup.
 */
export async function getTopReferenceHires(
  supabase: SupabaseClient,
  params: ReferenceHireLookupParams,
): Promise<ReferenceHireMatch[]> {
  const rpcName =
    params.embeddingsProvider === "ollama" ? "match_reference_hires_ollama" : "match_reference_hires_openai";

  const { data, error } = await supabase.rpc(rpcName, {
    query_embedding: params.embedding,
    match_org_id: params.orgId,
    match_job_family: params.jobFamily,
    match_count: params.k ?? 3,
  });

  if (error) {
    throw new Error(`getTopReferenceHires: ${rpcName} failed: ${error.message}`);
  }

  return ((data ?? []) as MatchReferenceHiresRow[]).map((row) => ({
    id: row.id,
    resumeText: row.resume_text,
    similarity: row.similarity,
  }));
}
