// Ranking-quality evaluation harness. NOT part of `npm test` (too slow/costly — makes
// real LLM calls) — run explicitly via `npm run eval`. Seeds an isolated SQLite database
// (never the user's real data/candidate-catcher-ats.db) with synthetic jobs + resumes,
// runs the real scoring pipeline (same lib/ functions app/jobs/[jobId]/actions.ts uses)
// against each job's own applicant pool N times, and checks whether the deliberately
// "obviously best" and "obviously worst" resumes land at #1 / last in EVERY run.
//
// Usage:
//   npm run eval                       -- all jobs, 3 runs each (default)
//   npm run eval -- --jobs=2 --runs=1  -- a fast/cheap smoke subset
//   npm run eval -- --job=principal-software-engineer --runs=1
//                                       -- seed/score ONE job by its fixture key, not the
//                                          first N in the array (useful for demo seeding)
//   LLM_PROVIDER=ollama npm run eval   -- which provider to score with (default: ollama,
//                                          since it's free and already set up locally;
//                                          override to anthropic/openai for a faster/paid run)
//   EVAL_DB_PATH=../data/candidate-catcher-ats.db npm run eval -- --job=foo --runs=1
//                                       -- point at an arbitrary DB (e.g. the real app's
//                                          live database, to seed demo data into it). See
//                                          the safety note below: a non-default path is
//                                          NEVER wiped, only added to.
//
// Cost/time warning: the full default (10 jobs x ~10 resumes x 3 runs) is ~300 LLM calls.
// At local-Ollama speed (observed ~35-70s/call elsewhere in this app) that's multiple
// hours. Start with a small --jobs/--runs subset before running the full suite.

import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";

const DEFAULT_EVAL_DB_PATH = "data/eval.db";
const EVAL_DB_PATH = process.env.EVAL_DB_PATH ?? DEFAULT_EVAL_DB_PATH;
// True only when the caller explicitly pointed this at something other than the
// throwaway default -- e.g. the real app's data/candidate-catcher-ats.db to seed demo
// data into it. That target is assumed to be real, live data to ADD to, never wipe.
const IS_CUSTOM_DB_TARGET = EVAL_DB_PATH !== DEFAULT_EVAL_DB_PATH;
// Must be set before any lib/db/client.ts import, since it reads DATABASE_PATH at
// module-load time via getDb()'s lazy singleton.
process.env.DATABASE_PATH = EVAL_DB_PATH;
// Ollama by default: free, already configured locally, and doesn't burn real API credit
// just from running this file. Override via LLM_PROVIDER=anthropic/openai if desired.
if (!process.env.LLM_PROVIDER) process.env.LLM_PROVIDER = "ollama";

// Fresh eval DB every run -- this is synthetic throwaway data, not something to
// accumulate/migrate across runs. NEVER applies to a custom EVAL_DB_PATH (see
// IS_CUSTOM_DB_TARGET above) -- that path's existing content is preserved and only added
// to, specifically so this can safely target data/candidate-catcher-ats.db.
if (!IS_CUSTOM_DB_TARGET) {
  for (const suffix of ["", "-wal", "-shm"]) {
    const p = resolve(process.cwd(), EVAL_DB_PATH + suffix);
    if (existsSync(p)) rmSync(p);
  }
}

const { getDb } = await import("../lib/db/client");
const {
  jobs: jobsTable,
  requirements: requirementsTable,
  applicants: applicantsTable,
  resumes: resumesTable,
  requirementScores: requirementScoresTable,
} = await import("../lib/db/schema");
const { stripBias } = await import("../lib/resume/bias-strip");
const { getProvider } = await import("../lib/llm/provider");
const { scoreResumeWithRetry } = await import("../lib/scoring/score-resume-with-retry");
const { aggregateScore } = await import("../lib/scoring/aggregate");
const { jobs: jobFixtures } = await import("./fixtures/jobs");
const { resumes: resumeFixtures } = await import("./fixtures/resumes");
const { evaluateJobResult, formatReport } = await import("./evaluate");
type RunOutcome = { top: string; bottom: string };

function parseArg(name: string, def: number): number {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!arg) return def;
  const val = Number(arg.split("=")[1]);
  return Number.isFinite(val) && val > 0 ? val : def;
}

function parseStringArg(name: string): string | undefined {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.split("=").slice(1).join("=") : undefined;
}

const RUNS = parseArg("runs", 3);
const JOB_LIMIT = parseArg("jobs", jobFixtures.length);
const JOB_KEY = parseStringArg("job");
if (JOB_KEY && !jobFixtures.some((j) => j.key === JOB_KEY)) {
  console.error(`eval: no job fixture with key "${JOB_KEY}". Known keys: ${jobFixtures.map((j) => j.key).join(", ")}`);
  process.exit(1);
}

async function main() {
  const db = getDb();
  const provider = getProvider();
  const startedAt = Date.now();
  let totalCalls = 0;

  const jobsToRun = JOB_KEY ? jobFixtures.filter((j) => j.key === JOB_KEY) : jobFixtures.slice(0, JOB_LIMIT);
  console.log(
    `Running eval: ${jobsToRun.length} job(s), ${RUNS} run(s) each, provider=${process.env.LLM_PROVIDER}, db=${EVAL_DB_PATH}\n`,
  );

  const results = [];

  for (const jobFixture of jobsToRun) {
    const [jobRow] = await db
      .insert(jobsTable)
      .values({ title: jobFixture.title, description: jobFixture.description })
      .returning({ id: jobsTable.id });
    if (!jobRow) throw new Error(`eval: failed to insert job ${jobFixture.key}`);

    const requirementRows: { id: string; text: string; weight: number }[] = [];
    for (const r of jobFixture.requirements) {
      const [row] = await db
        .insert(requirementsTable)
        .values({ jobId: jobRow.id, text: r.text, weight: r.weight })
        .returning({ id: requirementsTable.id });
      if (!row) throw new Error(`eval: failed to insert requirement for ${jobFixture.key}`);
      requirementRows.push({ id: row.id, text: r.text, weight: r.weight });
    }

    const myResumes = resumeFixtures.filter((r) => r.jobKey === jobFixture.key);
    const expectedTop = myResumes.find((r) => r.expected === "top");
    const expectedBottom = myResumes.find((r) => r.expected === "bottom");
    if (!expectedTop || !expectedBottom) {
      throw new Error(`eval: job "${jobFixture.key}" is missing an expected top/bottom resume fixture`);
    }

    // Insert real applicants/resumes rows -- exercises the same persistence the app's
    // upload flow produces, not just the in-memory scoring computation.
    const applicantIdByName = new Map<string, string>();
    for (const resumeFixture of myResumes) {
      const [applicantRow] = await db
        .insert(applicantsTable)
        .values({ jobId: jobRow.id, name: resumeFixture.name })
        .returning({ id: applicantsTable.id });
      if (!applicantRow) throw new Error(`eval: failed to insert applicant ${resumeFixture.name}`);

      const [resumeRow] = await db
        .insert(resumesTable)
        .values({ applicantId: applicantRow.id, rawText: resumeFixture.rawText })
        .returning({ id: resumesTable.id });
      if (!resumeRow) throw new Error(`eval: failed to insert resume for ${resumeFixture.name}`);

      await db.update(applicantsTable).set({ resumeId: resumeRow.id }).where(eq(applicantsTable.id, applicantRow.id));
      applicantIdByName.set(resumeFixture.name, applicantRow.id);
    }

    const runOutcomes: RunOutcome[] = [];

    for (let run = 1; run <= RUNS; run++) {
      const overallByName = new Map<string, number>();

      for (const resumeFixture of myResumes) {
        const applicantId = applicantIdByName.get(resumeFixture.name)!;
        const stripped = stripBias(resumeFixture.rawText, { candidateName: resumeFixture.name });
        const outcomes = await scoreResumeWithRetry(provider, stripped, requirementRows, []);
        totalCalls++;

        // Persist each requirement score, same upsert pattern as the real runScoring()
        // action -- a later run (run 2, 3, ...) overwrites the prior run's rows for this
        // applicant, which is fine since each run's RESULT is already captured in
        // runOutcomes below before the next run's writes land.
        for (const outcome of outcomes) {
          await db
            .insert(requirementScoresTable)
            .values({
              applicantId,
              requirementId: outcome.requirementId,
              aiScore: outcome.score,
              failed: outcome.failed,
              evidenceSnippet: outcome.evidence,
              substanceNote: outcome.substanceNote,
            })
            .onConflictDoUpdate({
              target: [requirementScoresTable.applicantId, requirementScoresTable.requirementId],
              set: {
                aiScore: outcome.score,
                failed: outcome.failed,
                evidenceSnippet: outcome.evidence,
                substanceNote: outcome.substanceNote,
              },
            });
        }

        const overall = aggregateScore(
          outcomes
            .filter((o) => !o.failed && o.score != null)
            .map((o) => ({
              score: o.score!,
              weight: requirementRows.find((r) => r.id === o.requirementId)!.weight,
            })),
        );
        await db.update(applicantsTable).set({ overallScore: overall }).where(eq(applicantsTable.id, applicantId));
        overallByName.set(resumeFixture.name, overall);
      }

      const ranked = [...overallByName.entries()].sort((a, b) => b[1] - a[1]);
      const top = ranked[0]?.[0] ?? "(no scores)";
      const bottom = ranked[ranked.length - 1]?.[0] ?? "(no scores)";
      runOutcomes.push({ top, bottom });
      console.log(`  [${jobFixture.title}] run ${run}/${RUNS}: top=${top} bottom=${bottom}`);
    }

    results.push(evaluateJobResult(jobFixture.key, jobFixture.title, expectedTop.name, expectedBottom.name, runOutcomes));
  }

  const elapsedSec = (Date.now() - startedAt) / 1000;
  console.log("\n" + formatReport(results));
  console.log(
    `\n${totalCalls} LLM call(s) in ${elapsedSec.toFixed(1)}s (${(elapsedSec / Math.max(totalCalls, 1)).toFixed(1)}s/call avg).`,
  );

  const failed = results.filter((r) => !r.pass).length;
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error("eval failed:", err);
  process.exit(1);
});
