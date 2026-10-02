# Lexcoria website integration

Lexcoria is built from the sibling `Lexcoria` React/Vite project into the SATs Legends Pages artifact at `/english/play/`. The public website and billing remain Matharia-only by default. Do not enable the English release flags before the release checks below pass.

## Prices agreed for launch

| Plan | Monthly | Yearly |
| --- | ---: | ---: |
| Matharia only | £4.99 | £49.99 |
| Lexcoria only | £4.99 | £49.99 |
| Both games | £8.49 | £109.99 |

The combined annual price is **not** a discount against twelve combined monthly payments. Do not advertise it as one.

## Build the combined Pages artifact

From `D:\BrainZilla\GitHub\SATsLegends`, with dependencies installed in both sibling repositories:

```powershell
npm run lint
npm run build:with-english
```

The upload folder is `D:\BrainZilla\GitHub\SATsLegends\dist`. Check that both `dist/index.html` and `dist/english/play/index.html` exist. The English build uses a hash router and the shared site origin, so a parent Supabase session and selected child profile work across both games. Set the **same** `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for both builds; the combined build script passes the website's public Vite values to Lexcoria. Never set `VITE_ALLOW_GAME_PREVIEW=true` for a public deployment.

The normal `npm run build` builds the website/Matharia only. A Cloudflare Git build must check out Lexcoria alongside SATsLegends and use `npm run build:with-english`; otherwise `/english/play/` will not exist. For a Direct Upload Pages project, upload the complete combined `dist` folder as one deployment. Test the nested URL directly after deployment. Do not upload the Lexcoria `dist` alone over the website.

## Gated website playtest (no English sales)

To link the English game from `/english` and from eligible child profiles while keeping English checkout disabled, build the combined artifact with the testing switch:

```powershell
npm run build:with-english -- --test-link
```

Set the website's public `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` before building; both sibling builds must use the same Supabase project as the deployed website. The switch forces `VITE_ENGLISH_RELEASED=false` for the website build and **does not** set `VITE_ALLOW_GAME_PREVIEW=true`. It does not change the backend catalog or grant access. A signed-in parent still needs an English or bundle entitlement, or a time-limited English complimentary grant, and a selected child profile. If those prerequisites are absent, the game remains gated. The current admin support form grants Matharia only; provision a test grant through the Supabase dashboard with an authorised administrator, not a browser-side bypass.

Deploy this combined `dist` as a Cloudflare Pages preview deployment first (for example, a `lexcoria-test` branch), verify `/english` and `/english/play/`, and run `LEGEND_ENGLISH_TESTING=true` with `LEGEND_QA_URL` pointing to the preview when using `npm run verify:lexcoria`. Pages preview URLs may be publicly reachable, so the entitlement gate must stay enabled. Do not use this build switch as the public English launch flag. A production upload or Git build will not inherit this local testing switch automatically; the uploaded artifact must be the combined test build.

## Backend and release sequence

1. Apply the Supabase migrations in filename order to the intended project and deploy the `billing`, `stripe-webhook`, `admin-support` and report functions. Preserve existing Matharia Stripe price mappings.
2. Create English-only and combined Stripe prices at the amounts above. Save their live price IDs in `public.products` and the trusted Stripe price catalog required by the billing migration. Verify the IDs and webhook in test mode first.
3. Confirm that the deployed Lexcoria game opens from a same-origin parent account, rejects a parent without English entitlement, saves English progress separately from Matharia, and resumes the same child on another device. Check reading/GPS paper completion and parent English progress.
4. Complete the legal, privacy, payment, email, device and production checks in `docs/RELEASE_READINESS.md`. Do not invite purchases before these pass.
5. Only then set `ENGLISH_RELEASED=true` in the Supabase `billing` function environment, set the English and bundle `public.products.available` values to `true`, and build the site with `VITE_ENGLISH_RELEASED=true`. Redeploy the combined Pages artifact and verify all six checkout options plus the public `/english` and `/english/play/` routes.

If any activation step fails, leave or return both release flags to false and disable the English/bundle catalog entries. Existing paid entitlements must still be honoured or refunded according to the operator's support process; do not silently revoke a paid subscription.
