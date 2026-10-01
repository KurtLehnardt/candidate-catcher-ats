import { AnthropicProvider } from "./anthropic";
import { OpenAIProvider } from "./openai";
import { OllamaProvider } from "./ollama";
import { getSettings } from "../db/settings";

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
  // The in-app /settings picker wins when set; otherwise fall back to .env.local so an
  // existing install keeps behaving exactly as before until the user actively changes
  // something. `||` (not `??`) throughout: a freshly-copied .env.local has LLM_PROVIDER=""
  // (blank, meant to be filled in by `npm run setup`/`setup:local`), and that empty string
  // must fall back too, not just an absent/undefined var or a null DB column.
  const settings = getSettings();
  const provider = settings.llmProvider || process.env.LLM_PROVIDER || "anthropic";
  const model = settings.llmModel || undefined;

  switch (provider) {
    case "anthropic":
      return new AnthropicProvider(model);
    case "openai":
      return new OpenAIProvider(model);
    case "ollama":
      return new OllamaProvider(model);
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}
