"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/org";

export interface RequirementInput {
  text: string;
  weight: number;
}

export async function createJob(formData: FormData): Promise<void> {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!title) throw new Error("createJob: title is required");

  const requirementTexts = formData.getAll("requirementText").map((v) => String(v));
  const requirementWeights = formData.getAll("requirementWeight").map((v) => Number(v) || 1.0);

  const requirements: RequirementInput[] = requirementTexts
    .map((text, i) => ({ text: text.trim(), weight: requirementWeights[i] ?? 1.0 }))
    .filter((r) => r.text.length > 0);

  const orgId = await getCurrentOrgId();
  const supabase = await createClient();

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .insert({ org_id: orgId, title, description, status: "draft" })
    .select("id")
    .single();
  if (jobError || !job) throw new Error(`createJob: ${jobError?.message ?? "no job returned"}`);

  if (requirements.length > 0) {
    const { error: reqError } = await supabase.from("requirements").insert(
      requirements.map((r, position) => ({
        job_id: job.id,
        text: r.text,
        weight: r.weight,
        position,
      })),
    );
    if (reqError) throw new Error(`createJob: requirements insert failed: ${reqError.message}`);
  }

  redirect(`/jobs/${job.id}`);
}
