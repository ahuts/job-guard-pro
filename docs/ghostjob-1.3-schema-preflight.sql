-- READ ONLY: run in the live Lovable Cloud SQL editor for GhostJob.
-- Capture this output before approving any constraint changes.
select c.relname as table_name, con.conname, pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('scanned_jobs', 'scan_observations')
  and con.contype = 'c'
order by c.relname, con.conname;

select 'profiles' as table_name, count(*) as row_count from public.profiles
union all select 'scanned_jobs', count(*) from public.scanned_jobs
union all select 'scan_observations', count(*) from public.scan_observations;

-- Explicitly show tables with NO check constraints as NULL rows.
select c.relname as table_name, con.conname, pg_get_constraintdef(con.oid) as definition
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_constraint con on con.conrelid = c.oid and con.contype = 'c'
where n.nspname = 'public' and c.relname in ('scanned_jobs', 'scan_observations')
order by c.relname, con.conname;

select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name in ('scanned_jobs', 'scan_observations')
  and column_name in ('scoring_version', 'trust_score', 'ghost_risk', 'careers_verification', 'investigation')
order by table_name, column_name;

select c.relname as table_name, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('scanned_jobs', 'scan_observations');
select tablename, policyname, roles, cmd, qual, with_check from pg_policies
where schemaname = 'public' and tablename in ('scanned_jobs', 'scan_observations')
order by tablename, policyname;
