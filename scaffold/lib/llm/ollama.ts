import OpenAI from "openai";
import type { LLMProvider, RequirementScoreResult } from "./provider";
import {
  BATCH_SCORING_SYSTEM_PROMPT,
  buildBatchScoringUserPrompt,
  EXTRACTION_SYSTEM_PROMPT,
  buildExtractionUserPrompt,
  INTERVIEW_QUESTIONS_SYSTEM_PROMPT,
  buildInterviewQuestionsUserPrompt,
  type ScoringRequirementInput,
  type InterviewQuestionRequirementInput,
} from "./prompt";
import {
  requirementScoreBatchSchema,
  requirementExtractionSchema,
  interviewQuestionBatchSchema,
  type ExtractedRequirement,
  type InterviewQuestionItem,
} from "./schema";

// Ollama serves an OpenAI-compatible API (the same trick github.com/KurtLehnardt/granted
// relies on), so this reuses the `openai` SDK pointed at LLM_BASE_URL instead of a
// separate Ollama-specific client. One difference from the OpenAI provider: Ollama's
// compat layer supports `response_format: {type: "json_object"}` (basic JSON mode) but not
// OpenAI's stricter `json_schema` strict mode, so schema conformance here relies on the
// prompt instructions plus the zod `.parse()` below, rather than the model being
// constrained to the schema server-side -- which is exactly why the batch orchestration
// layer (lib/scoring/score-resume-with-retry.ts) retries on a malformed/incomplete
// response instead of assuming this provider always gets it right first try.
export class OllamaProvider implements LLMProvider {
  // Same dual-use split as OpenAIProvider -- see its constructor comment.
  constructor(
    private readonly chatModelOverride?: string,
    private readonly embeddingsModelOverride?: string,
  ) {}

  private chatClient(): OpenAI {
    return new OpenAI({
      apiKey: "ollama", // unused by Ollama; the SDK just requires a non-empty string
      baseURL: process.env.LLM_BASE_URL || "http://localhost:11434/v1",
    });
  }

  private embedClient(): OpenAI {
    return new OpenAI({
      apiKey: "ollama",
      baseURL: process.env.EMBEDDINGS_BASE_URL || process.env.LLM_BASE_URL || "http://localhost:11434/v1",
    });
  }

  async scoreResume(
    resumeText: string,
    requirements: ScoringRequirementInput[],
    referenceSnippets: string[] = [],
  ): Promise<RequirementScoreResult[]> {
    const model = this.chatModelOverride || process.env.LOCAL_LLM_MODEL;
    if (!model) throw new Error("OllamaProvider.scoreResume: no model set (neither /settings nor LOCAL_LLM_MODEL)");

    const completion = await this.chatClient().chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `${BATCH_SCORING_SYSTEM_PROMPT}\n\nRequired JSON shape: {"scores": [{"requirementId": string, "score": number 0-100, "evidence": string, "substanceNote": string}, ...]}. Return ONLY that JSON object.`,
        },
        {
          role: "user",
          content: buildBatchScoringUserPrompt(resumeText, requirements, referenceSnippets),
        },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error("OllamaProvider.scoreResume: empty response");
    return requirementScoreBatchSchema.parse(JSON.parse(raw)).scores;
  }

  async embed(text: string): Promise<number[]> {
    const model = this.embeddingsModelOverride || process.env.EMBEDDINGS_MODEL || "nomic-embed-text";
    const response = await this.embedClient().embeddings.create({ model, input: text });
    const embedding = response.data[0]?.embedding;
    if (!embedding) throw new Error("OllamaProvider.embed: no embedding returned");
    return embedding;
  }

  async extractRequirements(jdText: string): Promise<ExtractedRequirement[]> {
    const model = this.chatModelOverride || process.env.LOCAL_LLM_MODEL;
    if (!model) throw new Error("OllamaProvider.extractRequirements: no model set (neither /settings nor LOCAL_LLM_MODEL)");

    const completion = await this.chatClient().chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `${EXTRACTION_SYSTEM_PROMPT}\n\nRequired JSON shape: {"requirements": [{"text": string, "weight": number}, ...]}. Return ONLY that JSON object.`,
        },
        { role: "user", content: buildExtractionUserPrompt(jdText) },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error("OllamaProvider.extractRequirements: empty response");
    return requirementExtractionSchema.parse(JSON.parse(raw)).requirements;
  }

  async generateInterviewQuestions(
    resumeText: string,
    requirementScores: InterviewQuestionRequirementInput[],
  ): Promise<InterviewQuestionItem[]> {
    const model = this.chatModelOverride || process.env.LOCAL_LLM_MODEL;
    if (!model)
      throw new Error("OllamaProvider.generateInterviewQuestions: no model set (neither /settings nor LOCAL_LLM_MODEL)");

    const completion = await this.chatClient().chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `${INTERVIEW_QUESTIONS_SYSTEM_PROMPT}\n\nRequired JSON shape: {"questions": [{"question": string, "relatedRequirementId": string}, ...]}. Return ONLY that JSON object.`,
        },
        { role: "user", content: buildInterviewQuestionsUserPrompt(resumeText, requirementScores) },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error("OllamaProvider.generateInterviewQuestions: empty response");
    return interviewQuestionBatchSchema.parse(JSON.parse(raw)).questions;
  }
}
