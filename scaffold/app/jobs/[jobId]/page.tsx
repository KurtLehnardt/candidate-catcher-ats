import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { applicants, jobs, referenceHires, requirements } from "@/lib/db/schema";
import { getSettings } from "@/lib/db/settings";
import { SubmitButton } from "@/components/SubmitButton";
import { uploadResumes, runScoring, setStage } from "./actions";

const PROVIDER_LABEL: Record<string, string> = { anthropic: "Anthropic", openai: "OpenAI", ollama: "Ollama (local)" };

export default async function JobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const db = getDb();

  const job = await db.query.jobs.findFirst({ where: eq(jobs.id, jobId) });
  if (!job) notFound();

  const requirementRows = await db
    .select()
    .from(requirements)
    .where(eq(requirements.jobId, jobId))
    .orderBy(asc(requirements.position));

  const applicantRows = await db
    .select()
    .from(applicants)
    .where(eq(applicants.jobId, jobId))
    .orderBy(desc(applicants.overallScore));

  // Who's already a reference example — so the Shortlisted nudge only shows for applicants
  // who haven't been promoted yet, instead of nagging on every row.
  const applicantIds = applicantRows.map((a) => a.id);
  const promotedIds = new Set(
    applicantIds.length === 0
      ? []
      : (
          await db
            .select({ promotedFromApplicantId: referenceHires.promotedFromApplicantId })
            .from(referenceHires)
            .where(inArray(referenceHires.promotedFromApplicantId, applicantIds))
        ).map((r) => r.promotedFromApplicantId),
  );

  const uploadResumesForJob = uploadResumes.bind(null, jobId);
  const runScoringForJob = runScoring.bind(null, jobId);

  const settings = getSettings();
  const activeProvider = settings.llmProvider || process.env.LLM_PROVIDER || "anthropic";
  const activeModel =
    settings.llmModel ||
    (activeProvider === "ollama"
      ? process.env.LOCAL_LLM_MODEL
      : activeProvider === "openai"
        ? process.env.OPENAI_MODEL
        : process.env.ANTHROPIC_MODEL) ||
    "default model";

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <Link href="/jobs" className="text-sm text-zinc-500 hover:underline">
        &larr; All jobs
      </Link>
      <div className="mb-1 mt-2 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">{job.title}</h1>
        <Link href={`/jobs/${jobId}/export`} className="text-sm text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-100">
          Scoring methodology &amp; evidence report
        </Link>
      </div>
      <p className="mb-6 text-sm text-zinc-500">Status: {job.status}</p>

      {job.description && (
        <p className="mb-8 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">{job.description}</p>
      )}

      <section className="mb-8 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="mb-2 text-sm font-semibold">Requirements</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {requirementRows.map((r) => (
            <li key={r.id} className="flex justify-between text-zinc-700 dark:text-zinc-300">
              <span>{r.text}</span>
              <span className="text-zinc-400">weight {r.weight}</span>
            </li>
          ))}
          {requirementRows.length === 0 && <li className="text-zinc-400">No requirements yet.</li>}
        </ul>
      </section>

      <section className="mb-8 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="mb-3 text-sm font-semibold">Upload resumes</h2>
        <form action={uploadResumesForJob} className="flex items-center gap-3">
          <input type="file" name="resumes" accept=".pdf,.docx" multiple className="text-sm" />
          <SubmitButton pendingText="Uploading...">Upload</SubmitButton>
        </form>
      </section>

      <section className="mb-8">
        <form action={runScoringForJob} className="flex items-center gap-3">
          <SubmitButton pendingText="Scoring... this can take a while">Run scoring</SubmitButton>
          <span className="text-xs text-zinc-500">
            Scoring with: <span className="font-medium text-zinc-700 dark:text-zinc-300">{PROVIDER_LABEL[activeProvider] ?? activeProvider} &middot; {activeModel}</span>{" "}
            <Link href="/settings" className="underline hover:text-zinc-900 dark:hover:text-zinc-100">
              change
            </Link>
          </span>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">Applicants ({applicantRows.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800">
                <th className="py-2 pr-4">Rank</th>
                <th className="py-2 pr-4">Applicant</th>
                <th className="py-2 pr-4">Score</th>
                <th className="py-2 pr-4">Stage</th>
              </tr>
            </thead>
            <tbody>
              {applicantRows.map((applicant, i) => (
                <tr key={applicant.id} className="border-b border-zinc-100 dark:border-zinc-900">
                  <td className="py-2 pr-4 text-zinc-400">#{i + 1}</td>
                  <td className="py-2 pr-4">
                    <Link href={`/jobs/${jobId}/applicants/${applicant.id}`} className="font-medium hover:underline">
                      {applicant.name}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">
                    {applicant.overallScore != null ? `${Math.round(applicant.overallScore)}%` : "—"}
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <form
                        action={setStage.bind(
                          null,
                          jobId,
                          applicant.id,
                          applicant.stage === "Shortlisted" ? "New" : "Shortlisted",
                        )}
                      >
                        <button
                          type="submit"
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            applicant.stage === "Shortlisted"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                          }`}
                        >
                          {applicant.stage}
                        </button>
                      </form>
                      {applicant.stage === "Shortlisted" && !promotedIds.has(applicant.id) && (
                        <Link
                          href={`/jobs/${jobId}/applicants/${applicant.id}#reference-hire-corpus`}
                          className="text-xs text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-100"
                        >
                          + save as reference
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {applicantRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-zinc-400">
                    No applicants yet. Upload resumes above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
