-- REVIEW BEFORE EXECUTION in the actual GhostJob project auevehneizminspolipf.
-- Private server storage; no existing jobs, notes, profiles or policies changed.
-- Apply alongside the reviewed v3/investigation column migration before enabling AI.
begin;
set local lock_timeout = '3s';
set local statement_timeout = '30s';

create schema if not exists ghostjob_private;
revoke all on schema ghostjob_private from public, anon, authenticated;
grant usage on schema ghostjob_private to service_role;

create table if not exists ghostjob_private.ai_budget_lock (
  singleton boolean primary key default true check (singleton)
);
insert into ghostjob_private.ai_budget_lock values (true) on conflict do nothing;
create table if not exists ghostjob_private.ai_monthly_spend (
  month_key text primary key check (month_key ~ '^\d{4}-\d{2}$'),
  spent_micro_usd bigint not null default 0 check (spent_micro_usd >= 0)
);
create table if not exists ghostjob_private.ai_attempts (
  attempt_key text primary key,
  month_key text not null references ghostjob_private.ai_monthly_spend(month_key),
  reserved_micro_usd bigint not null check (reserved_micro_usd > 0),
  actual_micro_usd bigint check (actual_micro_usd >= 0),
  expires_at timestamptz not null
);
create index if not exists ai_attempts_expiry on ghostjob_private.ai_attempts(expires_at);
create table if not exists ghostjob_private.ai_account_rate (
  account_key text not null,
  minute_start timestamptz not null,
  starts integer not null default 0 check (starts >= 0),
  primary key (account_key, minute_start)
);
create table if not exists ghostjob_private.cache (
  cache_key text primary key,
  value jsonb not null,
  expires_at timestamptz not null
);
create index if not exists cache_expiry on ghostjob_private.cache(expires_at);

alter table ghostjob_private.ai_budget_lock enable row level security;
alter table ghostjob_private.ai_monthly_spend enable row level security;
alter table ghostjob_private.ai_attempts enable row level security;
alter table ghostjob_private.ai_account_rate enable row level security;
alter table ghostjob_private.cache enable row level security;
revoke all on table ghostjob_private.ai_budget_lock, ghostjob_private.ai_monthly_spend,
  ghostjob_private.ai_attempts, ghostjob_private.ai_account_rate, ghostjob_private.cache from public, anon, authenticated;
grant select, insert, update, delete on table ghostjob_private.ai_budget_lock, ghostjob_private.ai_monthly_spend,
  ghostjob_private.ai_attempts, ghostjob_private.ai_account_rate, ghostjob_private.cache to service_role;

create or replace function public.ghostjob_ai_reserve(
  p_attempt_key text, p_account_key text, p_reserved_micro_usd bigint, p_budget_micro_usd bigint
) returns integer language plpgsql security invoker set search_path = '' as $$
declare
  v_now timestamptz;
  v_month text;
  v_minute timestamptz;
  v_spent bigint;
  v_starts integer;
begin
  if p_attempt_key is null or p_attempt_key !~ '^gj:ai-attempt:[a-f0-9]{64}$'
    or p_account_key is null or p_account_key !~ '^[a-f0-9]{64}$'
    or p_reserved_micro_usd is distinct from 1000000
    or p_budget_micro_usd is null or p_budget_micro_usd < 0 or p_budget_micro_usd > 25000000 then
    raise exception 'Invalid investigation reservation';
  end if;
  -- Every reservation and settlement takes this same row lock first. This also
  -- serializes attempts straddling UTC month boundaries without lock-order races.
  perform singleton from ghostjob_private.ai_budget_lock where singleton for update;
  v_now := clock_timestamp();
  v_month := to_char(v_now at time zone 'UTC', 'YYYY-MM');
  v_minute := date_trunc('minute', v_now);
  delete from ghostjob_private.ai_attempts where expires_at <= v_now;
  delete from ghostjob_private.ai_account_rate where minute_start < v_now - interval '2 minutes';
  -- Retain uncertain current-month reservations; only older monthly aggregates expire.
  delete from ghostjob_private.ai_monthly_spend
    where month_key < to_char((v_now at time zone 'UTC') - interval '62 days', 'YYYY-MM')
      and not exists (select 1 from ghostjob_private.ai_attempts a where a.month_key = ai_monthly_spend.month_key);
  if exists (select 1 from ghostjob_private.ai_attempts where attempt_key = p_attempt_key) then return 0; end if;
  insert into ghostjob_private.ai_monthly_spend(month_key) values (v_month) on conflict do nothing;
  select spent_micro_usd into v_spent from ghostjob_private.ai_monthly_spend where month_key = v_month;
  if v_spent + p_reserved_micro_usd > p_budget_micro_usd then return -1; end if;
  select starts into v_starts from ghostjob_private.ai_account_rate where account_key = p_account_key and minute_start = v_minute;
  if coalesce(v_starts, 0) >= 5 then return -2; end if;
  insert into ghostjob_private.ai_attempts(attempt_key, month_key, reserved_micro_usd, expires_at)
    values (p_attempt_key, v_month, p_reserved_micro_usd, v_now + interval '24 hours');
  update ghostjob_private.ai_monthly_spend set spent_micro_usd = spent_micro_usd + p_reserved_micro_usd where month_key = v_month;
  insert into ghostjob_private.ai_account_rate(account_key, minute_start, starts) values (p_account_key, v_minute, 1)
    on conflict (account_key, minute_start) do update set starts = ai_account_rate.starts + 1;
  return 1;
end $$;

create or replace function public.ghostjob_ai_settle(p_attempt_key text, p_actual_micro_usd bigint)
returns integer language plpgsql security invoker set search_path = '' as $$
declare v_attempt ghostjob_private.ai_attempts%rowtype;
begin
  if p_actual_micro_usd is null or p_actual_micro_usd < 0 then raise exception 'Invalid investigation cost'; end if;
  perform singleton from ghostjob_private.ai_budget_lock where singleton for update;
  select * into v_attempt from ghostjob_private.ai_attempts where attempt_key = p_attempt_key and expires_at > clock_timestamp();
  if not found then return 0; end if;
  if v_attempt.actual_micro_usd is not null then return 1; end if;
  update ghostjob_private.ai_monthly_spend
    set spent_micro_usd = spent_micro_usd + p_actual_micro_usd - v_attempt.reserved_micro_usd
    where month_key = v_attempt.month_key;
  update ghostjob_private.ai_attempts set actual_micro_usd = p_actual_micro_usd where attempt_key = p_attempt_key;
  return 1;
end $$;

create or replace function public.ghostjob_cache_get(p_key text)
returns jsonb language sql security invoker set search_path = '' as $$
  select value from ghostjob_private.cache where cache_key = p_key and expires_at > clock_timestamp();
$$;
create or replace function public.ghostjob_cache_put(p_key text, p_value jsonb, p_ttl_seconds integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  if p_key is null or length(p_key) > 200 or p_key not like 'gj:%'
    or p_value is null or p_ttl_seconds is null or p_ttl_seconds < 1 or p_ttl_seconds > 2592000 then
    raise exception 'Invalid investigation cache entry';
  end if;
  delete from ghostjob_private.cache where expires_at <= clock_timestamp();
  insert into ghostjob_private.cache(cache_key, value, expires_at)
    values (p_key, p_value, clock_timestamp() + make_interval(secs => p_ttl_seconds))
    on conflict (cache_key) do update set value = excluded.value, expires_at = excluded.expires_at;
  return true;
end $$;

-- RPCs have no public execution privileges. They retain caller privileges and
-- are invoked by the signed Cloud storage bridge using Cloud's internal key.
-- Vercel never needs access to the managed database's service-role credential.
revoke all on function public.ghostjob_ai_reserve(text,text,bigint,bigint) from public, anon, authenticated;
revoke all on function public.ghostjob_ai_settle(text,bigint) from public, anon, authenticated;
revoke all on function public.ghostjob_cache_get(text) from public, anon, authenticated;
revoke all on function public.ghostjob_cache_put(text,jsonb,integer) from public, anon, authenticated;
grant execute on function public.ghostjob_ai_reserve(text,text,bigint,bigint) to service_role;
grant execute on function public.ghostjob_ai_settle(text,bigint) to service_role;
grant execute on function public.ghostjob_cache_get(text) to service_role;
grant execute on function public.ghostjob_cache_put(text,jsonb,integer) to service_role;
notify pgrst, 'reload schema';
commit;
