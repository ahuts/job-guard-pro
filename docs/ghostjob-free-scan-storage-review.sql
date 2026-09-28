-- Apply only to the confirmed live Lovable Cloud project auevehneizminspolipf.
-- Additive private storage; do not alter profiles, saved jobs, or AI budget data.
begin;
set local lock_timeout = '3s';
set local statement_timeout = '30s';

create table if not exists ghostjob_private.free_scan_monthly (
  account_key text not null check (account_key ~ '^[a-f0-9]{64}$'),
  month_key text not null check (month_key ~ '^[0-9]{4}-[0-9]{2}$'),
  used smallint not null default 0 check (used between 0 and 3),
  primary key (account_key, month_key)
);

create table if not exists ghostjob_private.free_scan_jobs (
  account_key text not null,
  month_key text not null,
  job_key text not null check (job_key ~ '^[a-f0-9]{64}$'),
  lease_key uuid not null,
  state text not null check (state in ('pending', 'completed')),
  expires_at timestamptz not null,
  primary key (account_key, month_key, job_key),
  foreign key (account_key, month_key)
    references ghostjob_private.free_scan_monthly(account_key, month_key) on delete cascade
);

create index if not exists free_scan_jobs_pending_expiry
  on ghostjob_private.free_scan_jobs(expires_at) where state = 'pending';

alter table ghostjob_private.free_scan_monthly enable row level security;
alter table ghostjob_private.free_scan_jobs enable row level security;
revoke all on ghostjob_private.free_scan_monthly, ghostjob_private.free_scan_jobs
  from public, anon, authenticated;
grant select, insert, update, delete on ghostjob_private.free_scan_monthly,
  ghostjob_private.free_scan_jobs to service_role;

create or replace function public.ghostjob_free_scan(
  p_action text, p_account_key text, p_job_key text default null,
  p_month_key text default null, p_lease_key uuid default null,
  p_success boolean default null
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_now timestamptz := clock_timestamp();
  v_month text := to_char(v_now at time zone 'UTC', 'YYYY-MM');
  v_target_month text;
  v_used integer := 0;
  v_pending integer := 0;
  v_job ghostjob_private.free_scan_jobs%rowtype;
begin
  if p_action is null or p_action not in ('status', 'reserve', 'finish')
    or p_account_key is null or p_account_key !~ '^[a-f0-9]{64}$'
    or (p_action <> 'status' and (p_job_key is null or p_job_key !~ '^[a-f0-9]{64}$'))
    or (p_action = 'finish' and (p_month_key is null or p_month_key !~ '^[0-9]{4}-[0-9]{2}$'
      or p_lease_key is null or p_success is null)) then
    raise exception 'Invalid free scan request';
  end if;

  v_target_month := case when p_action = 'finish' then p_month_key else v_month end;
  if p_action = 'status' then
    select used into v_used from ghostjob_private.free_scan_monthly
      where account_key = p_account_key and month_key = v_target_month;
    v_used := coalesce(v_used, 0);
    select count(*) into v_pending from ghostjob_private.free_scan_jobs
      where account_key = p_account_key and month_key = v_target_month
        and state = 'pending' and expires_at > v_now;
    return jsonb_build_object('status', 'available', 'monthKey', v_target_month,
      'used', v_used, 'remaining', greatest(0, 3 - v_used - v_pending));
  end if;

  insert into ghostjob_private.free_scan_monthly(account_key, month_key)
    values (p_account_key, v_target_month) on conflict do nothing;
  select used into v_used from ghostjob_private.free_scan_monthly
    where account_key = p_account_key and month_key = v_target_month for update;
  delete from ghostjob_private.free_scan_jobs
    where account_key = p_account_key and month_key = v_target_month
      and state = 'pending' and expires_at <= v_now;
  select * into v_job from ghostjob_private.free_scan_jobs
    where account_key = p_account_key and month_key = v_target_month and job_key = p_job_key;

  if p_action = 'finish' then
    if not found or v_job.lease_key is distinct from p_lease_key then
      return jsonb_build_object('status', 'invalid');
    end if;
    if v_job.state = 'completed' then
      return jsonb_build_object('status', 'completed', 'monthKey', v_target_month, 'used', v_used);
    end if;
    if p_success then
      update ghostjob_private.free_scan_jobs set state = 'completed'
        where account_key = p_account_key and month_key = v_target_month and job_key = p_job_key;
      update ghostjob_private.free_scan_monthly set used = used + 1
        where account_key = p_account_key and month_key = v_target_month;
      v_used := v_used + 1;
      return jsonb_build_object('status', 'completed', 'monthKey', v_target_month, 'used', v_used);
    end if;
    delete from ghostjob_private.free_scan_jobs
      where account_key = p_account_key and month_key = v_target_month and job_key = p_job_key;
    return jsonb_build_object('status', 'released', 'monthKey', v_target_month, 'used', v_used);
  end if;

  if found then
    if v_job.state = 'completed' then
      return jsonb_build_object('status', 'existing', 'monthKey', v_target_month, 'used', v_used);
    end if;
    return jsonb_build_object('status', 'reserved', 'monthKey', v_target_month,
      'used', v_used, 'leaseKey', v_job.lease_key);
  end if;
  select count(*) into v_pending from ghostjob_private.free_scan_jobs
    where account_key = p_account_key and month_key = v_target_month and state = 'pending';
  if v_used + v_pending >= 3 then
    return jsonb_build_object('status', 'limited', 'monthKey', v_target_month, 'used', v_used);
  end if;
  if p_lease_key is null then raise exception 'Lease required'; end if;
  insert into ghostjob_private.free_scan_jobs(account_key, month_key, job_key, lease_key, state, expires_at)
    values (p_account_key, v_target_month, p_job_key, p_lease_key, 'pending', v_now + interval '90 seconds');
  return jsonb_build_object('status', 'reserved', 'monthKey', v_target_month,
    'used', v_used, 'leaseKey', p_lease_key);
end $$;

revoke all on function public.ghostjob_free_scan(text,text,text,text,uuid,boolean)
  from public, anon, authenticated;
grant execute on function public.ghostjob_free_scan(text,text,text,text,uuid,boolean)
  to service_role;

commit;
