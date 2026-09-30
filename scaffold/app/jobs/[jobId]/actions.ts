"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseResume } from "@/lib/resume/parse";
import { stripBias } from "@/lib/resume/bias-strip";
import { getProvider } from "@/lib/llm/provider";
import { embedText, getEmbeddingsProvider } from "@/lib/llm/embeddings";
import { getTopReferenceHires } from "@/lib/embeddings/reference-lookup";
import { recomputeOverallScores } from "@/lib/scoring/recompute";
import { ensureResumesBucket, uploadResumeFile } from "@/lib/storage";

/** Best-effort "Firstname Lastname" guess from a filename like "jane_doe_resume.pdf". */
function guessNameFromFilename(filename: string): string {
  const base = filename.replace(/\.(pdf|docx)$/i, "");
  const cleaned = base
    .replace(/[_-]+/g, " ")
    .replace(/\bresume\b/gi, "")
    .replace(/\bcv\b/gi, "")
    .trim();
  return cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(" ") || "Unnamed Applicant";
}

export async function uploadResumes(jobId: string, formData: FormData): Promise<void> {
  const files = formData.getAll("resumes").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return;

  await ensureResumesBucket();
  const supabase = await createClient();

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const rawText = await parseResume(buffer, file.name);
    const name = guessNameFromFilename(file.name);

    const { data: applicant, error: applicantError } = await supabase
      .from("applicants")
      .insert({ job_id: jobId, name })
      .select("id")
      .single();
    if (applicantError || !applicant) {
      throw new Error(`uploadResumes: applicant insert failed: ${applicantError?.message}`);
    }

    const path = `${jobId}/${applicant.id}-${file.name}`;
    await uploadResumeFile(path, file);

    const { data: resume, error: resumeError } = await supabase
      .from("resumes")
      .insert({ applicant_id: applicant.id, raw_text: rawText, file_path: path })
      .select("id")
      .single();
    if (resumeError || !resume) {
      throw new Error(`uploadResumes: resume insert failed: ${resumeError?.message}`);
    }

    const { error: linkError } = await supabase
      .from("applicants")
      .update({ resume_id: resume.id })
      .eq("id", applicant.id);
    if (linkError) throw new Error(`uploadResumes: linking resume failed: ${linkError.message}`);
  }

  revalidatePath(`/jobs/${jobId}`);
}

export async function runScoring(jobId: string): Promise<void> {
  const supabase = await createClient();

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id, org_id, title")
    .eq("id", jobId)
    .single();
  if (jobError || !job) throw new Error(`runScoring: job fetch failed: ${jobError?.message}`);

  const { data: requirements, error: reqError } = await supabase
    .from("requirements")
    .select("id, text, weight")
    .eq("job_id", jobId);
  if (reqError) throw new Error(`runScoring: requirements fetch failed: ${reqError.message}`);
  if (!requirements || requirements.length === 0) {
    throw new Error("runScoring: job has no requirements to score against");
  }

  const { data: applicants, error: applicantsError } = await supabase
    .from("applicants")
    .select("id, name, resume_id, resumes(id, raw_text)")
    .eq("job_id", jobId);
  if (applicantsError) throw new Error(`runScoring: applicants fetch failed: ${applicantsError.message}`);

  const provider = getProvider();
  const embeddingsProvider = getEmbeddingsProvider();

  for (const applicant of applicants ?? []) {
    const resume = Array.isArray(applicant.resumes) ? applicant.resumes[0] : applicant.resumes;
    if (!resume?.raw_text) continue;

    const strippedText = stripBias(resume.raw_text, { candidateName: applicant.name });

    // Reference-hire grounding is optional best-effort context — an org with no reference
    // hires yet (or an embeddings provider that isn't configured) should still score fine.
    let referenceSnippets: string[] = [];
    try {
      const embedding = await embedText(strippedText);
      const matches = await getTopReferenceHires(supabase, {
        orgId: job.org_id,
        jobFamily: job.title,
        embedding,
        embeddingsProvider,
      });
      referenceSnippets = matches.map((m) => m.resumeText);
    } catch {
      referenceSnippets = [];
    }

    for (const requirement of requirements) {
      const result = await provider.scoreRequirement(
        strippedText,
        requirement.text,
        requirement.weight,
        referenceSnippets,
      );

      const { error: scoreError } = await supabase.from("requirement_scores").upsert(
        {
          applicant_id: applicant.id,
          requirement_id: requirement.id,
          ai_score: result.score,
          evidence_snippet: result.evidence,
          substance_note: result.substanceNote,
        },
        { onConflict: "applicant_id,requirement_id" },
      );
      if (scoreError) throw new Error(`runScoring: score upsert failed: ${scoreError.message}`);
    }

    if (resume.id) {
      await supabase.from("resumes").update({ bias_stripped: true }).eq("id", resume.id);
    }
  }

  await recomputeOverallScores(supabase, jobId);
  await supabase.from("jobs").update({ status: "ranked" }).eq("id", jobId);

  revalidatePath(`/jobs/${jobId}`);
}

export async function setStage(jobId: string, applicantId: string, stage: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("applicants").update({ stage }).eq("id", applicantId);
  if (error) throw new Error(`setStage: ${error.message}`);
  revalidatePath(`/jobs/${jobId}`);
}
