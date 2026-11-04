# Multiplication Mine — visible mining and usable screen space

Request: replace the empty multiplication display with a rock that gets hit and improve the portrait composition. Retain the existing original controller, questions, written multiplication, carry values, timers, lives, four-product progression, scoring, rewards and navigation. Assumptions: keep the approved portrait orientation and current Matharia mine/hero identities. The latest request adds an actual mining playfield to the approved reference (853×1844), which previously emphasized written working without a rock.

Visual thesis: a physical timber ledge and sapphire crystal ore form the focal point in the amber/cyan mine. Content order: shared HUD, live question, original written board when required, illustrated mining scene, compact live answer dock, shared navigation. Interaction: a short pickaxe downstroke, timed contact chips and progressive original ore states; final crystal reveal. Reduced motion keeps the ore-state changes and removes the swing/particles. The original timings and input locks control the interaction.

## Screen checklist

| Reference | Real rendering path | Assets | Status | Evidence |
| --- | --- | --- | --- | --- |
| Attached Photo 1; `variants/matharia/reference/approved/multiplication_mine.png` | Original `src/games/MultiplicationMineGame.tsx`, existing presentation adapter, `MineScene.tsx` | Original four-state 3D ore atlas, sapphire pickaxe, existing hero/scenery; independent new timber ledge | Implemented; browser layout, interaction, mining and reduced-motion checks pass; native execution pending | `qa-artifacts/mine-strike-focus/RESULT.json`, before/after and mining GIF |

## Source and asset scope

- `variants/matharia/src/screens/MineScene.tsx`
- `variants/matharia/src/screens/mine-scene.css`
- `variants/matharia/assets/png/props/mine_floor_v4@2x.webp`
- `variants/matharia/reference/mine-floor-v4.json` — built-in image-generation prompt, source path, alpha-trim metadata and asset hash.
- `variants/matharia/scripts/verify-mine.mjs` — configurable preview/output paths, wait for the local test account on the mission board, discover the real level route and check visible captions.
- This handover and the appended root `WORKLOG.md` entry. Diagnostic scripts/captures live in `qa-artifacts/mine-strike-focus/`.

The saved production asset is [mine_floor_v4@2x.webp](D:/BrainZilla/GitHub/SATsLegends/variants/matharia/assets/png/props/mine_floor_v4@2x.webp). The exact final generation prompt and source/provenance are in [mine-floor-v4.json](D:/BrainZilla/GitHub/SATsLegends/variants/matharia/reference/mine-floor-v4.json). It was generated with the built-in image-generation tool. The 2152×338 lossless WebP retains real alpha; its margin crop excludes isolated alpha=1/255 noise, without repainting retained pixels. Original ore, pickaxe, scenery and hero assets remain unchanged.

The 640×560 illustration has shared physical anchors: the independent ledge starts at y=460, hero soles meet y=505, the ore ends at y≈505, and the pickaxe pivots from its handle into the ore face near (498,372). At 47.6ms into the 340ms swing, the actual blade-tip pixel is projected into the rendered ore atlas; the sampled alpha is above 100 for every checked damage state. Sprite clipping selects one original atlas frame; it is not a patch or mask over scenery. No flattened screen, background cover or baked live controls are introduced.

Four short choices share a row; long product values use two columns to keep full numbers legible. The original prompt and feedback share a padded caption, while the complete guidance remains available through the existing Tips action. Higher tiers keep the original written-method JSX and aligned place-value columns.

## Verification and limits

Evidence root: `qa-artifacts/mine-strike-focus/`.

- `before-after.jpg` / `before-after.gif`: actual beginner game before and after at the same 393×852 viewport with simulated 59/34px insets. Generated questions differ (5×8 before, 10×12 after); these compare composition, not pixel similarity. No source questions were edited.
- `written-before-after.jpg`: same viewport and identical 9,721×32 question, with all seven original written rows retained and the added mine below.
- `mining-strike.gif`: the running pickaxe, ore reaction and chips sampled at fixed animation times after a real correct submission. The source controller still grades immediately; the animation does not add an input delay.
- `reference-comparison.jpg` / `device-coverage.jpg`: approved written-method concept versus the revised live composition, and compact phone/iPad/large-iPad coverage. The new mining playfield is an explicit change requested after that concept.
- `after/checks.json`: six passing profiles — 393×852 tier 1; 375×667 tier 5; 768×1024 tier 3; WebKit 393×852 tier 4; 430×932 tier 2; 1024×1366 tier 1. All five original tiers are exercised. Forty-seven measured states include initial/wrong/correct/strike/treasure, aligned place-value columns, visible text containment, 44px targets, no gameplay scrolling, 125% prose stress, 100 independently solved correct submissions and six wrong submissions. Score, four-product count and rock health are checked after each answer; partial written steps do not damage the rock or grant product XP. Duplicate inputs are blocked. All six complete victory and return through the real Map action.
- `repository/checks.json`: two passing highest-tier Chromium/WebKit phone regressions, covering original lives/failure/Retry, scoring, carry/zero/sum steps, 1100/400/1000/650/1250ms active delays, pause, crystal reveal, victory and Map. Tier-1 wrong feedback retains its separate original 700ms delay, tested in the focused suite. No controller timing was changed.
- `smoke.json`: Bran, Mochi and Vex retain their saved identities; Barratt is used throughout the main suite. Includes a 3× 393×852 iPhone viewport capture and switching reduced motion on during play. These are browser checks, not native-device execution.
- `protected.json`: seventeen task-start source/art/reference files unchanged, including the controller, written-method component/math, presentation adapter, session/progression/audio, shared HUD/actor renderer, approved image/scenery, ore/pickaxe and previous Factor Frenzy work.
- `build.log` / `typecheck.log`: passing iOS-mode Vite build and TypeScript check. Existing chunk/dynamic-import build warnings remain.
- `native-copy.json`: all 851 final build files match the local Capacitor public copy; iOS minimum 16.4 verified. Aggregate receipt and source hashes: `RESULT.json`.

## Remaining limits

On the shortest phones, higher-tier written working takes priority and the mining illustration is smaller; long final-product choices use two rows while keeping their full numbers and 44px targets. The existing parchment-holding guide pose is retained beside a separate player pickaxe. This is a requested presentation revision, not a claim of pixel-identical reproduction of the earlier concept. Native Dynamic Type, VoiceOver, physical safe areas/orientation/backgrounding, real-device animation/audio and performance still need checking. Purchases and real accounts were not exercised; browser checks use the repository's isolated release-account fixture.

This Windows host cannot execute the iOS app. Browser viewport and simulated-safe-area checks are not native iOS tests. No publication, push, merge, signed archive or TestFlight upload is included. The installed TestFlight build will only acquire this change after a new build is uploaded.

No external legacy assumptions were used.
