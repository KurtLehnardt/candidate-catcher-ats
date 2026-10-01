import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { applicants, referenceHires } from "@/lib/db/schema";
import { SubmitButton } from "@/components/SubmitButton";
import { deleteReferenceHire } from "./actions";

export default async function ReferenceHiresPage() {
  const db = getDb();

  const rows = await db
    .select({
      id: referenceHires.id,
      jobFamily: referenceHires.jobFamily,
      createdAt: referenceHires.createdAt,
      embeddingProvider: referenceHires.embeddingProvider,
      promotedFromApplicantId: referenceHires.promotedFromApplicantId,
      applicantName: applicants.name,
      applicantJobId: applicants.jobId,
    })
    .from(referenceHires)
    .leftJoin(applicants, eq(referenceHires.promotedFromApplicantId, applicants.id))
    .orderBy(referenceHires.jobFamily, desc(referenceHires.createdAt));

  const byFamily = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = byFamily.get(row.jobFamily) ?? [];
    list.push(row);
    byFamily.set(row.jobFamily, list);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Reference-hire corpus</h1>
        <Link href="/jobs" className="text-sm text-zinc-500 hover:underline">
          &larr; Jobs
        </Link>
      </div>

      <p className="mb-8 text-sm text-zinc-500">
        Resumes of people you&apos;ve actually hired, grouped by job family. Promote an applicant from their job page
        (&ldquo;Mark as hired&rdquo;) — new candidates for a matching job family get scored with these as grounding
        examples.
      </p>

      {rows.length === 0 && (
        <p className="text-zinc-400">
          No reference hires yet. Open a scored applicant and use &ldquo;Mark as hired&rdquo; to add one.
        </p>
      )}

      <div className="flex flex-col gap-8">
        {Array.from(byFamily.entries()).map(([family, familyRows]) => (
          <section key={family}>
            <h2 className="mb-3 text-sm font-semibold">{family}</h2>
            <ul className="flex flex-col gap-2">
              {familyRows.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800"
                >
                  <div>
                    <p className="font-medium">
                      {row.applicantName ?? <span className="text-zinc-400 italic">Applicant no longer available</span>}
                      {row.applicantJobId && (
                        <>
                          {" "}
                          &middot;{" "}
                          <Link
                            href={`/jobs/${row.applicantJobId}/applicants/${row.promotedFromApplicantId}`}
                            className="text-xs text-zinc-500 hover:underline"
                          >
                            view applicant
                          </Link>
                        </>
                      )}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Added {new Date(row.createdAt).toLocaleDateString()} &middot; embedded via {row.embeddingProvider ?? "unknown"}
                    </p>
                  </div>
                  <form action={deleteReferenceHire.bind(null, row.id)}>
                    <SubmitButton
                      pendingText="Removing..."
                      className="rounded-md border border-zinc-300 px-3 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-zinc-700 dark:hover:bg-red-950"
                    >
                      Remove
                    </SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
