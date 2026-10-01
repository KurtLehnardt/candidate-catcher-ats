import OpenAI from "openai";
import type { LLMProvider, RequirementScore } from "./provider";
import { SCORING_SYSTEM_PROMPT, buildScoringUserPrompt } from "./prompt";
import { requirementScoreSchema, requirementScoreJsonSchema } from "./schema";

export class OpenAIProvider implements LLMProvider {
  // `chatModelOverride`/`embeddingsModelOverride` come from the in-app /settings picker.
  // This class does double duty as both the chat provider and (via lib/llm/embeddings.ts)
  // the OpenAI embeddings impl, so the two overrides are independent — picking a chat
  // model in /settings must not silently change which embeddings model gets used.
  constructor(
    private readonly chatModelOverride?: string,
    private readonly embeddingsModelOverride?: string,
  ) {}

  private client(): OpenAI {
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async scoreRequirement(
    resumeText: string,
    requirementText: string,
    weight: number,
    referenceSnippets: string[] = [],
  ): Promise<RequirementScore> {
    const completion = await this.client().chat.completions.create({
      model: this.chatModelOverride || process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: SCORING_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildScoringUserPrompt(resumeText, requirementText, weight, referenceSnippets),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "requirement_score",
          schema: requirementScoreJsonSchema,
          strict: true,
        },
      },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error("OpenAIProvider.scoreRequirement: empty response");
    return requirementScoreSchema.parse(JSON.parse(raw));
  }

  async embed(text: string): Promise<number[]> {
    const model = this.embeddingsModelOverride || process.env.EMBEDDINGS_MODEL || "text-embedding-3-small";
    const response = await this.client().embeddings.create({ model, input: text });
    const embedding = response.data[0]?.embedding;
    if (!embedding) throw new Error("OpenAIProvider.embed: no embedding returned");
    return embedding;
  }
}
