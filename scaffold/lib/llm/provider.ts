import { AnthropicProvider } from "./anthropic";
import { OpenAIProvider } from "./openai";
import { OllamaProvider } from "./ollama";

export interface RequirementScore {
  score: number;
  evidence: string;
  substanceNote: string;
}

export interface LLMProvider {
  scoreRequirement(
    resumeText: string,
    requirementText: string,
    weight: number,
    referenceSnippets?: string[],
  ): Promise<RequirementScore>;
  embed(text: string): Promise<number[]>;
}

export function getProvider(): LLMProvider {
  // `||` (not `??`): a freshly-copied .env.local has LLM_PROVIDER="" (blank,
  // meant to be filled in by `npm run setup`/`setup:local`), and that empty
  // string must fall back too, not just an absent/undefined var.
  const provider = process.env.LLM_PROVIDER || "anthropic";

  switch (provider) {
    case "anthropic":
      return new AnthropicProvider();
    case "openai":
      return new OpenAIProvider();
    case "ollama":
      return new OllamaProvider();
    default:
      throw new Error(`Unknown LLM_PROVIDER: ${provider}`);
  }
}
