import { createAdminClient } from "./supabase/admin";

const RESUMES_BUCKET = "resumes";

/** Creates the `resumes` Storage bucket if it doesn't exist yet. Idempotent, safe to call per-upload. */
export async function ensureResumesBucket(): Promise<void> {
  const admin = createAdminClient();
  const { data: buckets, error: listError } = await admin.storage.listBuckets();
  if (listError) throw new Error(`ensureResumesBucket: listBuckets failed: ${listError.message}`);

  if (buckets?.some((b) => b.name === RESUMES_BUCKET)) return;

  const { error: createError } = await admin.storage.createBucket(RESUMES_BUCKET, { public: false });
  if (createError) throw new Error(`ensureResumesBucket: createBucket failed: ${createError.message}`);
}

/** Uploads a resume file and returns its storage path. */
export async function uploadResumeFile(path: string, file: File): Promise<string> {
  const admin = createAdminClient();
  const { error } = await admin.storage.from(RESUMES_BUCKET).upload(path, file, { upsert: true });
  if (error) throw new Error(`uploadResumeFile: upload failed: ${error.message}`);
  return path;
}
