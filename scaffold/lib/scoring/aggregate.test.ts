import { describe, expect, it } from "vitest";
import { aggregateScore } from "./aggregate";

describe("aggregateScore", () => {
  it("returns 0 for an empty list", () => {
    expect(aggregateScore([])).toBe(0);
  });

  it("returns the single score when there's only one requirement", () => {
    expect(aggregateScore([{ score: 73, weight: 1 }])).toBe(73);
  });

  it("reduces to a plain average when all weights are equal", () => {
    const scores = [
      { score: 80, weight: 2 },
      { score: 60, weight: 2 },
      { score: 100, weight: 2 },
    ];
    expect(aggregateScore(scores)).toBeCloseTo(80);
  });

  it("weights higher-importance requirements more heavily", () => {
    const scores = [
      { score: 100, weight: 3 },
      { score: 0, weight: 1 },
    ];
    // (100*3 + 0*1) / 4 = 75
    expect(aggregateScore(scores)).toBeCloseTo(75);
  });

  it("excludes a zero-weight requirement from the result", () => {
    const withZero = [
      { score: 100, weight: 1 },
      { score: 0, weight: 0 },
    ];
    const withoutZero = [{ score: 100, weight: 1 }];
    expect(aggregateScore(withZero)).toBe(aggregateScore(withoutZero));
  });

  it("falls back to a plain average when every weight is zero", () => {
    const scores = [
      { score: 40, weight: 0 },
      { score: 60, weight: 0 },
    ];
    expect(aggregateScore(scores)).toBeCloseTo(50);
  });
});
