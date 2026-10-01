import { z } from "zod";

// One requirement's score within a batch response. `evidence` deliberately allows an
// empty string -- a model that genuinely finds no supporting quote for a weak match is a
// valid, common outcome, not a bug. (It previously required >=1 char, which is exactly
// what crashed a real scoring run: Ollama returned evidence: "" for a legitimate
// no-match case and the whole batch aborted on an uncaught ZodError.)
export const requirementScoreItemSchema = z.object({
  requirementId: z.string().min(1),
  score: z.number().min(0).max(100),
  evidence: z.string(),
  substanceNote: z.string().min(1),
});

export type RequirementScoreItem = z.infer<typeof requirementScoreItemSchema>;

// Top-level shape for a whole-resume batch call: one entry per requirement passed in.
// Wrapped in an object (not a bare array) because Anthropic's tool `input_schema` and
// OpenAI's `json_schema` strict mode both require an object at the top level.
export const requirementScoreBatchSchema = z.object({
  scores: z.array(requirementScoreItemSchema),
});

export type RequirementScoreBatchOutput = z.infer<typeof requirementScoreBatchSchema>;

// Hand-rolled JSON Schema mirroring requirementScoreBatchSchema above, for providers
// (Anthropic tool use, OpenAI structured outputs) that need a literal JSON Schema object
// rather than a zod schema. No zod-to-json-schema dependency for one small shape -- if the
// zod schema above changes, update this object to match.
export const requirementScoreBatchJsonSchema = {
  type: "object",
  properties: {
    scores: {
      type: "array",
      items: {
        type: "object",
        properties: {
          requirementId: {
            type: "string",
            description: "Echo back the exact id of the requirement this entry scores",
          },
          score: {
            type: "number",
            minimum: 0,
            maximum: 100,
            description: "0-100 fit score for this one requirement",
          },
          evidence: {
            type: "string",
            description:
              "A verbatim quote from the resume supporting the score, or an empty string if no supporting evidence exists",
          },
          substanceNote: {
            type: "string",
            description:
              "Whether the evidence is a specific, quantified, verifiable accomplishment or a vague/keyword-stuffed buzzword claim, and why",
          },
        },
        required: ["requirementId", "score", "evidence", "substanceNote"],
        additionalProperties: false,
      },
    },
  },
  required: ["scores"],
  additionalProperties: false,
} as const;
