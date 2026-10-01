import { describe, it, expect, vi } from "vitest";
import { scoreResumeWithRetry } from "./score-resume-with-retry";
import type { LLMProvider, RequirementScoreResult } from "../llm/provider";

const REQS = [
  { id: "r1", text: "5+ years backend", weight: 2 },
  { id: "r2", text: "AWS certified", weight: 1 },
];

function result(id: string, score = 80): RequirementScoreResult {
  return { requirementId: id, score, evidence: `evidence for ${id}`, substanceNote: "genuine" };
}

function mockProvider(scoreResume: LLMProvider["scoreResume"]): Pick<LLMProvider, "scoreResume"> {
  return { scoreResume };
}

describe("scoreResumeWithRetry", () => {
  it("returns all results on a clean first attempt, no retry needed", async () => {
    const scoreResume = vi.fn().mockResolvedValue([result("r1"), result("r2")]);
    const out = await scoreResumeWithRetry(mockProvider(scoreResume), "resume text", REQS);

    expect(scoreResume).toHaveBeenCalledTimes(1);
    expect(out).toEqual([
      { requirementId: "r1", score: 80, evidence: "evidence for r1", substanceNote: "genuine", failed: false },
      { requirementId: "r2", score: 80, evidence: "evidence for r2", substanceNote: "genuine", failed: false },
    ]);
  });

  it("retries once and succeeds when the first call throws", async () => {
    const scoreResume = vi
      .fn()
      .mockRejectedValueOnce(new Error("network blip"))
      .mockResolvedValueOnce([result("r1"), result("r2")]);
    const out = await scoreResumeWithRetry(mockProvider(scoreResume), "resume text", REQS);

    expect(scoreResume).toHaveBeenCalledTimes(2);
    expect(out.every((o) => !o.failed)).toBe(true);
  });

  it("marks every requirement failed when both attempts throw", async () => {
    const scoreResume = vi.fn().mockRejectedValue(new Error("daemon unreachable"));
    const out = await scoreResumeWithRetry(mockProvider(scoreResume), "resume text", REQS);

    expect(scoreResume).toHaveBeenCalledTimes(2);
    expect(out).toEqual([
      { requirementId: "r1", score: null, evidence: "", substanceNote: expect.any(String), failed: true },
      { requirementId: "r2", score: null, evidence: "", substanceNote: expect.any(String), failed: true },
    ]);
  });

  it("retries and merges when the first response is missing an entry", async () => {
    const scoreResume = vi
      .fn()
      .mockResolvedValueOnce([result("r1")]) // r2 missing
      .mockResolvedValueOnce([result("r2", 60)]);
    const out = await scoreResumeWithRetry(mockProvider(scoreResume), "resume text", REQS);

    expect(scoreResume).toHaveBeenCalledTimes(2);
    expect(out.find((o) => o.requirementId === "r1")).toMatchObject({ score: 80, failed: false });
    expect(out.find((o) => o.requirementId === "r2")).toMatchObject({ score: 60, failed: false });
  });

  it("marks only the still-missing requirement failed when the retry also omits it", async () => {
    const scoreResume = vi
      .fn()
      .mockResolvedValueOnce([result("r1")]) // r2 missing
      .mockResolvedValueOnce([result("r1", 50)]); // r2 missing again
    const out = await scoreResumeWithRetry(mockProvider(scoreResume), "resume text", REQS);

    // First attempt's r1 value wins over the retry's r1 value -- first successful entry
    // for a given id is kept rather than overwritten by the retry.
    expect(out.find((o) => o.requirementId === "r1")).toMatchObject({ score: 80, failed: false });
    expect(out.find((o) => o.requirementId === "r2")).toMatchObject({ score: null, failed: true });
  });

  it("does not retry when the response already covers every requested id", async () => {
    const scoreResume = vi.fn().mockResolvedValue([result("r1"), result("r2")]);
    await scoreResumeWithRetry(mockProvider(scoreResume), "resume text", REQS);
    expect(scoreResume).toHaveBeenCalledTimes(1);
  });
});
