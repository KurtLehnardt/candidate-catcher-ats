import { OpenAIProvider } from "./openai";
import { OllamaProvider } from "./ollama";
import type { EmbeddingsProvider } from "../embeddings/reference-lookup";
import { getSettings } from "../db/settings";

// Embeddings are governed by EMBEDDINGS_PROVIDER (or the in-app /settings picker),
// independent of LLM_PROVIDER — Anthropic has no embeddings API, so a deployment can
// score with Claude while embedding with OpenAI or Ollama. Reuses OpenAIProvider/
// OllamaProvider purely for their embed() method.

export function getEmbeddingsProvider(): EmbeddingsProvider {
  const provider = getSettings().embeddingsProvider || process.env.EMBEDDINGS_PROVIDER || "openai";
  if (provider !== "openai" && provider !== "ollama") {
    throw new Error(`Unknown embeddings provider: ${provider}`);
  }
  return provider;
}

export async function embedText(text: string): Promise<number[]> {
  const provider = getEmbeddingsProvider();
  const model = getSettings().embeddingsModel || undefined;
  // Chat-model override intentionally omitted (`undefined`) — this call only ever needs
  // the embeddings model, and the two overrides are independent per-constructor args.
  const impl = provider === "ollama" ? new OllamaProvider(undefined, model) : new OpenAIProvider(undefined, model);
  return impl.embed(text);
}
