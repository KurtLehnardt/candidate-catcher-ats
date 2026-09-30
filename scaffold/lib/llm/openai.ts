import type { LLMProvider, RequirementScore } from "./provider";

// Stub — real scoring/embedding calls land in the scoring-engine phase.
export class OpenAIProvider implements LLMProvider {
  async scoreRequirement(
    _resumeText: string,
    _requirementText: string,
    _weight: number,
  ): Promise<RequirementScore> {
    throw new Error("OpenAIProvider.scoreRequirement not implemented yet");
  }

  async embed(_text: string): Promise<number[]> {
    throw new Error("OpenAIProvider.embed not implemented yet");
  }
}
