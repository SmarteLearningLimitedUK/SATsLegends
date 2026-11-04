# Matharia — separate SATs Legends iOS presentation

The variant shares the current local React/TypeScript learning engine and integrations. It has its own entry point, Vite output (`dist-matharia`), Capacitor configuration, native project and independent artwork. The user selected the existing SATs Legends TestFlight app, so its upload bundle ID is `com.smartelearning.satslegends`; its display name remains Matharia. Unrelated changes in the original checkout are preserved.

## Current graphical pass

All37 gameplay presentations have dedicated measured scenes and browser functional/motion evidence. Map, menus, six wellbeing activities, shared controls and account states are included in the final review. Per-screen visual differences and exact verification coverage are recorded in `../../docs/concept-recreation/HANDOVER.md` and the persistent checklists. The separate app requires iOS 16.4 or later. Native iOS 16.4/device execution and live-provider behavior remain unverified before production.

The authoritative recovered approvals, measured regions, progress and limitations are in:

- `../../docs/concept-recreation/approved-screens.json`
- `../../docs/concept-recreation/screen-checklist.json`
- `../../docs/concept-recreation/WORKLOG.md`
- `reference/approved/` and the asset preparation/prompt JSON files in `reference/`.

The named earlier approval manifest was absent. Its 37 exact selections were recovered from the gallery explicitly supplied by the user, including revised Match Mastery, Fraction Forge, Angle Arena and Coordinates Quest. No other legacy project assumptions were used.

## Run and build

Use the repository's existing installed dependencies. From the repository root:

```powershell
node node_modules/vite/bin/vite.js --config variants/matharia/vite.config.ts --mode ios --host 127.0.0.1 --port 3017
node node_modules/typescript/bin/tsc --noEmit -p variants/matharia/tsconfig.json
node node_modules/vite/bin/vite.js build --config variants/matharia/vite.config.ts --mode ios
```

The local development app is `http://127.0.0.1:3017/`; the built iOS-mode preview is `http://127.0.0.1:3015/play`. The review gallery is served separately from `qa-artifacts` on port 3016, at `/concept-recreation/index.html`.

On a Mac, use `native/README.md` in the main repository for Xcode prerequisites. The separate project is `variants/matharia/native/ios/App/App.xcodeproj`. Run the variant's `ios:sync` and `ios:open` scripts when preparing a native build. Signing, installation and device testing have not been performed on this Windows host. Nothing has been submitted to Apple or deployed by this graphical pass.

## Rendering and preservation

Swift hosts Capacitor, native lifecycle and supported orientations. The actual game scenes are rendered by React in WKWebView. `presentation-transform.ts` and the explicit aliases in `vite.config.ts` adapt presentation modules at build time; original game modules are not edited on disk by this pass.

Measured scenes retain original question generation, answers, marking, difficulty, lives, score and completion callbacks. Pending feedback/round transitions retain their active-time intervals while respecting pause/background state. `SceneActor.tsx` uses independent sprites with the repository's existing mesh renderer, owned resource cleanup and reduced-motion still-image fallback. Player identities remain Barratt, Bran, Mochi and Vex. Where a concept places the activity's NPC in the HUD, the portrait represents that guide; saved player selection is unchanged.

Portrait/landscape choices are explicit in `src/compositions.ts` and follow the recovered selections. Match Mastery and Prime Pop are portrait. Peaceful Pond must remain landscape. iPhone and iPad both use the approved game orientation; rotating into an unsupported orientation pauses the mounted game behind a gate. Essential controls use safe-area regions. The map has vertically snapping island pages, verified across eight browser/device navigation cases.

Artwork is assembled from scenery, transparent characters/props, independent empty frames and sprites, live text and functional controls. Approved screen images are comparison references only. Asset scripts trim alpha margins and export aspect-preserving WebP files. Frame corners use uniform scaling, with empty edge/centre regions stretched deliberately; unsuitable background elements are not concealed by masks or covers.

## Verification

The scripts in `scripts/verify-*.mjs` use isolated repository QA account fixtures and do not save progress to a real account. Current functional scripts cover all37 gameplay presentations; motion/safe-area scripts are separate. `scripts/capture-approved.mjs` captures actual routes at reference raster sizes and representative browser viewport sizes. `scripts/make-approved-review.py` creates side-by-side, overlay and difference evidence from unchanged references and actual screenshots.

Set `PLAYWRIGHT_BROWSERS_PATH` to the local browser cache before Playwright. Chromium and the repository's WebKit runtime are used. Browser viewport checks and simulated insets are not native iOS testing. Native Dynamic Type, physical interruptions, device safe areas and performance remain unverified. Consult the persistent checklist for exact checks and remaining discrepancies.

Fixed-weight instances of the existing Fredoka typeface are generated by `scripts/prepare-fonts.py`; their original OFL and copyright are retained in `assets/fonts/LICENSE`. They prevent the thin variable-weight rendering observed in the Windows WebKit runtime. This browser finding does not establish native iOS behaviour.

## Shared screen update — 1 November 2026

The separate variant now owns illustrated briefings, responsive island mission boards, victory and retry presentation in `src/shared/`. Original controllers, educational content, reward calculations and callbacks remain in the root source and are adapted only at the rendering boundary by `shared-screen-transform.ts`. Four independent transparent victory sprites preserve the original hero identities.

See `../../docs/concept-recreation/SHARED-SCREENS-HANDOVER.md`, `../../docs/concept-recreation/shared-adventure-checklist.json` and `../../qa-artifacts/shared-adventure/index.html` for changed files, before/after captures and precise browser/native verification limits.

## Minimum iOS version

Matharia requires **iOS 16.4 or later**, explicitly approved on 1 November 2026. The original SATs Legends native target is unchanged. All four Xcode project/app Debug and Release settings use `16.4`; the generated Swift package uses `.iOS("16.4")`.

Capacitor 8 regenerates that package using only the major OS version. The variant’s `capacitor:update:after` and `capacitor:sync:after` hooks run `scripts/ensure-ios-minimum.mjs` to retain 16.4. Run `npm run ios:check` in this directory to verify consistency without changing files. The hook is idempotent and only touches the separate variant’s two native configuration files. Dependencies may legitimately declare a lower minimum and were not changed.

This resolves the declared OS-floor mismatch. An Xcode build and simulator/device validation on iOS 16.4 remain required before production; modern browser WebKit does not establish native compatibility.

The minimum-version change touches `native/ios/App/App.xcodeproj/project.pbxproj`, `native/ios/App/CapApp-SPM/Package.swift`, `package.json` and `scripts/ensure-ios-minimum.mjs`, plus the README and active compatibility handover/checklists. TypeScript, the iOS-mode build, a full Capacitor sync (including both hooks), the post-sync configuration check and hook idempotence passed. Original-project hashes were unchanged. Exact changed files and checks: `../../qa-artifacts/shared-adventure/ios-minimum-change.json`. No external legacy assumptions were used.


## Independent native accounts and subscriptions — 3 November 2026

The native build now uses its own Supabase Auth client/session key, local player
and progression storage, account screens and verified StoreKit access. Only the
identity service/credentials are shared with the website. Website billing,
complimentary grants, family profiles and cloud saves are not loaded by the app.
Existing native device saves/session migrate once within the app's isolated
WebView origin. Browser previews never import website sessions or progress.
Signing out is local to this app and does not remove its device progress or an
Apple purchase. Account deletion explicitly warns about removing the shared
identity, associated website data and local native progress.

The two App Store Connect products are recorded in `release/subscriptions.json`
and the native Info.plist. The app displays prices returned by StoreKit. The
approved GBP base prices are £4.99/month and £49.99/year; all 175 storefronts were
explicitly approved. Both products are level 1 in Matharia Full Access. Annual
billing is upfront. Family Sharing, promotional offers and annual instalments
were not enabled. Products have not been submitted for App Review.

CI verifies the app/group/product identities and periods before upload. Export
options now permit App Store review and TestFlight, while retaining existing
internal-tester handling. Exporting/uploading does not submit an App Store version.

The deletion service is prepared in `../../supabase/functions/native-account-delete/`.
Its README lists the private server configuration and deployment/device checks
still required. Its live deployment and Apple provider configuration remain
unverified. Do not call this candidate App Store ready until those services,
native signing/purchases and the remaining App Store metadata are verified.

Current evidence and exact changed files:
`../../qa-artifacts/app-store-readiness-2026-11-03/`.
No external legacy assumptions were used.
