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

## Purchase integration contract

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
