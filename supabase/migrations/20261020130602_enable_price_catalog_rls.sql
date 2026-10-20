-- Client privileges are already revoked. RLS also protects this internal
-- lookup table if a future grant accidentally exposes it through the Data API.
alter table public.stripe_price_catalog enable row level security;
