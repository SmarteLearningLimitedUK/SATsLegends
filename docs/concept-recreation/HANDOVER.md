# Matharia presentation pass — source and browser evidence

The separate reskin is `D:/BrainZilla/GitHub/SATsLegends/variants/matharia`. Its React entry is `src/main.tsx` inside that directory, with its own Vite configuration, presentation adapters, assets, Capacitor configuration and native project. The original learning/game controllers and account integrations are reused from the main repository. The iOS gameplay screens render through React in Capacitor/WKWebView. The native launch screen, app icon, lifecycle bridge and orientation declarations live in the separate Xcode project.

The active checkout is `codex/website-refinement-2026-10-28`, based on `fe35bdcf`. Existing unrelated changes were preserved. The earlier `8d37` worktree was inspected as an explicitly supplied reference; it was not selected as the active checkout or modified. No branch switch, merge, publication, deployment or Apple submission was performed.

## Review and source

- Local production preview: <http://127.0.0.1:3015/play>
- Running/reference comparison gallery: <http://127.0.0.1:3016/concept-recreation/index.html>
- Map, menus, wellbeing and account captures: <http://127.0.0.1:3016/concept-recreation/non-game/index.html>
- Approved reference manifest: [approved-screens.json](approved-screens.json)
- Gameplay checklist: [screen-checklist.json](screen-checklist.json)
- Other screens and states: [non-game-checklist.json](non-game-checklist.json)
- Work log: [WORKLOG.md](WORKLOG.md)
- Implementation and asset inventory: [implementation-files.txt](implementation-files.txt)

All 37 gameplay concepts have dedicated measured renderers. Match Mastery and Prime Pop are portrait. Peaceful Pond is landscape, and the map retains the original eight destinations in vertically snapping pages with one primary island visible. Live text, questions, answer controls, score, clock and lives remain connected to the original controllers. No approved screenshot is used as a finished interactive screen.

The initial requested manifest was absent. Its 37 exact selections were recovered from the explicitly supplied concept gallery, including revised Match Mastery, Fraction Forge, Angle Arena and Coordinates Quest. The approved image files are unchanged and retain their recorded hashes. No distinct approved non-game screen image was present in that manifest/gallery; those surfaces retain repository layouts and artwork with the shared Matharia presentation.

## Changes and preservation

The implementation writes within `variants/matharia`, `docs/concept-recreation` and QA artifacts. Root gameplay, question-bank and account source files were not edited on disk by this pass. The variant adapts their JSX/rendered presentation through Vite aliases and explicit presentation transforms. See the inventory for individual source, style, preparation-script and asset files.

Independent scenery, transparent heroes/props, live diagrams, blank frames and controls replace unsuitable flattened materials. The shared frames use aspect-preserving canvas nine-slicing. Old parchment/quill panel imagery and competing footer raster skins were removed at their rendering sources. No patches, masks or blur were added to conceal unsuitable background UI.

Specific interaction work includes cross-engine pointer capture for Conversion Canyon, active-time feedback/pause handling, larger SVG handles and controlled numeric entry in Scale Builder, proper screen-exit input isolation, immediate reduced-motion exits, centred shared HUD icons, and fully contained wellbeing instructions/Tips. Polygon's original full hidden-edge guidance is retained in the existing Tips container rather than beneath a frame ornament. Peaceful Pond retains its original ten placements and noticing sequence, with separate lily pads, target rings and four transparent koi.

Question banks, answers, explanations, scoring, lives, difficulty, rewards and purchase/account destinations are reused. The repository's content checks passed: 600 paper questions, the 53-family/1,000-seed content-depth check, and upgraded curriculum/shipment checks. Browser accounts and cloud-save/purchase UI checks use the repository's isolated fixture. No real family data, email or payment operation was submitted.

## Verification evidence

The gallery and checklist link each actual running capture, unchanged approval, side-by-side comparison, aligned overlay and difference image. Captures include build/source fingerprints and repeatable source-game states where available. Review is visual and functional; a numerical image-similarity score is not used as acceptance evidence.

Gameplay functional checks cover actual input, correct/incorrect feedback, score/life/clock changes, pause/resume, failure/Retry where applicable, the complete original goal, results and navigation. Separate checks cover normal/reduced motion, simulated safe areas, browser root-font changes and rotation gates. The latest aggregate counts and build fingerprints are written to `qa-artifacts/concept-recreation/verification-summary.json`.

Additional evidence includes all eight original map destinations and dock callbacks across eight browser/device cases, all ten Pond placements/gate/completion across eight landscape cases, the other five complete wellbeing goals across 30 cases, and settings/coin purchase/equipment/reload/all-four-hero/name persistence across six cases. The save check uses the original online event to flush its intentionally staggered queue into the isolated fixture.

The browser runtimes are Chromium 147 and Playwright WebKit 26.4. Reference captures use each approved raster/orientation. Other coverage includes compact, standard and large phone viewports plus portrait/landscape iPad viewports as appropriate. These are browser checks, not native iOS tests.

TypeScript and the iOS-mode Vite build pass. Capacitor copies the resulting bundle into `variants/matharia/native/ios/App/App/public`. Byte-for-byte copy verification is recorded in `qa-artifacts/concept-recreation/build-and-platform.json`. The bundle currently contains 852 files, approximately 325 MiB, including the shared source artwork and audio library; this is installed-package size, not a measured per-screen network transfer or device memory figure.

## Specific differences and production limits

- The original game rules take precedence over illustrative concept states. Examples include colourless tier-five Match Mastery, Angle Arena's existing automatic fire, original Potion ingredient controls, and source question values/counts. Per-screen differences are recorded in the gameplay checklist.
- Scale Builder uses six columns/two rows of numeric keys at reference/phone sizes to retain 44px touch targets in the available landscape height, and four columns/three rows on iPad. Its original L-shape proportions/annotations and regenerated frames/hero pose differ from the illustration. Other regenerated ornament and prop details also differ from the exact raster art.
- There is no Mac, Xcode, simulator or attached iOS device on this Windows host. Native compilation, signing, actual safe areas, Dynamic Type/VoiceOver, interruptions, native input and physical-device animation/memory performance remain unverified. Browser font/inset checks do not establish those behaviors.
- **Matharia minimum OS is iOS 16.4, explicitly approved on 1 November 2026.** All separate-project Xcode configurations and the Swift package use 16.4; Capacitor hooks retain the exact minor version after sync/update. This resolves the declared iOS 15 floor mismatch with the Tailwind 4/Safari 16.4 stack. Actual iOS 16.4 rendering still requires native verification. The original SATs Legends project remains at iOS 15, outside this separate-reskin change. See [Tailwind browser support](https://tailwindcss.com/docs/compatibility#browser-support) and [WebKit's container-query release notes](https://webkit.org/blog/13152/webkit-features-in-safari-16-0/#container-queries).
- Live authentication/recovery returns, entitlement refresh and payment-provider/native purchase behavior require staging/device verification. Fixture checks preserve and exercise the existing UI/state wiring; they do not certify a live purchase.
- The user selected the existing SATs Legends TestFlight record: the reskin now uses `com.smartelearning.satslegends` for upload while retaining its separate source and Matharia display name. The original project remains `native/ios/App/App.xcodeproj`; the reskin project is `variants/matharia/native/ios/App/App.xcodeproj`. The protected macOS workflow verifies the live Apple record, chooses an unused build number and records upload/processing evidence. A local source checkout alone does not establish which commit Apple currently distributes through TestFlight.

On a Mac, follow the main `native/README.md` for prerequisites, then run the separate project's `npm run ios:sync` from `variants/matharia` and open its Xcode project. Verify the supported OS floor and the above native/provider checks before any production release.

Assumptions: current repository mechanics are authoritative; approved concepts specify presentation; original non-game layouts remain authoritative where no approved image exists. No external legacy assumptions were used.


## Shared-screen update — 1 November 2026

The intro/help/mock briefings, island level selector, victory and retry surfaces were rebuilt after the shared-screen vision was approved. The latest evidence for those surfaces supersedes their earlier captures. See [shared-screen handover](SHARED-SCREENS-HANDOVER.md) and [persistent checklist](shared-adventure-checklist.json). Original gameplay/source contracts and all 37 approved concept image hashes remain intact. The separate Matharia minimum was subsequently raised to iOS 16.4 at the user’s request. Native execution on that minimum remains unverified.
