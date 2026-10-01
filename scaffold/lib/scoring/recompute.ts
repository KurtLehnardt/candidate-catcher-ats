import { eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { applicants, requirementScores, requirements } from "../db/schema";
import { aggregateScore } from "./aggregate";

/**
 * Recomputes and stores `applicants.overallScore` for every applicant on a job, from
 * their current `requirement_scores` rows and each requirement's current weight. Call
 * this after scoring runs and after any requirement weight changes.
 */
export async function recomputeOverallScores(jobId: string): Promise<void> {
  const db = getDb();

  const reqRows = await db
    .select({ id: requirements.id, weight: requirements.weight })
    .from(requirements)
    .where(eq(requirements.jobId, jobId));
  const weightByRequirement = new Map(reqRows.map((r) => [r.id, r.weight]));

  const applicantRows = await db.select({ id: applicants.id }).from(applicants).where(eq(applicants.jobId, jobId));

  for (const applicant of applicantRows) {
    const scoreRows = await db
      .select({
        requirementId: requirementScores.requirementId,
        aiScore: requirementScores.aiScore,
        failed: requirementScores.failed,
      })
      .from(requirementScores)
      .where(eq(requirementScores.applicantId, applicant.id));

    // Failed rows (aiScore null after a retried-and-still-bad LLM response) are excluded
    // from the aggregate entirely, same as if scoring hadn't been attempted for that
    // requirement yet -- not treated as a 0, which would unfairly tank the applicant's
    // overall score for a transient provider hiccup rather than a real weak match.
    const overall = aggregateScore(
      scoreRows
        .filter((s) => weightByRequirement.has(s.requirementId) && !s.failed && s.aiScore != null)
        .map((s) => ({ score: s.aiScore!, weight: weightByRequirement.get(s.requirementId)! })),
    );

    await db.update(applicants).set({ overallScore: overall }).where(eq(applicants.id, applicant.id));
  }
}
