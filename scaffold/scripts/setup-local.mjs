#!/usr/bin/env node
/**
 * Candidate Catcher ATS — guided fully-local setup (Ollama).
 *
 *   npm run setup:local            (from the scaffold/ directory)
 *   npm run setup:local -- --yes   (non-interactive; sane defaults)
 *
 * Takes a self-hoster to a fully-offline run in one command:
 *   1. Detects OS + available memory/GPU to recommend a chat model.
 *   2. Verifies Ollama is installed and its daemon is reachable, offering to
 *      install it (winget on Windows, Homebrew on macOS 14+) before falling
 *      back to printed guidance.
 *   3. Installs a NEW recommended model or lets you pick an EXISTING one.
 *   4. ALWAYS pulls the SEPARATE embeddings model (`nomic-embed-text`) — the
 *      seam people miss: LLM_PROVIDER=ollama moves only scoring, NOT the
 *      reference-hire-corpus embedding, which otherwise still calls a cloud
 *      embedder (or 401s with no key configured).
 *   5. Merges the local env into scaffold/.env.local (never clobbering a
 *      value you already set).
 *
 * Unlike a RAG tool with a large shipped corpus to re-embed, Candidate Catcher ATS's
 * reference-hire corpus starts empty and only grows as you mark candidates
 * as hires — there's nothing to re-embed here, so this script stops once
 * the embedding model is pulled and .env.local is written.
 *
 * The pure logic (memory parsing, GB conversion, model recommendation, env
 * merge) lives in scripts/lib/{hardware,env}.mjs and is unit-tested there;
 * none of those tests need a TTY or a live Ollama. This file is the thin,
 * impure CLI wrapper around them.
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { mergeEnvLocal } from "./lib/env.mjs";
import {
  DEFAULT_MODEL_WHEN_UNKNOWN,
  EMBED_MODEL,
  installGuidance,
  parseNvidiaSmi,
  parseOllamaList,
  parseProcMeminfo,
  parseSysctlMemsize,
  parseWinBytes,
  pickAutoInstallCommand,
  recommendModel,
} from "./lib/hardware.mjs";

const SCAFFOLD = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENV = join(SCAFFOLD, ".env.local");
const EXAMPLE = join(SCAFFOLD, ".env.example");
const OLLAMA_BASE_URL = "http://localhost:11434/v1";
const OLLAMA_API_TAGS = "http://localhost:11434/api/tags";

const ARGS = process.argv.slice(2);
const YES = ARGS.includes("--yes") || ARGS.includes("-y");

const c = {
  g: (s) => `\x1b[32m${s}\x1b[0m`,
  y: (s) => `\x1b[33m${s}\x1b[0m`,
  r: (s) => `\x1b[31m${s}\x1b[0m`,
  b: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};
function heading(s) {
  console.log(`\n${c.b(s)}`);
}

// One shared interface for the whole process, consumed via its async
// iterator rather than rl.question()'s callback — see the matching note in
// setup.mjs: question() only resolves correctly for the FIRST prompt when
// stdin is piped (not a TTY); every later call just hangs. The iterator
// drains buffered lines correctly regardless, and behaves identically for a
// real human typing at a real terminal.
const rl = createInterface({ input: process.stdin, output: process.stdout });
const rlIter = rl[Symbol.asyncIterator]();

async function ask(query) {
  process.stdout.write(query);
  const { value, done } = await rlIter.next();
  return done ? "" : value.trim();
}

async function confirm(query, dflt = true) {
  if (YES) return dflt;
  const hint = dflt ? c.dim("[Y/n]") : c.dim("[y/N]");
  const a = (await ask(`  ${query} ${hint} `)).toLowerCase();
  if (a === "") return dflt;
  return a === "y" || a === "yes";
}

function run(cmd, args) {
  try {
    const r = spawnSync(cmd, args, { encoding: "utf8", timeout: 8000 });
    if (r.status === 0 && typeof r.stdout === "string") return r.stdout;
    return null;
  } catch {
    return null;
  }
}

function runInherit(cmd, args) {
  try {
    const r = spawnSync(cmd, args, { stdio: "inherit" });
    return r.status === 0;
  } catch {
    return false;
  }
}

async function ollamaDaemonModels() {
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 1500);
    const res = await fetch(OLLAMA_API_TAGS, { signal: ac.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const json = await res.json();
    return Array.isArray(json?.models) ? json.models : [];
  } catch {
    return null;
  }
}

function launchOllamaDaemon(platform) {
  try {
    if (platform === "win32") {
      const localAppData = process.env.LOCALAPPDATA || "";
      const exe = join(localAppData, "Programs", "Ollama", "ollama app.exe");
      const child = spawnSync("cmd", ["/c", "start", "", exe], { stdio: "ignore", detached: true, windowsHide: true });
      return child;
    }
    const child = spawn("ollama", ["serve"], { detached: true, stdio: "ignore" });
    child.on("error", () => {});
    child.unref();
    return child;
  } catch {
    return null;
  }
}

async function waitForDaemon(timeoutMs = 120000, intervalMs = 2000) {
  const start = Date.now();
  for (;;) {
    if ((await ollamaDaemonModels()) !== null) return true;
    if (Date.now() - start >= timeoutMs) return false;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

async function tryAutoInstall(platform, macosMajor) {
  const hasWinget = platform === "win32" && Boolean(run("winget", ["--version"]));
  const hasBrew = platform === "darwin" && Boolean(run("brew", ["--version"]));
  const choice = pickAutoInstallCommand(platform, { hasWinget, hasBrew, macosMajor });
  if (!choice) return false;

  const proceed = await confirm(`Install Ollama automatically now (${choice.label})?`, true);
  if (!proceed) return false;

  console.log(c.dim(`\n  Running: ${choice.cmd} ${choice.args.join(" ")}`));
  const ok = runInherit(choice.cmd, choice.args);
  if (!ok) {
    console.log(c.y("\n  Automatic install failed. Falling back to manual guidance."));
    return false;
  }
  console.log(`  ${c.g("✓")} Ollama installed`);

  const alreadyUp = (await ollamaDaemonModels()) !== null;
  if (!alreadyUp) {
    launchOllamaDaemon(platform);
  }

  console.log(c.dim("  Waiting for the Ollama daemon to come up (can take over a minute on first start)…"));
  const up = await waitForDaemon();
  if (up) {
    console.log(`  ${c.g("✓")} daemon reachable at ${c.dim("localhost:11434")}`);
  } else {
    console.log(c.y("\n  Daemon still not reachable after waiting. Falling back to manual guidance."));
  }
  return up;
}

/** Detect usable memory/VRAM for a model recommendation. */
function detectMemory() {
  const platform = process.platform;

  if (platform === "darwin") {
    const out = run("sysctl", ["-n", "hw.memsize"]);
    const gb = parseSysctlMemsize(out);
    if (Number.isFinite(gb) && gb > 0) {
      return { gb, source: "unified/system memory (sysctl hw.memsize)", reliable: true };
    }
    return { gb: null, source: "sysctl unavailable", reliable: false };
  }

  if (platform === "linux") {
    const smi = run("nvidia-smi", ["--query-gpu=memory.total", "--format=csv,noheader,nounits"]);
    const vram = parseNvidiaSmi(smi);
    if (Number.isFinite(vram) && vram > 0) {
      return { gb: vram, source: "NVIDIA GPU VRAM (nvidia-smi)", reliable: true };
    }
    try {
      const meminfo = readFileSync("/proc/meminfo", "utf8");
      const ram = parseProcMeminfo(meminfo);
      if (Number.isFinite(ram) && ram > 0) {
        return { gb: ram, source: "system RAM (/proc/meminfo)", reliable: true };
      }
    } catch {
      /* fall through */
    }
    return { gb: null, source: "no nvidia-smi and /proc/meminfo unreadable", reliable: false };
  }

  if (platform === "win32") {
    const smi = run("nvidia-smi", ["--query-gpu=memory.total", "--format=csv,noheader,nounits"]);
    const vram = parseNvidiaSmi(smi);
    if (Number.isFinite(vram) && vram > 0) {
      return { gb: vram, source: "NVIDIA GPU VRAM (nvidia-smi)", reliable: true };
    }
    const totalOut = run("powershell", [
      "-NoProfile",
      "-Command",
      "(Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory",
    ]);
    const totalRam = parseWinBytes(totalOut);
    if (Number.isFinite(totalRam) && totalRam > 0) {
      return { gb: totalRam, source: "total system RAM (Win32_ComputerSystem) — GPU VRAM unknown", reliable: true };
    }
    const adapterOut = run("powershell", [
      "-NoProfile",
      "-Command",
      "(Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty AdapterRAM)",
    ]);
    const adapter = parseWinBytes(adapterOut);
    if (Number.isFinite(adapter) && adapter > 0) {
      return {
        gb: adapter,
        source: "GPU AdapterRAM (Win32_VideoController) — CAPS AT ~4GB, unreliable",
        reliable: false,
      };
    }
    return { gb: null, source: "PowerShell CIM queries unavailable", reliable: false };
  }

  return { gb: null, source: `unsupported platform ${platform}`, reliable: false };
}

async function askMemoryGB() {
  if (YES) return null;
  const a = await ask(
    `  ${c.b("How much GPU VRAM / unified memory do you have, in GB?")} ${c.dim("(e.g. 8, 16, 32 — Enter to skip)")} `,
  );
  const n = Number(a.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseMacosMajorFromSwVers() {
  const out = run("sw_vers", ["-productVersion"]);
  const m = String(out ?? "").trim().match(/^(\d+)/);
  return m ? Number(m[1]) : null;
}

async function main() {
  console.log(
    c.b("\nCandidate Catcher ATS — guided local-model setup\n") +
      c.dim("Go fully local (Ollama): scoring AND the reference-hire embeddings on your machine, no API keys.\n"),
  );

  const platform = process.platform;
  const osName =
    platform === "darwin" ? "macOS" : platform === "win32" ? "Windows" : platform === "linux" ? "Linux" : platform;
  const macosMajor = platform === "darwin" ? parseMacosMajorFromSwVers() : null;
  console.log(`${c.g("✓")} Detected OS: ${c.b(osName)} ${c.dim(`(${platform})`)}`);

  heading("Ollama");
  let version = run("ollama", ["--version"]);
  let daemonUp = false;
  if (!version) {
    console.log(c.y("  Ollama isn't installed (or not on your PATH).\n"));
    const installed = await tryAutoInstall(platform, macosMajor);
    version = run("ollama", ["--version"]);
    daemonUp = installed && Boolean(version);
    if (!version) {
      console.log(installGuidance(platform, macosMajor));
      console.log(c.dim("\n  Install + start Ollama, then re-run: ") + c.g("npm run setup:local"));
      process.exit(1);
    }
  }
  console.log(`  ${c.g("✓")} ollama installed ${c.dim(version.trim().split(/\r?\n/)[0] || "")}`);

  if (!daemonUp) {
    daemonUp = (await ollamaDaemonModels()) !== null;
  }
  if (!daemonUp) {
    console.log(c.y("\n  Ollama is installed but its daemon isn't reachable at localhost:11434.\n"));
    console.log(installGuidance(platform, macosMajor));
    console.log(c.dim("\n  Start the daemon, then re-run: ") + c.g("npm run setup:local"));
    process.exit(1);
  }
  console.log(`  ${c.g("✓")} daemon reachable at ${c.dim("localhost:11434")}`);

  heading("Choose a chat model");
  const installed = parseOllamaList(run("ollama", ["list"]) ?? "");
  const chatInstalled = installed.filter((m) => !m.toLowerCase().includes("embed"));

  let chosenModel = null;
  let useExisting = false;
  if (chatInstalled.length > 0) {
    console.log(c.dim(`  You already have: ${chatInstalled.join(", ")}`));
    useExisting = await confirm("Use one of your EXISTING models (instead of installing a new one)?", false);
  }

  if (useExisting) {
    if (YES) {
      chosenModel = chatInstalled[0];
    } else {
      chatInstalled.forEach((m, i) => console.log(`    ${c.b(String(i + 1))}. ${m}`));
      const pick = await ask(`  Which one? ${c.dim(`[1-${chatInstalled.length}, default 1]`)} `);
      const idx = Number(pick) - 1;
      chosenModel = chatInstalled[Number.isInteger(idx) && idx >= 0 && idx < chatInstalled.length ? idx : 0];
    }
    console.log(`  ${c.g("✓")} Using existing model: ${c.b(chosenModel)}`);
  } else {
    let { gb, source, reliable } = detectMemory();
    if (gb != null) {
      console.log(`  ${c.dim("Detected memory:")} ${c.b(`${gb} GB`)} ${c.dim(`— ${source}`)}`);
    }
    if (!reliable || gb == null) {
      if (gb != null) console.log(c.y(`  Memory detection may be unreliable (${source}).`));
      const asked = await askMemoryGB();
      if (asked != null) gb = asked;
    }

    const tier = recommendModel(Number.isFinite(gb) ? gb : NaN);
    const recommended = gb == null && YES ? DEFAULT_MODEL_WHEN_UNKNOWN : tier.model;
    console.log(`\n  ${c.b("Recommended:")} ${c.g(recommended)} ${c.dim(`— ${tier.note}`)}`);
    console.log(c.dim(`  (alternative: ${tier.alt}; or type any Ollama tag, e.g. qwen2.5:7b)`));

    if (YES) {
      chosenModel = recommended;
    } else {
      const typed = await ask(`  Model tag to install ${c.dim(`[Enter for ${recommended}]`)}: `);
      chosenModel = typed || recommended;
    }

    console.log(c.dim(`\n  Pulling ${chosenModel} … (first pull can take a while)`));
    if (!runInherit("ollama", ["pull", chosenModel])) {
      console.log(
        c.r(`\n  Failed to pull "${chosenModel}".`) +
          c.dim(
            "\n  Check the tag exists (https://ollama.com/library) and the daemon is running, then re-run.\n" +
              "  Nothing was written to .env.local.",
          ),
      );
      process.exit(1);
    }
    console.log(`  ${c.g("✓")} Pulled ${c.b(chosenModel)}`);
  }

  heading("Embeddings model (for the reference-hire corpus)");
  console.log(
    c.dim(
      "  Embeddings are a SEPARATE model from the chat LLM. Candidate Catcher ATS's reference-hire\n" +
        `  corpus needs ${EMBED_MODEL} to run fully local — without it, embedding calls still\n` +
        "  need a cloud provider even with LLM_PROVIDER=ollama.",
    ),
  );
  const haveEmbed = parseOllamaList(run("ollama", ["list"]) ?? "").some((m) => m.startsWith(EMBED_MODEL));
  if (haveEmbed) {
    console.log(`  ${c.g("✓")} ${EMBED_MODEL} already installed`);
  } else {
    console.log(c.dim(`  Pulling ${EMBED_MODEL} …`));
    if (!runInherit("ollama", ["pull", EMBED_MODEL])) {
      console.log(
        c.r(`\n  Failed to pull "${EMBED_MODEL}".`) +
          c.dim("\n  The reference-hire corpus can't go local without it. Fix the daemon and re-run. Nothing was written to .env.local."),
      );
      process.exit(1);
    }
    console.log(`  ${c.g("✓")} Pulled ${c.b(EMBED_MODEL)}`);
  }

  heading("Write scaffold/.env.local");
  if (!existsSync(ENV)) {
    if (existsSync(EXAMPLE)) {
      copyFileSync(EXAMPLE, ENV);
      console.log(`  ${c.g("✓")} Created .env.local from .env.example`);
    } else {
      writeFileSync(ENV, "");
      console.log(`  ${c.g("✓")} Created empty .env.local`);
    }
  }
  const before = readFileSync(ENV, "utf8");
  const updates = {
    LLM_PROVIDER: "ollama",
    LOCAL_LLM_MODEL: chosenModel,
    LLM_BASE_URL: OLLAMA_BASE_URL,
    EMBEDDINGS_PROVIDER: "ollama",
    EMBEDDINGS_MODEL: EMBED_MODEL,
    EMBEDDINGS_BASE_URL: OLLAMA_BASE_URL,
  };
  const { text, applied, skipped } = mergeEnvLocal(before, updates);
  writeFileSync(ENV, text);
  for (const { key, value } of applied) console.log(`  ${c.g("✓")} set ${key}=${value}`);
  for (const { key, existing } of skipped) {
    console.log(c.y(`  • kept existing ${key}=${existing} ${c.dim("(edit .env.local by hand to change it)")}`));
  }
  if (skipped.some((s) => s.key === "LOCAL_LLM_MODEL" && s.existing !== chosenModel)) {
    console.log(
      c.y(`  ! LOCAL_LLM_MODEL is already ${existing(text, "LOCAL_LLM_MODEL")}, not ${chosenModel} — `) +
        c.dim("edit .env.local if you meant to switch."),
    );
  }

  heading("You're fully local — next steps");
  console.log(`  ${c.dim("Chat model:")}      ${c.b(chosenModel)}`);
  console.log(`  ${c.dim("Embeddings:")}      ${c.b(EMBED_MODEL)} ${c.dim(`@ ${OLLAMA_BASE_URL}`)}`);
  console.log(`  ${c.dim("Config written:")}  scaffold/.env.local`);
  console.log(`\n  ${c.b("Now run:")} ${c.g("npm run dev")}   ${c.dim("→ http://localhost:3000")}`);
  console.log(
    c.dim(
      "  Local scoring is slower than a hosted cloud model (a single GPU serves requests\n" +
        "  serially) — expect noticeably longer waits on a large applicant batch.\n",
    ),
  );
  rl?.close();
  process.exit(0);
}

function existing(text, key) {
  const m = text.match(new RegExp(`^${key}=(.*)$`, "m"));
  return m ? m[1].trim() : "";
}

main().catch((err) => {
  console.error(c.r(`\nUnexpected error: ${err?.message || err}`));
  console.error(c.dim("Nothing partial was written to .env.local unless a '✓ set' line printed above."));
  process.exit(1);
});
