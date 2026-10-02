-- Lexcoria is still in development. Publishing its game and enabling sales are
-- separate release steps; the catalog must fail closed in the meantime.
update public.products set name = 'SATs Legends Lexcoria', available = false where code = 'english';
insert into public.products (code, name, available, child_limit)
values ('bundle', 'Matharia + Lexcoria', false, 1)
on conflict (code) do update set name = excluded.name, available = excluded.available;

create or replace function public.has_game_access(product text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.account_is_active() and (
    exists (select 1 from public.subscriptions
      where parent_id = auth.uid()
        and (product_code = product or (product in ('matharia', 'english') and product_code = 'bundle'))
        and status in ('active', 'trialing') and current_period_end > now())
    or exists (select 1 from public.complimentary_access
      where parent_id = auth.uid()
        and (product_code = product or (product in ('matharia', 'english') and product_code = 'bundle'))
        and revoked_at is null and valid_until > now())
  );
$$;

create or replace function public.create_child_profile(child_nickname text) returns public.child_profiles
language plpgsql security definer set search_path = '' as $$
declare child public.child_profiles; allowed_count integer;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if not public.account_is_active() then raise exception 'Account unavailable'; end if;
  if not (public.has_game_access('matharia') or public.has_game_access('english')) then
    raise exception 'Active game subscription required';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  select coalesce(max(p.child_limit), 1) into allowed_count from public.products p
    join public.subscriptions s on s.product_code = p.code
    where s.parent_id = auth.uid() and s.status in ('active', 'trialing') and s.current_period_end > now();
  if public.has_game_access('matharia') or public.has_game_access('english') then
    allowed_count := greatest(allowed_count, 1);
  end if;
  if (select count(*) from public.child_profiles where parent_id = auth.uid()) >= allowed_count then
    raise exception 'Your subscription includes one child profile';
  end if;
  insert into public.child_profiles(parent_id, nickname) values(auth.uid(), trim(child_nickname)) returning * into child;
  return child;
end;
$$;

create or replace function public.save_child_progress(
  target_child uuid, game_code text, expected_revision bigint, request_id uuid,
  player_data jsonb, progression_data jsonb
) returns bigint language plpgsql security definer set search_path = '' as $$
declare saved public.child_progress;
begin
  if auth.uid() is null or not exists (select 1 from public.child_profiles where id = target_child and parent_id = auth.uid()) then
    raise exception 'Profile not found';
  end if;
  if game_code not in ('matharia', 'english') or not public.has_game_access(game_code) then
    raise exception 'Active game subscription required';
  end if;
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

create or replace function public.apply_subscription_event(subscription_data jsonb) returns void
language sql security definer set search_path = '' as $$
  insert into public.subscriptions(id, parent_id, product_code, status, interval, current_period_end, cancel_at_period_end, last_event_created)
  values(subscription_data->>'id', (subscription_data->>'parent_id')::uuid, subscription_data->>'product_code',
    subscription_data->>'status', subscription_data->>'interval', (subscription_data->>'current_period_end')::timestamptz,
    (subscription_data->>'cancel_at_period_end')::boolean, (subscription_data->>'last_event_created')::bigint)
  on conflict (id) do update set product_code = excluded.product_code, status = excluded.status, interval = excluded.interval,
    current_period_end = excluded.current_period_end, cancel_at_period_end = excluded.cancel_at_period_end,
    last_event_created = excluded.last_event_created, updated_at = now()
  where public.subscriptions.last_event_created <= excluded.last_event_created
    and public.subscriptions.parent_id = excluded.parent_id;
$$;
