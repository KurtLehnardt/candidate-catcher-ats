import OpenAI from "openai";
import type { LLMProvider, RequirementScore } from "./provider";
import { SCORING_SYSTEM_PROMPT, buildScoringUserPrompt } from "./prompt";
import { requirementScoreSchema } from "./schema";

// Ollama serves an OpenAI-compatible API (the same trick github.com/KurtLehnardt/granted
// relies on), so this reuses the `openai` SDK pointed at LLM_BASE_URL instead of a
// separate Ollama-specific client. One difference from the OpenAI provider: Ollama's
// compat layer supports `response_format: {type: "json_object"}` (basic JSON mode) but not
// OpenAI's stricter `json_schema` strict mode, so schema conformance here relies on the
// prompt instructions plus the zod `.parse()` below, rather than the model being
// constrained to the schema server-side.
export class OllamaProvider implements LLMProvider {
  // Same dual-use split as OpenAIProvider — see its constructor comment.
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

  async scoreRequirement(
    resumeText: string,
    requirementText: string,
    weight: number,
    referenceSnippets: string[] = [],
  ): Promise<RequirementScore> {
    const model = this.chatModelOverride || process.env.LOCAL_LLM_MODEL;
    if (!model) throw new Error("OllamaProvider.scoreRequirement: no model set (neither /settings nor LOCAL_LLM_MODEL)");

    const completion = await this.chatClient().chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `${SCORING_SYSTEM_PROMPT}\n\nRequired JSON shape: {"score": number 0-100, "evidence": string, "substanceNote": string}. Return ONLY that JSON object.`,
        },
        {
          role: "user",
          content: buildScoringUserPrompt(resumeText, requirementText, weight, referenceSnippets),
        },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error("OllamaProvider.scoreRequirement: empty response");
    return requirementScoreSchema.parse(JSON.parse(raw));
  }

  async embed(text: string): Promise<number[]> {
    const model = this.embeddingsModelOverride || process.env.EMBEDDINGS_MODEL || "nomic-embed-text";
    const response = await this.embedClient().embeddings.create({ model, input: text });
    const embedding = response.data[0]?.embedding;
    if (!embedding) throw new Error("OllamaProvider.embed: no embedding returned");
    return embedding;
  }
}
