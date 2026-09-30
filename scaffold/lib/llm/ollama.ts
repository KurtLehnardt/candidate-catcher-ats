import type { LLMProvider, RequirementScore } from "./provider";

// Stub — real scoring/embedding calls land in the scoring-engine phase.
//
// Ollama serves an OpenAI-compatible API (the same trick github.com/KurtLehnardt/granted
// relies on), so at implementation time this should reuse an OpenAI-compatible HTTP
// client pointed at `LLM_BASE_URL` (e.g. http://localhost:11434/v1) with `LOCAL_LLM_MODEL`
// as the model name, rather than a separate Ollama-specific SDK.
export class OllamaProvider implements LLMProvider {
  async scoreRequirement(
    _resumeText: string,
    _requirementText: string,
    _weight: number,
  ): Promise<RequirementScore> {
    throw new Error("OllamaProvider.scoreRequirement not implemented yet");
  }

  async embed(_text: string): Promise<number[]> {
    throw new Error("OllamaProvider.embed not implemented yet");
  }
}
