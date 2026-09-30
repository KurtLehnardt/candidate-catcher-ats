"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { recomputeOverallScores } from "@/lib/scoring/recompute";

export async function updateRequirementWeight(
  jobId: string,
  requirementId: string,
  formData: FormData,
): Promise<void> {
  const weight = Number(formData.get("weight"));
  if (!Number.isFinite(weight) || weight < 0) throw new Error("updateRequirementWeight: invalid weight");

  const supabase = await createClient();
  const { error } = await supabase.from("requirements").update({ weight }).eq("id", requirementId);
  if (error) throw new Error(`updateRequirementWeight: ${error.message}`);

  await recomputeOverallScores(supabase, jobId);
  revalidatePath(`/jobs/${jobId}`);
}

export async function setManualScore(
  jobId: string,
  applicantId: string,
  formData: FormData,
): Promise<void> {
  const score = Number(formData.get("score"));
  const note = String(formData.get("note") ?? "").trim();
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new Error("setManualScore: score must be between 0 and 100");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("manual_scores").insert({
    applicant_id: applicantId,
    job_id: jobId,
    score,
    note: note || null,
  });
  if (error) throw new Error(`setManualScore: ${error.message}`);

  revalidatePath(`/jobs/${jobId}/applicants/${applicantId}`);
}
