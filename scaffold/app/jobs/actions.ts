"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { jobs, requirements } from "@/lib/db/schema";

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

  const requirementInputs: RequirementInput[] = requirementTexts
    .map((text, i) => ({ text: text.trim(), weight: requirementWeights[i] ?? 1.0 }))
    .filter((r) => r.text.length > 0);

  const db = getDb();

  const [job] = await db.insert(jobs).values({ title, description, status: "draft" }).returning({ id: jobs.id });
  if (!job) throw new Error("createJob: no job returned");

  if (requirementInputs.length > 0) {
    await db.insert(requirements).values(
      requirementInputs.map((r, position) => ({
        jobId: job.id,
        text: r.text,
        weight: r.weight,
        position,
      })),
    );
  }

  redirect(`/jobs/${job.id}`);
}
