-- Resolve the reference_hires embedding dimension mismatch flagged in 0001_init.sql.
--
-- A single `embedding vector(1536)` column can't hold both a hosted org's OpenAI
-- text-embedding-3-small vectors (1536-dim) and a self-hosted org's Ollama
-- nomic-embed-text vectors (768-dim). Split into two nullable, provider-specific
-- columns instead. A given row only ever populates ONE of them, matching whichever
-- EMBEDDINGS_PROVIDER wrote it — application code must never compare across the two.

alter table reference_hires
  rename column embedding to embedding_openai;

alter table reference_hires
  add column embedding_ollama vector(768);

create index on reference_hires using ivfflat (embedding_openai vector_cosine_ops)
  where embedding_openai is not null;

create index on reference_hires using ivfflat (embedding_ollama vector_cosine_ops)
  where embedding_ollama is not null;

-- RPC functions for nearest-reference-hire lookup, one per embedding provider since
-- pgvector requires a fixed dimension per function signature. Both scope to org_id +
-- job_family and return cosine similarity (1 - cosine distance) so callers get a
-- 0..1 "higher is closer" score instead of a raw distance.

create or replace function match_reference_hires_openai(
  query_embedding vector(1536),
  match_org_id uuid,
  match_job_family text,
  match_count int default 3
)
returns table (id uuid, resume_text text, similarity float)
language sql stable
as $$
  select
    reference_hires.id,
    reference_hires.resume_text,
    1 - (reference_hires.embedding_openai <=> query_embedding) as similarity
  from reference_hires
  where reference_hires.org_id = match_org_id
    and reference_hires.job_family = match_job_family
    and reference_hires.embedding_openai is not null
  order by reference_hires.embedding_openai <=> query_embedding
  limit match_count;
$$;

create or replace function match_reference_hires_ollama(
  query_embedding vector(768),
  match_org_id uuid,
  match_job_family text,
  match_count int default 3
)
returns table (id uuid, resume_text text, similarity float)
language sql stable
as $$
  select
    reference_hires.id,
    reference_hires.resume_text,
    1 - (reference_hires.embedding_ollama <=> query_embedding) as similarity
  from reference_hires
  where reference_hires.org_id = match_org_id
    and reference_hires.job_family = match_job_family
    and reference_hires.embedding_ollama is not null
  order by reference_hires.embedding_ollama <=> query_embedding
  limit match_count;
$$;
