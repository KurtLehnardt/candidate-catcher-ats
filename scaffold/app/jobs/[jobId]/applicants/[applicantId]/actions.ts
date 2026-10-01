"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { manualScores, requirements } from "@/lib/db/schema";
import { recomputeOverallScores } from "@/lib/scoring/recompute";
import { promoteApplicantToReferenceHire } from "@/lib/embeddings/promote";

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
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new Error("setManualScore: score must be between 0 and 100");
  }

  const db = getDb();
  await db.insert(manualScores).values({
    applicantId,
    jobId,
    score,
    note: note || null,
  });

  revalidatePath(`/jobs/${jobId}/applicants/${applicantId}`);
}

export async function promoteToReferenceHire(jobId: string, applicantId: string, formData: FormData): Promise<void> {
  const jobFamily = String(formData.get("jobFamily") ?? "").trim();
  const result = await promoteApplicantToReferenceHire(applicantId, jobFamily);
  if (!result.ok) {
    throw new Error(result.error ?? "promoteToReferenceHire: unknown error");
  }

  revalidatePath(`/jobs/${jobId}/applicants/${applicantId}`);
  revalidatePath("/reference-hires");
}
