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
