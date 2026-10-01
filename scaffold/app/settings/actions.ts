"use server";

import { revalidatePath } from "next/cache";
import { updateSettings } from "@/lib/db/settings";

export async function saveSettings(formData: FormData): Promise<void> {
  const llmProvider = String(formData.get("llmProvider") || "") || null;
  const llmModel = String(formData.get("llmModel") || "").trim() || null;
  const embeddingsProvider = String(formData.get("embeddingsProvider") || "") || null;
  const embeddingsModel = String(formData.get("embeddingsModel") || "").trim() || null;

  updateSettings({ llmProvider, llmModel, embeddingsProvider, embeddingsModel });
  revalidatePath("/settings");
  revalidatePath("/jobs", "layout");
}
