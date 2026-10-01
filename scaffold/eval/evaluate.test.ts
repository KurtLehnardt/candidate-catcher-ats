import { describe, expect, it } from "vitest";
import { evaluateJobResult, formatReport } from "./evaluate";

describe("evaluateJobResult", () => {
  it("passes when the expected top/bottom hold in every run", () => {
    const result = evaluateJobResult("job-a", "Job A", "Alice", "Bob", [
      { top: "Alice", bottom: "Bob" },
      { top: "Alice", bottom: "Bob" },
      { top: "Alice", bottom: "Bob" },
    ]);
    expect(result.pass).toBe(true);
    expect(result.topConsistent).toBe(true);
    expect(result.bottomConsistent).toBe(true);
  });

  it("fails when the expected top does not hold in every run (a real mismatch, not just a crash)", () => {
    const result = evaluateJobResult("job-a", "Job A", "Alice", "Bob", [
      { top: "Alice", bottom: "Bob" },
      { top: "Carol", bottom: "Bob" }, // wrong top on run 2
      { top: "Alice", bottom: "Bob" },
    ]);
    expect(result.pass).toBe(false);
    expect(result.topConsistent).toBe(false);
    expect(result.bottomConsistent).toBe(true);
  });

  it("fails when the expected bottom does not hold in every run", () => {
    const result = evaluateJobResult("job-a", "Job A", "Alice", "Bob", [
      { top: "Alice", bottom: "Bob" },
      { top: "Alice", bottom: "Dave" }, // wrong bottom on run 2
    ]);
    expect(result.pass).toBe(false);
    expect(result.topConsistent).toBe(true);
    expect(result.bottomConsistent).toBe(false);
  });

  it("fails both when neither top nor bottom is ever right", () => {
    const result = evaluateJobResult("job-a", "Job A", "Alice", "Bob", [{ top: "Carol", bottom: "Dave" }]);
    expect(result.pass).toBe(false);
    expect(result.topConsistent).toBe(false);
    expect(result.bottomConsistent).toBe(false);
  });

  it("treats zero runs as not consistent (nothing was ever proven)", () => {
    const result = evaluateJobResult("job-a", "Job A", "Alice", "Bob", []);
    expect(result.pass).toBe(false);
  });
});

describe("formatReport", () => {
  it("reports PASS for a fully consistent job and includes the summary count", () => {
    const report = formatReport([
      evaluateJobResult("job-a", "Job A", "Alice", "Bob", [{ top: "Alice", bottom: "Bob" }]),
    ]);
    expect(report).toContain("[PASS] Job A");
    expect(report).toContain("1/1 jobs fully consistent");
  });

  it("reports FAIL with the actual mismatched names for a broken case, proving the checker catches it", () => {
    const report = formatReport([
      evaluateJobResult("job-a", "Job A", "Alice", "Bob", [
        { top: "Alice", bottom: "Bob" },
        { top: "Zoe", bottom: "Bob" },
      ]),
    ]);
    expect(report).toContain("[FAIL] Job A");
    expect(report).toContain('expected "Alice" every run, got: Alice, Zoe');
    expect(report).toContain("0/1 jobs fully consistent");
  });
});
