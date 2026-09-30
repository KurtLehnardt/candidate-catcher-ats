import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/SubmitButton";
import { updateRequirementWeight, setManualScore } from "./actions";

export default async function ApplicantPage({
  params,
}: {
  params: Promise<{ jobId: string; applicantId: string }>;
}) {
  const { jobId, applicantId } = await params;
  const supabase = await createClient();

  const { data: applicant } = await supabase
    .from("applicants")
    .select("id, name, stage, overall_score, job_id")
    .eq("id", applicantId)
    .single();
  if (!applicant || applicant.job_id !== jobId) notFound();

  const { data: job } = await supabase.from("jobs").select("id, title").eq("id", jobId).single();

  const { data: scores } = await supabase
    .from("requirement_scores")
    .select("id, ai_score, evidence_snippet, substance_note, requirements(id, text, weight)")
    .eq("applicant_id", applicantId);

  const { data: manualScores } = await supabase
    .from("manual_scores")
    .select("id, score, note, created_at")
    .eq("applicant_id", applicantId)
    .order("created_at", { ascending: false });

  const latestManualScore = manualScores?.[0];

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link href={`/jobs/${jobId}`} className="text-sm text-zinc-500 hover:underline">
        &larr; {job?.title ?? "Job"}
      </Link>

      <div className="mt-2 mb-8 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">{applicant.name}</h1>
        <div className="text-right">
          <p className="text-2xl font-semibold">
            {applicant.overall_score != null ? `${Math.round(applicant.overall_score)}%` : "—"}
          </p>
          <p className="text-xs text-zinc-500">AI aggregate score</p>
        </div>
      </div>

      <section className="mb-8 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="mb-2 text-sm font-semibold">Your score</h2>
        {latestManualScore && (
          <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
            Current: <span className="font-medium text-zinc-900 dark:text-zinc-100">{latestManualScore.score}%</span>
            {latestManualScore.note && ` — ${latestManualScore.note}`}
          </p>
        )}
        <form action={setManualScore.bind(null, jobId, applicantId)} className="flex items-center gap-3">
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

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold">Requirement breakdown</h2>
        {scores?.map((s) => {
          const requirement = Array.isArray(s.requirements) ? s.requirements[0] : s.requirements;
          if (!requirement) return null;
          return (
            <div key={s.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <div className="mb-2 flex items-start justify-between gap-4">
                <p className="font-medium">{requirement.text}</p>
                <p className="shrink-0 text-lg font-semibold">{Math.round(s.ai_score)}%</p>
              </div>

              {s.evidence_snippet && (
                <p className="mb-2 border-l-2 border-zinc-300 pl-3 text-sm italic text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
                  &ldquo;{s.evidence_snippet}&rdquo;
                </p>
              )}
              {s.substance_note && (
                <p className="mb-3 text-sm text-zinc-500">{s.substance_note}</p>
              )}

              <form
                action={updateRequirementWeight.bind(null, jobId, requirement.id)}
                className="flex items-center gap-2 text-xs text-zinc-500"
              >
                <span>Weight</span>
                <input
                  name="weight"
                  type="number"
                  min={0}
                  step={0.5}
                  defaultValue={requirement.weight}
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
          );
        })}
        {scores?.length === 0 && (
          <p className="text-zinc-400">No scores yet — run scoring from the job page first.</p>
        )}
      </section>
    </div>
  );
}
