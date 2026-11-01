# App-opening internal TestFlight update — 1 November 2026

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

Pending. The protected `ios-testflight` signing environment is retained.
