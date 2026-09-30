import { OpenAIProvider } from "./openai";
import { OllamaProvider } from "./ollama";
import type { EmbeddingsProvider } from "../embeddings/reference-lookup";

// Embeddings are governed by EMBEDDINGS_PROVIDER, independent of LLM_PROVIDER — Anthropic
// has no embeddings API, so a deployment can score with Claude while embedding with OpenAI
// or Ollama. Reuses OpenAIProvider/OllamaProvider purely for their embed() method.

export function getEmbeddingsProvider(): EmbeddingsProvider {
  const provider = process.env.EMBEDDINGS_PROVIDER ?? "openai";
  if (provider !== "openai" && provider !== "ollama") {
    throw new Error(`Unknown EMBEDDINGS_PROVIDER: ${provider}`);
  }
  return provider;
}

export async function embedText(text: string): Promise<number[]> {
  const provider = getEmbeddingsProvider();
  const impl = provider === "ollama" ? new OllamaProvider() : new OpenAIProvider();
  return impl.embed(text);
}
