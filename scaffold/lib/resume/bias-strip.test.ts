import { describe, expect, it } from "vitest";
import { stripBias } from "./bias-strip";

describe("stripBias", () => {
  it("redacts the full candidate name and its individual parts", () => {
    const text = "Alex Chen\nSenior Engineer\nReferences available: contact Alex directly, or ask for Chen.";
    const out = stripBias(text, { candidateName: "Alex Chen" });
    expect(out).not.toContain("Alex Chen");
    expect(out).not.toMatch(/\bAlex\b/);
    expect(out).not.toMatch(/\bChen\b/);
    expect(out).toContain("[REDACTED]");
  });

  it("is case-insensitive for the full name phrase", () => {
    const out = stripBias("Contact: alex chen at example.com", { candidateName: "Alex Chen" });
    expect(out.toLowerCase()).not.toContain("alex chen");
  });

  it("leaves text untouched when no candidateName is given", () => {
    const text = "Experienced backend engineer.";
    expect(stripBias(text)).toBe(text);
  });

  it("redacts a graduation year while keeping the label", () => {
    const out = stripBias("Education: Class of 2015, B.S. Computer Science.");
    expect(out).not.toContain("2015");
    expect(out.toLowerCase()).toContain("class of");
    expect(out).toContain("[REDACTED]");
  });

  it("redacts a 'Graduated in <month> <year>' phrase", () => {
    const out = stripBias("Graduated in May 2018 from State University.");
    expect(out).not.toContain("2018");
  });

  it("does not touch unrelated years, like employment dates", () => {
    const out = stripBias("Senior Engineer, Acme Corp, 2019-2023.");
    expect(out).toContain("2019");
    expect(out).toContain("2023");
  });

  it("redacts markdown image embeds and short photo-caption lines", () => {
    const text = "![headshot](https://example.com/photo.jpg)\nHeadshot attached above.\nSummary: strong backend engineer.";
    const out = stripBias(text);
    expect(out).not.toContain("https://example.com/photo.jpg");
    expect(out).toContain("Summary: strong backend engineer.");
  });

  it("does not redact a long paragraph that merely mentions photography as a skill", () => {
    const text =
      "In my spare time I enjoy photography and have built a small portfolio site showcasing landscape and street photography work from trips across several countries.";
    const out = stripBias(text);
    expect(out).toBe(text);
  });
});
