import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { applicants, jobs, manualScores, referenceHires, requirementScores, requirements } from "@/lib/db/schema";
import { SubmitButton } from "@/components/SubmitButton";
import { ReviewerNameInput } from "@/components/ReviewerNameInput";
import { embeddingsConfigStatus } from "@/lib/embeddings/promote";
import { updateRequirementWeight, setManualScore, promoteToReferenceHire } from "./actions";

export default async function ApplicantPage({
  params,
}: {
  params: Promise<{ jobId: string; applicantId: string }>;
}) {
  const { jobId, applicantId } = await params;
  const db = getDb();

  const applicant = await db.query.applicants.findFirst({ where: eq(applicants.id, applicantId) });
  if (!applicant || applicant.jobId !== jobId) notFound();

  const job = await db.query.jobs.findFirst({ where: eq(jobs.id, jobId) });

  const scoreRows = await db
    .select({
      id: requirementScores.id,
      aiScore: requirementScores.aiScore,
      failed: requirementScores.failed,
      evidenceSnippet: requirementScores.evidenceSnippet,
      substanceNote: requirementScores.substanceNote,
      requirementId: requirements.id,
      requirementText: requirements.text,
      requirementWeight: requirements.weight,
    })
    .from(requirementScores)
    .innerJoin(requirements, eq(requirementScores.requirementId, requirements.id))
    .where(eq(requirementScores.applicantId, applicantId));

  const manualScoreRows = await db
    .select()
    .from(manualScores)
    .where(eq(manualScores.applicantId, applicantId))
    .orderBy(desc(manualScores.createdAt));

  // A meaningful-disagreement threshold (points on the 0-100 scale) — a judgment call, not
  // a precise statistical bound. Used both to flag a reviewer's score against the AI's and
  // to flag reviewers against each other.
  const DISAGREEMENT_THRESHOLD = 15;
  const manualScoreValues = manualScoreRows.map((m) => m.score);
  const reviewerRange =
    manualScoreValues.length >= 2 ? Math.max(...manualScoreValues) - Math.min(...manualScoreValues) : 0;
  const reviewersDisagree = reviewerRange >= DISAGREEMENT_THRESHOLD;

  const existingReferenceHire = await db.query.referenceHires.findFirst({
    where: eq(referenceHires.promotedFromApplicantId, applicantId),
  });
  const embeddingsStatus = embeddingsConfigStatus();

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link href={`/jobs/${jobId}`} className="text-sm text-zinc-500 hover:underline">
        &larr; {job?.title ?? "Job"}
      </Link>

      <div className="mt-2 mb-8 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">{applicant.name}</h1>
        <div className="text-right">
          <p className="text-2xl font-semibold">
            {applicant.overallScore != null ? `${Math.round(applicant.overallScore)}%` : "—"}
          </p>
          <p className="text-xs text-zinc-500">AI aggregate score</p>
        </div>
      </div>

      <section className="mb-8 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="mb-3 text-sm font-semibold">Reviewer scores</h2>

        {(manualScoreRows.length > 0 || applicant.overallScore != null) && (
          <div className="mb-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800">
                  <th className="py-1 pr-4 font-medium">Reviewer</th>
                  <th className="py-1 pr-4 font-medium">Score</th>
                  <th className="py-1 pr-4 font-medium">Note</th>
                  <th className="py-1 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {applicant.overallScore != null && (
                  <tr className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="py-2 pr-4 text-zinc-500">AI aggregate</td>
                    <td className="py-2 pr-4 font-medium">{Math.round(applicant.overallScore)}%</td>
                    <td className="py-2 pr-4 text-zinc-400">—</td>
                    <td className="py-2 text-zinc-400">—</td>
                  </tr>
                )}
                {manualScoreRows.map((m) => {
                  const disagreesWithAi =
                    applicant.overallScore != null &&
                    Math.abs(m.score - applicant.overallScore) >= DISAGREEMENT_THRESHOLD;
                  return (
                    <tr key={m.id} className="border-b border-zinc-100 dark:border-zinc-900">
                      <td className="py-2 pr-4">{m.reviewerName || "Unknown reviewer"}</td>
                      <td
                        className={`py-2 pr-4 font-medium ${
                          disagreesWithAi ? "text-amber-700 dark:text-amber-400" : ""
                        }`}
                      >
                        {m.score}%
                        {disagreesWithAi && <span className="ml-1 text-xs font-normal">&#9888; vs. AI</span>}
                      </td>
                      <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">{m.note || "—"}</td>
                      <td className="py-2 text-xs text-zinc-400">{m.createdAt.toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {reviewersDisagree && (
              <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-400">
                &#9888; Reviewers disagree by {Math.round(reviewerRange)} points — worth discussing before deciding.
              </p>
            )}
          </div>
        )}

        <form
          action={setManualScore.bind(null, jobId, applicantId)}
          className="flex flex-wrap items-center gap-3"
        >
          <ReviewerNameInput className="w-32 rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
          <input
            name="score"
            type="number"
            min={0}
            max={100}
            placeholder="0-100"
            required
            className="w-20 rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <input
            name="note"
            type="text"
            placeholder="Optional note"
            className="flex-1 rounded-md border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <SubmitButton pendingText="Saving...">Save</SubmitButton>
        </form>
      </section>

      <section id="reference-hire-corpus" className="mb-8 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Reference-hire corpus</h2>
          <Link href="/reference-hires" className="text-xs text-zinc-500 hover:underline">
            View corpus &rarr;
          </Link>
        </div>

        {existingReferenceHire ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            &#10003; In the reference corpus as{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">&ldquo;{existingReferenceHire.jobFamily}&rdquo;</span>
            {" "}
            (
            {existingReferenceHire.outcome === "hired"
              ? "hired"
              : existingReferenceHire.outcome === "top_pick"
                ? "top pick"
                : "other"}
            ) — used as grounding when scoring future candidates for this job family.
          </p>
        ) : !embeddingsStatus.configured ? (
          <p className="text-sm text-zinc-500">
            Not available: {embeddingsStatus.reason} Set up an embeddings provider (
            <code className="text-xs">npm run setup</code> or <code className="text-xs">npm run setup:local</code>) to enable
            this.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-zinc-500">
              Save this resume as a grounding example for future candidates in the same job family — as a confirmed
              hire, or as a top pick short of an actual hire.
            </p>
            <form
              action={promoteToReferenceHire.bind(null, jobId, applicantId, "hired")}
              className="flex items-center gap-3"
            >
              <input
                name="jobFamily"
                type="text"
                defaultValue={job?.title ?? ""}
                placeholder="Job family"
                required
                className="flex-1 rounded-md border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
              <SubmitButton pendingText="Adding...">Mark as hired</SubmitButton>
            </form>
            <form
              action={promoteToReferenceHire.bind(null, jobId, applicantId, "top_pick")}
              className="flex items-center gap-3"
            >
              <input
                name="jobFamily"
                type="text"
                defaultValue={job?.title ?? ""}
                placeholder="Job family"
                required
                className="flex-1 rounded-md border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
              <SubmitButton
                pendingText="Adding..."
                className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                Save as top pick
              </SubmitButton>
            </form>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold">Requirement breakdown</h2>
        {scoreRows.map((s) => (
          <div key={s.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="mb-2 flex items-start justify-between gap-4">
              <p className="font-medium">{s.requirementText}</p>
              {s.failed || s.aiScore == null ? (
                <p className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                  Scoring failed
                </p>
              ) : (
                <p className="shrink-0 text-lg font-semibold">{Math.round(s.aiScore)}%</p>
              )}
            </div>

            {s.evidenceSnippet && (
              <p className="mb-2 border-l-2 border-zinc-300 pl-3 text-sm italic text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
                &ldquo;{s.evidenceSnippet}&rdquo;
              </p>
            )}
            {s.substanceNote && <p className="mb-3 text-sm text-zinc-500">{s.substanceNote}</p>}

            <form
              action={updateRequirementWeight.bind(null, jobId, s.requirementId)}
              className="flex items-center gap-2 text-xs text-zinc-500"
            >
              <span>Weight</span>
              <input
                name="weight"
                type="number"
                min={0}
                step={0.5}
                defaultValue={s.requirementWeight}
                className="w-16 rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
              />
              <SubmitButton
                pendingText="..."
                className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                Update
              </SubmitButton>
            </form>
          </div>
        ))}
        {scoreRows.length === 0 && <p className="text-zinc-400">No scores yet — run scoring from the job page first.</p>}
      </section>
    </div>
  );
}
