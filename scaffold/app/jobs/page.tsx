import Link from "next/link";
import { count, desc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { applicants, jobs } from "@/lib/db/schema";

export default async function JobsPage() {
  const db = getDb();
  const jobRows = await db.select().from(jobs).orderBy(desc(jobs.createdAt));
  const countRows = await db
    .select({ jobId: applicants.jobId, count: count() })
    .from(applicants)
    .groupBy(applicants.jobId);
  const countByJob = new Map(countRows.map((r) => [r.jobId, r.count]));

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Jobs</h1>
        <div className="flex items-center gap-4">
          <Link href="/reference-hires" className="text-sm text-zinc-500 hover:underline">
            Reference hires
          </Link>
          <Link href="/settings" className="text-sm text-zinc-500 hover:underline">
            Settings
          </Link>
          <Link href="/logs" className="text-sm text-zinc-500 hover:underline">
            Logs
          </Link>
          <Link
            href="/jobs/new"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
          >
            New job
          </Link>
        </div>
      </div>

      {jobRows.length === 0 && <p className="text-zinc-500">No jobs yet. Create one to start ranking applicants.</p>}

      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {jobRows.map((job) => (
          <li key={job.id}>
            <Link
              href={`/jobs/${job.id}`}
              className="flex items-center justify-between py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              <div>
                <p className="font-medium">{job.title}</p>
                <p className="text-sm text-zinc-500">
                  {countByJob.get(job.id) ?? 0} applicant(s) &middot; {job.status}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
