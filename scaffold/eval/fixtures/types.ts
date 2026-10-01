export interface JobFixture {
  /** Stable key linking resumes.ts entries back to this job — not a DB id. */
  key: string;
  title: string;
  description: string;
  requirements: { text: string; weight: number }[];
}

export interface ResumeFixture {
  jobKey: string;
  name: string;
  rawText: string;
  /**
   * "top" = this resume MUST rank #1 for this job in every eval run.
   * "bottom" = this resume MUST rank last for this job in every eval run.
   * undefined = a plausible mid-pack filler, no hard assertion.
   */
  expected?: "top" | "bottom";
}

export interface ResumeSpec {
  name: string;
  title: string;
  years: number;
  bullets: string[];
  skills: string[];
  expected?: "top" | "bottom";
}

/** Assembles a plain-text resume from structured fields — keeps fixtures.ts legible
 * (short object literals) instead of 100 hand-formatted prose blocks. */
export function buildResume(spec: ResumeSpec): string {
  const bulletLines = spec.bullets.map((b) => `- ${b}`).join("\n");
  return `${spec.name}\n${spec.title} — ${spec.years} years of experience\n\nExperience:\n${bulletLines}\n\nSkills: ${spec.skills.join(", ")}`;
}
