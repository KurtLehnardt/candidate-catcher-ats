import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export type ResumeFileType = "pdf" | "docx";

export function detectFileType(filename: string): ResumeFileType {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".docx")) return "docx";
  throw new Error(`Unsupported resume file type: ${filename} (only .pdf and .docx are supported)`);
}

async function parsePdf(data: Uint8Array): Promise<string> {
  const parser = new PDFParse({ data });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

async function parseDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

/** Extract raw text from a resume file. `filename` is only used to pick a parser by extension. */
export async function parseResume(fileBuffer: Buffer, filename: string): Promise<string> {
  const type = detectFileType(filename);
  if (type === "pdf") return parsePdf(new Uint8Array(fileBuffer));
  return parseDocx(fileBuffer);
}
