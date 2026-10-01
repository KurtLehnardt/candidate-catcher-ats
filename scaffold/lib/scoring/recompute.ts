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
      .select({ requirementId: requirementScores.requirementId, aiScore: requirementScores.aiScore })
      .from(requirementScores)
      .where(eq(requirementScores.applicantId, applicant.id));

    const overall = aggregateScore(
      scoreRows
        .filter((s) => weightByRequirement.has(s.requirementId))
        .map((s) => ({ score: s.aiScore, weight: weightByRequirement.get(s.requirementId)! })),
    );

    await db.update(applicants).set({ overallScore: overall }).where(eq(applicants.id, applicant.id));
  }
}
