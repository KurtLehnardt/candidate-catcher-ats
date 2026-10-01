#!/usr/bin/env node
/**
 * Candidate Catcher ATS — guided cloud-key setup.
 *
 *   npm run setup            (from the scaffold/ directory)
 *   npm run setup -- --yes   (non-interactive; leaves blanks blank)
 *
 * Prompts for an Anthropic and/or OpenAI API key and merges them into
 * scaffold/.env.local (created from .env.example if it doesn't exist yet).
 * Idempotent: never overwrites a key that's already set to a non-empty
 * value, only fills in blanks. For the fully-local (no API key) path, run
 * `npm run setup:local` instead.
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mergeEnvLocal } from "./lib/env.mjs";

const SCAFFOLD = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENV = join(SCAFFOLD, ".env.local");
const EXAMPLE = join(SCAFFOLD, ".env.example");

const ARGS = process.argv.slice(2);
const YES = ARGS.includes("--yes") || ARGS.includes("-y");

const c = {
  g: (s) => `\x1b[32m${s}\x1b[0m`,
  y: (s) => `\x1b[33m${s}\x1b[0m`,
  b: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

// One shared interface for the whole process, consumed via its async
// iterator rather than rl.question()'s callback. question() only resolves
// correctly for the FIRST prompt when stdin is piped (not a TTY) and
// multiple lines arrive in one chunk — every later question() call just
// hangs, since each one registers its own one-shot listener instead of
// draining an already-buffered line. The iterator drains buffered lines
// correctly regardless, and behaves identically for a real human typing at
// a real terminal.
const rl = createInterface({ input: process.stdin, output: process.stdout });
const rlIter = rl[Symbol.asyncIterator]();

async function ask(query) {
  process.stdout.write(query);
  const { value, done } = await rlIter.next();
  return done ? "" : value.trim();
}

async function main() {
  console.log(
    c.b("\nCandidate Catcher ATS — guided cloud-key setup\n") +
      c.dim("Use a hosted LLM (Anthropic and/or OpenAI) for scoring. Prefer fully local? Run `npm run setup:local` instead.\n"),
  );

  if (!existsSync(ENV)) {
    if (existsSync(EXAMPLE)) {
      copyFileSync(EXAMPLE, ENV);
      console.log(`${c.g("✓")} Created .env.local from .env.example`);
    } else {
      writeFileSync(ENV, "");
      console.log(`${c.g("✓")} Created empty .env.local`);
    }
  }

  const before = readFileSync(ENV, "utf8");
  const updates = {};

  if (YES) {
    console.log(c.dim("Non-interactive mode: leaving any unset keys blank. Edit .env.local by hand to add them."));
  } else {
    const anthropicAnswer = await ask(
      `  ${c.b("Anthropic API key")} ${c.dim("(console.anthropic.com/settings/keys — Enter to skip)")}: `,
    );
    if (anthropicAnswer) updates.ANTHROPIC_API_KEY = anthropicAnswer;

    const openaiAnswer = await ask(
      `  ${c.b("OpenAI API key")} ${c.dim("(platform.openai.com/api-keys — Enter to skip)")}: `,
    );
    if (openaiAnswer) updates.OPENAI_API_KEY = openaiAnswer;

    if (updates.ANTHROPIC_API_KEY && !updates.LLM_PROVIDER) {
      updates.LLM_PROVIDER = "anthropic";
    } else if (updates.OPENAI_API_KEY && !updates.ANTHROPIC_API_KEY) {
      updates.LLM_PROVIDER = "openai";
    }
    if (updates.OPENAI_API_KEY) {
      updates.EMBEDDINGS_PROVIDER = "openai";
      updates.EMBEDDINGS_MODEL = "text-embedding-3-small";
    }
  }

  const { text, applied, skipped } = mergeEnvLocal(before, updates);
  writeFileSync(ENV, text);

  console.log("");
  for (const { key } of applied) console.log(`  ${c.g("✓")} set ${key}`);
  for (const { key, existing } of skipped) {
    console.log(c.y(`  • kept existing ${key}=${existing.slice(0, 4)}… ${c.dim("(edit .env.local by hand to change it)")}`));
  }
  if (applied.length === 0 && skipped.length === 0) {
    console.log(c.dim("  Nothing entered — .env.local left as-is."));
  }

  console.log(`\n${c.b("Now run:")} ${c.g("npm run dev")}   ${c.dim("→ http://localhost:3000")}`);
  rl?.close();
}

main().catch((err) => {
  console.error(`\nUnexpected error: ${err?.message || err}`);
  rl?.close();
  process.exit(1);
});
