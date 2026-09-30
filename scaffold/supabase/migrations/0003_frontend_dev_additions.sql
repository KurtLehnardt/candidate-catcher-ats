-- Additions needed for the frontend/demo wave. No auth wave has landed yet, so this
-- keeps the app fully usable without a real signed-in user; revisit once auth exists.

alter table applicants
  add column stage text not null default 'New' check (stage in ('New', 'Shortlisted', 'Rejected'));

-- Cached weighted-aggregate score (lib/scoring/aggregate.ts), recomputed whenever a
-- requirement's weight changes or scoring re-runs, so the ranked table can sort by a
-- plain column instead of joining + aggregating requirement_scores on every read.
alter table applicants
  add column overall_score numeric;

-- manual_scores.user_id was NOT NULL referencing auth.users, which has no real row to
-- point at until the auth wave lands. Nullable for now.
alter table manual_scores
  alter column user_id drop not null;

-- Single dev org so the UI is demoable without a login flow. Every job/applicant created
-- through the app in this wave hangs off this org (see lib/org.ts).
insert into orgs (id, name) values
  ('00000000-0000-0000-0000-000000000001', 'Dev Org')
on conflict (id) do nothing;
