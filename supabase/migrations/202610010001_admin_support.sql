-- Staff membership and complimentary game access are server-managed.
-- Apply after 202609290001_family_accounts.sql.
create table public.staff_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table public.account_suspensions (
  parent_id uuid primary key references auth.users(id) on delete cascade,
  reason text not null,
  suspended_by uuid not null references auth.users(id),
  suspended_at timestamptz not null default now(),
  cleared_at timestamptz
);
create table public.complimentary_access (
  parent_id uuid not null references auth.users(id) on delete cascade,
  product_code text not null references public.products(code),
  valid_until timestamptz not null,
  reason text not null,
  granted_by uuid references auth.users(id),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (parent_id, product_code)
);
create table public.admin_actions (
  id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users(id),
  target_id uuid references auth.users(id),
  action text not null,
  reason text not null,
  outcome text not null check (outcome in ('started', 'succeeded', 'failed')),
  created_at timestamptz not null default now()
);
create index admin_actions_created on public.admin_actions(created_at desc);

alter table public.staff_accounts enable row level security;
alter table public.account_suspensions enable row level security;
alter table public.complimentary_access enable row level security;
alter table public.admin_actions enable row level security;
revoke all on public.staff_accounts, public.account_suspensions, public.complimentary_access, public.admin_actions from anon, authenticated;
grant all on public.staff_accounts, public.account_suspensions, public.complimentary_access, public.admin_actions to service_role;
grant usage, select on sequence public.admin_actions_id_seq to service_role;

create function public.account_is_active() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and not exists (
    select 1 from public.account_suspensions
    where parent_id = auth.uid() and cleared_at is null
  );
$$;
create function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.account_is_active() and exists (
    select 1 from public.staff_accounts where user_id = auth.uid()
  );
$$;
revoke execute on function public.account_is_active(), public.is_staff() from public, anon, authenticated;
grant execute on function public.account_is_active(), public.is_staff() to authenticated, service_role;

create policy complimentary_own_read on public.complimentary_access for select to authenticated
  using (parent_id = auth.uid() and public.account_is_active());
grant select on public.complimentary_access to authenticated;

create or replace function public.has_game_access(product text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.account_is_active() and (
    exists (select 1 from public.subscriptions
      where parent_id = auth.uid() and product_code = product
        and status in ('active', 'trialing') and current_period_end > now())
    or exists (select 1 from public.complimentary_access
      where parent_id = auth.uid() and product_code = product
        and revoked_at is null and valid_until > now())
  );
$$;

create or replace function public.create_child_profile(child_nickname text) returns public.child_profiles
language plpgsql security definer set search_path = '' as $$
declare child public.child_profiles; allowed_count integer;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if not public.account_is_active() then raise exception 'Account unavailable'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  select coalesce(max(p.child_limit), 1) into allowed_count from public.products p
    join public.subscriptions s on s.product_code = p.code
    where s.parent_id = auth.uid() and s.status in ('active', 'trialing') and s.current_period_end > now();
  if public.has_game_access('matharia') then allowed_count := greatest(allowed_count, 1); end if;
  if (select count(*) from public.child_profiles where parent_id = auth.uid()) >= allowed_count then
    raise exception 'Your subscription includes one child profile';
  end if;
  insert into public.child_profiles(parent_id, nickname) values(auth.uid(), trim(child_nickname)) returning * into child;
  return child;
end;
$$;

-- Suspensions take effect for existing JWTs at the database boundary as well as at Auth sign-in.
drop policy settings_read on public.parent_settings;
drop policy settings_update on public.parent_settings;
drop policy children_read on public.child_profiles;
drop policy children_update on public.child_profiles;
drop policy subscriptions_read on public.subscriptions;
drop policy progress_read on public.child_progress;
create policy settings_read on public.parent_settings for select to authenticated
  using (parent_id = auth.uid() and public.account_is_active());
create policy settings_update on public.parent_settings for update to authenticated
  using (parent_id = auth.uid() and public.account_is_active())
  with check (parent_id = auth.uid() and public.account_is_active());
create policy children_read on public.child_profiles for select to authenticated
  using (parent_id = auth.uid() and public.account_is_active());
create policy children_update on public.child_profiles for update to authenticated
  using (parent_id = auth.uid() and public.account_is_active())
  with check (parent_id = auth.uid() and public.account_is_active());
create policy subscriptions_read on public.subscriptions for select to authenticated
  using (parent_id = auth.uid() and public.account_is_active());
create policy progress_read on public.child_progress for select to authenticated
  using (parent_id = auth.uid() and public.account_is_active());
