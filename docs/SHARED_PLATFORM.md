# SATs Legends: one service across website, iOS and Android

Agreed product requirement, 20 October 2026.

## Shared identity and data

- `https://satslegends.com` is the main website and desktop game host.
- Matharia and Lexcoria are sister games within SATs Legends. They retain their own product access and progress; an active bundle unlocks both.
- All production clients must use the same Supabase project: `znwqfeqzzlyytbfsakqj`.
- The authenticated Supabase user ID identifies the parent. The same child profile ID follows the child between devices. Email addresses and device IDs must not be used as purchase ownership keys.
- A parent logs in separately on each device using the same account. Browser cookies/local storage do not transfer to a native app.
- Cloud progress is keyed by child ID and game code. Existing revision checks reject stale writes; clients must offer the latest cloud save when another device has saved. Do not silently overwrite a newer save or promise simultaneous-device merging.
- Never copy browser tokens into URLs or FTP files. Never ship server credentials inside a mobile bundle.

## Stripe testing backend, configured 20 October 2026

The isolated Supabase Free project **SATsLegends Testing** (`wcinuayogriuiupyktyv`, Ireland) is for Stripe sandbox testing. It does not share production accounts, child profiles, subscriptions or saves. Production clients continue using `znwqfeqzzlyytbfsakqj`.

- Applied the six existing schema migrations and the additional `enable_price_catalog_rls` migration. A remote SQL check confirmed zero public tables without RLS and zero copied auth users. The additional RLS migration has not been applied to production in this setup.
- Saved `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` only in the testing project's Edge Function secrets. `APP_URL` is `http://localhost:4181` for an isolated local preview. No test secrets were added to source, frontend configuration or the FTP website.
- Deployed the existing `billing` and `stripe-webhook` handlers with their internal parent-token and Stripe-signature validation. Legacy gateway JWT verification is off, matching `supabase/config.toml`.
- Stripe confirmed active, non-live GBP recurring prices: £4.99/month and £49.99/year. Public identifiers and the six registered webhook events are recorded in `scripts/stripe-sandbox-prices.json`.
- Created active Stripe test destination `we_1USd0EDFXVy0TQ8iH40P2VTt` using snapshot API version `2026-09-30.endive`. The receiver reads event identifiers and retrieves the latest subscription through its pinned SDK.
- Remote checks passed: billing GET exposes the two correct Matharia prices; an untrusted origin receives 403; unauthenticated checkout receives 401; webhook GET receives 405; missing and invalid signatures receive 400; a locally generated, correctly signed connection probe receives 200. This probe is not a Stripe-originated delivery or a completed purchase.
- Local database verification passes 19 checks, including an added regression check requiring RLS on every public table. Lexcoria and bundle sales remain disabled.

### Completed sandbox purchase test, 20 October 2026

A disposable, API-confirmed test parent completed hosted Stripe Checkout with Stripe's published Visa test card. This tested the deployed backend and hosted payment/portal UI, not the website's email-confirmation flow or native store purchases.

| Check | Result |
| --- | --- |
| Access before payment | Matharia and Lexcoria both false. |
| Monthly Checkout | Completed, paid, GBP 499, `livemode=false`. |
| Real Stripe webhooks | Checkout completed, subscription created and subscription updated deliveries returned HTTP 200. |
| Access after payment | Matharia true; Lexcoria false; active subscription mirrored to the correct parent. |
| Repeat checkout | Open session reused; a second purchase after activation rejected with HTTP 409. |
| Portal | Opened and allowed the test customer to cancel at the end of the paid period. |
| Scheduled cancellation | Stripe used `cancel_at` with `cancel_at_period_end=false`. Found and fixed the mapper so the app correctly marks the plan as ending this period. A replay of the real Stripe event confirmed the fix in the testing backend; paid-period access remained true. |
| Immediate test cancellation | Stripe and the backend both changed to canceled; Matharia access became false. |
| Cloud saving | A test child saved revision 1 while entitled. A save after cancellation was rejected, and revision 1 remained unchanged. |
| Yearly Checkout / repurchase | A new checkout after cancellation opened for GBP 4999, `livemode=false`; expired unpaid after verification. No annual payment was submitted. |
| Final fixture state | Test subscription `sub_1USdGjDFXVy0TQ8iTSQzgvg9` is canceled, no game access remains, and the new unpaid yearly checkout is expired. |

The cancellation mapper fix is deployed to testing and, following owner authorization on 20 October 2026, to the production `stripe-webhook` function. The production source was backed up before deployment. Downloading the deployed ZIP confirmed all three files match the tested source and only the shared billing mapper changed. A production GET probe returned the expected HTTP 405, confirming that the function starts and rejects unsupported methods. No live payment was submitted for this verification.

Following owner approval on 20 October 2026, saved **SATs Legends** as the Stripe account's public trading name. A fresh reload of Stripe's business-details page confirmed the saved value in both the business and public-details sections. This corrects the public name that previously fell back to **laserlush.com** during checkout testing.

Before live activation: release the RLS migration to production and verify renewals, failed-payment recovery and the annual payment flow. The public website remains separate from sandbox billing. A local sandbox preview uses ignored public-client configuration; no server keys are placed in its environment.

## Purchase integration contract

### Prepared foundation, 20 October 2026 — not deployed

The owner confirmed that neither mobile store is ready. The following code is prepared and tested locally; it does **not** enable mobile purchases:

- Migration `20261020144412_shared_store_entitlements.sql` adds a server-only entitlement ledger, immutable parent ownership through its ingestion RPC, separate sandbox/production identities and disabled-by-default provider settings. No receipt verifier or public grant endpoint exists.
- `apply_verified_store_entitlement` is executable only by the server role. It accepts normalized **already verified** state; it does not verify Apple signatures or Google tokens. A future verifier must validate app/package ID, environment, product mapping, account binding and current provider state before calling it. Use a SHA-256 purchase identity; retain any raw Google token needed for reconciliation in separate protected server storage, not in client-visible account data.
- Duplicate/older verification snapshots are ignored. `verified_at` must be a server-generated verification ordering value, never a device timestamp. Future handlers must serialize verification per purchase, re-query authoritative provider state for notifications, and handle Google linked-token upgrades before ingestion. Database ordering alone does not verify a webhook or resolve stale provider responses.
- `account_subscriptions()` projects safe Stripe/store summaries for the authenticated parent only. Purchase hashes and raw receipts are not exposed. A verified grace period maps to active access through the supplied grace expiry. Pending, held, paused, expired and revoked purchases do not grant access. Cancellation is an active paid period with renewal off until expiry.
- Existing `has_game_access`, child creation and cloud-save validation now consume this shared account access. Stripe and complimentary access remain supported. Reports retain the same parent/child/game keys, and losing access does not erase saved report data.
- The website account loader uses the shared summary, with fallback to the old Stripe query only if the RPC is absent during staged rollout (`PGRST202`). Other failures remain visible. Apple/Google subscriptions have their own renewal-management links; they are not sent to Stripe's portal.
- Web checkout checks for overlapping active store coverage before creating a Stripe customer/session. This does not replace the equivalent native pre-purchase check, cross-channel race handling or reconciliation of previously open checkouts.

Verification: 13 PGlite integration checks pass for default-off state, environment separation, Apple/Google/bundle access, one-child enforcement, cloud saves, ownership isolation, restore conflicts, replay ordering, cancellation, revocation, expiry, existing Stripe/complimentary access and deletion protection. Browser API fixtures pass for shared child reports, correct store-management links, foreground refresh, old-schema fallback and visible permission failures. Fixtures are not store sandbox purchase tests.

Deployment order when approved: apply the migrations to testing, verify the RPC permissions and existing Stripe regression there, deploy the billing function, then publish the website. Repeat the reviewed migration/function/site order for production. Both store providers must remain disabled until their complete integration passes release checks. The additional RLS migration also remains pending in production.

Files changed for this foundation:

- `supabase/migrations/20261020144412_shared_store_entitlements.sql` and `supabase/functions/billing/index.ts`: ledger, shared access and web checkout conflict check.
- `src/website/FamilyAccount.tsx`, `src/website/ParentArea.tsx`, `src/website/Subscriptions.tsx`, `src/website/ReleasedSubscriptions.tsx`: account loading and subscription management.
- `scripts/verify-store-entitlements.mjs`, `scripts/verify-family-auth-flow.mjs`, `scripts/verify-lexcoria-readiness.mjs`, `package.json`, `.github/workflows/quality.yml`: verification and CI.
- `docs/SHARED_PLATFORM.md`: status and release requirements.

Assumptions: one shared production backend, the same authenticated parent account on each client, one child profile per current plan, and separate game access unless the purchased product is a bundle. No external legacy project assumptions were used.

Still required before any claim of cross-platform purchase support:

1. Apple paid membership/App Store Connect and Google Play Console, app entries and real approved product IDs.
2. StoreKit and Google Billing clients, authenticated purchase binding, Restore Purchases and native account/deep-link handling. Update and test both the native app source and pinned Lexcoria client against the new account projection; they were not modified in this pass.
3. Server receipt/API verification, product allowlists, secure reconciliation credentials/token storage, Apple notifications, authenticated Google RTDN and Google acknowledgement/retry handling.
4. Device tests for web-to-app and app-to-web access, saved reports, renewals, verified grace, refunds/revocations, restored purchases, upgrades/linked tokens, wrong-account restores and prevention of duplicate subscriptions.
5. Enable each provider in the correct backend/environment only after those tests pass. Never enable sandbox access in the production service.

The payment provider collects payment; the shared backend decides access.

| Purchase channel | Payment mechanism | Required server input |
| --- | --- | --- |
| Website | Existing Stripe Checkout | Verified Stripe subscription webhook |
| iOS | StoreKit subscription, subject to storefront rules | Server-verified Apple transaction and App Store Server Notifications |
| Android | Google Play Billing, subject to applicable programmes | Server-verified purchase token and real-time developer notifications |

All channels must feed the same game-access decision. Existing Stripe subscriptions and complimentary grants must keep working. Store integrations must not write fabricated Stripe IDs into the existing Stripe subscription mirror.

Before enabling mobile purchases:

1. Create the Apple/Google developer accounts and the monthly/yearly products. Map their real product IDs to `matharia`, `english` or `bundle` on the server. Store catalogue approval is separate from implementing the API.
2. Require the parent account before purchase. Bind Apple purchases using an app account token and Google purchases using the supported obfuscated account identifier. Validate ownership server-side; a transaction must not unlock two unrelated parent accounts.
3. Store provider-specific transaction identifiers, verified state, expiry and parent ownership in a server-written ledger with row-level access controls. Unify these grants with the existing `has_game_access` decision and the parent dashboard. Support grace periods only when backed by a verified provider state.
4. Process renewal, cancellation, expiration, refund and revocation events idempotently, tolerating duplicates and out-of-order delivery. Reconcile with provider APIs when needed. Never grant access based solely on a client receipt or a checkout success page.
5. Provide Restore Purchases. Restore the verified purchase to its bound parent account, with a support path for ownership conflicts.
6. Show existing cross-platform access before offering a purchase. Explain where to manage an existing subscription. Do not automatically create a second subscription when a parent changes devices or signs in again.
7. Test sandbox purchases and restores on real iOS/Android devices before store submission. Keep web checkout out of native purchase flows unless the app is explicitly configured for an applicable store programme.

## Authentication integration

Email/password uses the existing shared Supabase identity. Google/Apple sign-in, email confirmation and recovery also need native callback handling and registered redirect URLs. The current iOS lifecycle module has no `appUrlOpen`/cold-start authentication callback handling; this must be implemented and tested before enabling those native flows. Apple private relay can produce a different email: account linking must prove control of both identities rather than guessing from an email address.

Configure the production website origin and exact callback/reset routes in Supabase. Configure native callback routes and OAuth provider settings separately. Passkeys require matching relying-party/domain configuration and native associated-domain/credential setup; a website feature flag alone does not establish native support.

Edge Function CORS currently uses the configured `APP_URL` as its allowed origin. Confirm it is `https://satslegends.com` for the production website. Native functions need a narrowly scoped origin allowlist if called from native WebViews; CORS is not authentication.

## Audit status

| Area | Evidence and current limit |
| --- | --- |
| Shared web/iOS account source | iOS Vite configuration inherits production public settings; both route through `FamilyAccount` and `GameGate`. This is source verification, not a signed-device test. |
| Both browser games | Combined build passes the same public account configuration to the embedded Lexcoria build and disables game previews. |
| Entitlement freshness | Family account refreshes on browser focus, visibility return and reconnection. The iOS working source now emits the same refresh signal on foregrounding. Browser fixture tests cover both granting and revoking access through that signal; a signed-device test is still required. |
| Cloud save isolation | Local database checks cover parent isolation, idempotent retries, stale-save rejection and expired-access rejection. |
| Store purchases | Missing. Owner confirmed Apple/Google developer accounts and products are not set up. No StoreKit/Google Billing integration found in inspected source. |
| Android package | No Android native directory found in the inspected app workspace. |
| Live backend configuration | Not verified in this pass: Supabase connector calls reported unavailable; direct backend probes could not connect. Do not treat local passing tests as production verification. |
| Production deployment | These integration amendments have not been deployed. The website publisher is prepared separately. |

## Required end-to-end release evidence

- One test parent signs in on website, iPhone, iPad and Android; the same child IDs appear everywhere.
- A web purchase unlocks the right game on both apps; native purchases unlock the corresponding website access after server verification.
- A bundle unlocks both games; a single-game plan does not accidentally unlock its sister game.
- Cancelled access remains valid through the paid period; expiration/refund/revocation removes access consistently. Restoring a purchase works after reinstall without granting it to a second account.
- Finish a level, wait for the cloud-save acknowledgement, then open another device: the result is present. A stale device cannot overwrite it. Reconnection retries do not duplicate progress.
- Google/Apple sign-in and password recovery return to the correct signed app after both warm and cold starts. Existing accounts are not duplicated.
- Website, native apps and backend pass all of the above against the same production project, using sandbox billing where applicable. Production launch remains blocked until this evidence exists.

References: [Supabase native authentication](https://supabase.com/docs/guides/auth/native-mobile-deep-linking), [Apple multiplatform services and purchase rules](https://developer.apple.com/app-store/review/guidelines/#multiplatform-services), [Google Play payments policy](https://support.google.com/googleplay/android-developer/answer/9858738), [Google purchase verification guidance](https://developer.android.com/google/play/billing/security).
