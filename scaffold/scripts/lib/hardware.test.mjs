import { describe, expect, it } from "vitest";
import {
  MODEL_TIERS,
  OLLAMA_MIN_MACOS,
  bytesToGB,
  installGuidance,
  kbToGB,
  mibToGB,
  parseMacosMajor,
  parseNvidiaSmi,
  parseOllamaList,
  parseProcMeminfo,
  parseSysctlMemsize,
  parseWinBytes,
  pickAutoInstallCommand,
  recommendModel,
} from "./hardware.mjs";

describe("unit conversions", () => {
  it("bytesToGB floors and rejects bad input", () => {
    expect(bytesToGB(34359738368)).toBe(32); // 32 GiB exactly
    expect(bytesToGB("17179869184")).toBe(16);
    expect(bytesToGB(-1)).toBeNaN();
    expect(bytesToGB("")).toBeNaN();
    expect(bytesToGB(null)).toBeNaN();
  });

  it("kbToGB floors and rejects bad input", () => {
    expect(kbToGB(16 * 1024 * 1024)).toBe(16);
    expect(kbToGB(-5)).toBeNaN();
  });

  it("mibToGB floors and rejects bad input", () => {
    expect(mibToGB(8 * 1024)).toBe(8);
    expect(mibToGB(undefined)).toBeNaN();
  });
});

describe("parseMacosMajor", () => {
  it("parses a normal version string", () => {
    expect(parseMacosMajor("14.5")).toBe(14);
    expect(parseMacosMajor("12.7.6\n")).toBe(12);
  });

  it("returns null for unparseable input", () => {
    expect(parseMacosMajor("")).toBeNull();
    expect(parseMacosMajor(undefined)).toBeNull();
    expect(parseMacosMajor("not a version")).toBeNull();
  });
});

describe("parseSysctlMemsize", () => {
  it("parses a bytes figure to GB", () => {
    expect(parseSysctlMemsize("34359738368\n")).toBe(32);
  });

  it("returns NaN for garbage", () => {
    expect(parseSysctlMemsize("")).toBeNaN();
  });
});

describe("parseNvidiaSmi", () => {
  it("picks the largest GPU's VRAM in GB", () => {
    expect(parseNvidiaSmi("8192\n24576\n12288\n")).toBe(24);
  });

  it("returns NaN when there's no output", () => {
    expect(parseNvidiaSmi("")).toBeNaN();
    expect(parseNvidiaSmi(null)).toBeNaN();
  });
});

describe("parseProcMeminfo", () => {
  it("extracts MemTotal and converts kB to GB", () => {
    const text = "MemTotal:       16384000 kB\nMemFree:        1000000 kB\n";
    expect(parseProcMeminfo(text)).toBe(15); // floor(16384000/1024/1024)
  });

  it("returns NaN when MemTotal is absent", () => {
    expect(parseProcMeminfo("MemFree: 1000 kB\n")).toBeNaN();
  });
});

describe("parseWinBytes", () => {
  it("picks the largest numeric line, converted to GB", () => {
    expect(parseWinBytes("34359738368\n")).toBe(32);
  });

  it("ignores non-numeric noise lines", () => {
    expect(parseWinBytes("some header\n17179869184\ntrailing text\n")).toBe(16);
  });

  it("returns NaN for empty output", () => {
    expect(parseWinBytes("")).toBeNaN();
  });
});

describe("parseOllamaList", () => {
  it("extracts model names, skipping the header", () => {
    const stdout = "NAME            ID      SIZE\nqwen2.5:14b     abc123  9.0 GB\nllama3.2:3b     def456  2.0 GB\n";
    expect(parseOllamaList(stdout)).toEqual(["qwen2.5:14b", "llama3.2:3b"]);
  });

  it("returns an empty array for empty output", () => {
    expect(parseOllamaList("")).toEqual([]);
  });
});

describe("recommendModel", () => {
  it("picks the top tier for 32GB+", () => {
    expect(recommendModel(32).model).toBe("qwen2.5:14b");
    expect(recommendModel(64).model).toBe("qwen2.5:14b");
  });

  it("picks the right tier at each boundary", () => {
    expect(recommendModel(16).model).toBe("qwen2.5:7b");
    expect(recommendModel(31).model).toBe("qwen2.5:7b");
    expect(recommendModel(8).model).toBe("llama3.2:3b");
    expect(recommendModel(15).model).toBe("llama3.2:3b");
    expect(recommendModel(4).model).toBe("llama3.2:1b");
    expect(recommendModel(0).model).toBe("llama3.2:1b");
  });

  it("falls back to the smallest tier for invalid input", () => {
    expect(recommendModel(NaN).model).toBe("llama3.2:1b");
    expect(recommendModel(-5).model).toBe("llama3.2:1b");
  });

  it("every tier is present and ordered high to low", () => {
    expect(MODEL_TIERS.map((t) => t.minGB)).toEqual([32, 16, 8, 0]);
  });
});

describe("pickAutoInstallCommand", () => {
  it("prefers winget on Windows when present", () => {
    const cmd = pickAutoInstallCommand("win32", { hasWinget: true });
    expect(cmd.cmd).toBe("winget");
  });

  it("returns null on Windows without winget", () => {
    expect(pickAutoInstallCommand("win32", { hasWinget: false })).toBeNull();
  });

  it("uses brew on a modern macOS", () => {
    const cmd = pickAutoInstallCommand("darwin", { hasBrew: true, macosMajor: 15 });
    expect(cmd.cmd).toBe("brew");
  });

  it("refuses brew on a macOS older than the Ollama floor", () => {
    expect(pickAutoInstallCommand("darwin", { hasBrew: true, macosMajor: 12 })).toBeNull();
  });

  it("returns null on Linux (no auto-install path)", () => {
    expect(pickAutoInstallCommand("linux", {})).toBeNull();
  });
});

describe("installGuidance", () => {
  it("gives the CLI-tarball path for an old macOS", () => {
    const text = installGuidance("darwin", OLLAMA_MIN_MACOS - 1);
    expect(text).toContain("ollama-darwin.tgz");
  });

  it("gives the normal app guidance for a modern macOS", () => {
    const text = installGuidance("darwin", OLLAMA_MIN_MACOS);
    expect(text).toContain("ollama.com/download");
    expect(text).not.toContain("ollama-darwin.tgz");
  });

  it("gives Windows guidance", () => {
    expect(installGuidance("win32")).toContain("ollama.com/download");
  });

  it("gives Linux guidance as the fallback for any other platform", () => {
    expect(installGuidance("linux")).toContain("install.sh");
    expect(installGuidance("freebsd")).toContain("install.sh");
  });
});
