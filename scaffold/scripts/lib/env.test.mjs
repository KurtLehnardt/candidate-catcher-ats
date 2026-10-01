import { describe, expect, it } from "vitest";
import { currentValue, mergeEnvLocal, upsert } from "./env.mjs";

describe("currentValue", () => {
  it("returns the value for a present key", () => {
    expect(currentValue("FOO=bar\nBAZ=qux", "FOO")).toBe("bar");
  });

  it("returns empty string for an absent key", () => {
    expect(currentValue("FOO=bar", "MISSING")).toBe("");
  });

  it("returns empty string for a blank value", () => {
    expect(currentValue("FOO=\nBAZ=qux", "FOO")).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(currentValue("FOO=  bar  \n", "FOO")).toBe("bar");
  });
});

describe("upsert", () => {
  it("replaces an existing key in place", () => {
    expect(upsert("FOO=old\nBAZ=qux\n", "FOO", "new")).toBe("FOO=new\nBAZ=qux\n");
  });

  it("appends a missing key", () => {
    expect(upsert("FOO=bar\n", "BAZ", "qux")).toBe("FOO=bar\nBAZ=qux\n");
  });

  it("appends to empty text", () => {
    expect(upsert("", "FOO", "bar")).toBe("\nFOO=bar\n");
  });
});

describe("mergeEnvLocal", () => {
  it("applies keys that are blank or absent", () => {
    const { text, applied, skipped } = mergeEnvLocal("FOO=\n", { FOO: "bar", BAZ: "qux" });
    expect(text).toContain("FOO=bar");
    expect(text).toContain("BAZ=qux");
    expect(applied).toEqual([
      { key: "FOO", value: "bar" },
      { key: "BAZ", value: "qux" },
    ]);
    expect(skipped).toEqual([]);
  });

  it("never clobbers a key already set to a non-empty value", () => {
    const { text, applied, skipped } = mergeEnvLocal("FOO=existing\n", { FOO: "new" });
    expect(text).toContain("FOO=existing");
    expect(text).not.toContain("FOO=new");
    expect(applied).toEqual([]);
    expect(skipped).toEqual([{ key: "FOO", existing: "existing" }]);
  });

  it("handles a mix of applied and skipped keys in one call", () => {
    const { applied, skipped } = mergeEnvLocal("A=1\nB=\n", { A: "override", B: "filled", C: "new" });
    expect(applied.map((a) => a.key)).toEqual(["B", "C"]);
    expect(skipped).toEqual([{ key: "A", existing: "1" }]);
  });
});
