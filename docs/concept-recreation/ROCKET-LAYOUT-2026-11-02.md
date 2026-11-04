# Rounding Rocket and shared HUD correction — 2 November 2026

Implemented in the real Matharia React rendering path. Browser checks pass; the native public bundle is prepared. Native iOS execution and a new TestFlight upload remain outstanding.

## Request and assumptions

The supplied iPhone 15 photo identifies inconsistent top HUD placement, a question-frame/container mismatch and insufficient answer-card padding. “Too hud” was interpreted as **top HUD**. The existing approved sapphire/gold artwork and original game rules remain the specification. The shared placement applies to portrait gameplay; approved landscape scenes retain their existing layout. No external legacy assumptions were used.

## Changed source

- `variants/matharia/src/measured-hud.css`: one safe-area coordinate system for all 16 portrait headers. Compact phones reserve a separate pause column and stack hearts/time. Long titles wrap within their own region.
- `variants/matharia/src/screens/rocket-scene.css`: explicit header/question/world/status/answer/footer regions; answer gutters measured from the 1600×533 frame aperture; padded five-digit answer values; wider status plaque for longer part names and explanations. The lower question ornament no longer collides with the rocket. The existing `ArtworkFrame` material-backing correction is retained. Whole-background crop follows the launchpad ground line, preserving image aspect ratio and coverage on compact and tablet viewports.
- `variants/matharia/src/screens/takeout-scene.css`: question and ticket clear the common header; kitchen characters retain their floor line while fitting the remaining space. This prevents the shared HUD from covering the question's top rim.

No educational content, answer generation, scoring, lives, timers, difficulty, progression, purchase/account logic or navigation destinations were edited. No asset replacement was required: existing clean scenery, transparent characters/rocket, hollow frames, independent emerald buttons and live controls were reused. No background masks or patches were added.

Generated native files are under `variants/matharia/native/ios/App/App/public`. Verification drivers, screenshots and receipts are under `qa-artifacts/rocket-layout`. This handover, the screen checklist and work log are the documentation changes.

## Reference and composition evidence

Approved Rocket reference: `variants/matharia/reference/approved/rounding_rocket.png`, **853×1844**. Its recorded normalized regions are HUD `(0.035,0.031,0.904,0.081)`, question `(0.128,0.123,0.746,0.114)` and answer console `(0.039,0.735,0.923,0.132)`. The requested shared header and additional padding deliberately replace the former game-specific HUD offsets and crowded console dimensions.

At the iPhone 15 browser viewport **393×852**, with simulated top/bottom insets **59/34**, the Rocket answer panel grew from approximately **346×100** to **346×125 CSS pixels**. The three answer targets are approximately **90×49 pixels**; the real five-digit `10000` value has over **21 pixels** of horizontal space to each button boundary. These are layout measurements, not a claim of pixel identity with the concept.

- [Supplied photo versus updated running screen](../../qa-artifacts/rocket-layout/before-after.png)
- [Approved concept versus updated running screen](../../qa-artifacts/rocket-layout/approved-vs-running.png)
- [Compact, iPhone 15 and iPad layouts](../../qa-artifacts/rocket-layout/devices.png)
- [Fully initialized normal-motion Mastery screen](../../qa-artifacts/rocket-layout/mastery-ready/initial.png)
- [Longer part-label state](../../qa-artifacts/rocket-layout/mastery/part-4.png)
- [Takeout Rush after spacing correction](../../qa-artifacts/rocket-layout/takeout/iphone15.png)
- [Per-screen checklist and evidence](../../qa-artifacts/rocket-layout/screen-checklist.json)

The comparisons preserve the screenshot pixels apart from proportional scaling and labels. Questions differ between captures. The normal-motion initial capture was repeated after mesh readiness; that fully loaded capture is the comparison evidence.

## Verification

| Check | Coverage | Result |
| --- | --- | --- |
| Shared portrait HUD | 16 real gameplay scenes × 3 browser profiles: 393×852, 320×568, 768×1024, with simulated safe areas | 48 cases pass: common header bounds, title containment, unobstructed pause/readouts, 44px touch targets and no page scrolling |
| Rocket layouts and gameplay | WebKit 390×843 reference, 320×568 stress, 393×852 iPhone 15 with 59/34 insets, 430×932 and 768×1024 | Five cases pass: questions, status, answer containment/hit testing, correct/incorrect answers, lives and pause/resume |
| Rocket full basic run | Actual UI answers, failed run, Retry, seven parts, countdown/launch/results | Pass; original 850ms correct and 1600ms incorrect feedback timing retained, pause holds active-time remainder, Map returns to the game's mission group |
| Rocket Mastery / normal motion | Chromium 393×852 with simulated 59/34 insets; original generator seeded to 9999 → nearest 1000 | Pass: real 10000/11000 choices, incorrect explanation, eight correct parts, long labels, countdown pause, visible lift-off, frozen flight position during pause, resumed victory and Map |
| Takeout Rush compatibility | 393×852, 375×667 and 768×1024 with simulated insets | Three cases pass: padded question clears HUD, ticket clears chef, 44px food controls, actual add/reset/exact portions, original automatic serving validation and pause/resume |
| Orientation and small phone | 375×667 play; rotated iPhone 852×393 and iPad 1024×768; return to 768×1024 portrait | Pass: portrait instruction/gate, resumed game and correct Back destination |
| Repository checks | Matharia typecheck, final iOS-mode Vite build, original shared controller/calculation contracts, 37 approved reference hashes | Pass; existing bundle-size warning remains |
| Native preparation | Capacitor sync and iOS minimum checker | Pass: 838 built files match native public files by SHA-256; minimum 16.4 aligned in four Xcode settings and Swift package |

All browser account requests used the repository's isolated account fixture. No live account, subscription, purchase or database settings were changed. Saves/account integrations remain unchanged; live persistence was not retested in this visual correction.

Verification retries corrected automation timing/readiness races and a solver assumption that every order needed multiple portions. The final receipts use the actual displayed portion requirement and original automatic validation. Earlier candidate images are retained for review; `RESULT.json` and the linked final receipts are authoritative.

## Remaining work before production

No blocking layout or interaction defect remains in the covered browser cases. These checks **are not native iOS tests**. Run the prepared bundle on a Mac simulator or iPhone/iPad to verify actual safe areas, native orientation, VoiceOver, Dynamic Type, first-frame asset loading and performance. StoreKit and live account integrations were outside this correction's verification scope. Sign/archive and upload a fresh TestFlight build when requested; the current installed build has not been changed by this task.

Detailed receipts: `qa-artifacts/rocket-layout/RESULT.json`, `portrait-hud/checks-*.json`, `gameplay/checks.json`, `mastery/checks.json`, `mastery-ready/checks.json`, `takeout/checks.json`, `orientation/checks.json`, `source-preservation.json`, `native-copy.json`, `dist-sha256.json` and `build.log`.
