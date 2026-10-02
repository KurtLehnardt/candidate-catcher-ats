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

// One extracted requirement: the requirement text plus a relative importance weight.
export const extractedRequirementSchema = z.object({
  text: z.string().min(1),
  weight: z.number().min(0),
});

export type ExtractedRequirement = z.infer<typeof extractedRequirementSchema>;

// Top-level shape for a job-description-extraction call. Wrapped in an object for the
// same reason requirementScoreBatchSchema is -- Anthropic tool `input_schema` and
// OpenAI's `json_schema` strict mode both require an object at the top level.
export const requirementExtractionSchema = z.object({
  requirements: z.array(extractedRequirementSchema),
});

export type RequirementExtractionOutput = z.infer<typeof requirementExtractionSchema>;

// One suggested interview question. `relatedRequirementId` deliberately allows an empty
// string for a general question not tied to one specific requirement -- same
// allow-empty-string pattern as `evidence` above, for the same reason: forcing a value
// where none genuinely applies is what produces an invalid response, not a safe one.
export const interviewQuestionItemSchema = z.object({
  question: z.string().min(1),
  relatedRequirementId: z.string(),
});

export type InterviewQuestionItem = z.infer<typeof interviewQuestionItemSchema>;

export const interviewQuestionBatchSchema = z.object({
  questions: z.array(interviewQuestionItemSchema),
});

export type InterviewQuestionBatchOutput = z.infer<typeof interviewQuestionBatchSchema>;

export const interviewQuestionBatchJsonSchema = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string", description: "One targeted interview question for this candidate" },
          relatedRequirementId: {
            type: "string",
            description:
              "Echo back the exact id of the requirement this question probes, or an empty string if the question is general rather than tied to one requirement",
          },
        },
        required: ["question", "relatedRequirementId"],
        additionalProperties: false,
      },
    },
  },
  required: ["questions"],
  additionalProperties: false,
} as const;

// Hand-rolled JSON Schema mirroring requirementExtractionSchema, for providers that need
// a literal JSON Schema object rather than a zod schema.
export const requirementExtractionJsonSchema = {
  type: "object",
  properties: {
    requirements: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "One distinct requirement or qualification extracted from the job description",
          },
          weight: {
            type: "number",
            minimum: 0,
            description:
              "Relative importance, where 1.0 is a normal/default requirement. Use roughly 1.5-2.0 for things the description marks as required/must-have, and roughly 0.5 for things marked nice-to-have/preferred/a plus.",
          },
        },
        required: ["text", "weight"],
        additionalProperties: false,
      },
    },
  },
  required: ["requirements"],
  additionalProperties: false,
} as const;
