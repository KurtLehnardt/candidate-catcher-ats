import Link from "next/link";
import { getSettings } from "@/lib/db/settings";
import { getOllamaStatus } from "@/lib/llm/ollama-status";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const stored = getSettings();
  const ollama = await getOllamaStatus();

  const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY);
  const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY);

  const llmOptions = [
    {
      value: "anthropic",
      label: "Anthropic (Claude)",
      available: hasAnthropicKey,
      note: hasAnthropicKey ? "API key configured" : "No ANTHROPIC_API_KEY — run `npm run setup`",
    },
    {
      value: "openai",
      label: "OpenAI",
      available: hasOpenAIKey,
      note: hasOpenAIKey ? "API key configured" : "No OPENAI_API_KEY — run `npm run setup`",
    },
    {
      value: "ollama",
      label: "Ollama (local)",
      available: ollama.reachable,
      note: ollama.reachable
        ? `${ollama.models.length} model(s) installed, free, your data never leaves this machine`
        : "Daemon not reachable — run `npm run setup:local`",
    },
  ];

  // Anthropic has no embeddings API — not offered here even if it's the scoring provider.
  const embeddingsOptions = [
    {
      value: "openai",
      label: "OpenAI",
      available: hasOpenAIKey,
      note: hasOpenAIKey ? "API key configured" : "No OPENAI_API_KEY — run `npm run setup`",
    },
    {
      value: "ollama",
      label: "Ollama (local)",
      available: ollama.reachable,
      note: ollama.reachable ? "Free, local — needs nomic-embed-text pulled" : "Daemon not reachable",
    },
  ];

  const effectiveLlmProvider = stored.llmProvider || process.env.LLM_PROVIDER || "anthropic";
  const effectiveLlmModel =
    stored.llmModel ||
    (effectiveLlmProvider === "ollama"
      ? process.env.LOCAL_LLM_MODEL
      : effectiveLlmProvider === "openai"
        ? process.env.OPENAI_MODEL
        : process.env.ANTHROPIC_MODEL) ||
    "";
  const effectiveEmbeddingsProvider = stored.embeddingsProvider || process.env.EMBEDDINGS_PROVIDER || "openai";
  const effectiveEmbeddingsModel = stored.embeddingsModel || process.env.EMBEDDINGS_MODEL || "";

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <Link href="/jobs" className="text-sm text-zinc-500 hover:underline">
        &larr; All jobs
      </Link>
      <h1 className="mb-1 mt-2 text-2xl font-semibold">Settings</h1>
      <p className="mb-8 text-sm text-zinc-500">
        Choose which LLM provider scores applicants and generates reference-hire embeddings. Changes take effect
        immediately — no restart needed.
      </p>

      <SettingsForm
        llmOptions={llmOptions}
        embeddingsOptions={embeddingsOptions}
        ollamaModels={ollama.models}
        initial={{
          llmProvider: effectiveLlmProvider,
          llmModel: effectiveLlmModel,
          embeddingsProvider: effectiveEmbeddingsProvider,
          embeddingsModel: effectiveEmbeddingsModel,
        }}
      />
    </div>
  );
}
