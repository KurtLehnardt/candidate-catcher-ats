import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

/** Ensures the local resumes directory exists. Idempotent, safe to call per-upload. */
export async function ensureResumesDir(): Promise<void> {
  await mkdir(join(process.cwd(), "data", "resumes"), { recursive: true });
}

/** Writes a resume file to local disk and returns its path, relative to the resumes dir. */
export async function uploadResumeFile(path: string, file: File): Promise<string> {
  const fullPath = join(process.cwd(), "data", "resumes", path);
  await mkdir(dirname(fullPath), { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(fullPath, buffer);
  return path;
}
