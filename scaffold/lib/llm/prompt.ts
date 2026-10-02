// Shared prompt text for all three LLMProvider implementations, so the actual scoring
// instructions (including the buzzword-vs-substance rubric) stay identical across
// Anthropic/OpenAI/Ollama -- only the structured-output mechanism differs per provider.
//
// Scoring is batched: ONE call covers every requirement for a given resume, instead of
// one call per requirement. This cuts LLM calls (and wall-clock time, and failure
// surface) by roughly the number of requirements on a job.

export const BATCH_SCORING_SYSTEM_PROMPT = `You are an expert technical recruiter. Score how well a candidate's resume satisfies EACH of the job requirements listed below, independently of one another.

Critically distinguish GENUINE ACCOMPLISHMENTS from BUZZWORDS:
- Genuine: specific, quantified, verifiable claims ("led a team of 4 engineers", "reduced p99 latency from 800ms to 120ms", "processed 10M requests/day").
- Buzzword: vague, unquantified, keyword-stuffed claims ("passionate about scalable systems", "expert in cloud technologies", "results-driven team player").

Score higher for genuine, evidenced accomplishments that match a requirement. Score lower -- even if the right keywords appear -- for vague buzzword claims with no substance behind them. Always state which kind the evidence is in that requirement's substanceNote, and why.

If the resume genuinely has no supporting evidence for a requirement, use an empty string for that entry's evidence and say so in substanceNote -- do not fabricate a quote that isn't in the resume.

Respond with exactly one JSON object of the shape {"scores": [...]}, with exactly one entry per requirement id listed below (echo the id back exactly as given), in any order. No text outside the JSON object.`;

export interface ScoringRequirementInput {
  id: string;
  text: string;
  weight: number;
}

export function buildBatchScoringUserPrompt(
  resumeText: string,
  requirements: ScoringRequirementInput[],
  referenceSnippets: string[] = [],
): string {
  const requirementList = requirements
    .map((r) => `- id: "${r.id}" (importance weight ${r.weight}): "${r.text}"`)
    .join("\n");

  const referenceBlock =
    referenceSnippets.length > 0
      ? `\n\nFor grounding, here are excerpts from resumes of people previously hired for similar roles at this organization. Use these only as calibration context for what "strong" looks like here -- do not penalize this candidate for simply differing from them:\n${referenceSnippets
          .map((snippet, i) => `[Reference ${i + 1}]\n${snippet}`)
          .join("\n\n")}`
      : "";

  return `Job requirements to score this candidate against:
${requirementList}

Candidate resume (identifying details removed):
"""
${resumeText}
"""${referenceBlock}

Score this candidate against EVERY requirement listed above, returning one entry per id.`;
}

// Prompt for extracting weighted requirements out of a pasted job description, so a
// recruiter doesn't have to type each requirement in by hand.
export const EXTRACTION_SYSTEM_PROMPT = `You are an expert technical recruiter. Read the job description below and extract a list of distinct, concrete requirements or qualifications a candidate would be scored against.

Rules:
- Each requirement should be a single, specific, scorable qualification (e.g. "5+ years of backend engineering experience", "AWS Solutions Architect certification", "experience leading a team of 3+ engineers") -- not a restatement of the whole job, and not vague filler like "team player" or "good communication skills" unless the description genuinely has nothing more specific to offer.
- Assign each a weight: 1.0 is the default/normal importance. Use roughly 1.5-2.0 for anything the description marks as required, must-have, or essential. Use roughly 0.5 for anything marked nice-to-have, preferred, a plus, or bonus.
- Extract 3-8 requirements -- enough to meaningfully cover the role, not an exhaustive restatement of every sentence.
- If the description is too short or vague to extract anything meaningful, return an empty list rather than inventing requirements that aren't actually there.

Respond with exactly one JSON object of the shape {"requirements": [...]}. No text outside the JSON object.`;

export function buildExtractionUserPrompt(jdText: string): string {
  return `Job description:\n"""\n${jdText}\n"""\n\nExtract the requirements.`;
}
