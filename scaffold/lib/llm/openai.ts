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
  requirementScoreBatchJsonSchema,
  requirementExtractionSchema,
  requirementExtractionJsonSchema,
  interviewQuestionBatchSchema,
  interviewQuestionBatchJsonSchema,
  type ExtractedRequirement,
  type InterviewQuestionItem,
} from "./schema";

export class OpenAIProvider implements LLMProvider {
  // `chatModelOverride`/`embeddingsModelOverride` come from the in-app /settings picker.
  // This class does double duty as both the chat provider and (via lib/llm/embeddings.ts)
  // the OpenAI embeddings impl, so the two overrides are independent -- picking a chat
  // model in /settings must not silently change which embeddings model gets used.
  constructor(
    private readonly chatModelOverride?: string,
    private readonly embeddingsModelOverride?: string,
  ) {}

  private client(): OpenAI {
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async scoreResume(
    resumeText: string,
    requirements: ScoringRequirementInput[],
    referenceSnippets: string[] = [],
  ): Promise<RequirementScoreResult[]> {
    const completion = await this.client().chat.completions.create({
      model: this.chatModelOverride || process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: BATCH_SCORING_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildBatchScoringUserPrompt(resumeText, requirements, referenceSnippets),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "requirement_scores",
          schema: requirementScoreBatchJsonSchema,
          strict: true,
        },
      },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error("OpenAIProvider.scoreResume: empty response");
    return requirementScoreBatchSchema.parse(JSON.parse(raw)).scores;
  }

  async embed(text: string): Promise<number[]> {
    const model = this.embeddingsModelOverride || process.env.EMBEDDINGS_MODEL || "text-embedding-3-small";
    const response = await this.client().embeddings.create({ model, input: text });
    const embedding = response.data[0]?.embedding;
    if (!embedding) throw new Error("OpenAIProvider.embed: no embedding returned");
    return embedding;
  }

  async extractRequirements(jdText: string): Promise<ExtractedRequirement[]> {
    const completion = await this.client().chat.completions.create({
      model: this.chatModelOverride || process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
        { role: "user", content: buildExtractionUserPrompt(jdText) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "extracted_requirements",
          schema: requirementExtractionJsonSchema,
          strict: true,
        },
      },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error("OpenAIProvider.extractRequirements: empty response");
    return requirementExtractionSchema.parse(JSON.parse(raw)).requirements;
  }

  async generateInterviewQuestions(
    resumeText: string,
    requirementScores: InterviewQuestionRequirementInput[],
  ): Promise<InterviewQuestionItem[]> {
    const completion = await this.client().chat.completions.create({
      model: this.chatModelOverride || process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: INTERVIEW_QUESTIONS_SYSTEM_PROMPT },
        { role: "user", content: buildInterviewQuestionsUserPrompt(resumeText, requirementScores) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "interview_questions",
          schema: interviewQuestionBatchJsonSchema,
          strict: true,
        },
      },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error("OpenAIProvider.generateInterviewQuestions: empty response");
    return interviewQuestionBatchSchema.parse(JSON.parse(raw)).questions;
  }
}
