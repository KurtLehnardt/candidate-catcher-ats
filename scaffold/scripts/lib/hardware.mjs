/**
 * Pure logic for hardware-sized Ollama model recommendation and the various
 * command-output parsers that feed it. No I/O, no child_process — the caller
 * (setup-local.mjs) runs the actual commands and passes stdout in here. This
 * split is what lets all of it be unit-tested without a live Ollama daemon,
 * a GPU, or a TTY.
 */

/**
 * Lowest macOS major version Ollama's .app/.dmg (and the Homebrew cask)
 * support. Below this the app won't launch and Homebrew has no bottle —
 * only the release's CLI tarball runs there.
 */
export const OLLAMA_MIN_MACOS = 14;

/** Non-interactive fallback when memory detection is unreliable and we can't ask. */
export const DEFAULT_MODEL_WHEN_UNKNOWN = "llama3.2:3b";

/** Embeddings model Candidate Catcher ATS's reference-hire corpus always needs locally. */
export const EMBED_MODEL = "nomic-embed-text";

/**
 * Memory (GB) -> recommended Ollama chat model. Ordered high->low;
 * `recommendModel` picks the first tier the machine clears.
 */
export const MODEL_TIERS = [
  {
    minGB: 32,
    model: "qwen2.5:14b",
    alt: "llama3.1:8b",
    note: "Best local quality; needs ~32GB+ of memory/VRAM.",
  },
  {
    minGB: 16,
    model: "qwen2.5:7b",
    alt: "llama3.1:8b",
    note: "Strong, well-calibrated local default for 16-32GB.",
  },
  {
    minGB: 8,
    model: "llama3.2:3b",
    alt: "qwen2.5:3b",
    note: "Good balance for 8-16GB machines.",
  },
  {
    minGB: 0,
    model: "llama3.2:1b",
    alt: "qwen2.5:1.5b",
    note: "Fits small/4GB GPUs, but quality is rougher and scoring is slow.",
  },
];

/**
 * Pick a recommended model for `memGB` gigabytes of usable memory/VRAM.
 * Non-finite/non-positive input is treated conservatively (smallest tier).
 */
export function recommendModel(memGB) {
  if (!Number.isFinite(memGB) || memGB <= 0) {
    return MODEL_TIERS[MODEL_TIERS.length - 1];
  }
  for (const tier of MODEL_TIERS) {
    if (memGB >= tier.minGB) return tier;
  }
  return MODEL_TIERS[MODEL_TIERS.length - 1];
}

function toNum(v) {
  if (v == null) return NaN;
  if (typeof v === "string" && v.trim() === "") return NaN;
  return Number(v);
}

/** Bytes -> whole GB (floored). Non-finite/negative/blank -> NaN. */
export function bytesToGB(bytes) {
  const n = toNum(bytes);
  if (!Number.isFinite(n) || n < 0) return NaN;
  return Math.floor(n / 1024 ** 3);
}

/** Kilobytes -> whole GB (floored). `/proc/meminfo` reports kB. */
export function kbToGB(kb) {
  const n = toNum(kb);
  if (!Number.isFinite(n) || n < 0) return NaN;
  return Math.floor(n / (1024 * 1024));
}

/** Mebibytes -> whole GB (floored). `nvidia-smi` reports MiB. */
export function mibToGB(mib) {
  const n = toNum(mib);
  if (!Number.isFinite(n) || n < 0) return NaN;
  return Math.floor(n / 1024);
}

/** Parse `sw_vers -productVersion` ("12.7.6", "26.4") -> major version number. */
export function parseMacosMajor(text) {
  const m = String(text ?? "").trim().match(/^(\d+)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Parse `sysctl -n hw.memsize` (bytes on one line) -> GB. */
export function parseSysctlMemsize(stdout) {
  return bytesToGB(String(stdout ?? "").trim());
}

/**
 * Parse `nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits`
 * (one MiB integer per GPU) -> the LARGEST GPU's VRAM in GB, or NaN if none.
 */
export function parseNvidiaSmi(stdout) {
  const gbs = String(stdout ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => mibToGB(l))
    .filter((n) => Number.isFinite(n));
  return gbs.length ? Math.max(...gbs) : NaN;
}

/** Parse `/proc/meminfo` text -> total RAM in GB (from the `MemTotal:` line). */
export function parseProcMeminfo(text) {
  const m = String(text ?? "").match(/^MemTotal:\s+(\d+)\s*kB/im);
  return m ? kbToGB(m[1]) : NaN;
}

/**
 * Parse a Windows PowerShell numeric dump (TotalPhysicalMemory or AdapterRAM,
 * both in bytes) -> the LARGEST value in GB. Caller flags AdapterRAM
 * separately as unreliable (uint32, capped at ~4GB) — this just extracts
 * numbers robustly from noisy output.
 */
export function parseWinBytes(stdout) {
  const nums = String(stdout ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^\d+$/.test(l))
    .map((l) => bytesToGB(l))
    .filter((n) => Number.isFinite(n));
  return nums.length ? Math.max(...nums) : NaN;
}

/**
 * Parse `ollama list` stdout -> array of model names (first column). Skips
 * the header row and blank lines.
 */
export function parseOllamaList(stdout) {
  return String(stdout ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^NAME\b/i.test(l))
    .map((l) => l.split(/\s+/)[0])
    .filter(Boolean);
}

/**
 * Automatic Ollama install command for this platform, or null -> manual
 * guidance.
 * @param {string} platform
 * @param {{ hasWinget?: boolean, hasBrew?: boolean, macosMajor?: number | null }} [opts]
 */
export function pickAutoInstallCommand(platform, { hasWinget = false, hasBrew = false, macosMajor = null } = {}) {
  if (platform === "win32" && hasWinget) {
    return {
      cmd: "winget",
      args: [
        "install",
        "-e",
        "--id",
        "Ollama.Ollama",
        "--silent",
        "--accept-package-agreements",
        "--accept-source-agreements",
      ],
      label: "winget install -e --id Ollama.Ollama",
    };
  }
  const macTooOld = macosMajor !== null && macosMajor < OLLAMA_MIN_MACOS;
  if (platform === "darwin" && hasBrew && !macTooOld) {
    return { cmd: "brew", args: ["install", "ollama"], label: "brew install ollama" };
  }
  return null;
}

/** Platform (+ macOS major, when known) -> human install guidance text. */
export function installGuidance(platform, macosMajor = null) {
  if (platform === "darwin") {
    if (macosMajor !== null && macosMajor < OLLAMA_MIN_MACOS) {
      return [
        `  Your macOS (${macosMajor}) is older than Ollama's app requires (${OLLAMA_MIN_MACOS}+),`,
        "  so the download page and `brew install ollama` will NOT work. Use the CLI build:",
        "",
        "    curl -fsSL -o ollama-darwin.tgz \\",
        "      https://github.com/ollama/ollama/releases/latest/download/ollama-darwin.tgz",
        "    mkdir -p ~/.local/ollama && tar xzf ollama-darwin.tgz -C ~/.local/ollama",
        "    ln -sf ~/.local/ollama/ollama /usr/local/bin/ollama",
        "",
        "  Then start it:   `ollama serve` in another terminal (re-run after each reboot).",
      ].join("\n");
    }
    return [
      "  Install Ollama:  https://ollama.com/download   (or: brew install ollama)",
      "  Then start it:   open the Ollama app, or run `ollama serve` in another terminal.",
    ].join("\n");
  }
  if (platform === "win32") {
    return [
      "  Install Ollama:  https://ollama.com/download",
      "  Then start it:   launch the Ollama app (it runs a background daemon).",
    ].join("\n");
  }
  return [
    "  Install Ollama:  curl -fsSL https://ollama.com/install.sh | sh",
    "  Then start it:   `ollama serve` (or the systemd service: `systemctl start ollama`).",
  ].join("\n");
}
