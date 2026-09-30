// Strips demographic signals (candidate name, photo references, graduation year) from
// resume text before it's ever sent to an LLM for scoring. The original, unstripped text
// stays in `resumes.raw_text` for the recruiter's own UI display only — never forward
// raw_text to a provider's scoreRequirement()/embed() call, only this function's output.
//
// This is a heuristic first pass, not a guarantee: name-part matching can miss unusual
// name formats, and the photo/grad-year regexes are deliberately conservative (narrow
// patterns, short-line heuristic) to avoid false-positive redaction of unrelated resume
// content. Expected to be refined against real resume samples later.

const REDACTED = "[REDACTED]";

export interface BiasStripOptions {
  /** The candidate's full name as recorded on the applicant record, if known. */
  candidateName?: string;
}

export function stripBias(rawText: string, options: BiasStripOptions = {}): string {
  let text = rawText;
  text = stripName(text, options.candidateName);
  text = stripGraduationYear(text);
  text = stripPhotoReferences(text);
  return text;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripName(text: string, candidateName?: string): string {
  const fullName = candidateName?.trim();
  if (!fullName) return text;

  let result = text.replace(new RegExp(`\\b${escapeRegExp(fullName)}\\b`, "gi"), REDACTED);

  // Also redact individual name parts (case-sensitive, matching the capitalization given
  // in candidateName) to catch first-name-only or last-name-only mentions elsewhere in the
  // document. Case-sensitive on purpose: case-insensitive matching on short name parts like
  // "Will" or "Grace" would also strip unrelated common words.
  const parts = fullName.split(/\s+/).filter((part) => part.length > 1);
  for (const part of parts) {
    result = result.replace(new RegExp(`\\b${escapeRegExp(part)}\\b`, "g"), REDACTED);
  }
  return result;
}

function stripGraduationYear(text: string): string {
  // Matches "Class of 2021", "Graduated 2019", "Graduated in May 2018", "Graduation: 2020",
  // collapsing the whole label+year phrase down to "<label> [REDACTED]" so the year is gone
  // but the surrounding sentence still reads sensibly.
  const pattern = /\b(class of|graduat(?:ed|ion)(?:\s*date)?:?)\s*(?:in\s+)?(?:[A-Za-z]+\s+)?((?:19|20)\d{2})\b/gi;
  return text.replace(pattern, (_match, label: string) => `${label} ${REDACTED}`);
}

function stripPhotoReferences(text: string): string {
  let result = text;
  // Markdown image embeds and raw <img> tags.
  result = result.replace(/!\[[^\]]*\]\([^)]*\)/g, REDACTED);
  result = result.replace(/<img\b[^>]*>/gi, REDACTED);

  // Short standalone lines that are themselves a photo caption/label (e.g. "Headshot
  // attached", "[Photo]") — only short lines, so a long paragraph that merely mentions
  // "photography" as a skill isn't wrongly nuked.
  result = result
    .split("\n")
    .map((line) =>
      /\b(photo|headshot|profile picture|picture attached)\b/i.test(line) && line.trim().length < 80
        ? REDACTED
        : line,
    )
    .join("\n");
  return result;
}
