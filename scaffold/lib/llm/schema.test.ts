import { describe, it, expect } from "vitest";
import { requirementScoreBatchSchema } from "./schema";

describe("requirementScoreBatchSchema", () => {
  it("accepts an empty evidence string (a genuine no-match outcome, not a bug)", () => {
    const parsed = requirementScoreBatchSchema.parse({
      scores: [{ requirementId: "r1", score: 20, evidence: "", substanceNote: "No relevant experience found." }],
    });
    expect(parsed.scores[0]?.evidence).toBe("");
  });

  it("rejects a score outside 0-100", () => {
    expect(() =>
      requirementScoreBatchSchema.parse({
        scores: [{ requirementId: "r1", score: 150, evidence: "x", substanceNote: "y" }],
      }),
    ).toThrow();
  });

  it("rejects a missing requirementId", () => {
    expect(() =>
      requirementScoreBatchSchema.parse({
        scores: [{ score: 50, evidence: "x", substanceNote: "y" }],
      }),
    ).toThrow();
  });
});
