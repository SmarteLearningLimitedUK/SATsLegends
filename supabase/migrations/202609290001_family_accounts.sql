-- Parent-owned profiles. Billing and email delivery tables are server-written only.
create table public.products (
  code text primary key,
  name text not null,
  available boolean not null default false,
  monthly_price_id text unique,
  yearly_price_id text unique,
  child_limit integer not null default 1 check (child_limit between 1 and 20)
);
insert into public.products (code, name, available) values
  ('matharia', 'SATs Legends Matharia', true),
  ('english', 'English adventure', false);

create function public.next_report_time(after_time timestamptz) returns timestamptz
language sql stable set search_path = '' as $$
  select min(candidate) from (
    select ((after_time at time zone 'Europe/London')::date + day +
      case when extract(isodow from (after_time at time zone 'Europe/London')::date + day) = 7 then time '15:00' else time '16:00' end)
      at time zone 'Europe/London' as candidate
    from generate_series(0, 7) day
    where extract(isodow from (after_time at time zone 'Europe/London')::date + day) in (3, 7)
  ) slots where candidate > after_time;
$$;

create table public.parent_settings (
  parent_id uuid primary key references auth.users(id) on delete cascade,
  report_emails boolean not null default true,
  next_report_at timestamptz not null default public.next_report_time(now()),
  created_at timestamptz not null default now()
);
create table public.child_profiles (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null check (char_length(trim(nickname)) between 2 and 24),
  created_at timestamptz not null default now(),
  unique (id, parent_id)
);
create index child_profiles_parent on public.child_profiles(parent_id);
create table public.stripe_customers (
  parent_id uuid primary key references auth.users(id) on delete cascade,
  customer_id text not null unique,
  checkout_lock_until timestamptz
);
create table public.subscriptions (
  id text primary key,
  parent_id uuid not null references auth.users(id) on delete cascade,
  product_code text not null references public.products(code),
  status text not null,
  interval text not null check (interval in ('month', 'year')),
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  last_event_created bigint not null default 0,
  updated_at timestamptz not null default now()
);
create index subscriptions_parent_product on public.subscriptions(parent_id, product_code);
create table public.child_progress (
  child_id uuid not null,
  parent_id uuid not null,
  product_code text not null references public.products(code),
  player jsonb not null default '{}',
  progression jsonb not null default '{}',
  revision bigint not null default 0,
  last_request_id uuid,
  updated_at timestamptz not null default now(),
  primary key (child_id, product_code),
  foreign key (child_id, parent_id) references public.child_profiles(id, parent_id) on delete cascade
);
create index child_progress_parent on public.child_progress(parent_id);
create table public.report_deliveries (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references auth.users(id) on delete cascade,
  due_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'skipped')),
  lease_until timestamptz,
  attempts integer not null default 0,
  provider_id text,
  sent_at timestamptz,
  last_error text,
  unique (parent_id, due_at)
);
create index report_deliveries_queue on public.report_deliveries(status, lease_until);

create function public.create_parent_settings() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.parent_settings(parent_id, report_emails)
    values (new.id, coalesce((new.raw_user_meta_data->>'report_emails')::boolean, true));
  return new;
end;
$$;
create trigger create_parent_settings after insert on auth.users
  for each row execute function public.create_parent_settings();
insert into public.parent_settings(parent_id) select id from auth.users on conflict do nothing;

create function public.has_game_access(product text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.subscriptions
    where parent_id = auth.uid() and product_code = product
      and status in ('active', 'trialing') and current_period_end > now());
$$;

alter table public.products enable row level security;
alter table public.parent_settings enable row level security;
alter table public.child_profiles enable row level security;
alter table public.stripe_customers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.child_progress enable row level security;
alter table public.report_deliveries enable row level security;
create policy catalog_read on public.products for select to anon, authenticated using (true);
create policy settings_read on public.parent_settings for select to authenticated using (parent_id = auth.uid());
create policy settings_update on public.parent_settings for update to authenticated
  using (parent_id = auth.uid()) with check (parent_id = auth.uid());
create policy children_read on public.child_profiles for select to authenticated using (parent_id = auth.uid());
create policy children_update on public.child_profiles for update to authenticated
  using (parent_id = auth.uid()) with check (parent_id = auth.uid());
create policy subscriptions_read on public.subscriptions for select to authenticated using (parent_id = auth.uid());
create policy progress_read on public.child_progress for select to authenticated using (parent_id = auth.uid());
-- Deliberately no direct client INSERT/UPDATE policies for progress or subscriptions.
revoke all on public.products, public.parent_settings, public.child_profiles, public.stripe_customers,
  public.subscriptions, public.child_progress, public.report_deliveries from anon, authenticated;
grant select on public.products to anon, authenticated;
grant select on public.parent_settings, public.child_profiles, public.subscriptions, public.child_progress to authenticated;
grant update (report_emails) on public.parent_settings to authenticated;
grant update (nickname) on public.child_profiles to authenticated;
grant all on public.products, public.parent_settings, public.child_profiles, public.stripe_customers,
  public.subscriptions, public.child_progress, public.report_deliveries to service_role;

create function public.create_child_profile(child_nickname text) returns public.child_profiles
language plpgsql security definer set search_path = '' as $$
declare child public.child_profiles; allowed_count integer;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  select coalesce(max(p.child_limit), 1) into allowed_count from public.products p
    join public.subscriptions s on s.product_code = p.code
    where s.parent_id = auth.uid() and s.status in ('active', 'trialing') and s.current_period_end > now();
  if (select count(*) from public.child_profiles where parent_id = auth.uid()) >= allowed_count then
    raise exception 'Your subscription includes one child profile';
  end if;
  insert into public.child_profiles(parent_id, nickname) values(auth.uid(), trim(child_nickname)) returning * into child;
  return child;
end;
$$;

create function public.save_child_progress(
  target_child uuid, game_code text, expected_revision bigint, request_id uuid,
  player_data jsonb, progression_data jsonb
) returns bigint language plpgsql security definer set search_path = '' as $$
declare saved public.child_progress;
begin
  if auth.uid() is null or not exists (select 1 from public.child_profiles where id = target_child and parent_id = auth.uid()) then
    raise exception 'Profile not found';
  end if;
  if game_code <> 'matharia' or not public.has_game_access(game_code) then raise exception 'Active Matharia subscription required'; end if;
  if request_id is null or expected_revision is null or expected_revision < 0 then raise exception 'Invalid save request'; end if;
  if jsonb_typeof(player_data) is distinct from 'object' or jsonb_typeof(progression_data) is distinct from 'object'
    or octet_length(player_data::text) + octet_length(progression_data::text) > 262144 then raise exception 'Invalid progress'; end if;
  insert into public.child_progress(child_id, parent_id, product_code)
    values(target_child, auth.uid(), game_code) on conflict do nothing;
  select * into saved from public.child_progress where child_id = target_child and product_code = game_code for update;
  if saved.last_request_id = request_id then return saved.revision; end if;
  if saved.revision <> expected_revision then raise exception 'PROGRESS_CONFLICT'; end if;
  update public.child_progress set player = player_data, progression = progression_data,
    revision = revision + 1, last_request_id = request_id, updated_at = now()
    where child_id = target_child and product_code = game_code returning * into saved;
  return saved.revision;
end;
$$;

-- Server-only operations. A client cannot write billing status or trigger mass email.
create function public.acquire_checkout_lock(target_parent uuid) returns boolean
language sql security definer set search_path = '' as $$
  with locked as (update public.stripe_customers set checkout_lock_until = now() + interval '3 minutes'
    where parent_id = target_parent and (checkout_lock_until is null or checkout_lock_until < now()) returning parent_id)
  select exists(select 1 from locked);
$$;
create function public.apply_subscription_event(subscription_data jsonb) returns void
language sql security definer set search_path = '' as $$
  insert into public.subscriptions(id, parent_id, product_code, status, interval, current_period_end, cancel_at_period_end, last_event_created)
  values(subscription_data->>'id', (subscription_data->>'parent_id')::uuid, subscription_data->>'product_code',
    subscription_data->>'status', subscription_data->>'interval', (subscription_data->>'current_period_end')::timestamptz,
    (subscription_data->>'cancel_at_period_end')::boolean, (subscription_data->>'last_event_created')::bigint)
  on conflict (id) do update set status = excluded.status, interval = excluded.interval,
    current_period_end = excluded.current_period_end, cancel_at_period_end = excluded.cancel_at_period_end,
    last_event_created = excluded.last_event_created, updated_at = now()
  where public.subscriptions.last_event_created <= excluded.last_event_created
    and public.subscriptions.parent_id = excluded.parent_id and public.subscriptions.product_code = excluded.product_code;
$$;
create function public.claim_report_deliveries(batch_size integer default 40)
returns setof public.report_deliveries language plpgsql security definer set search_path = '' as $$
begin
  insert into public.report_deliveries(parent_id, due_at)
    select ps.parent_id, ps.next_report_at from public.parent_settings ps
    where ps.report_emails and ps.next_report_at <= now()
      and exists(select 1 from public.child_profiles c where c.parent_id = ps.parent_id)
    on conflict do nothing;
  return query with due as (
    select r.id from public.report_deliveries r join public.parent_settings ps on ps.parent_id = r.parent_id
    where ps.report_emails and (r.status = 'pending' or (r.status = 'sending' and r.lease_until < now()))
    order by r.due_at limit least(greatest(batch_size, 1), 40) for update of r skip locked
  ) update public.report_deliveries r set status = 'sending', lease_until = now() + interval '3 minutes',
    attempts = attempts + 1 from due where r.id = due.id returning r.*;
end;
$$;
create function public.finish_report_delivery(delivery_id uuid, email_id text, skip_delivery boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare delivery public.report_deliveries;
begin
  update public.report_deliveries set status = case when skip_delivery then 'skipped' else 'sent' end,
    sent_at = now(), provider_id = email_id, lease_until = null, last_error = null
    where id = delivery_id and status = 'sending' returning * into delivery;
  if delivery.id is not null then
    update public.parent_settings set next_report_at = public.next_report_time(greatest(now(), delivery.due_at))
      where parent_id = delivery.parent_id;
  end if;
end;
$$;

revoke execute on function public.create_parent_settings(), public.next_report_time(timestamptz),
  public.has_game_access(text), public.create_child_profile(text),
  public.save_child_progress(uuid,text,bigint,uuid,jsonb,jsonb), public.acquire_checkout_lock(uuid),
  public.apply_subscription_event(jsonb), public.claim_report_deliveries(integer),
  public.finish_report_delivery(uuid,text,boolean) from public, anon, authenticated;
grant execute on function public.has_game_access(text), public.create_child_profile(text),
  public.save_child_progress(uuid,text,bigint,uuid,jsonb,jsonb) to authenticated;
grant execute on function public.acquire_checkout_lock(uuid), public.apply_subscription_event(jsonb),
  public.claim_report_deliveries(integer), public.finish_report_delivery(uuid,text,boolean), public.next_report_time(timestamptz) to service_role;
