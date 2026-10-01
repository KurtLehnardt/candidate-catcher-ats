import { randomUUID } from "node:crypto";
import { relations } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// Single-user, self-hosted schema — no orgs/multi-tenancy, no billing, no auth.
// IDs are app-generated UUIDs (text) rather than a Postgres-only uuid type; timestamps
// are stored as SQLite integers (unix ms) via drizzle's `timestamp` mode.

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID());

const createdAt = () =>
  integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date());

export const jobs = sqliteTable("jobs", {
  id: id(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("draft"), // draft | ranking | ranked | archived
  createdAt: createdAt(),
});

export const requirements = sqliteTable(
  "requirements",
  {
    id: id(),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    // User-adjustable importance weight, used in the weighted aggregate score.
    weight: real("weight").notNull().default(1.0),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("requirements_job_idx").on(t.jobId)],
);

// Declared before `applicants` but references it via a closure — both are fully
// initialized module consts by the time drizzle-kit actually calls the closure, so this
// resolves the resumes<->applicants circular FK the same way the old Postgres migration
// did with a post-hoc `alter table`.
export const resumes = sqliteTable(
  "resumes",
  {
    id: id(),
    applicantId: text("applicant_id")
      .notNull()
      .references((): import("drizzle-orm/sqlite-core").AnySQLiteColumn => applicants.id, { onDelete: "cascade" }),
    rawText: text("raw_text").notNull().default(""),
    filePath: text("file_path"),
    parsedJson: text("parsed_json"),
    // True once demographic signals (name, photo, grad year, etc.) are stripped from the
    // text sent to the LLM for scoring.
    biasStripped: integer("bias_stripped", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("resumes_applicant_idx").on(t.applicantId)],
);

export const applicants = sqliteTable(
  "applicants",
  {
    id: id(),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    resumeId: text("resume_id").references((): import("drizzle-orm/sqlite-core").AnySQLiteColumn => resumes.id, {
      onDelete: "set null",
    }),
    stage: text("stage").notNull().default("New"), // New | Shortlisted | Rejected
    // Cached weighted-aggregate score (lib/scoring/aggregate.ts), recomputed whenever a
    // requirement's weight changes or scoring re-runs.
    overallScore: real("overall_score"),
    createdAt: createdAt(),
  },
  (t) => [index("applicants_job_idx").on(t.jobId)],
);

export const requirementScores = sqliteTable(
  "requirement_scores",
  {
    id: id(),
    applicantId: text("applicant_id")
      .notNull()
      .references(() => applicants.id, { onDelete: "cascade" }),
    requirementId: text("requirement_id")
      .notNull()
      .references(() => requirements.id, { onDelete: "cascade" }),
    // Nullable: a score that failed after retry (see lib/scoring/score-resume-with-retry.ts)
    // is persisted as a row with aiScore=null, failed=true -- a visible, distinct state
    // from "scored 0" -- rather than throwing away the whole run's other results.
    aiScore: real("ai_score"),
    failed: integer("failed", { mode: "boolean" }).notNull().default(false),
    evidenceSnippet: text("evidence_snippet"),
    // Commentary distinguishing a quantified, specific claim from generic
    // keyword-stuffing/buzzwords — Candidate Catcher ATS's "substance vs. buzzword" signal.
    substanceNote: text("substance_note"),
    createdAt: createdAt(),
  },
  (t) => [
    index("requirement_scores_applicant_idx").on(t.applicantId),
    uniqueIndex("requirement_scores_applicant_requirement_unique").on(t.applicantId, t.requirementId),
  ],
);

export const manualScores = sqliteTable(
  "manual_scores",
  {
    id: id(),
    applicantId: text("applicant_id")
      .notNull()
      .references(() => applicants.id, { onDelete: "cascade" }),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    score: real("score").notNull(),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("manual_scores_applicant_idx").on(t.applicantId)],
);

// Embedding stored as a JSON-serialized float array rather than a fixed-dimension vector
// type — SQLite has none, which conveniently sidesteps the OpenAI-1536-dim vs.
// Ollama-768-dim mismatch the old Postgres schema needed two separate columns for. Each
// row is tagged with the provider/model that produced it; lookups filter to a matching
// `embeddingProvider` before computing cosine similarity in application code (see
// lib/embeddings/reference-lookup.ts) — never compare across providers.
export const referenceHires = sqliteTable(
  "reference_hires",
  {
    id: id(),
    jobFamily: text("job_family").notNull(),
    resumeText: text("resume_text").notNull(),
    embedding: text("embedding"), // JSON.stringify(number[])
    embeddingProvider: text("embedding_provider"), // "openai" | "ollama"
    embeddingModel: text("embedding_model"),
    promotedFromApplicantId: text("promoted_from_applicant_id").references(() => applicants.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
  },
  (t) => [index("reference_hires_job_family_idx").on(t.jobFamily)],
);

// Singleton row (fixed id) holding the user's in-app LLM provider/model choice. Null
// columns mean "fall back to the .env.local-derived environment value" — this is what
// lets an existing install keep working unchanged until the user actively picks
// something in /settings. API keys are never stored here, env-only — this table only
// ever decides WHICH provider/model is active, never credentials.
export const settings = sqliteTable("settings", {
  id: text("id").primaryKey().default("singleton"),
  llmProvider: text("llm_provider"), // 'anthropic' | 'openai' | 'ollama' | null
  llmModel: text("llm_model"),
  embeddingsProvider: text("embeddings_provider"), // 'openai' | 'ollama' | null
  embeddingsModel: text("embeddings_model"),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Relations — needed for the `db.query.X.findMany({ with: {...} })` relational API used
// by a few read paths (e.g. loading an applicant together with their resume in one go).

export const jobsRelations = relations(jobs, ({ many }) => ({
  requirements: many(requirements),
  applicants: many(applicants),
}));

export const requirementsRelations = relations(requirements, ({ one, many }) => ({
  job: one(jobs, { fields: [requirements.jobId], references: [jobs.id] }),
  scores: many(requirementScores),
}));

export const applicantsRelations = relations(applicants, ({ one, many }) => ({
  job: one(jobs, { fields: [applicants.jobId], references: [jobs.id] }),
  resume: one(resumes, { fields: [applicants.resumeId], references: [resumes.id] }),
  scores: many(requirementScores),
  manualScores: many(manualScores),
}));

export const resumesRelations = relations(resumes, ({ one }) => ({
  applicant: one(applicants, { fields: [resumes.applicantId], references: [applicants.id] }),
}));

export const requirementScoresRelations = relations(requirementScores, ({ one }) => ({
  applicant: one(applicants, { fields: [requirementScores.applicantId], references: [applicants.id] }),
  requirement: one(requirements, { fields: [requirementScores.requirementId], references: [requirements.id] }),
}));

export const manualScoresRelations = relations(manualScores, ({ one }) => ({
  applicant: one(applicants, { fields: [manualScores.applicantId], references: [applicants.id] }),
  job: one(jobs, { fields: [manualScores.jobId], references: [jobs.id] }),
}));
