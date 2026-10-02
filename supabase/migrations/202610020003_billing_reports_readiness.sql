-- Keep historical Stripe prices so renewals and cancellations continue to map
-- to the right product after the current catalog price IDs are replaced.
create table public.stripe_price_catalog (
  price_id text primary key,
  product_code text not null references public.products(code),
  interval text not null check (interval in ('month', 'year')),
  recorded_at timestamptz not null default now()
);
insert into public.stripe_price_catalog(price_id, product_code, interval)
  select monthly_price_id, code, 'month' from public.products where monthly_price_id is not null
  union all
  select yearly_price_id, code, 'year' from public.products where yearly_price_id is not null;

create function public.remember_product_prices() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.monthly_price_id is not null then
    insert into public.stripe_price_catalog(price_id, product_code, interval)
      values (new.monthly_price_id, new.code, 'month') on conflict (price_id) do nothing;
    if not exists (select 1 from public.stripe_price_catalog
      where price_id = new.monthly_price_id and product_code = new.code and interval = 'month') then
      raise exception 'Stripe price ID already belongs to another product or interval';
    end if;
  end if;
  if new.yearly_price_id is not null then
    insert into public.stripe_price_catalog(price_id, product_code, interval)
      values (new.yearly_price_id, new.code, 'year') on conflict (price_id) do nothing;
    if not exists (select 1 from public.stripe_price_catalog
      where price_id = new.yearly_price_id and product_code = new.code and interval = 'year') then
      raise exception 'Stripe price ID already belongs to another product or interval';
    end if;
  end if;
  return new;
end;
$$;
create trigger remember_product_prices after insert or update of monthly_price_id, yearly_price_id
  on public.products for each row execute function public.remember_product_prices();

-- Draft Lexcoria and bundle records must not become purchasable until the
-- playable Lexcoria route exists and is separately enabled for launch.
update public.products set available = false where code in ('english', 'bundle');

-- Parents can ask for deletion without losing billing links or support audit
-- records before a staff member checks and cancels Stripe subscriptions.
create table public.account_deletion_requests (
  parent_id uuid primary key references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now()
);
alter table public.account_deletion_requests enable row level security;
create policy deletion_request_own_read on public.account_deletion_requests
  for select to authenticated using (parent_id = auth.uid());
revoke all on public.account_deletion_requests from anon, authenticated;
grant select on public.account_deletion_requests to authenticated;
grant all on public.account_deletion_requests to service_role;

create function public.request_account_deletion() returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare requested timestamptz;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  insert into public.account_deletion_requests(parent_id) values (auth.uid())
    on conflict (parent_id) do update set requested_at = public.account_deletion_requests.requested_at
    returning requested_at into requested;
  return requested;
end;
$$;
revoke execute on function public.request_account_deletion() from public, anon, authenticated;
grant execute on function public.request_account_deletion() to authenticated;

-- Fail closed if anyone attempts to delete an Auth user while the Stripe
-- customer mapping remains. Staff must cancel in Stripe, verify the result,
-- then remove the mapping before deleting Auth data.
create function public.guard_billed_account_delete() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.stripe_customers where parent_id = old.id) then
    raise exception 'Verify and cancel Stripe subscriptions, then remove the customer mapping before deleting this account';
  end if;
  return old;
end;
$$;
create trigger guard_billed_account_delete before delete on auth.users
  for each row execute function public.guard_billed_account_delete();

-- One status row gives operations a heartbeat without adding a row every
-- minute (more than half a million rows a year on the current schedule).
create table public.report_job_status (
  id boolean primary key default true check (id),
  run_id uuid not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  claimed integer not null default 0,
  sent integer not null default 0,
  failed integer not null default 0,
  error text
);
alter table public.report_job_status enable row level security;
revoke all on public.stripe_price_catalog, public.report_job_status from anon, authenticated;
grant all on public.stripe_price_catalog, public.report_job_status to service_role;
