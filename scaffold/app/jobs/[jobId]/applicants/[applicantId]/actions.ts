"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { applicants, interviewQuestions, manualScores, requirementScores, requirements, resumes } from "@/lib/db/schema";
import { recomputeOverallScores } from "@/lib/scoring/recompute";
import { promoteApplicantToReferenceHire, type ReferenceHireOutcome } from "@/lib/embeddings/promote";
import { getProvider } from "@/lib/llm/provider";
import { stripBias } from "@/lib/resume/bias-strip";
import type { InterviewQuestionRequirementInput } from "@/lib/llm/prompt";

const VALID_OUTCOMES: ReferenceHireOutcome[] = ["hired", "top_pick", "other"];

export async function updateRequirementWeight(jobId: string, requirementId: string, formData: FormData): Promise<void> {
  const weight = Number(formData.get("weight"));
  if (!Number.isFinite(weight) || weight < 0) throw new Error("updateRequirementWeight: invalid weight");

  const db = getDb();
  await db.update(requirements).set({ weight }).where(eq(requirements.id, requirementId));

  await recomputeOverallScores(jobId);
  revalidatePath(`/jobs/${jobId}`);
}

export async function setManualScore(jobId: string, applicantId: string, formData: FormData): Promise<void> {
  const score = Number(formData.get("score"));
  const note = String(formData.get("note") ?? "").trim();
  const reviewerName = String(formData.get("reviewerName") ?? "").trim();
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new Error("setManualScore: score must be between 0 and 100");
  }
  if (!reviewerName) {
    throw new Error("setManualScore: reviewerName is required");
  }

  const db = getDb();
  await db.insert(manualScores).values({
    applicantId,
    jobId,
    score,
    note: note || null,
    reviewerName,
  });

  revalidatePath(`/jobs/${jobId}/applicants/${applicantId}`);
}

export async function promoteToReferenceHire(
  jobId: string,
  applicantId: string,
  outcome: ReferenceHireOutcome,
  formData: FormData,
): Promise<void> {
  if (!VALID_OUTCOMES.includes(outcome)) {
    throw new Error(`promoteToReferenceHire: invalid outcome "${outcome}"`);
  }
  const jobFamily = String(formData.get("jobFamily") ?? "").trim();
  const result = await promoteApplicantToReferenceHire(applicantId, jobFamily, outcome);
  if (!result.ok) {
    throw new Error(result.error ?? "promoteToReferenceHire: unknown error");
  }

  revalidatePath(`/jobs/${jobId}/applicants/${applicantId}`);
  revalidatePath("/reference-hires");
  revalidatePath(`/jobs/${jobId}`);
}

/**
 * Generates (or regenerates) interview questions for this applicant, targeted at their
 * actual per-requirement scoring gaps/strengths rather than generic questions. Replaces
 * any previously-generated rows for this applicant instead of accumulating duplicates --
 * generation is explicit and on-demand, never automatic on page load.
 */
export async function generateInterviewQuestionsForApplicant(jobId: string, applicantId: string): Promise<void> {
  const db = getDb();

  const applicant = await db.query.applicants.findFirst({ where: eq(applicants.id, applicantId) });
  if (!applicant) throw new Error("generateInterviewQuestionsForApplicant: applicant not found");
  if (!applicant.resumeId) throw new Error("generateInterviewQuestionsForApplicant: applicant has no resume");

  const resume = await db.query.resumes.findFirst({ where: eq(resumes.id, applicant.resumeId) });
  if (!resume) throw new Error("generateInterviewQuestionsForApplicant: resume not found");

  const scoreRows = await db
    .select({
      id: requirements.id,
      text: requirements.text,
      score: requirementScores.aiScore,
      failed: requirementScores.failed,
      evidence: requirementScores.evidenceSnippet,
      substanceNote: requirementScores.substanceNote,
    })
    .from(requirements)
    .leftJoin(requirementScores, eq(requirementScores.requirementId, requirements.id))
    .where(eq(requirements.jobId, jobId));

  const knownIds = new Set(scoreRows.map((r) => r.id));
  const requirementInputs: InterviewQuestionRequirementInput[] = scoreRows.map((r) => ({
    id: r.id,
    text: r.text,
    score: r.score,
    failed: r.failed ?? false,
    evidence: r.evidence,
    substanceNote: r.substanceNote,
  }));

  const strippedResume = stripBias(resume.rawText, { candidateName: applicant.name });
  const provider = getProvider();
  const questions = await provider.generateInterviewQuestions(strippedResume, requirementInputs);

  await db.delete(interviewQuestions).where(eq(interviewQuestions.applicantId, applicantId));
  if (questions.length > 0) {
    await db.insert(interviewQuestions).values(
      questions.map((q) => ({
        applicantId,
        question: q.question,
        // Only trust an id the model actually echoed back from the real requirement set --
        // an empty string (general question) or a hallucinated id both resolve to null.
        relatedRequirementId: knownIds.has(q.relatedRequirementId) ? q.relatedRequirementId : null,
      })),
    );
  }

  revalidatePath(`/jobs/${jobId}/applicants/${applicantId}`);
}
