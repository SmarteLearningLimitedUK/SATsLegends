# Approved gameplay HUD and question spacing — 1 November 2026

The supplied HUD photograph is now the shared bottom-control specification for the 37 approved activity screens. It uses five independent sapphire/gold tiles, centred ivory line icons and live Back, Tips, Board, Sound and Music labels/actions. Existing per-scene footer locations are retained. All three mock papers expose their existing mission working board through Board.

Place Value Panic's counter occupies a separate padded row inside the question frame. Insets follow the frame's actual inner gold edges. Responsive question height and the guardian's reserved region prevent the counter, question, ornament and character from competing for the same space. Long-question treatment changes presentation only.

## Reference and rendering path

- User-approved image: `variants/matharia/reference/approved/gameplay-bottom-hud.jpg` (1280 × 254), with provenance and SHA-256 in `variants/matharia/reference/gameplay-bottom-hud.json`.
- Approximate visible reference strip: x=110–1170, y=36–234. Five near-square controls, roughly 200 × 194 pixels each, separated by roughly 12–18 pixels. These are composition measurements, not a screenshot used as the UI.
- Existing independent production frame: `buttons/scale_key_v4`, RGBA 1391 × 476, no baked text or icons. Its full rounded corner curves are retained by nine-slicing; the straight centre sections resize independently. Source and reference were visually inspected.
- Real iOS rendering is React/TypeScript through the Matharia Vite presentation replacements. `GameActionDock.tsx` owns actions and artwork; `UnifiedMiniGameHud.tsx` mounts it and connects the mock-paper workpad event. `sapphire-gold-dock.css` owns gameplay dock contents; scene CSS owns its reserved position/size.
- Tiles stay square within available footer width/height. Controls retain at least 44 CSS-pixel targets. No flattened screenshot, background masks or concealed background controls were added.

## Evidence and checks

- Compiled iOS web bundle: **111/111 HUD layout captures passed**, all 37 screens at phone, iPad and iPhone 15 viewports. Labels, independent frames, equal tile sizes, visible/painted icon centring, text containment and unobstructed touch targets checked.
- Phone viewports: portrait 390 × 844 / landscape 844 × 390. iPad: portrait 768 × 1024 / landscape 1024 × 768. Orientations follow the approved manifest.
- User confirmed the supplied images came from an iPhone 15. Added its fullscreen app dimensions, **393 × 852 points** (or reverse); full-size previews use **1179 × 2556 pixels at 3×**. The installed Playwright device descriptor confirms the screen size/scale; its Safari toolbar viewport is not used for this fullscreen app. Simulated native insets are 59 top/34 bottom in portrait and 59 left/right/21 bottom in landscape. These inset values are test assumptions, not measured native-device results. All 37 WebKit HUD cases fit these simulated safe areas. Angle Arena's reserved footer minimum was corrected to 236px (five 44px targets plus four 4px gaps), removing its 3px safe-area overrun.
- **18/18 WebKit interaction cases passed**: Place Value Panic, Number Line Ninja, Fraction Forge and all three mock papers at compact (320 × 568 or reverse), phone and iPad sizes. Tips open/close, Board edit/reopen with retained notes, Sound/Music toggle/restore and Back to level selection exercised through live controls.
- **Three additional Angle Arena control cases passed** at phone, iPad and iPhone 15 sizes after correcting its reserved footer width (21 live-control cases in total).
- **22 question viewport checks passed** across Chromium and WebKit, using practice and high-level prompts at 320 × 568, 390 × 844, 430 × 932, 768 × 1024 and 1032 × 1376, plus two iPhone 15 states with simulated native insets. The counter clears the ornament, and text fits the padded inner frame. The final WebKit captures use the compiled bundle.
- **Two complete Place Value game flows passed** in Chromium at 375 × 667 and 390 × 844: touch drag, tap return, keyboard input, independently parsed correct answers, score/remaining-strength feedback, pause/resume, wrong answers/lives, failure/retry, ten solved rounds, victory and return to the map. All twenty changing prompts stayed contained; the longest exercised prompt was 83 characters.
- Variant typecheck and production build passed. The existing source-contract check passed, including hashes for all 37 original approved references and retention of the original intro/level/results controllers.
- Capacitor sync passed; iOS minimum 16.4 verified. All **838** compiled web files match the copies in the native iOS project by SHA-256.
- QA account requests use the repository's isolated fixture; gameplay and assets are real. Native iOS simulation/device testing has **not** been performed for this patch.

The development server reloaded during native bundle sync and interrupted some captures. The final compiled-bundle matrix supersedes that interrupted run. Pre-correction Angle Arena results are retained alongside the successful rechecks.

Evidence files under `qa-artifacts/question-flourish/`:

- `approved-vs-running-hud.png`: supplied reference above / actual live HUD below. This comparison preserves both screenshots; it is not game artwork.
- `all-game-huds.png`: review sheet of all 37 captured HUDs.
- `hud/production/chromium/`: full game and HUD captures; `checks-phone-ipad.json`.
- `hud/production/iphone15/`: all 37 fullscreen iPhone 15 WebKit HUD captures and safe-area measurements.
- `hud/webkit/final-interaction/checks-phone-ipad-compact.json`: live control checks.
- `question/production/webkit/geometry.json` and `after/chromium/geometry.json`: question-layout evidence.
- `question/production/iphone15/`: 3× iPhone 15 practice and high-level question previews and measurements.
- `pvp-gameplay/checks.json`, failure/victory captures and longest-prompt captures: gameplay flow evidence.
- `build.log`, `typecheck.log`, `source-contract.log`, `ios-sync.log`, `native-bundle-copy.json` and `RESULT.json`.

## Screen checklist

Each row uses the new shared approved HUD reference above. These statuses concern the HUD; they do not claim a new full-gameplay audit of every activity.

| Screen | Route | Orientation | Phone HUD | iPad HUD | iPhone 15 HUD | Live control checks |
|---|---|---|---|---|---|---|
| Place Value Panic | `/game/1/37` | portrait | Pass | Pass | Pass | Pass: compact/phone/iPad WebKit |
| Number Line Ninja | `/game/1/38` | landscape | Pass | Pass | Pass | Pass: compact/phone/iPad WebKit |
| Prime Pop | `/game/1/39` | portrait | Pass | Pass | Pass | Shared actions covered by representatives |
| Rounding Rocket | `/game/1/40` | portrait | Pass | Pass | Pass | Shared actions covered by representatives |
| Maths vs Zombies | `/game/1/46` | landscape | Pass | Pass | Pass | Shared actions covered by representatives |
| Takeout Rush | `/game/2/10` | portrait | Pass | Pass | Pass | Shared actions covered by representatives |
| Fraction Forge | `/game/2/15` | landscape | Pass | Pass | Pass | Pass: compact/phone/iPad WebKit |
| Match Mastery | `/game/2/20` | portrait | Pass | Pass | Pass | Shared actions covered by representatives |
| Percent Power | `/game/2/25` | portrait | Pass | Pass | Pass | Shared actions covered by representatives |
| Simplify Sprint | `/game/2/30` | landscape | Pass | Pass | Pass | Shared actions covered by representatives |
| Angle Arena | `/game/3/12` | landscape | Pass | Pass | Pass | Pass: phone/iPad/iPhone 15 |
| Polygon Palace | `/game/3/17` | portrait | Pass | Pass | Pass | Shared actions covered by representatives |
| Area Architect | `/game/3/22` | landscape | Pass | Pass | Pass | Shared actions covered by representatives |
| Transformation Station | `/game/3/27` | landscape | Pass | Pass | Pass | Shared actions covered by representatives |
| Coordinates Quest | `/game/3/32` | landscape | Pass | Pass | Pass | Shared actions covered by representatives |
| Conversion Canyon | `/game/3/37` | portrait | Pass | Pass | Pass | Shared actions covered by representatives |
| Perimeter Path | `/game/3/42` | landscape | Pass | Pass | Pass | Shared actions covered by representatives |
| Mean Machine | `/game/4/10` | portrait | Pass | Pass | Pass | Shared actions covered by representatives |
| Graph Grabber | `/game/4/18` | landscape | Pass | Pass | Pass | Shared actions covered by representatives |
| Line Graph Lab | `/game/4/23` | landscape | Pass | Pass | Pass | Shared actions covered by representatives |
| Data Detective | `/game/4/28` | landscape | Pass | Pass | Pass | Shared actions covered by representatives |
| Factor Frenzy | `/game/5/10` | portrait | Pass | Pass | Pass | Shared actions covered by representatives |
| Multiplication Mine | `/game/5/19` | portrait | Pass | Pass | Pass | Shared actions covered by representatives |
| Order Ops Arena | `/game/5/24` | portrait | Pass | Pass | Pass | Shared actions covered by representatives |
| Formula Forge | `/game/5/29` | portrait | Pass | Pass | Pass | Shared actions covered by representatives |
| Remainder Run | `/game/5/34` | landscape | Pass | Pass | Pass | Shared actions covered by representatives |
| Chrono Dash: Time Trial | `/game/6/9` | portrait | Pass | Pass | Pass | Shared actions covered by representatives |
| Problem Pyramid | `/game/6/14` | portrait | Pass | Pass | Pass | Shared actions covered by representatives |
| Lava Path | `/game/6/19` | landscape | Pass | Pass | Pass | Shared actions covered by representatives |
| Change Counter | `/game/6/24` | landscape | Pass | Pass | Pass | Shared actions covered by representatives |
| SATs Paper 1: Arithmetic | `/game/8/1` | portrait | Pass | Pass | Pass | Pass: compact/phone/iPad WebKit |
| SATs Paper 2: Reasoning | `/game/8/2` | landscape | Pass | Pass | Pass | Pass: compact/phone/iPad WebKit |
| SATs Paper 3: Reasoning | `/game/8/3` | landscape | Pass | Pass | Pass | Pass: compact/phone/iPad WebKit |
| Potion Panic | `/game/7/9` | landscape | Pass | Pass | Pass | Shared actions covered by representatives |
| Share Splitter | `/game/7/14` | landscape | Pass | Pass | Pass | Shared actions covered by representatives |
| Ratio Racer | `/game/7/19` | landscape | Pass | Pass | Pass | Shared actions covered by representatives |
| Scale Builder | `/game/7/24` | landscape | Pass | Pass | Pass | Shared actions covered by representatives |

## Changed files

- `variants/matharia/src/GameActionDock.tsx`
- `variants/matharia/src/UnifiedMiniGameHud.tsx`
- `variants/matharia/src/sapphire-gold-dock.css`
- `variants/matharia/src/measured-hud.css`
- `variants/matharia/src/main.ts`
- `variants/matharia/src/screens/PlaceValueScene.tsx`
- `variants/matharia/src/screens/place-value-scene.css`
- `variants/matharia/src/screens/angle-scene.css`
- `variants/matharia/reference/approved/gameplay-bottom-hud.jpg`
- `variants/matharia/reference/gameplay-bottom-hud.json`
- `docs/concept-recreation/GAMEPLAY-HUD-2026-11-01.md` (this checklist) and `docs/concept-recreation/WORKLOG.md`.
- Generated native web assets refreshed by Capacitor sync. Original gameplay controllers/question banks were not edited in this pass.

## Assumptions and remaining work

The supplied photograph specifies the shared bottom gameplay HUD. Menus and top HUDs keep their existing layout ownership. Current repository assets supply the independent blue/gold frame; its light reflections differ slightly from the photograph. The comparison is evidence of the current result rather than a claim of pixel identity.

The new source and iOS web bundle are prepared locally. This patch has **not been uploaded to TestFlight**. A new signed macOS archive, native device/simulator checks and the existing protected upload review remain necessary before installation through TestFlight. Browser viewport checks are not native iOS testing. iOS 16.4 runtime behaviour remains unverified for this patch.

No external legacy assumptions were used. Source decisions came from the current request, the attached image and current repository files.
