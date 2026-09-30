-- ClearMatch initial schema.
-- Shared by both deployment editions (hosted multi-tenant, self-hosted single-user);
-- `jobs.deployment_mode` records which edition created a given job for audit purposes,
-- auth/billing enforcement itself lives in application code, not RLS in this first pass.

create extension if not exists pgcrypto;
create extension if not exists vector;

create table orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table org_members (
  org_id uuid not null references orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  title text not null,
  description text not null default '',
  deployment_mode text not null default 'hosted' check (deployment_mode in ('hosted', 'self-hosted')),
  status text not null default 'draft' check (status in ('draft', 'ranking', 'ranked', 'archived')),
  created_at timestamptz not null default now()
);

create table requirements (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  text text not null,
  -- User-adjustable importance weight, used in the weighted aggregate score.
  weight numeric not null default 1.0 check (weight >= 0),
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table applicants (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  name text not null,
  email text,
  created_at timestamptz not null default now()
);

create table resumes (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references applicants(id) on delete cascade,
  raw_text text not null default '',
  file_path text,
  parsed_json jsonb,
  -- True once demographic signals (name, photo, grad year, etc.) are stripped
  -- from the text sent to the LLM for scoring.
  bias_stripped boolean not null default false,
  created_at timestamptz not null default now()
);

alter table applicants
  add column resume_id uuid references resumes(id) on delete set null;

create table requirement_scores (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references applicants(id) on delete cascade,
  requirement_id uuid not null references requirements(id) on delete cascade,
  ai_score numeric not null check (ai_score >= 0 and ai_score <= 100),
  evidence_snippet text,
  -- Commentary distinguishing a quantified, specific claim from generic
  -- keyword-stuffing/buzzwords — ClearMatch's "substance vs. buzzword" signal.
  substance_note text,
  created_at timestamptz not null default now(),
  unique (applicant_id, requirement_id)
);

create table manual_scores (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references applicants(id) on delete cascade,
  job_id uuid not null references jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score numeric not null check (score >= 0 and score <= 100),
  note text,
  created_at timestamptz not null default now()
);

-- Embedding dimension is pinned to 1536 (OpenAI text-embedding-3-small) for the
-- hosted edition. The self-hosted edition's local embedder (Ollama
-- nomic-embed-text) is 768-dim — a dimension mismatch that this table does not
-- yet resolve. Self-hosted deployments will need either a second
-- reference_hires_local table with vector(768), or a dimension-agnostic
-- storage format (e.g. store raw float arrays in jsonb and cast per-provider
-- at query time instead of a pgvector column). Deferred to the embedding
-- pipeline phase — flagging here so it isn't a surprise later.
create table reference_hires (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  job_family text not null,
  resume_text text not null,
  embedding vector(1536),
  promoted_from_applicant_id uuid references applicants(id) on delete set null,
  created_at timestamptz not null default now()
);

create table credit_packs (
  id uuid primary key default gen_random_uuid(),
  tier text not null unique,
  price_cents int not null check (price_cents >= 0),
  applicant_cap int not null check (applicant_cap > 0)
);

insert into credit_packs (tier, price_cents, applicant_cap) values
  ('Starter', 4900, 250),
  ('Essential', 9900, 1000),
  ('Pro', 19900, 3000);

create table credits (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  credit_pack_id uuid not null references credit_packs(id),
  purchased_at timestamptz not null default now(),
  consumed_at timestamptz,
  job_id uuid references jobs(id) on delete set null
);

create index on org_members (user_id);
create index on jobs (org_id);
create index on requirements (job_id);
create index on applicants (job_id);
create index on resumes (applicant_id);
create index on requirement_scores (applicant_id);
create index on manual_scores (applicant_id);
create index on reference_hires (org_id, job_family);
create index on credits (org_id);
