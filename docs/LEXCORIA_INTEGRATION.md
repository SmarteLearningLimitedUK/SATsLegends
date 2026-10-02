# Lexcoria website integration

Lexcoria is built from the sibling `Lexcoria` React/Vite project into the SATs Legends Pages artifact at `/english/play/`. The public website and billing remain Matharia-only by default. Do not enable the English release flags before the release checks below pass.

## Subscription pricing

Matharia is £4.99 monthly or £49.99 yearly for one child profile. Lexcoria-only and combined-plan prices are still drafts in the disabled release code. Confirm those prices with the owner before enabling English or combined checkout or advertising either plan.

## Build the combined Pages artifact

From `D:\BrainZilla\GitHub\SATsLegends`, with dependencies installed in both sibling repositories:

```powershell
npm run lint
npm run build:with-english
```

The upload folder is `D:\BrainZilla\GitHub\SATsLegends\dist`. Check that both `dist/index.html` and `dist/english/play/index.html` exist. The English build uses a hash router and the shared site origin, so a parent Supabase session and selected child profile work across both games. Set the **same** `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for both builds; the combined build script passes the website's public Vite values to Lexcoria. Never set `VITE_ALLOW_GAME_PREVIEW=true` for a public deployment.

The normal `npm run build` builds the website/Matharia only. For the existing Git-connected Cloudflare Pages project, set the build command to `npm run build:cloudflare-english-test` and the output directory to `dist`. Cloudflare installs the website dependencies first. The command fetches the exact Lexcoria revision in `scripts/lexcoria.commit` with a sparse checkout, installs its dependencies with `npm ci`, and builds both games into one artifact. Set `NODE_VERSION=22` and provide the public `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` build variables for the relevant Pages environment. The script refuses to build without those variables. Do not add a service-role key or any other secret to a `VITE_*` variable. For a Direct Upload Pages project, upload the complete combined `dist` folder as one deployment. Test the nested URL directly after deployment. Do not upload the Lexcoria `dist` alone over the website.

The pinned Lexcoria commit is changed only after that revision passes review and game QA. A push to Lexcoria alone does not trigger a SATs Legends Pages deployment; update `scripts/lexcoria.commit` in this repository to deploy the new game revision. The sparse checkout excludes large unrelated QA and Unity files tracked in Lexcoria. The build command always enables the **gated test link**, not the public English release flag. `/english` shows a playtest link, but the game requires a signed-in parent, selected child and server-verified English access; English and combined subscriptions remain unavailable. When the release checks below are complete, change this build command deliberately as part of the public launch.

## Gated website playtest (no English sales)

To link the English game from `/english` and from eligible child profiles while keeping English checkout disabled, build the combined artifact with the testing switch:

```powershell
npm run build:with-english -- --test-link
```

Set the website's public `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` before building; both sibling builds must use the same Supabase project as the deployed website. The switch forces `VITE_ENGLISH_RELEASED=false` for the website build and **does not** set `VITE_ALLOW_GAME_PREVIEW=true`. It does not change the backend catalog or grant access. A signed-in parent still needs an English or bundle entitlement, or a time-limited English complimentary grant, and a selected child profile. If those prerequisites are absent, the game remains gated. An authorised administrator can grant or revoke one year of complimentary Lexcoria access through the protected admin support dashboard.

Deploy this combined `dist` as a Cloudflare Pages preview deployment first (for example, a `lexcoria-test` branch), verify `/english` and `/english/play/`, and run `LEGEND_ENGLISH_TESTING=true` with `LEGEND_QA_URL` pointing to the preview when using `npm run verify:lexcoria`. Pages preview URLs may be publicly reachable, so the entitlement gate must stay enabled. After preview checks, the same gated build can be used for the live owner test; the playtest link is visible to visitors, but access still requires an English entitlement. Do not use this build switch as the public English launch flag.

## Backend and release sequence

1. Apply the Supabase migrations in filename order to the intended project and deploy the `billing`, `stripe-webhook`, `admin-support` and report functions. Preserve existing Matharia Stripe price mappings.
2. Agree English-only and combined prices, update the disabled price checks and product copy, then create matching Stripe prices. Save their live price IDs in `public.products` and the trusted Stripe price catalog required by the billing migration. Verify the IDs and webhook in test mode first.
3. Confirm that the deployed Lexcoria game opens from a same-origin parent account, rejects a parent without English entitlement, saves English progress separately from Matharia, and resumes the same child on another device. Check reading/GPS paper completion and parent English progress.
4. Complete the legal, privacy, payment, email, device and production checks in `docs/RELEASE_READINESS.md`. Do not invite purchases before these pass.
5. Only then set `ENGLISH_RELEASED=true` in the Supabase `billing` function environment, set the English and bundle `public.products.available` values to `true`, and build the site with `VITE_ENGLISH_RELEASED=true`. Redeploy the combined Pages artifact and verify all six checkout options plus the public `/english` and `/english/play/` routes.

If any activation step fails, leave or return both release flags to false and disable the English/bundle catalog entries. Existing paid entitlements must still be honoured or refunded according to the operator's support process; do not silently revoke a paid subscription.
