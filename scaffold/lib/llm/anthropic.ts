import Anthropic from "@anthropic-ai/sdk";
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

const TOOL_NAME = "submit_requirement_scores";
const EXTRACTION_TOOL_NAME = "submit_extracted_requirements";
const INTERVIEW_QUESTIONS_TOOL_NAME = "submit_interview_questions";

export class AnthropicProvider implements LLMProvider {
  // Optional override (from the in-app /settings picker) for the chat model -- falls back
  // to ANTHROPIC_MODEL, then a hardcoded default, when not given.
  constructor(private readonly modelOverride?: string) {}

  private client(): Anthropic {
    return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async scoreResume(
    resumeText: string,
    requirements: ScoringRequirementInput[],
    referenceSnippets: string[] = [],
  ): Promise<RequirementScoreResult[]> {
    const response = await this.client().messages.create({
      model: this.modelOverride || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
      max_tokens: 4096,
      system: BATCH_SCORING_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildBatchScoringUserPrompt(resumeText, requirements, referenceSnippets),
        },
      ],
      tools: [
        {
          name: TOOL_NAME,
          description: "Submit the requirement scores for this candidate.",
          input_schema: requirementScoreBatchJsonSchema as unknown as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: "tool", name: TOOL_NAME },
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );
    if (!toolUse) {
      throw new Error("AnthropicProvider.scoreResume: model did not return a tool_use block");
    }
    return requirementScoreBatchSchema.parse(toolUse.input).scores;
  }

  async embed(_text: string): Promise<number[]> {
    throw new Error(
      "AnthropicProvider.embed not implemented — embeddings go through EMBEDDINGS_PROVIDER, not Anthropic (Anthropic has no embeddings API)",
    );
  }

  async extractRequirements(jdText: string): Promise<ExtractedRequirement[]> {
    const response = await this.client().messages.create({
      model: this.modelOverride || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
      max_tokens: 2048,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildExtractionUserPrompt(jdText) }],
      tools: [
        {
          name: EXTRACTION_TOOL_NAME,
          description: "Submit the extracted requirements for this job description.",
          input_schema: requirementExtractionJsonSchema as unknown as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: "tool", name: EXTRACTION_TOOL_NAME },
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );
    if (!toolUse) {
      throw new Error("AnthropicProvider.extractRequirements: model did not return a tool_use block");
    }
    return requirementExtractionSchema.parse(toolUse.input).requirements;
  }

  async generateInterviewQuestions(
    resumeText: string,
    requirementScores: InterviewQuestionRequirementInput[],
  ): Promise<InterviewQuestionItem[]> {
    const response = await this.client().messages.create({
      model: this.modelOverride || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
      max_tokens: 2048,
      system: INTERVIEW_QUESTIONS_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildInterviewQuestionsUserPrompt(resumeText, requirementScores) }],
      tools: [
        {
          name: INTERVIEW_QUESTIONS_TOOL_NAME,
          description: "Submit the interview questions for this candidate.",
          input_schema: interviewQuestionBatchJsonSchema as unknown as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: "tool", name: INTERVIEW_QUESTIONS_TOOL_NAME },
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );
    if (!toolUse) {
      throw new Error("AnthropicProvider.generateInterviewQuestions: model did not return a tool_use block");
    }
    return interviewQuestionBatchSchema.parse(toolUse.input).questions;
  }
}
