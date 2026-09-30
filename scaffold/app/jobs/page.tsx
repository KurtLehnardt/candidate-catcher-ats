import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/org";

export default async function JobsPage() {
  const orgId = await getCurrentOrgId();
  const supabase = await createClient();
  const { data: jobs, error } = await supabase
    .from("jobs")
    .select("id, title, status, created_at, applicants(count)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Jobs</h1>
        <Link
          href="/jobs/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
        >
          New job
        </Link>
      </div>

      {error && <p className="text-red-600">Failed to load jobs: {error.message}</p>}

      {jobs?.length === 0 && (
        <p className="text-zinc-500">No jobs yet. Create one to start ranking applicants.</p>
      )}

      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {jobs?.map((job) => (
          <li key={job.id}>
            <Link
              href={`/jobs/${job.id}`}
              className="flex items-center justify-between py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              <div>
                <p className="font-medium">{job.title}</p>
                <p className="text-sm text-zinc-500">
                  {job.applicants?.[0]?.count ?? 0} applicant(s) &middot; {job.status}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
