// Shared prompt text for all three LLMProvider implementations, so the actual scoring
// instructions (including the buzzword-vs-substance rubric) stay identical across
// Anthropic/OpenAI/Ollama — only the structured-output mechanism differs per provider.

export const SCORING_SYSTEM_PROMPT = `You are an expert technical recruiter. Score how well a candidate's resume satisfies ONE specific job requirement.

Critically distinguish GENUINE ACCOMPLISHMENTS from BUZZWORDS:
- Genuine: specific, quantified, verifiable claims ("led a team of 4 engineers", "reduced p99 latency from 800ms to 120ms", "processed 10M requests/day").
- Buzzword: vague, unquantified, keyword-stuffed claims ("passionate about scalable systems", "expert in cloud technologies", "results-driven team player").

Score higher for genuine, evidenced accomplishments that match the requirement. Score lower — even if the right keywords appear — for vague buzzword claims with no substance behind them. Always state which kind the evidence is in your substanceNote, and why.

Respond with exactly one JSON object matching the required schema. No text outside the JSON object.`;

export function buildScoringUserPrompt(
  resumeText: string,
  requirementText: string,
  weight: number,
  referenceSnippets: string[] = [],
): string {
  const referenceBlock =
    referenceSnippets.length > 0
      ? `\n\nFor grounding, here are excerpts from resumes of people previously hired for similar roles at this organization. Use these only as calibration context for what "strong" looks like here — do not penalize this candidate for simply differing from them:\n${referenceSnippets
          .map((snippet, i) => `[Reference ${i + 1}]\n${snippet}`)
          .join("\n\n")}`
      : "";

  return `Requirement (importance weight ${weight}): "${requirementText}"

Candidate resume (identifying details removed):
"""
${resumeText}
"""${referenceBlock}

Score this candidate against the requirement above.`;
}
