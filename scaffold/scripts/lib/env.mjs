/**
 * Pure helpers for reading/writing .env.local text. No I/O here — the CLI
 * scripts (setup.mjs, setup-local.mjs) do the actual file read/write and
 * call into these. Kept separate so the merge logic is unit-testable
 * without touching the filesystem.
 */

/** Return the value already set for `key` in env text, or "" if blank/absent. */
export function currentValue(text, key) {
  const m = text.match(new RegExp(`^${key}=(.*)$`, "m"));
  return m ? m[1].trim() : "";
}

/** Replace `key=...` in place, or append it if the key isn't present. */
export function upsert(text, key, value) {
  const line = `${key}=${value}`;
  if (new RegExp(`^${key}=.*$`, "m").test(text)) {
    return text.replace(new RegExp(`^${key}=.*$`, "m"), line);
  }
  return `${text.replace(/\s*$/, "")}\n${line}\n`;
}

/**
 * Merge `updates` (a plain {KEY: value} object) into env text WITHOUT
 * clobbering any key that already holds a non-empty value. Returns the
 * merged text plus which keys were written (`applied`) and which were left
 * as-is (`skipped`, with the existing value) so the caller can report both
 * honestly.
 */
export function mergeEnvLocal(text, updates) {
  let out = text;
  const applied = [];
  const skipped = [];
  for (const [key, value] of Object.entries(updates)) {
    const existing = currentValue(out, key);
    if (existing) {
      skipped.push({ key, existing });
      continue;
    }
    out = upsert(out, key, value);
    applied.push({ key, value });
  }
  return { text: out, applied, skipped };
}
