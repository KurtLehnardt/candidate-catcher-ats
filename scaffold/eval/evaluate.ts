export interface RunOutcome {
  top: string;
  bottom: string;
}

export interface JobEvalResult {
  jobKey: string;
  jobTitle: string;
  expectedTop: string;
  expectedBottom: string;
  runs: RunOutcome[];
  topConsistent: boolean;
  bottomConsistent: boolean;
  pass: boolean;
}

/**
 * Pure pass/fail logic, deliberately separated from the LLM-calling orchestration in
 * run.ts so it can be unit-tested fast and for free (no live model calls) — including
 * proving it actually reports FAIL on a real mismatch, not just that it runs.
 *
 * "Consistent" means the expected name was the actual top/bottom in EVERY run, not just
 * on average — matches the user's "should always be ranked #1/last" framing.
 */
export function evaluateJobResult(
  jobKey: string,
  jobTitle: string,
  expectedTop: string,
  expectedBottom: string,
  runs: RunOutcome[],
): JobEvalResult {
  const topConsistent = runs.length > 0 && runs.every((r) => r.top === expectedTop);
  const bottomConsistent = runs.length > 0 && runs.every((r) => r.bottom === expectedBottom);
  return {
    jobKey,
    jobTitle,
    expectedTop,
    expectedBottom,
    runs,
    topConsistent,
    bottomConsistent,
    pass: topConsistent && bottomConsistent,
  };
}

export function formatReport(results: JobEvalResult[]): string {
  const lines: string[] = [];
  for (const r of results) {
    const status = r.pass ? "PASS" : "FAIL";
    lines.push(`[${status}] ${r.jobTitle}`);
    if (!r.topConsistent) {
      const actualTops = r.runs.map((run) => run.top).join(", ");
      lines.push(`  top mismatch: expected "${r.expectedTop}" every run, got: ${actualTops}`);
    }
    if (!r.bottomConsistent) {
      const actualBottoms = r.runs.map((run) => run.bottom).join(", ");
      lines.push(`  bottom mismatch: expected "${r.expectedBottom}" every run, got: ${actualBottoms}`);
    }
  }
  const passCount = results.filter((r) => r.pass).length;
  lines.push("");
  lines.push(`${passCount}/${results.length} jobs fully consistent across all runs.`);
  return lines.join("\n");
}
