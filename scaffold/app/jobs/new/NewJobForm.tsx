"use client";

import { useState } from "react";
import { createJob } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";

interface RequirementRow {
  key: number;
  text: string;
  weight: number;
}

let nextKey = 1;

export function NewJobForm() {
  const [requirements, setRequirements] = useState<RequirementRow[]>([
    { key: nextKey++, text: "", weight: 1 },
  ]);

  function addRequirement() {
    setRequirements((rows) => [...rows, { key: nextKey++, text: "", weight: 1 }]);
  }

  function removeRequirement(key: number) {
    setRequirements((rows) => rows.filter((r) => r.key !== key));
  }

  function updateRequirement(key: number, patch: Partial<RequirementRow>) {
    setRequirements((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  return (
    <form action={createJob} className="flex flex-col gap-6">
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="title">
          Job title
        </label>
        <input
          id="title"
          name="title"
          required
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          placeholder="Senior Software Engineer"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="description">
          Job description
        </label>
        <textarea
          id="description"
          name="description"
          rows={5}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          placeholder="Paste the full job description here..."
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">Requirements</span>
          <button
            type="button"
            onClick={addRequirement}
            className="text-sm text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            + Add requirement
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {requirements.map((req) => (
            <div key={req.key} className="flex items-center gap-3">
              <input
                name="requirementText"
                value={req.text}
                onChange={(e) => updateRequirement(req.key, { text: e.target.value })}
                placeholder="e.g. 5+ years backend engineering"
                className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
              <label className="flex items-center gap-1 text-xs text-zinc-500">
                Weight
                <input
                  name="requirementWeight"
                  type="number"
                  min={0}
                  step={0.5}
                  value={req.weight}
                  onChange={(e) => updateRequirement(req.key, { weight: Number(e.target.value) })}
                  className="w-16 rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </label>
              {requirements.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRequirement(req.key)}
                  className="text-sm text-zinc-400 hover:text-red-600"
                  aria-label="Remove requirement"
                >
                  &times;
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <SubmitButton pendingText="Creating...">Create job</SubmitButton>
    </form>
  );
}
