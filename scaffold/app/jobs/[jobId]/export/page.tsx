import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { applicants, jobs, requirementScores, requirements } from "@/lib/db/schema";
import { PrintButton } from "./PrintButton";

// A per-job "scoring methodology & evidence report" — NOT a compliance certificate.
// It documents what the app actually does (bias-stripping before scoring, per-requirement
// evidence, buzzword-vs-substance commentary) and shows the real evidence trail behind
// every score, for the recruiter's own transparency/audit records. It deliberately does
// NOT claim to satisfy any specific regulation (e.g. NYC Local Law 144, the EU AI Act) —
// those typically require statistical adverse-impact analysis across protected
// demographic categories, which this app never collects by design and therefore cannot
// produce. See the disclaimer rendered at the bottom of the page.

export default async function JobExportPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const db = getDb();

  const job = await db.query.jobs.findFirst({ where: eq(jobs.id, jobId) });
  if (!job) notFound();

  const requirementRows = await db
    .select()
    .from(requirements)
    .where(eq(requirements.jobId, jobId))
    .orderBy(asc(requirements.position));

  const applicantRows = await db.query.applicants.findMany({
    where: eq(applicants.jobId, jobId),
    orderBy: (a, { desc }) => [desc(a.overallScore)],
  });

  const scoreRows = await db
    .select({
      applicantId: requirementScores.applicantId,
      requirementId: requirementScores.requirementId,
      aiScore: requirementScores.aiScore,
      failed: requirementScores.failed,
      evidenceSnippet: requirementScores.evidenceSnippet,
      substanceNote: requirementScores.substanceNote,
    })
    .from(requirementScores)
    .innerJoin(requirements, eq(requirementScores.requirementId, requirements.id))
    .where(eq(requirements.jobId, jobId));

  const scoresByApplicant = new Map<string, typeof scoreRows>();
  for (const row of scoreRows) {
    const existing = scoresByApplicant.get(row.applicantId);
    if (existing) existing.push(row);
    else scoresByApplicant.set(row.applicantId, [row]);
  }
  const requirementById = new Map(requirementRows.map((r) => [r.id, r]));

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12 print:px-0 print:py-0">
      <div className="mb-8 flex items-center justify-between print:hidden">
        <Link href={`/jobs/${jobId}`} className="text-sm text-zinc-500 hover:underline">
          &larr; {job.title}
        </Link>
        <PrintButton />
      </div>

      <h1 className="text-2xl font-semibold">Scoring methodology &amp; evidence report</h1>
      <p className="mt-1 text-sm text-zinc-500">{job.title}</p>

      <section className="mt-8 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800 print:border-0 print:p-0">
        <h2 className="mb-2 text-sm font-semibold">Methodology</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
          <li>
            Before any resume is sent to a language model for scoring, candidate-identifying signals — full name,
            individual name parts, photo references, and graduation year — are stripped from the text. The model
            never sees these. The recruiter&apos;s own view of a resume still shows the original, unstripped text.
          </li>
          <li>
            Each resume is scored against every one of this job&apos;s requirements in a single pass. For each
            requirement, the model returns a 0–100 score, a verbatim evidence quote from the resume (or an explicit
            empty string if there genuinely is none), and a note distinguishing a specific, quantified accomplishment
            from a vague, keyword-stuffed claim.
          </li>
          <li>
            The model is explicitly instructed: <em>&ldquo;Score higher for genuine, evidenced accomplishments that
            match a requirement. Score lower — even if the right keywords appear — for vague buzzword claims with no
            substance behind them.&rdquo;</em> It is also instructed never to fabricate a quote that isn&apos;t
            actually in the resume.
          </li>
          <li>
            Each applicant&apos;s overall score is a weighted average of their per-requirement scores, using the
            importance weights set below — not a simple keyword match count.
          </li>
        </ul>
      </section>

      <section className="mt-6 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800 print:border-0 print:p-0">
        <h2 className="mb-2 text-sm font-semibold">Requirements &amp; weights</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {requirementRows.map((r) => (
            <li key={r.id} className="flex justify-between text-zinc-700 dark:text-zinc-300">
              <span>{r.text}</span>
              <span className="text-zinc-400">weight {r.weight}</span>
            </li>
          ))}
          {requirementRows.length === 0 && <li className="text-zinc-400">No requirements recorded.</li>}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">
          Evidence trail by applicant ({applicantRows.length})
        </h2>
        <div className="flex flex-col gap-6">
          {applicantRows.map((applicant) => {
            const rows = scoresByApplicant.get(applicant.id) ?? [];
            return (
              <div
                key={applicant.id}
                className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800 print:break-inside-avoid print:border print:p-3"
              >
                <div className="mb-2 flex items-baseline justify-between">
                  <h3 className="font-medium">{applicant.name}</h3>
                  <span className="text-sm text-zinc-500">
                    Overall: {applicant.overallScore != null ? `${Math.round(applicant.overallScore)}%` : "—"}
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  {rows.map((row) => {
                    const req = requirementById.get(row.requirementId);
                    return (
                      <div key={row.requirementId} className="text-sm">
                        <div className="flex justify-between text-zinc-700 dark:text-zinc-300">
                          <span className="font-medium">{req?.text ?? "(requirement removed)"}</span>
                          <span className="text-zinc-400">
                            {row.failed ? "failed" : row.aiScore != null ? `${Math.round(row.aiScore)}%` : "—"}
                          </span>
                        </div>
                        {row.evidenceSnippet ? (
                          <blockquote className="mt-1 border-l-2 border-zinc-300 pl-2 text-zinc-600 italic dark:border-zinc-700 dark:text-zinc-400">
                            &ldquo;{row.evidenceSnippet}&rdquo;
                          </blockquote>
                        ) : (
                          <p className="mt-1 text-zinc-400 italic">No supporting evidence found in the resume.</p>
                        )}
                        {row.substanceNote && (
                          <p className="mt-1 text-xs text-zinc-500">{row.substanceNote}</p>
                        )}
                      </div>
                    );
                  })}
                  {rows.length === 0 && <p className="text-sm text-zinc-400">Not yet scored.</p>}
                </div>
              </div>
            );
          })}
          {applicantRows.length === 0 && <p className="text-sm text-zinc-400">No applicants yet.</p>}
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200 print:border print:bg-transparent">
        <strong>What this report is — and isn&apos;t:</strong> this documents the scoring methodology applied and
        the evidence behind each score, for your own transparency and record-keeping. It is{" "}
        <strong>not</strong> a statistical bias or adverse-impact audit, and does not by itself demonstrate
        compliance with any specific law or regulation (e.g. NYC Local Law 144, the EU AI Act) — those typically
        require analyzing outcomes across protected demographic categories, which this app never collects, by
        design, and therefore cannot report on.
      </section>
    </div>
  );
}
