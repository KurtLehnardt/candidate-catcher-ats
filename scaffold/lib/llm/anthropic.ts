import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider, RequirementScore } from "./provider";
import { SCORING_SYSTEM_PROMPT, buildScoringUserPrompt } from "./prompt";
import { requirementScoreSchema, requirementScoreJsonSchema } from "./schema";

const TOOL_NAME = "submit_requirement_score";

export class AnthropicProvider implements LLMProvider {
  // Optional override (from the in-app /settings picker) for the chat model — falls back
  // to ANTHROPIC_MODEL, then a hardcoded default, when not given.
  constructor(private readonly modelOverride?: string) {}

  private client(): Anthropic {
    return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async scoreRequirement(
    resumeText: string,
    requirementText: string,
    weight: number,
    referenceSnippets: string[] = [],
  ): Promise<RequirementScore> {
    const response = await this.client().messages.create({
      model: this.modelOverride || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
      max_tokens: 1024,
      system: SCORING_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildScoringUserPrompt(resumeText, requirementText, weight, referenceSnippets),
        },
      ],
      tools: [
        {
          name: TOOL_NAME,
          description: "Submit the requirement score for this candidate.",
          input_schema: requirementScoreJsonSchema as unknown as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: "tool", name: TOOL_NAME },
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );
    if (!toolUse) {
      throw new Error("AnthropicProvider.scoreRequirement: model did not return a tool_use block");
    }
    return requirementScoreSchema.parse(toolUse.input);
  }

  async embed(_text: string): Promise<number[]> {
    throw new Error(
      "AnthropicProvider.embed not implemented — embeddings go through EMBEDDINGS_PROVIDER, not Anthropic (Anthropic has no embeddings API)",
    );
  }
}
