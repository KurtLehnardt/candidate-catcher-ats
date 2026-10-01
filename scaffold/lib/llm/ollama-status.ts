/** Derive Ollama's native API host (`/api/tags`) from an OpenAI-compat base URL (`.../v1`). */
function ollamaHost(): string {
  const base = process.env.LLM_BASE_URL || process.env.EMBEDDINGS_BASE_URL || "http://localhost:11434/v1";
  return base.replace(/\/v1\/?$/, "");
}

export interface OllamaStatus {
  reachable: boolean;
  models: string[];
}

/** Live-queries the local Ollama daemon for installed models. Never throws — a down/missing daemon just reports unreachable. */
export async function getOllamaStatus(): Promise<OllamaStatus> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${ollamaHost()}/api/tags`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return { reachable: false, models: [] };
    const json = (await res.json()) as { models?: { name: string }[] };
    return { reachable: true, models: (json.models ?? []).map((m) => m.name) };
  } catch {
    return { reachable: false, models: [] };
  }
}
