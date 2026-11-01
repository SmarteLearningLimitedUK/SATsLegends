# App-opening internal TestFlight update â€” 1 November 2026

Requested destination: the existing SATs Legends internal TestFlight app,
`com.smartelearning.satslegends` (App Store Connect `6825120444`). Minimum iOS 16.4.
No public release, new tester invitations or source merge is requested.

## Included experience

- Dedicated Matharia splash instead of the website login/marketing front end.
- The first three campaign practices are free: Place Value Panic, Number Line Ninja and Prime Pop.
- Other levels open the in-app upgrade sheet; direct paid-game routes are guarded.
- Native Sign in with Apple token exchange and StoreKit purchase/restore bridge.
- Existing paid family accounts retain their existing cloud-save path.

Apple sign-in was enabled in the existing Supabase project for this bundle ID;
the public authentication-settings endpoint confirmed it on 1 November 2026.
Apple Developer capability/signing and a real Apple sign-in remain to be checked.

## Verification and current limitations

Thirty release-browser checks passed in Chromium and WebKit across seven phone
and tablet viewports. Account and StoreKit cases use isolated fixtures. These are
not native iOS or real purchase tests. Source contracts retained the original
gameplay controllers/calculations and all 37 approved references.

App Store subscription product IDs are currently absent from the native Info.plist.
The upgrade sheet therefore reports subscriptions unavailable; it does not offer
fictional prices or unlock access. App Store-only progression is currently local
to the device; purchase-to-family entitlement/cloud integration is unfinished.
The privacy-policy destination also needs production verification.

The user explicitly requested uploading this newest build for internal testing
with those limitations described. Native compilation, launch captures and Apple
processing/tester availability will be recorded below; preparation is not proof
of upload.

## Source and packaging

Editable implementation: `variants/matharia/src/app/`,
`src/shared/IslandAdventureBoard.tsx`, `src/WorldMap.tsx`, `native-flow-transform.ts`,
the scoped Vite entry/adapters, and `native/ios/App/App/MathariaServicesPlugin.swift`
with its entitlements, SceneDelegate registration and Xcode source references.

The candidate includes native source and the exact rebuilt/synced web bundle from
the current working tree. This is not a clean frontend npm build from the isolated
public CI commit. The local branch/index and unrelated changes are preserved.

This upload's supporting changes are limited to the candidate manifest, native
build/packaging scripts, the existing workflow and this handover. Original
candidate artifacts and receipts remain unchanged. No external legacy assumptions
were used.

## Native build and upload

Current candidate: `matharia-ci-20261101-app-opening-v3`, SHA-256
`c77b854e13c3bff06326221964052e463b656f4082519c08564cb03a75a03cb4`.
The 358,822,732-byte archive contains 838 hash-verified compiled web files plus
native source and the local Capacitor App package. It was rebuilt and synced
before packaging. A Swift bridge value was corrected to use Capacitor's typed
`JSValue` dictionary before the signed build.

CI commit: `edcb18ad6c3d9d6457d926d529d50c53d5e3b5f5` on the existing isolated
`ios/testflight-upload-matharia-20261101-v1` branch. The local source branch and
index remain unchanged. The superseded v2 native check was cancelled before
signing; its draft candidate is retained.

Native workflow: https://github.com/SmarteLearningLimitedUK/SATsLegends/actions/runs/41346382705.
Native compilation passed with Xcode 26.6. iPhone 17 Pro and iPad Pro 13-inch (M5)
both installed, launched and survived. Actual launch captures were inspected:
the app opens to the new splash rather than the website; controls fit, and the
iPhone account action clears the Dynamic Island. Evidence is in
`qa-artifacts/app-opening/run-41346382705/matharia-native-checks/` and
`native-captures-accepted.json`.

The protected `ios-testflight` signing environment is retained. The user approved
its standard review for this exact candidate, and that review was recorded using
GitHub's normal API with the protection rules unchanged. The signing job started.
Upload and Apple processing are not yet confirmed. These
launch checks do not certify native gameplay, purchases, a physical device or
an iOS 16.4 runtime.


## Confirmed TestFlight availability: 1.0 (100.15.1)

Apple returned VALID processing and IN_BETA_TESTING for this newest app-opening build. Export compliance is cleared (usesNonExemptEncryption=false), and 1 existing internal group with 1 tester membership has access. No new testers were invited and external testing was not enabled.

Receipt: `qa-artifacts/app-opening/run-41346382705/matharia-testflight-result/result.json`. Native launch captures were inspected on iPhone and iPad. The new splash and three-free-practice flow are included. Subscription product IDs, App Store-only cloud integration, real native purchases/gameplay, physical devices and an iOS 16.4 runtime remain unverified or unfinished as described above. This is a verified internal beta upload, not production certification.

No external legacy assumptions were used.
