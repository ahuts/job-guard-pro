-- Target: auevehneizminspolipf (the configured Lovable Cloud project).
-- REVIEW BEFORE EXECUTION. The connected Supabase account cannot inspect this
-- project. Run docs/ghostjob-1.3-schema-preflight.sql in its SQL editor first.
-- This transaction changes no rows, ownership policies, notes, or defaults.
begin;
set local lock_timeout = '3s';
set local statement_timeout = '30s';

do $$
declare definition text;
begin
  select pg_get_constraintdef(oid) into definition from pg_constraint
  where conrelid = 'public.scanned_jobs'::regclass and conname = 'scanned_jobs_scoring_version_check';
  if definition is not null then
    if definition <> 'CHECK ((scoring_version = ANY (ARRAY[1, 2])))' then
      raise exception 'Unexpected scanned_jobs constraint: %. Review the live schema before changing it.', definition;
    end if;
    alter table public.scanned_jobs add constraint scanned_jobs_scoring_version_v3_check check (scoring_version in (1, 2, 3)) not valid;
    alter table public.scanned_jobs validate constraint scanned_jobs_scoring_version_v3_check;
    alter table public.scanned_jobs drop constraint scanned_jobs_scoring_version_check;
  elsif not exists (select 1 from pg_constraint where conrelid = 'public.scanned_jobs'::regclass and conname = 'scanned_jobs_scoring_version_v3_check'
    and pg_get_constraintdef(oid) = 'CHECK ((scoring_version = ANY (ARRAY[1, 2, 3])))') then
    raise exception 'Expected scanned_jobs version constraint missing. Review the live schema.';
  end if;
  select pg_get_constraintdef(oid) into definition from pg_constraint
  where conrelid = 'public.scan_observations'::regclass and conname = 'scan_observations_scoring_version_check';
  if definition is not null then
    if definition <> 'CHECK ((scoring_version = 2))' then
      raise exception 'Unexpected scan_observations constraint: %. Review the live schema before changing it.', definition;
    end if;
    alter table public.scan_observations add constraint scan_observations_scoring_version_v3_check check (scoring_version in (2, 3)) not valid;
    alter table public.scan_observations validate constraint scan_observations_scoring_version_v3_check;
    alter table public.scan_observations drop constraint scan_observations_scoring_version_check;
  elsif not exists (select 1 from pg_constraint where conrelid = 'public.scan_observations'::regclass and conname = 'scan_observations_scoring_version_v3_check'
    and pg_get_constraintdef(oid) = 'CHECK ((scoring_version = ANY (ARRAY[2, 3])))') then
    raise exception 'Expected scan_observations version constraint missing. Review the live schema.';
  end if;
end $$;

alter table public.scanned_jobs add column if not exists investigation jsonb;
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'scanned_jobs' and column_name = 'investigation' and data_type = 'jsonb' and is_nullable = 'YES') then
    raise exception 'Investigation column has an unexpected type or nullability.';
  end if;
end $$;
commit;

-- Confirm v3 constraints, nullable JSONB, original policies and retained row counts.
select table_name, column_name, data_type, is_nullable from information_schema.columns
where table_schema = 'public' and table_name = 'scanned_jobs' and column_name = 'investigation';
select tablename, policyname, roles, cmd from pg_policies where schemaname = 'public' and tablename in ('scanned_jobs', 'scan_observations');
