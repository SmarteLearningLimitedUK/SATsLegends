-- Foundation only: no public receipt endpoint and both providers disabled.
-- Only a future server verifier may write authoritative, account-bound states.
create table public.store_billing_settings (
  provider text primary key check (provider in ('apple', 'google')),
  enabled boolean not null default false,
  environment text not null check (environment in ('sandbox', 'production'))
);
insert into public.store_billing_settings(provider, environment)
values ('apple', 'sandbox'), ('google', 'sandbox');
alter table public.store_billing_settings enable row level security;
revoke all on public.store_billing_settings from public, anon, authenticated;
grant select, update on public.store_billing_settings to service_role;

create table public.store_entitlements (
  id uuid primary key default gen_random_uuid(),
  provider text not null references public.store_billing_settings(provider),
  environment text not null check (environment in ('sandbox', 'production')),
  -- SHA-256 of Apple originalTransactionId or Google purchaseToken.
  -- Raw purchase tokens/receipts must never be exposed through the Data API.
  purchase_hash text not null check (purchase_hash ~ '^[a-f0-9]{64}$'),
  parent_id uuid not null references auth.users(id) on delete restrict,
  product_code text not null references public.products(code),
  interval text not null check (interval in ('month', 'year')),
  status text not null check (status in ('active', 'trialing', 'grace', 'pending', 'expired', 'revoked', 'on_hold', 'paused')),
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null,
  verified_at timestamptz not null,
  unique(provider, environment, purchase_hash)
);
create index store_entitlements_parent on public.store_entitlements(parent_id);
alter table public.store_entitlements enable row level security;
revoke all on public.store_entitlements from public, anon, authenticated;
-- Writes go through the ownership-preserving RPC, not direct upserts.
grant select on public.store_entitlements to service_role;

create function public.apply_verified_store_entitlement(entitlement jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
declare existing public.store_entitlements; target_parent uuid := (entitlement->>'parent_id')::uuid;
begin
  -- This RPC is service-role only. Its input is NOT a receipt verifier.
  -- The caller must verify signature/API state, app ID, product and account binding.
  perform pg_advisory_xact_lock(hashtextextended(
    concat(entitlement->>'provider', ':', entitlement->>'environment', ':', entitlement->>'purchase_hash'), 0));
  select * into existing from public.store_entitlements
    where provider = entitlement->>'provider' and environment = entitlement->>'environment'
      and purchase_hash = entitlement->>'purchase_hash' for update;
  if found then
    if existing.parent_id is distinct from target_parent then raise exception 'Purchase belongs to another parent account'; end if;
    if existing.verified_at >= (entitlement->>'verified_at')::timestamptz then return false; end if;
  end if;
  insert into public.store_entitlements(provider, environment, purchase_hash, parent_id, product_code,
    interval, status, current_period_end, cancel_at_period_end, verified_at)
  values(entitlement->>'provider', entitlement->>'environment', entitlement->>'purchase_hash', target_parent,
    entitlement->>'product_code', entitlement->>'interval', entitlement->>'status',
    (entitlement->>'current_period_end')::timestamptz, (entitlement->>'cancel_at_period_end')::boolean,
    (entitlement->>'verified_at')::timestamptz)
  on conflict(provider, environment, purchase_hash) do update set
    product_code = excluded.product_code, interval = excluded.interval, status = excluded.status,
    current_period_end = excluded.current_period_end, cancel_at_period_end = excluded.cancel_at_period_end,
    verified_at = excluded.verified_at;
  return true;
end;
$$;
revoke all on function public.apply_verified_store_entitlement(jsonb) from public, anon, authenticated;
grant execute on function public.apply_verified_store_entitlement(jsonb) to service_role;

-- Account-safe projection: never return purchase identifiers or tokens.
-- Verified provider grace periods have the same access semantics as active.
create function public.account_subscriptions() returns table (
  id text, product_code text, status text, "interval" text,
  current_period_end timestamptz, cancel_at_period_end boolean, provider text
) language sql stable security definer set search_path = '' as $$
  select s.id, s.product_code, s.status, s.interval, s.current_period_end, s.cancel_at_period_end, 'stripe'::text
  from public.subscriptions s where s.parent_id = auth.uid() and public.account_is_active()
  union all
  select e.id::text, e.product_code, case when e.status = 'grace' then 'active' else e.status end,
    e.interval, e.current_period_end, e.cancel_at_period_end, e.provider
  from public.store_entitlements e join public.store_billing_settings c
    on c.provider = e.provider and c.enabled and c.environment = e.environment
  where e.parent_id = auth.uid() and public.account_is_active();
$$;
revoke all on function public.account_subscriptions() from public, anon;
grant execute on function public.account_subscriptions() to authenticated;

create or replace function public.has_game_access(product text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.account_is_active() and (
    exists (select 1 from public.account_subscriptions() s
      where (s.product_code = product or (product in ('matharia', 'english') and s.product_code = 'bundle'))
        and s.status in ('active', 'trialing') and s.current_period_end > now())
    or exists (select 1 from public.complimentary_access
      where parent_id = auth.uid()
        and (product_code = product or (product in ('matharia', 'english') and product_code = 'bundle'))
        and revoked_at is null and valid_until > now())
  );
$$;

-- Called by authenticated billing code with its server-verified parent ID.
create function public.store_access_conflicts(target_parent uuid, target_product text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.store_entitlements e
    join public.store_billing_settings c on c.provider = e.provider and c.enabled and c.environment = e.environment
    where e.parent_id = target_parent and e.status in ('active', 'trialing', 'grace')
      and e.current_period_end > now()
      and (e.product_code = target_product or e.product_code = 'bundle' or target_product = 'bundle'));
$$;
revoke all on function public.store_access_conflicts(uuid, text) from public, anon, authenticated;
grant execute on function public.store_access_conflicts(uuid, text) to service_role;
