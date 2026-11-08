# Matharia iOS release-readiness pass — 4 November 2026

**Verdict: ready for native validation; not ready for App Store submission.**

The authorised local audit, repairs, production build, browser checks, resource pruning and unsigned Mac preparation are complete. Native compilation, physical-device behaviour and real Apple/account services remain unverified. No upload, publishing, submission, signing-key changes or live account deletion was performed.

## Target and reproducible baseline

- Repository: SATs Legends; branch `codex/website-refinement-2026-10-28`.
- Baseline commit: `e7083fb7b03ebe80d4c9becd6b14338310c9ff70`, plus the preserved uncommitted working tree. This pass does not claim a clean committed-source release.
- Independent app: `variants/matharia`, React + TypeScript + Vite, Capacitor, display name **Matharia**, bundle ID `com.smartelearning.satslegends`.
- Build: `npm run build --prefix variants/matharia`; output `dist-matharia`.
- Native project: `variants/matharia/native/ios/App/App.xcodeproj`; minimum iOS/iPadOS **16.4**, iPhone and iPad enabled.
- Actual game catalogue and resolver outputs: [catalogue.json](../qa-artifacts/release-readiness-2026-11-04/catalogue.json). There are 35 mathematics activities with practice plus five scored tiers, three separate assessment papers, six calm activities and the additional pictogram mode.
- Snapshot hashes: [before](../qa-artifacts/release-readiness-2026-11-04/source-baseline.json), [after](../qa-artifacts/release-readiness-2026-11-04/source-final.json), [compiled output](../qa-artifacts/release-readiness-2026-11-04/final-output.json).
- The root website/native projects are separate targets. Shared credentials use the authentication service; app sessions, App Store access and device progress stay separate from the website.

## Persistent checklist

- [x] Discover the actual iOS target, native configuration and CI pipeline.
- [x] Record baseline commit, working tree and source hashes; preserve pre-existing changes.
- [x] Measure a clean baseline and trace static/dynamic/glob/public asset inclusion.
- [x] Derive layout contracts from current components and repository references.
- [x] Check all mathematics activities, practice and five tiers, papers, calm activities and shared screens.
- [x] Check compact/notched-size/large iPhone and iPad viewports in each activity's supported orientation.
- [x] Check text, padding, collision geometry, answer pads, validation and incorrect-answer feedback.
- [x] Review question/instruction patterns and provenance; run applicable actual-generator/answer integrity checks.
- [x] Exercise lifecycle, results, retry, navigation and recorded progress.
- [x] Verify Prime Pop replenishment, composites, rendered danger line, single life deduction and end conditions.
- [x] Exercise account, StoreKit, parent gate and deletion contracts with isolated fixtures.
- [x] Exclude proven unused output while retaining original source assets.
- [x] Build and sync the release output; check local resources and native metadata.
- [x] Prepare the unsigned Mac handoff and evidence gallery/matrix.
- [ ] Compile/archive this exact candidate with Xcode and verify the aggregated privacy report.
- [ ] Complete the physical-device and real-service checks below before submission.

## Layout contracts and repairs

These preserve the existing art, palette, fonts, scene compositions and orientation choices. No source artwork was regenerated, deleted or replaced.

| Screen family | Existing contract and verified functional boundaries |
|---|---|
| Measured game scenes | Shared docked HUD owns its header/footer. Question and live controls stay within the remaining area; mathematical diagrams retain their existing scene. Percentage-only offsets must also reserve the HUD's minimum physical height. |
| Independent entry/keypad | Existing answer bay opens the existing entry dialog and nested keypad. Units, multi-part fields, validation and return actions stay readable and reachable. Required text is retained. |
| Island library | Three unique visible choices when at least three games exist; centred focus larger than its neighbours; swipe/arrows/selection synchronise with the level panel. Island artwork remains fixed while games change. |
| Map/navigation | Returning from an island restores that island on the map; returning from a game restores its game selection. Eight island journeys and all 35 game-return selections passed. |
| Briefing/help/results | Existing artwork and frames; reading region may scroll while main actions remain available. Modal geometry is measured within the modal, with hit tests for actual controls; covered game HUDs are not treated as modal controls. Help freezes gameplay and returns to the same state. |
| Profile/account/report/settings/shop | Existing normal-flow/scrolling layout. Partially visible controls in an intentional scroll region must become reachable after scrolling. Ordinary control targets are at least 44 CSS px. Parent/account gates remain in place. |
| Calm activities | Existing activity artwork and interactions; readable captions, accessible controls, completion and return to the hub. Pond retains its landscape orientation gate. |

Repairs include compact Potion ingredient controls and recipe clearance; Number Line answer-button padding; Place Value label padding and submit/dock clearance; Polygon line spacing; Angle hint spacing; Coordinates submit/dock separation; Perimeter feedback and label separation; graph/data label wrapping and padding; Remainder counters; Change Counter header clearance; tablet portrait HUD/question spacing; Prime Pop line spacing; Share Splitter question padding; and the small Lantern Camp caption.

Shared controls repaired: carousel arrows and hero-selection arrows now have 44px targets; the revision-quest summary has a 44px target; long briefing headings use adequate line spacing; assessment checkboxes have a functional 44px labelled touch area. Daily Quests' close control and tiny labels were repaired, and its modal now sits above the dock so the bottom action cannot be intercepted.

`UnifiedMiniGameHud` no longer shows a frozen countdown for Mean Machine and Potion Panic: `useGameplaySession` already intentionally treats those activities as untimed. Their mathematical completion conditions were preserved.

`FormulaScene` defers observer-driven sizing writes to the next animation frame, resolving WebKit resize-observer delivery errors. `PerimeterPlot` separates adjacent labels within their original anchor columns, retaining the diagram and edge-to-label leaders.

## Verification evidence and limits

- **576 layout cases, 1584 measured states**, all passed. iPhone 12 size covers practice, tiers 1–5, all three papers, both graph modes and all calm activities. Other device sizes cover practice, tiers 1 and 5, papers and calm activities.
- Viewports: 375×667 compact phone, 390×844 iPhone 12 size, 430×932 large phone, 768×1024 iPad; dimensions reverse for landscape activities. Account surfaces additionally cover 320×568, 402×874, 874×402, 1032×1376 and 1376×1032.
- **35 mathematics lifecycle flows** passed: actual App-bridge inactive/active callbacks, help hold/resume, clock expiry or genuine untimed mistakes, stable results, clean retry and Back. These are browser bridge contracts, not physical backgrounding tests.
- **6 calm activities** completed their real goals and returned to the hub; no microphone request occurred.
- **73 shared-screen/navigation cases**, **27 account/service fixture cases**, **17 source/type/content suites** passed.
- Eleven educational flows cover independent keypad entry, duplicate submission, instruction/scaffold separation, Learning Support master/untimed behaviour, three untimed winning paths, all three paper save/finish/review flows, revision-quest completion and reset.
- Calendar and pictogram UI: all five tiers completed, 50 first-attempt correct events recorded once; weak-skill targeting and canonical persistence passed. These functional checks use the local development target; the production layouts/assets were checked separately.
- Menu robustness at 125% browser root text passed. This is not native Dynamic Type or a claim that fixed-pixel game text scales with iOS settings.

[Complete per-activity coverage matrix (CSV)](../qa-artifacts/release-readiness-2026-11-04/coverage-matrix.csv) · [JSON](../qa-artifacts/release-readiness-2026-11-04/coverage-matrix.json) · [Screenshot gallery](../qa-artifacts/release-readiness-2026-11-04/index.html) · [Checks and logs](../qa-artifacts/release-readiness-2026-11-04/verification-summary.json).

Coverage is explicitly scoped. A successful lifecycle/end-state/retry check does not certify every possible winning strategy, seed, gesture or content permutation. Full correct-answer completion was exercised for calendar/pictograms, selected untimed mathematics paths and all calm activities; all other winning paths still need native playthrough evidence. Browser WebKit is not an iPhone simulator, the installed minimum-OS WebKit, physical safe areas, a real software keyboard or a performance benchmark. VoiceOver, native text-size settings, interruptions, audio/haptics, low-memory conditions and hardware rotation remain native checks. No “AAA” or Apple-compliance certification is claimed.

Prime Pop evidence: scored and practice rounds both ran for 30 seconds with new bubbles near the end; composites cleared the visible line without life loss; primes cost a life at the rendered line. An isolated missed prime disappeared and charged exactly one life, with no repeated deduction. Life/time ends, score retention (240 points in the scoring regression) and retry were verified. See `logs/prime-round.log`, `logs/prime-scoring.log`, `prime-single-miss/report.json` and `lifecycle/report.json` in the evidence directory. Prime mechanics were verified from the existing build; this pass did not replace them.

### Repaired-defect screenshot pairs

| Case | Before | After |
|---|---|---|
| Compact Potion controls | [Before](../qa-artifacts/release-readiness-2026-11-04/layout-small/potion_panic-L5-failure.png) | [After](../qa-artifacts/release-readiness-2026-11-04/final-small/potion_panic-L5.png) |
| Place Value submit/dock collision | [Before](../qa-artifacts/release-readiness-2026-11-04/layout-small/place_value_panic-L5-failure.png) | [After](../qa-artifacts/release-readiness-2026-11-04/final-small/place_value_panic-L5.png) |
| Tablet Prime line spacing | [Before](../qa-artifacts/release-readiness-2026-11-04/final-ipad/prime_pop-L1-failure.png) | [After](../qa-artifacts/release-readiness-2026-11-04/final-ipad/prime_pop-L1.png) |

The gallery's local image links, visible image decoding and search were verified in WebKit; see [gallery-check.json](../qa-artifacts/release-readiness-2026-11-04/gallery-check.json). Earlier failure evidence is retained separately and is not displayed as an updated screen.

## Question clarity and integrity

The inventory covers current catalogue engines, shared content, imported mathematical helpers and Matharia scene copy: [question-source-inventory.json](../qa-artifacts/release-readiness-2026-11-04/question-source-inventory.json). It is an inventory, not a correctness certificate for every string or generated combination. Actual-generator/property suites, all-tier runtime samples, longer stems, fractions/decimals/large values and multipart entry were checked. Applicable suites cover five-tier progression, mathematical construction, calendar/pictogram boundaries, paper totals/keys/partial-credit and equivalent answers, number lines, transformations, scaling and order of operations.

Authored assessment stems were left unchanged. `satsAdventure.ts` identifies its missions as original game missions with STA framework references; this pass did not rewrite quoted assessment material or add official-paper/scaled-score claims. Paper timings/marks remain 30 minutes/40 marks for arithmetic and 40 minutes/35 marks for each reasoning paper. Numerical data, answer keys, constraints, scoring and mathematical difficulty were preserved.

The substantive instruction correction is Coordinates Quest's reminder: the starting point is the point named in the question, rather than always `(0, 0)`. Other changes replace obsolete “choose” instructions with the real entry action and remove unnecessary naming-question narrative. Examples:

| Before | After |
|---|---|
| Combine those pieces and choose the answer. If finding the whole, work backwards. | Combine those pieces and enter your answer. If finding the whole, work backwards. |
| Start at (0, 0). Negative x goes left; negative y goes down. | Start at the point named in the question. Negative x moves left; negative y moves down. |
| Choose the total in the same length unit. Do not multiply length by width: that finds area. | Enter the total using the unit in the question. Do not multiply length by width: that finds area. |
| The Monster Minds have scrambled the palace records. What shape is this? | What is the name of this shape? |
| Restore the palace record by naming this shape. | Name this shape. |

[All wording changes](../qa-artifacts/release-readiness-2026-11-04/wording-edits.json). No substantive mathematical question-data correction was required by the passing suites. This release pass is not a new statutory curriculum-coverage certification. Repository documentation that describes median/mode as out of KS2 differs from the existing requested extension modes; those modes remain and are not given KS2 curriculum references by `MeanScene`.

## Package reduction and asset retention

| Comparable measure | Baseline | Final |
|---|---:|---:|
| Uncompressed generated web bytes | 350,234,919 | 267,608,693 |
| Generated web files | 866 | 727 |

Saved **82,626,226 bytes (23.59%)**. These are web-output measurements, not IPA, native archive, gzip or Apple upload sizes. The baseline already includes the repository's earlier contact-sheet exclusion; that saving is not counted twice.

`releaseAssets` removes only unreferenced generated binaries/resources from `dist-matharia`, checking emitted JS/CSS/HTML/JSON/SVG and URL-encoded references. It preserves runtime lookup maps and the public reference slices actually used by `GameUiKit`. The Matharia asset glob omits PNG encodings when `asset()` already prefers their matching WebP; PNG-only fallbacks remain. `VisionScene`'s unused eager environment glob was removed. No image/audio recompression or quality change was introduced.

The exclusion manifest lists 84 removed output resources; every corresponding source file was located and hashed. Originals remain under `src/assets`, `variants/matharia/assets` and `public`. The separately filtered duplicate encodings also remain in the source library. Native copy has exactly the 727 app files plus Capacitor's two empty Cordova placeholders; no stale web assets were retained. Static resource URLs and visible game resources passed loading checks. Audio/font URLs are included in that static validation; this is not an auditory-quality test.

[Exclusions and reasons](../qa-artifacts/release-readiness-2026-11-04/asset-exclusions.json) · [Retained source hashes and final file manifest](../qa-artifacts/release-readiness-2026-11-04/final-output.json) · [Largest remaining assets and extension totals](../qa-artifacts/release-readiness-2026-11-04/size-comparison.json).

## Apple/native review and exact remaining release steps

1. On a Mac, unzip the prepared handoff and compile **this exact candidate**, using the existing team/signing setup. Xcode 26+ with an iOS/iPadOS 26 SDK is required by Apple's current [upload requirement](https://developer.apple.com/news/upcoming-requirements/?id=04282026a). The current workflow already checks Xcode 26+, but its pinned candidate is older and was deliberately not published/repointed by this task.
2. Verify simulator launch and a Release archive, generated minimum OS, iPhone/iPad device families and orientations. Test a supported SE/mini, notched/larger iPhone and iPad, including the lowest supported OS. Complete real-device winning playthroughs of every activity, keyboard/safe-area/rotation checks, text sizes/VoiceOver, app interruption/backgrounding, sound/haptics and low-memory/performance checks. Browser evidence cannot close this gate.
3. Verify a unique marketing version/build against the live App Store Connect record. Checked-in `1.0`/`1` are placeholders; the existing upload pipeline calculates the next build from Apple. Do not manually upload this placeholder build. Historical `docs/RELEASE_READINESS.md` stated a 16.0 policy; the actual enforced Matharia floor is 16.4. Resolve/confirm that support-policy discrepancy without silently lowering the native target.
4. Inspect the final archive's privacy report and embedded SDK manifests. This pass adds the missing app `PrivacyInfo.xcprivacy` resource, declaring parent email/user ID for app functionality, linked to the parent account, with no tracking. Required-reason API entries remain empty because none were demonstrated in custom native source; do not invent reason codes. Verify actual SDK aggregation and App Store Connect privacy answers against [Apple's privacy-manifest documentation](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files). The 1024×1024 RGB app icon, launch storyboard/logo and plist/resource references passed static checks.
5. Run real Sandbox StoreKit purchase, cancellation, Ask to Buy/pending approval, expiry/revocation, restore and offline entitlement cases. Confirm the configured monthly/yearly product IDs and review metadata in App Store Connect. Fixture success does not establish live product availability or transactions.
6. Test real Apple and email authentication, then delete a disposable test account through fresh reauthentication and the deployed deletion service, including Apple-token revocation. The source/unit/browser error paths passed; live service/key/provider configuration was not exercised. Apple's [account-deletion guidance](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion) requires an in-app initiation path and Apple credential revocation where applicable.
7. Confirm privacy-policy content matches this independent app, App Store privacy answers, age-rating/Kids-category choices, parental gates, subscriptions, review notes and screenshots. The shipped privacy URL returned HTTP 200; policy/legal alignment and live App Store metadata are not certified here. Review applicable [App Review guidelines](https://developer.apple.com/app-store/review/guidelines/), including completeness, purchases and children's privacy.
8. After native/service validation and explicit upload authorisation, publish/repoint the prepared candidate and run the existing protected pipeline. No upload or submission was started by this pass.

## Handoff and changes

[Unsigned Mac candidate](../qa-artifacts/release-readiness-2026-11-04/mac-handoff/matharia-mac-testflight-candidate.zip) · [Mac instructions](../qa-artifacts/release-readiness-2026-11-04/mac-handoff/MAC-HANDOFF.txt) · [Local candidate checksums/status](../qa-artifacts/release-readiness-2026-11-04/mac-handoff/upload-readiness.json).

This ZIP contains native source, the existing local Swift plugin and the exact compiled web snapshot. It is not an IPA or proof of native compilation. `--local-only` prepares its manifest without changing the active CI release pointer. The handoff now rejects unexpected stale native web resources; credentials/profiles/environment files are excluded.

Modified files since this pass began (pre-existing modifications were preserved):

- `src/games/PolygonPalaceGame.tsx`
- `src/systems/content/learnerGuides.ts`
- `variants/matharia/vite.config.ts`
- `variants/matharia/scripts/prepare-testflight-handoff.py`
- `variants/matharia/scripts/qa-native-access.mjs`
- `variants/matharia/scripts/verify-app-opening.mjs`
- `variants/matharia/src/lantern-camp.css`
- `variants/matharia/src/readability.css`
- `variants/matharia/src/UnifiedMiniGameHud.tsx`
- `variants/matharia/src/VisionScene.ts`
- `variants/matharia/src/screens/AreaScene.tsx`
- `variants/matharia/src/screens/FormulaScene.tsx`
- `variants/matharia/src/screens/MeanScene.tsx`
- `variants/matharia/src/screens/PerimeterScene.tsx`
- `variants/matharia/src/screens/prime-scene.css`
- `variants/matharia/src/screens/RocketScene.tsx`
- `variants/matharia/src/screens/share-scene.css`
- `variants/matharia/src/shared/mission-reference.css`
- `variants/matharia/src/shared/shared-adventure.css`
- `variants/matharia/native/ios/App/App.xcodeproj/project.pbxproj`
- `scripts/verify-calendar-pictogram-ui.mjs`
- `scripts/verify-educational-flows.mjs`
- `scripts/verify-iphone12-legibility.mjs`
- `docs/ios-release-readiness-working.md`
- `docs/RELEASE_READINESS.md`

New files:

- `docs/release-readiness-2026-11-04.md`
- `scripts/qa/create-release-evidence.py`
- `scripts/qa/discover-ios-release.mjs`
- `scripts/qa/inventory-release-content.mjs`
- `scripts/qa/run-ios-release-checks.mjs`
- `scripts/qa/verify-prime-single-miss.mjs`
- `scripts/qa/verify-release-calm.mjs`
- `scripts/qa/verify-release-gallery.mjs`
- `scripts/qa/verify-release-lifecycle.mjs`
- `scripts/qa/verify-release-package.py`
- `scripts/qa/verify-release-shared-screens.mjs`
- `variants/matharia/native/ios/App/App/PrivacyInfo.xcprivacy`
- `variants/matharia/release-assets.ts`

Assumptions: the current `variants/matharia` target and 16.4 native configuration are the release source of truth; an ordinary App Store candidate must retain its production access checks, so the TestFlight all-games flag is off. Tests use isolated entitlement/account fixtures to inspect paid games. Source-only and browser checks are distinguished from native verification. No external legacy assumptions were used.
