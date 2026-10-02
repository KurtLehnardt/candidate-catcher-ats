import { describe, it, expect } from "vitest";
import { requirementScoreBatchSchema, requirementExtractionSchema } from "./schema";

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

describe("requirementExtractionSchema", () => {
  it("accepts a normal extracted list", () => {
    const parsed = requirementExtractionSchema.parse({
      requirements: [
        { text: "5+ years backend engineering", weight: 1.5 },
        { text: "Experience with Kubernetes", weight: 0.5 },
      ],
    });
    expect(parsed.requirements).toHaveLength(2);
  });

  it("accepts an empty list (a vague/short description with nothing extractable)", () => {
    const parsed = requirementExtractionSchema.parse({ requirements: [] });
    expect(parsed.requirements).toHaveLength(0);
  });

  it("rejects a negative weight", () => {
    expect(() =>
      requirementExtractionSchema.parse({ requirements: [{ text: "x", weight: -1 }] }),
    ).toThrow();
  });

  it("rejects an empty requirement text", () => {
    expect(() =>
      requirementExtractionSchema.parse({ requirements: [{ text: "", weight: 1 }] }),
    ).toThrow();
  });
});
