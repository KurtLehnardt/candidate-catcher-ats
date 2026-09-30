import type { LLMProvider, RequirementScore } from "./provider";

// Stub — real scoring/embedding calls land in the scoring-engine phase.
export class AnthropicProvider implements LLMProvider {
  async scoreRequirement(
    _resumeText: string,
    _requirementText: string,
    _weight: number,
  ): Promise<RequirementScore> {
    throw new Error("AnthropicProvider.scoreRequirement not implemented yet");
  }

  async embed(_text: string): Promise<number[]> {
    throw new Error("AnthropicProvider.embed not implemented yet — embeddings go through EMBEDDINGS_PROVIDER, not Anthropic");
  }
}
