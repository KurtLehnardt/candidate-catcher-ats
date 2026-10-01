import type { LLMProvider, RequirementScoreResult } from "../llm/provider";
import type { ScoringRequirementInput } from "../llm/prompt";

export interface ScoredRequirementOutcome {
  requirementId: string;
  /** null means this requirement's score could not be obtained after retrying. */
  score: number | null;
  evidence: string;
  substanceNote: string;
  failed: boolean;
}

/**
 * One `scoreResume` attempt, tolerant of the call throwing (network error, invalid JSON,
 * schema mismatch) -- returns null instead of propagating, so the caller can retry rather
 * than crash the whole batch (this is the exact failure mode that took down a real
 * scoring run: one bad Ollama response aborted every other resume's already-completed
 * work along with it).
 */
async function attemptOnce(
  provider: Pick<LLMProvider, "scoreResume">,
  resumeText: string,
  requirements: ScoringRequirementInput[],
  referenceSnippets: string[],
): Promise<Map<string, RequirementScoreResult> | null> {
  try {
    const results = await provider.scoreResume(resumeText, requirements, referenceSnippets);
    return new Map(results.map((r) => [r.requirementId, r]));
  } catch {
    return null;
  }
}

/**
 * Score one resume against every given requirement in a single batched LLM call, with one
 * retry if the call throws OR comes back missing one or more requested requirement ids
 * (an Ollama json_object response is not schema-constrained server-side, so a smaller
 * local model can drop an entry). Entries still missing after the retry are reported as
 * `failed: true` / `score: null` rather than thrown -- the caller persists these as a
 * clear failure state and keeps going, instead of losing every other resume's results in
 * the same run.
 */
export async function scoreResumeWithRetry(
  provider: Pick<LLMProvider, "scoreResume">,
  resumeText: string,
  requirements: ScoringRequirementInput[],
  referenceSnippets: string[] = [],
): Promise<ScoredRequirementOutcome[]> {
  const firstAttempt = await attemptOnce(provider, resumeText, requirements, referenceSnippets);
  const missingIds = requirements.map((r) => r.id).filter((id) => !firstAttempt?.has(id));

  const merged = new Map(firstAttempt ?? []);
  if (missingIds.length > 0) {
    const retryAttempt = await attemptOnce(provider, resumeText, requirements, referenceSnippets);
    if (retryAttempt) {
      for (const [id, result] of retryAttempt) {
        if (!merged.has(id)) merged.set(id, result);
      }
    }
  }

  return requirements.map((req) => {
    const hit = merged.get(req.id);
    if (hit) {
      return {
        requirementId: req.id,
        score: hit.score,
        evidence: hit.evidence,
        substanceNote: hit.substanceNote,
        failed: false,
      };
    }
    return {
      requirementId: req.id,
      score: null,
      evidence: "",
      substanceNote: "Scoring failed after retry — re-run scoring to try again.",
      failed: true,
    };
  });
}
