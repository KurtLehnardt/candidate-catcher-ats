import type { SupabaseClient } from "@supabase/supabase-js";
import { aggregateScore } from "./aggregate";

/**
 * Recomputes and stores `applicants.overall_score` for every applicant on a job, from
 * their current `requirement_scores` rows and each requirement's current weight. Call
 * this after scoring runs and after any requirement weight changes.
 */
export async function recomputeOverallScores(supabase: SupabaseClient, jobId: string): Promise<void> {
  const { data: requirements, error: reqError } = await supabase
    .from("requirements")
    .select("id, weight")
    .eq("job_id", jobId);
  if (reqError) throw new Error(`recomputeOverallScores: requirements fetch failed: ${reqError.message}`);

  const weightByRequirement = new Map<string, number>((requirements ?? []).map((r) => [r.id, r.weight]));

  const { data: applicants, error: applicantsError } = await supabase
    .from("applicants")
    .select("id")
    .eq("job_id", jobId);
  if (applicantsError) {
    throw new Error(`recomputeOverallScores: applicants fetch failed: ${applicantsError.message}`);
  }

  for (const applicant of applicants ?? []) {
    const { data: scores, error: scoresError } = await supabase
      .from("requirement_scores")
      .select("requirement_id, ai_score")
      .eq("applicant_id", applicant.id);
    if (scoresError) {
      throw new Error(`recomputeOverallScores: scores fetch failed: ${scoresError.message}`);
    }

    const overall = aggregateScore(
      (scores ?? [])
        .filter((s) => weightByRequirement.has(s.requirement_id))
        .map((s) => ({ score: s.ai_score, weight: weightByRequirement.get(s.requirement_id)! })),
    );

    const { error: updateError } = await supabase
      .from("applicants")
      .update({ overall_score: overall })
      .eq("id", applicant.id);
    if (updateError) {
      throw new Error(`recomputeOverallScores: applicant update failed: ${updateError.message}`);
    }
  }
}
