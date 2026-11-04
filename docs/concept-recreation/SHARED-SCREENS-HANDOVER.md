# Matharia shared screens — 1 November 2026

The approved shared-screen direction is implemented in the separate Matharia variant. The current checkout remains `codex/website-refinement-2026-10-28`; no branch switch, merge, deploy, publishing or Apple submission was performed. Unrelated work was preserved.

## Result

- Briefings use the current game's clean scenery, a separate canonical hero, an ornate sapphire reading panel, numbered instructions, the original worked example and a live primary action. Long content scrolls inside the panel; the primary and close controls remain accessible. Practice, help/revision and mock briefings retain their original behavior.
- The island mission board uses a bounded scenic identity and compact game headers with expandable live level rows. The next playable group opens initially. Original ordering, unlock conditions, completed states, token counts, difficulty labels, navigation and calm-break callbacks are retained. Compact phones use the actual viewport, so controls are not shrunk by the inherited stage scale.
- Victory uses independent transparent celebration artwork for Barratt, Bran, Mochi and Vex; gems reveal gently, the XP bar begins at the true previous level/progress, and existing bonuses remain visible or accessible in the reading region. Result animations do not restart when an equivalent parent result object rerenders. Primary navigation remains available during animation.
- Retry keeps a supportive hero and accessible results, Retry, Map, practice and any existing calm-break actions. Short landscapes prioritize the title and performance metrics; additional result detail scrolls within the panel.
- Decorative artwork does not receive input. Gem rendering samples the visible alpha bounds of the existing independent asset, rather than centering its transparent margins. Background screenshots, baked controls, concealment patches and masks are not used.

## Scope and assumptions

The current accepted sapphire-and-gold vision, repository artwork, canonical heroes and existing game contracts were the source of truth. Existing content and mechanics remain authoritative. There are no new game rules, reward systems, progression requirements or backend integrations. No external legacy assumptions were used.

The app renders these screens through React/TypeScript in Capacitor's web view. Swift/native navigation and lifecycle code were not changed. The original root source files were not edited for this pass; guarded build-time adapters replace their presentation while retaining their controllers/calculations/callbacks.

## Verification and evidence

The [browser gallery](../../qa-artifacts/shared-adventure/index.html) includes actual before/after captures and all 37 briefings with engine/viewport selection. These new shared surfaces follow the accepted textual vision; the comparisons are before-versus-implemented, not claims of pixel matching a new approved raster reference.

The [verification summary](../../qa-artifacts/shared-adventure/verification-summary.json), [per-game checklist](../../qa-artifacts/shared-adventure/screen-checklist.json) and [persistent shared-screen checklist](shared-adventure-checklist.json) record the precise coverage.

| Coverage | Evidence |
|---|---|
| 37 briefings and Start actions × 3 profiles × 2 engines = 222 cases | `chromium-checks.json`, `webkit-checks.json`, and `*-remaining-checks.json` |
| 24 main level-board checks; 18 live level-to-game navigation checks | Same records; original locked controls remain disabled |
| All eight islands on compact phones in both engines | `*-extras-checks.json` and `*/board-final-compact-*.png` |
| Six real five-shipment victories and six real three-mistake failures/retries | Final `*-results-checks.json`; 100% accuracy, three stars and canonical +105 XP verified |
| Five additional real wins covering all four canonical heroes, including normal and reduced motion | `*-extras-checks.json`; actual hero captures |
| Practice completion gives no XP/brainpower and reopens practice on retry | Both engines, `*-extras-checks.json` |
| Help retains revision content, pauses the timer for five virtual seconds and resumes it | Both engines, `*-extras-checks.json` |
| A completed game and three earned tokens survive reload | Chromium, `progress-retention` record; original prerequisites remain in force |
| Keyboard focus trap and Enter-to-start | Both engines, `keyboard-focus-start` records |
| 150% browser text override and simulated safe insets | Both engines, portrait and compact landscape; not native Dynamic Type or native-device testing |
| Original controller/calculation blocks and all 37 approved image hashes retained | [Source preservation](../../qa-artifacts/shared-adventure/source-preservation.json) |
| TypeScript and iOS-mode Vite build pass; native web copy matches all 856 files byte for byte | [Build/platform report](../../qa-artifacts/shared-adventure/build-and-platform.json) |

Viewport coverage: 320×568 / 568×320 compact phone, 390×844 / 844×390 phone, 430×932 large phone, 768×1024 / 1024×768 tablet. Chromium and browser WebKit were used. Core gameplay's previously recorded full functional suite was not relabeled as rerun here; this pass's additional checks specifically exercise the changed shared surfaces and representative real game outcomes.

During verification, the compact selector's inherited scaling was caught and removed. The geometry check distinguishes fully visible controls from rows intentionally clipped at the scroll-list edge. The progress test's direct tier-five win retains the original prerequisite lock because earlier difficulties were not completed by the fixture; progress and earned tokens still persist. No unlock rule was changed to satisfy a test.

## Source and required assets changed

- `variants/matharia/presentation-transform.ts` — shared presentation dispatch, scoped responsive island shell and result XP initialization/reduced motion.
- `variants/matharia/shared-screen-transform.ts` — guarded render-boundary adapters; original controllers and reward helpers retained.
- `variants/matharia/src/main.ts` — load the new coherent shared-screen stylesheet.
- `variants/matharia/src/shared/AdventureArtwork.tsx` — independent backgrounds, frames, controls and hero presentation.
- `variants/matharia/src/shared/BriefingScene.tsx` — briefing, help/revision and mock layout.
- `variants/matharia/src/shared/IslandAdventureBoard.tsx` — responsive mission/level presentation using original row state and callbacks.
- `variants/matharia/src/shared/ResultGems.tsx` — reward reveal using real earned counts.
- `variants/matharia/src/shared/GemArtwork.tsx` — aspect-preserving SVG viewport for the existing gem's measured visible bounds.
- `variants/matharia/src/shared/shared-adventure.css` — scoped tokens, layouts, responsive constraints, feedback and reduced-motion treatment.
- `variants/matharia/assets/png/heroes/hero_barratt_victory_v1@2x.webp`
- `variants/matharia/assets/png/heroes/hero_bran_victory_v1@2x.webp`
- `variants/matharia/assets/png/heroes/hero_mochi_victory_v1@2x.webp`
- `variants/matharia/assets/png/heroes/hero_vex_victory_v1@2x.webp`
- `variants/matharia/reference/shared-adventure-assets.json` — source references and asset provenance. Original generated alpha is retained; no painted background cleanup.
- `variants/matharia/scripts/verify-shared-adventure.mjs`
- `variants/matharia/scripts/verify-shared-adventure-extras.mjs`
- `variants/matharia/scripts/verify-shared-source-contract.mjs`
- `variants/matharia/scripts/build-shared-adventure-review.py`
- `variants/matharia/README.md`, this handover, `shared-adventure-checklist.json`, and scoped updates to `non-game-checklist.json`, `HANDOVER.md`, `WORKLOG.md`.
- Generated browser evidence in `qa-artifacts/shared-adventure/` and the copied web bundle under `variants/matharia/native/ios/App/App/public/`.

## Resume / reproduce

From the repository root, use the installed dependencies:

```powershell
node node_modules/typescript/bin/tsc --noEmit -p variants/matharia/tsconfig.json
node node_modules/vite/bin/vite.js build --config variants/matharia/vite.config.ts --mode ios
node variants/matharia/scripts/verify-shared-source-contract.mjs
$env:PLAYWRIGHT_BROWSERS_PATH='C:/Users/samva/AppData/Local/ms-playwright'
$env:MATHARIA_ENGINE='chromium'
$env:MATHARIA_SECTION='all'
node variants/matharia/scripts/verify-shared-adventure.mjs
node variants/matharia/scripts/verify-shared-adventure-extras.mjs
```

Repeat with `MATHARIA_ENGINE='webkit'` using the repository's prepared WebKit runtime. Keep at most two browser verification jobs active. Tests use isolated local account fixtures and do not write to a real account. The production preview must serve `dist-matharia` on port 3015. The existing QA artifact server serves the review on port 3016 at `/shared-adventure/index.html`.

After the browser capture scripts have produced matching before/after viewport files, build the gallery with `python -X utf8 variants/matharia/scripts/build-shared-adventure-review.py`.

## Remaining production work

No blocking browser layout/interaction defects were identified in the covered cases. Native iOS compilation and execution were unavailable on this Windows host. A Mac/device pass must still verify actual safe areas, rotations, VoiceOver, Dynamic Type, interruptions and native performance. The user subsequently approved an iOS 16.4 minimum for Matharia. Its Xcode and generated Swift package settings now agree at 16.4, with sync/update hooks to preserve the minor version. Actual execution on iOS 16.4 remains unverified. Live account and payment providers were not certified by these isolated browser checks.

The separate native project is `variants/matharia/native/ios/App/App.xcodeproj`. The user subsequently selected the existing SATs Legends TestFlight app; upload identity is now `com.smartelearning.satslegends`, with the Matharia display name and artwork retained. Consult `TESTFLIGHT-HANDOVER.md` and the CI run evidence for current native-build/upload status; the browser checks above do not establish native execution or Apple processing.
