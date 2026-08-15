-- GhostJob Trust Meter v2. Preserve ghost_score for historical v1 scans.
-- This migration is additive and safe to retry after an interrupted deploy.
begin;

alter table public.scanned_jobs
  add column if not exists trust_score integer check (trust_score between 0 and 100),
  add column if not exists scoring_version integer check (scoring_version in (1, 2)),
  add column if not exists ghost_risk text check (ghost_risk in ('low', 'low_moderate', 'unclear', 'high', 'very_high')),
  add column if not exists careers_verification text check (careers_verification in ('verified_match', 'active_board_no_match', 'unverified', 'closed_conflict'));

create table if not exists public.scan_observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_key text not null,
  job_url text,
  job_title text,
  company_name text,
  company_location text,
  first_observed_at timestamptz not null,
  last_observed_at timestamptz not null,
  reposted boolean not null default false,
  careers_verification text not null default 'unverified'
    check (careers_verification in ('verified_match', 'active_board_no_match', 'unverified', 'closed_conflict')),
  scoring_version integer not null default 2 check (scoring_version = 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, job_key)
);

alter table public.scan_observations enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'scan_observations'
      and policyname = 'Users can read their own scan observations'
  ) then
    create policy "Users can read their own scan observations"
      on public.scan_observations for select to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'scan_observations'
      and policyname = 'Users can insert their own scan observations'
  ) then
    create policy "Users can insert their own scan observations"
      on public.scan_observations for insert to authenticated
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'scan_observations'
      and policyname = 'Users can update their own scan observations'
  ) then
    create policy "Users can update their own scan observations"
      on public.scan_observations for update to authenticated
      using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'scan_observations'
      and policyname = 'Users can delete their own scan observations'
  ) then
    create policy "Users can delete their own scan observations"
      on public.scan_observations for delete to authenticated
      using (auth.uid() = user_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.scan_observations'::regclass
      and tgname = 'update_scan_observations_updated_at'
      and not tgisinternal
  ) then
    create trigger update_scan_observations_updated_at
      before update on public.scan_observations
      for each row execute function public.update_updated_at_column();
  end if;
end
$$;

commit;
