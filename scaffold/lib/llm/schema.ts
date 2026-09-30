import { z } from "zod";

export const requirementScoreSchema = z.object({
  score: z.number().min(0).max(100),
  evidence: z.string().min(1),
  substanceNote: z.string().min(1),
});

export type RequirementScoreOutput = z.infer<typeof requirementScoreSchema>;

// Hand-rolled JSON Schema mirroring requirementScoreSchema above, for providers (Anthropic
// tool use, OpenAI structured outputs) that need a literal JSON Schema object rather than a
// zod schema. No zod-to-json-schema dependency for one small shape — if the zod schema above
// changes, update this object to match.
export const requirementScoreJsonSchema = {
  type: "object",
  properties: {
    score: {
      type: "number",
      minimum: 0,
      maximum: 100,
      description: "0-100 fit score for this one requirement",
    },
    evidence: {
      type: "string",
      description: "A verbatim quote from the resume supporting the score",
    },
    substanceNote: {
      type: "string",
      description:
        "Whether the evidence is a specific, quantified, verifiable accomplishment or a vague/keyword-stuffed buzzword claim, and why",
    },
  },
  required: ["score", "evidence", "substanceNote"],
  additionalProperties: false,
} as const;
