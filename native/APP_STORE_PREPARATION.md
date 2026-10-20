# iOS subscription preparation

Prepared on 20 October 2026. This is source preparation on Windows, not a signed, simulator-tested or App Store-approved app.

## Implemented

- Local StoreKit 2 Capacitor plugin: Apple-localised products and prices, purchase, pending/cancelled states, restore and subscription management. Transactions finish only after server acknowledgement; unfinished transactions can retry.
- Parent subscription screen uses Apple purchases in the iOS build. Website checkout remains unchanged. Existing access prevents another subscription being offered.
- Authenticated server verification binds the Apple transaction to the app, environment and parent account. The client supplies transaction IDs, never an asserted entitlement. Expiry, revocation and grace periods are checked against Apple's authenticated HTTPS API response.
- Existing account entitlement storage is reused. No database migration, live deployment or Apple account change was performed.
- Native target aligned to iOS 16, retaining iPhone landscape support. Initial native authentication uses email/password; email confirmation and recovery return to a configured HTTPS account website.

## Configuration before enabling purchases

Create one subscription group in App Store Connect with these planned IDs, matching the source exactly:

| Product | ID |
| --- | --- |
| Monthly Matharia | `com.smartelearning.satslegends.matharia.monthly` |
| Annual Matharia | `com.smartelearning.satslegends.matharia.annual` |

These products are not registered yet. Set real prices and product information in App Store Connect; the app reads Apple's prices. The existing bundle ID is `com.smartelearning.satslegends`.

Build-time public settings, alongside the existing Supabase URL and publishable key:

- `VITE_IOS_PRIVACY_URL`: published HTTPS privacy policy.
- `VITE_IOS_TERMS_URL`: published HTTPS subscription terms/EULA.
- `VITE_IOS_AUTH_ORIGIN`: HTTPS website origin handling `/auth/callback` and `/reset-password`; allow these return URLs in Supabase authentication settings.

Missing legal settings disable purchases. Browser tests use isolated fake public settings, accounts and prices; they are not release configuration.

Deploy `supabase/functions/apple-subscriptions` only after configuring existing backend credentials and `APP_URL`, plus server secrets `APPLE_ISSUER_ID`, `APPLE_KEY_ID`, and `APPLE_PRIVATE_KEY` (Apple In-App Purchase API signing key). Never put these in VITE variables, the app bundle or chat. Set `APPLE_SUBSCRIPTIONS_ENABLED=true` only after validation. `APPLE_ENVIRONMENT` defaults to `Production`. Sandbox additionally requires `APPLE_ENVIRONMENT=Sandbox` and `APPLE_ALLOW_SANDBOX=true`; use a separate test backend to avoid granting production access from test purchases.

The function uses explicit Auth.getUser validation despite `verify_jwt=false`, matching this repository's edge-function pattern. Incoming signed transactions/webhooks are not accepted: only transaction IDs are accepted, and authoritative payloads are retrieved directly from Apple over HTTPS.

## Mac handoff

### Work prepared without a local Mac

The manually triggered GitHub Actions workflow `.github/workflows/ios-simulator.yml` installs dependencies, checks TypeScript and entitlement/configuration fixtures, builds the iOS bundle, syncs Capacitor, and invokes Xcode on a macOS runner. It requires an installed Xcode 26; it fails explicitly if unavailable. It creates an **unsigned simulator-only** `.app` artifact, not an installable iPhone IPA. It does not sign, upload, publish or use Apple credentials. This workflow has been prepared locally but has not been dispatched or verified on a runner. Review runner availability/billing before manually running it.

`npm run ios:build:simulator` runs the same Xcode build locally on a Mac. It refuses to run on Windows. Node 22+ and Xcode 26+ match the [Capacitor 8 requirements](https://capacitorjs.com/docs/getting-started/environment-setup).

Before a real distribution build, run `npm run ios:check:release`. This checks public configuration structure, rejects reserved/local URLs, preview access bypass and commonly mis-prefixed server keys, and never prints values. It intentionally fails with this worktree's missing production settings. It does not validate ownership, connectivity, legal wording or Apple's configuration. The simulator workflow deliberately compiles without production settings so account access remains closed.

An iOS-only outer render boundary now covers account screens as well as individual games. Its recovery screen offers reload/return-to-start without clearing storage. Browser checks at 667×375, 844×390 and 932×430 verify touch targets, containment, both navigation actions and local-data preservation. It cannot recover native process termination or errors before JavaScript starts.

Additional changed files for this pass: `src/platform/ios/IOSAppBoundary.tsx`, `src/main.tsx`, `src/platform/native-app.css`, `src/components/GameLoadBoundary.tsx` (optional back-button label), `scripts/{ios-release-config.mjs,verify-ios-release-config.mjs,build-ios-simulator.mjs,verify-ios-recovery.mjs}`, `.github/workflows/ios-simulator.yml`, and the two npm commands in `package.json`. Recovery screenshots/checks are in `qa-artifacts/ios-recovery/`.

Apple Developer membership does not provide a Mac. Obtain Mac access with Xcode compatible with the installed Capacitor 8 dependencies. On that Mac:

1. Run `npm ci`, `npm run lint`, `npm run build:ios`, and `npx cap sync ios` with real public build configuration.
2. Run `npm run ios:open`. Confirm the existing app target, bundle ID, iOS 16 minimum and both landscape directions.
3. Compile and test in an iPhone simulator. Create a local StoreKit configuration in Xcode with the two product IDs above and attach it to the run scheme. Local StoreKit transactions need a corresponding test-verification strategy; they are not production Apple server transactions.
4. Once membership is active, select the signing team, create the matching App Store Connect record and configure subscription products and sandbox testing.
5. Test real sandbox purchases, pending approval, cancellation, restore after reinstall, renewal, expiry, refund, account mismatch, offline/retry and background/foreground recovery. Then archive and distribute through TestFlight.

Windows checks cannot establish whether Swift compiles, StoreKit works on device, or signing succeeds. No IPA has been produced or uploaded.

## Remaining release gates

- Compile the Swift plugin and exercise StoreKit on Mac and real devices, including sound interruptions, safe areas and lifecycle behaviour.
- Add and validate server-side subscription lifecycle reconciliation (Apple notifications or a scheduled authenticated refresh). Current refresh runs when the app/account resumes; this alone is not full renewal/refund reconciliation.
- Complete account deletion: the current repository has a manual deletion-request workflow. Verify and implement an App Store-compliant in-app deletion flow before submission.
- Publish accurate legal documents and privacy labels, decide Kids Category/parental-gate requirements, complete subscription disclosures, review account and App Store metadata.
- Replace placeholder app icon/launch artwork and capture real device App Store screenshots.
- Verify existing web subscriber access, purchase ownership and support procedures before enabling production billing. Native social authentication requires a separate callback implementation and is hidden in this initial native flow.

## Checks and changed files

Tests: `npx tsx scripts/verify-apple-entitlements.ts`, `node scripts/verify-ios-subscriptions.mjs` against an isolated iOS-mode preview, `npx deno check supabase/functions/apple-subscriptions/index.ts`, `npm run lint`, website/iOS builds and Capacitor sync. Browser fixtures are not live payment certification. Evidence is under `qa-artifacts/ios-store-preparation/`.

Source files: `src/platform/ios/{appleSubscriptions.ts,IOSSubscriptionScreen.tsx,apple-subscriptions.css,nativeAuthReturn.ts}`; `src/website/{Subscriptions.tsx,ParentArea.tsx,FamilyAccount.tsx,ParentAccount.tsx,services/supabase.ts}`; `native/ios/App/App/{LegendsStorePlugin.swift,SceneDelegate.swift}`; `native/ios/App/App.xcodeproj/project.pbxproj`; `supabase/functions/_shared/appleSubscriptions.ts`; `supabase/functions/apple-subscriptions/index.ts`; `supabase/config.toml`; `.env.example`; the two verification scripts above; `native/README.md`; `docs/RELEASE_READINESS.md`; this document.

Assumptions: retain the repository's bundle ID, account architecture and Matharia product; monthly and annual are proposed product periods. No external legacy assumptions were used.

References: [Apple review guidelines](https://developer.apple.com/app-store/review/guidelines/), [StoreKit testing](https://developer.apple.com/documentation/xcode/setting-up-storekit-testing-in-xcode), [subscription statuses](https://developer.apple.com/documentation/appstoreserverapi/get-all-subscription-statuses), [Capacitor native code](https://capacitorjs.com/docs/ios/custom-code).
