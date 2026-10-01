"use client";

import { useState } from "react";
import { saveSettings } from "./actions";
import { SubmitButton } from "@/components/SubmitButton";

interface ProviderOption {
  value: string;
  label: string;
  available: boolean;
  note: string;
}

function ProviderRadios({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: ProviderOption[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((opt) => (
        <label
          key={opt.value}
          className={`flex items-start gap-2 rounded-md border p-2 text-sm ${
            opt.available
              ? "border-zinc-300 dark:border-zinc-700"
              : "border-zinc-200 opacity-50 dark:border-zinc-800"
          }`}
        >
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            disabled={!opt.available}
            onChange={() => onChange(opt.value)}
            className="mt-0.5"
          />
          <span>
            <span className="font-medium">{opt.label}</span>
            <span className="block text-xs text-zinc-500">{opt.note}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

export function SettingsForm({
  llmOptions,
  embeddingsOptions,
  ollamaModels,
  initial,
}: {
  llmOptions: ProviderOption[];
  embeddingsOptions: ProviderOption[];
  ollamaModels: string[];
  initial: { llmProvider: string; llmModel: string; embeddingsProvider: string; embeddingsModel: string };
}) {
  const [llmProvider, setLlmProvider] = useState(initial.llmProvider);
  const [llmModel, setLlmModel] = useState(initial.llmModel);
  const [embeddingsProvider, setEmbeddingsProvider] = useState(initial.embeddingsProvider);
  const [embeddingsModel, setEmbeddingsModel] = useState(initial.embeddingsModel);

  return (
    <form action={saveSettings} className="flex flex-col gap-10">
      <section>
        <h2 className="mb-1 text-sm font-semibold">Scoring model</h2>
        <p className="mb-3 text-xs text-zinc-500">Which LLM scores applicants against your job requirements.</p>
        <ProviderRadios name="llmProvider" options={llmOptions} value={llmProvider} onChange={setLlmProvider} />

        <label className="mt-3 block text-sm font-medium" htmlFor="llmModel">
          Model
        </label>
        {llmProvider === "ollama" ? (
          <select
            id="llmModel"
            name="llmModel"
            value={llmModel}
            onChange={(e) => setLlmModel(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {ollamaModels.length === 0 && <option value="">No local models found</option>}
            {ollamaModels.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        ) : (
          <input
            id="llmModel"
            name="llmModel"
            value={llmModel}
            onChange={(e) => setLlmModel(e.target.value)}
            placeholder={llmProvider === "anthropic" ? "e.g. claude-sonnet-4-5" : "e.g. gpt-4o-mini"}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        )}
      </section>

      <section>
        <h2 className="mb-1 text-sm font-semibold">Embeddings model</h2>
        <p className="mb-3 text-xs text-zinc-500">
          Used for the reference-hire corpus. Anthropic has no embeddings API, so it is not an option here even if
          it is your scoring model.
        </p>
        <ProviderRadios
          name="embeddingsProvider"
          options={embeddingsOptions}
          value={embeddingsProvider}
          onChange={setEmbeddingsProvider}
        />

        <label className="mt-3 block text-sm font-medium" htmlFor="embeddingsModel">
          Model
        </label>
        {embeddingsProvider === "ollama" ? (
          <select
            id="embeddingsModel"
            name="embeddingsModel"
            value={embeddingsModel}
            onChange={(e) => setEmbeddingsModel(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {ollamaModels.length === 0 && <option value="">No local models found</option>}
            {ollamaModels.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        ) : (
          <input
            id="embeddingsModel"
            name="embeddingsModel"
            value={embeddingsModel}
            onChange={(e) => setEmbeddingsModel(e.target.value)}
            placeholder="e.g. text-embedding-3-small"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        )}
      </section>

      <SubmitButton pendingText="Saving...">Save</SubmitButton>
    </form>
  );
}
