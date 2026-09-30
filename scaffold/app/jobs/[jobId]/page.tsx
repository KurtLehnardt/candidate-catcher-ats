import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/SubmitButton";
import { uploadResumes, runScoring, setStage } from "./actions";

export default async function JobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const supabase = await createClient();

  const { data: job } = await supabase.from("jobs").select("*").eq("id", jobId).single();
  if (!job) notFound();

  const { data: requirements } = await supabase
    .from("requirements")
    .select("id, text, weight")
    .eq("job_id", jobId)
    .order("position");

  const { data: applicants } = await supabase
    .from("applicants")
    .select("id, name, stage, overall_score, resume_id")
    .eq("job_id", jobId)
    .order("overall_score", { ascending: false, nullsFirst: false });

  const uploadResumesForJob = uploadResumes.bind(null, jobId);
  const runScoringForJob = runScoring.bind(null, jobId);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <Link href="/jobs" className="text-sm text-zinc-500 hover:underline">
        &larr; All jobs
      </Link>
      <h1 className="mb-1 mt-2 text-2xl font-semibold">{job.title}</h1>
      <p className="mb-6 text-sm text-zinc-500">Status: {job.status}</p>

      {job.description && <p className="mb-8 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">{job.description}</p>}

      <section className="mb-8 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="mb-2 text-sm font-semibold">Requirements</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {requirements?.map((r) => (
            <li key={r.id} className="flex justify-between text-zinc-700 dark:text-zinc-300">
              <span>{r.text}</span>
              <span className="text-zinc-400">weight {r.weight}</span>
            </li>
          ))}
          {requirements?.length === 0 && <li className="text-zinc-400">No requirements yet.</li>}
        </ul>
      </section>

      <section className="mb-8 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="mb-3 text-sm font-semibold">Upload resumes</h2>
        <form action={uploadResumesForJob} className="flex items-center gap-3">
          <input
            type="file"
            name="resumes"
            accept=".pdf,.docx"
            multiple
            className="text-sm"
          />
          <SubmitButton pendingText="Uploading...">Upload</SubmitButton>
        </form>
      </section>

      <section className="mb-8">
        <form action={runScoringForJob}>
          <SubmitButton pendingText="Scoring... this can take a while">Run scoring</SubmitButton>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">
          Applicants ({applicants?.length ?? 0})
        </h2>
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
              {applicants?.map((applicant, i) => (
                <tr key={applicant.id} className="border-b border-zinc-100 dark:border-zinc-900">
                  <td className="py-2 pr-4 text-zinc-400">#{i + 1}</td>
                  <td className="py-2 pr-4">
                    <Link href={`/jobs/${jobId}/applicants/${applicant.id}`} className="font-medium hover:underline">
                      {applicant.name}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">
                    {applicant.overall_score != null ? `${Math.round(applicant.overall_score)}%` : "—"}
                  </td>
                  <td className="py-2 pr-4">
                    <form action={setStage.bind(null, jobId, applicant.id, applicant.stage === "Shortlisted" ? "New" : "Shortlisted")}>
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
                  </td>
                </tr>
              ))}
              {applicants?.length === 0 && (
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
