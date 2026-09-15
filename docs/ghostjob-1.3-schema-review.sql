-- REVIEW ONLY. Do not run until the live Lovable project and existing constraint
-- definitions have been confirmed. This file is intentionally not an automatic migration.
-- Target: auevehneizminspolipf (Lovable Cloud), not the separate Supabase projects.

-- Run this read-only preflight first and retain the output:
select c.relname as table_name, con.conname, pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('scanned_jobs', 'scan_observations')
  and con.contype = 'c'
order by c.relname, con.conname;

-- Proposed change, only if the named constraints match the checked-in v2 migration.
-- The transaction adds replacements before removing the old constraints. It makes
-- no row updates and leaves column defaults, policies, triggers and privileges intact.
begin;
set local lock_timeout = '3s';
set local statement_timeout = '30s';

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.scanned_jobs'::regclass and conname = 'scanned_jobs_scoring_version_check')
     or not exists (select 1 from pg_constraint where conrelid = 'public.scan_observations'::regclass and conname = 'scan_observations_scoring_version_check') then
    raise exception 'Expected v2 constraint names missing. Stop and inspect the live schema.';
  end if;
end $$;

alter table public.scanned_jobs add constraint scanned_jobs_scoring_version_v3_check
  check (scoring_version in (1, 2, 3)) not valid;
alter table public.scanned_jobs validate constraint scanned_jobs_scoring_version_v3_check;
alter table public.scan_observations add constraint scan_observations_scoring_version_v3_check
  check (scoring_version in (2, 3)) not valid;
alter table public.scan_observations validate constraint scan_observations_scoring_version_v3_check;
alter table public.scanned_jobs drop constraint scanned_jobs_scoring_version_check;
alter table public.scan_observations drop constraint scan_observations_scoring_version_check;
commit;

-- Re-run the preflight query to verify. Do not restore v2-only constraints after
-- v3 rows exist; rollback the application using feature switches instead.
