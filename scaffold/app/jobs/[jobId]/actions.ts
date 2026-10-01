"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { applicants, jobs, requirementScores, requirements, resumes } from "@/lib/db/schema";
import { parseResume } from "@/lib/resume/parse";
import { stripBias } from "@/lib/resume/bias-strip";
import { getProvider } from "@/lib/llm/provider";
import { embedText, getEmbeddingsProvider } from "@/lib/llm/embeddings";
import { getTopReferenceHires } from "@/lib/embeddings/reference-lookup";
import { recomputeOverallScores } from "@/lib/scoring/recompute";
import { ensureResumesDir, uploadResumeFile } from "@/lib/storage";

/** Best-effort "Firstname Lastname" guess from a filename like "jane_doe_resume.pdf". */
function guessNameFromFilename(filename: string): string {
  const base = filename.replace(/\.(pdf|docx)$/i, "");
  const cleaned = base
    .replace(/[_-]+/g, " ")
    .replace(/\bresume\b/gi, "")
    .replace(/\bcv\b/gi, "")
    .trim();
  return (
    cleaned
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0]!.toUpperCase() + word.slice(1))
      .join(" ") || "Unnamed Applicant"
  );
}

export async function uploadResumes(jobId: string, formData: FormData): Promise<void> {
  const files = formData.getAll("resumes").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return;

  await ensureResumesDir();
  const db = getDb();

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const rawText = await parseResume(buffer, file.name);
    const name = guessNameFromFilename(file.name);

    const [applicant] = await db.insert(applicants).values({ jobId, name }).returning({ id: applicants.id });
    if (!applicant) throw new Error("uploadResumes: applicant insert failed");

    const path = `${jobId}/${applicant.id}-${file.name}`;
    await uploadResumeFile(path, file);

    const [resume] = await db
      .insert(resumes)
      .values({ applicantId: applicant.id, rawText, filePath: path })
      .returning({ id: resumes.id });
    if (!resume) throw new Error("uploadResumes: resume insert failed");

    await db.update(applicants).set({ resumeId: resume.id }).where(eq(applicants.id, applicant.id));
  }

  revalidatePath(`/jobs/${jobId}`);
}

export async function runScoring(jobId: string): Promise<void> {
  const db = getDb();

  const job = await db.query.jobs.findFirst({ where: eq(jobs.id, jobId) });
  if (!job) throw new Error("runScoring: job not found");

  const reqRows = await db.select().from(requirements).where(eq(requirements.jobId, jobId));
  if (reqRows.length === 0) throw new Error("runScoring: job has no requirements to score against");

  const applicantRows = await db.query.applicants.findMany({
    where: eq(applicants.jobId, jobId),
    with: { resume: true },
  });

  const provider = getProvider();
  const embeddingsProvider = getEmbeddingsProvider();

  for (const applicant of applicantRows) {
    const resume = applicant.resume;
    if (!resume?.rawText) continue;

    const strippedText = stripBias(resume.rawText, { candidateName: applicant.name });

    // Reference-hire grounding is optional best-effort context — no reference hires yet
    // (or an unconfigured embeddings provider) should still let scoring proceed.
    let referenceSnippets: string[] = [];
    try {
      const embedding = await embedText(strippedText);
      const matches = await getTopReferenceHires({
        jobFamily: job.title,
        embedding,
        embeddingsProvider,
      });
      referenceSnippets = matches.map((m) => m.resumeText);
    } catch {
      referenceSnippets = [];
    }

    for (const requirement of reqRows) {
      const result = await provider.scoreRequirement(strippedText, requirement.text, requirement.weight, referenceSnippets);

      await db
        .insert(requirementScores)
        .values({
          applicantId: applicant.id,
          requirementId: requirement.id,
          aiScore: result.score,
          evidenceSnippet: result.evidence,
          substanceNote: result.substanceNote,
        })
        .onConflictDoUpdate({
          target: [requirementScores.applicantId, requirementScores.requirementId],
          set: {
            aiScore: result.score,
            evidenceSnippet: result.evidence,
            substanceNote: result.substanceNote,
          },
        });
    }

    await db.update(resumes).set({ biasStripped: true }).where(eq(resumes.id, resume.id));
  }

  await recomputeOverallScores(jobId);
  await db.update(jobs).set({ status: "ranked" }).where(eq(jobs.id, jobId));

  revalidatePath(`/jobs/${jobId}`);
}

export async function setStage(jobId: string, applicantId: string, stage: string): Promise<void> {
  const db = getDb();
  await db.update(applicants).set({ stage }).where(eq(applicants.id, applicantId));
  revalidatePath(`/jobs/${jobId}`);
}
