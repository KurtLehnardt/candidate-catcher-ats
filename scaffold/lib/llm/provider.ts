import { AnthropicProvider } from "./anthropic";
import { OpenAIProvider } from "./openai";
import { OllamaProvider } from "./ollama";
import { getSettings } from "../db/settings";
import type { ScoringRequirementInput } from "./prompt";
import type { ExtractedRequirement } from "./schema";

export interface RequirementScoreResult {
  requirementId: string;
  score: number;
  evidence: string;
  substanceNote: string;
}

export interface LLMProvider {
  /**
   * Score a resume against ALL of a job's requirements in one call (batched -- see
   * lib/llm/prompt.ts for why). Returns one result per requirement that the model
   * actually answered; a provider implementation is not responsible for filling in
   * missing/failed entries -- that's lib/scoring/score-resume-with-retry.ts's job, so it
   * can retry and merge without each provider duplicating that logic.
   */
  scoreResume(
    resumeText: string,
    requirements: ScoringRequirementInput[],
    referenceSnippets?: string[],
  ): Promise<RequirementScoreResult[]>;
  embed(text: string): Promise<number[]>;
  /** Extract weighted requirements out of a pasted job description. */
  extractRequirements(jdText: string): Promise<ExtractedRequirement[]>;
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
