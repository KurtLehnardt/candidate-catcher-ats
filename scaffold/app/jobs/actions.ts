"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { jobs, requirements } from "@/lib/db/schema";
import { getProvider } from "@/lib/llm/provider";
import type { ExtractedRequirement } from "@/lib/llm/schema";

export interface RequirementInput {
  text: string;
  weight: number;
}

export interface ExtractRequirementsResult {
  ok: boolean;
  requirements: ExtractedRequirement[];
  error?: string;
}

/**
 * Extract weighted requirements from a pasted job description. Returns a result object
 * rather than throwing -- this is called directly from a client component (not a form
 * action), and a thrown server-action error surfaces as an opaque client exception, not
 * a message a user can act on (e.g. "no provider configured" vs. "Ollama unreachable").
 */
export async function extractRequirementsFromDescription(description: string): Promise<ExtractRequirementsResult> {
  const text = description.trim();
  if (!text) {
    return { ok: false, requirements: [], error: "Paste a job description first." };
  }
  try {
    const extracted = await getProvider().extractRequirements(text);
    return { ok: true, requirements: extracted };
  } catch (e) {
    return { ok: false, requirements: [], error: (e as Error).message };
  }
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
