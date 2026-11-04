# Maths vs Zombies graveyard pass — 2 November 2026

Current request supersedes the sunny background in the existing approved Zombie concept. Scope: spooky graves/ruins scenery, independently animated bats, padded text/answers and grounded actors. Keep the original educational and combat controller unchanged.

Assumptions: retain the existing landscape orientation, sapphire/gold controls, hero and zombie identity; make the setting spooky and suitable for the existing educational game. No external legacy assumptions were used. No deployment or TestFlight upload is part of this correction.

| Item | Renderer / source | Status | Evidence |
| --- | --- | --- | --- |
| Graveyard scenery | `compositions.ts`, new `bg_zombies_graveyard_v4` | Implemented; running phone/iPad screenshots inspected | Moonlit graves, earth mounds, gothic ruins, lanterns and wisps; clean scenery with no UI or actors baked in |
| Bat flights and wing articulation | `ZombieAtmosphere.tsx`, `zombies-scene.css`, new transparent `graveyard_bat_v2` | Implemented; normal motion, pause/resume and reduced motion passed | Three independent flights; articulated wings; one shared sprite request; decorative layers cannot intercept input |
| Question, feedback, progress and answers | `ZombiesScene.tsx`, `zombies-scene.css` | Four final WebKit layout cases passed; higher-tier questions inspected | Full original instruction retained as accessible text; compact live visible cue/progress; measured frame and answer padding |
| Hero/enemy ground contact | `ZombiesScene.tsx`, `zombies-scene.css` | Four layout cases passed and phone/iPad images inspected | Common 95%-of-actor contact baseline; original enemy size and controller retained; hero scale capped on iPad |
| Functional/device verification | Actual application routes | Six gameplay profiles, manual targeting/motion and practice passed in browsers | Correct/incorrect answers, XP/lives, pause/resume, failure/retry, timed victory/results/Map and four-question practice |
| Local iOS web bundle | Capacitor public assets | Synced; 840 files hash-match the final build; minimum 16.4 checked | Native compilation/device execution and TestFlight upload remain pending |

The original approved 1844×853 reference remains unchanged in the manifest. The supplied 1280×589 iPhone 15 photo and this request provide the updated graveyard direction. This correction intentionally replaces the sunny environment; it does not claim to match that earlier sunny artwork.

## Layout specification and corrections

Use the existing landscape coordinate system. Let H be viewport height less the top/bottom safe areas; the content plane already excludes horizontal safe areas. HUD top is 1.4% of H, with height clamped to 44–84px. Question top is the greater of 16.6% of H and HUD bottom + 8px; its width is 84% of the content plane and height at least 80px. Its text has 12px vertical and 7% horizontal padding, separately measured against the hollow frame aperture.

Work upwards from the bottom: safe area, 4–10px dock clearance, 48–84px dock, 10px gap, 52–96px answer row, 8px gap, then the actor floor. Four equal answer columns have 8px gaps, 14% horizontal padding and a minimum 44px target. Actor artwork ends at 95% of its box; each box is positioned so that contact point meets the common floor. Hero height cannot exceed 1.25 times the existing enemy size. No artwork is stretched.

The first running comparison exposed a double horizontal safe inset and an oversized iPad hero; both were corrected before the final captures. A normal-motion check exposed a reduced-motion wing-rule priority issue; the final rule disables both flight and wing animation. The redundant lower timer/cue strip and overlapping YOU plaque were removed; the shared HUD retains the real timer/lives, and the question card contains live feedback and the stop count.

## Visual evidence

- [Supplied iPhone photo versus updated running build](../../qa-artifacts/zombie-graveyard/comparisons/user-photo-vs-running.png)
- [Previous source versus updated source, same browser viewport](../../qa-artifacts/zombie-graveyard/comparisons/before-after-iphone15.png)
- [Final iPhone 15 layout](../../qa-artifacts/zombie-graveyard/after/iphone15.png)
- [Final iPad layout](../../qa-artifacts/zombie-graveyard/after/ipad.png)
- [Actual normal-motion gameplay](../../qa-artifacts/zombie-graveyard/motion/running.png)
- [Higher-tier multiplication question](../../qa-artifacts/zombie-graveyard/motion/advanced-3.png)
- [Bat/playfield animation GIF from actual browser frames](../../qa-artifacts/zombie-graveyard/comparisons/animated-bats.gif)

The GIF uses cropped running screenshots, a reduced colour palette and 180ms playback frames. It is visual evidence, not a production asset. Debug visibility captures are explicitly named `bat-debug`; they use diagnostic styles and are not final-screen evidence. Numerical image differences are not useful for the intentionally replaced environment; the actual running screenshots were inspected for composition, ground contact, frame fit, contrast and text containment.

## Verification

| Coverage | Result |
| --- | --- |
| Final WebKit layouts | 667×375; iPhone 15 852×393; large phone 932×430; iPad 1024×768. Phone landscape insets simulated as 59/59/21px. All four pass question-aperture padding, centred HUD/question, foot alignment, answer padding, target/hit checks and no page scrolling. |
| WebKit gameplay | Five sizes, including 845×391 reference viewport; independent arithmetic, correct 220 XP, incorrect answer costs one life, and pause holds question/enemies/timer. iPhone also reaches failure, Retry, timed survival victory, rewards and Map. |
| Final Chromium gameplay | iPhone 15 profile repeats the full failure/Retry/victory flow; the live 19-answer streak title remains inside its HUD region. |
| Normal motion and advanced controls | Real clock, tier 3: multiple minions, touchscreen target selection, spell hits selected minion, motion and an in-flight spell freeze on pause and resume. Three bat paths and wing articulation change over time. One sprite resource request. Reduced motion disables flight/wing animations. Four actual tier 5 questions answered/captured. |
| Practice | Remains active after 30 seconds with the original 0.7%/s slow movement; four independently solved questions reach victory/results. The initial QA assumption that practice enemies are stationary was corrected against the unchanged controller. |
| Source/build | Variant TypeScript and production build pass. Original Zombie controller and presentation adapter hash-match the pre-change copies. Shared contracts and all 37 approved reference hashes pass. Earlier portrait HUD, Rocket and Takeout styles hash-match their pre-task values. |
| Native preparation | Capacitor sync passed; all 840 production files match their native public copies; four Xcode settings and Swift package checked at iOS 16.4. |

Receipts: [RESULT.json](../../qa-artifacts/zombie-graveyard/RESULT.json), [layout geometry](../../qa-artifacts/zombie-graveyard/after/checks.json), [gameplay](../../qa-artifacts/zombie-graveyard/gameplay/checks.json), [motion/advanced controls](../../qa-artifacts/zombie-graveyard/motion/checks.json), [practice](../../qa-artifacts/zombie-graveyard/practice.json), [source preservation](../../qa-artifacts/zombie-graveyard/source-preservation.json), [native copy verification](../../qa-artifacts/zombie-graveyard/native-copy.json).

All browser runs use the repository's isolated release-account fixture and real game controls. They do not verify live accounts or purchases. WebKit on Windows is browser testing, not iOS device testing.

## Changed files and asset provenance

Presentation source only:

- `variants/matharia/src/compositions.ts` — Zombie background key.
- `variants/matharia/src/screens/ZombiesScene.tsx` — actual React renderer, live cue/progress and common floor.
- `variants/matharia/src/screens/ZombieAtmosphere.tsx` — memoized decorative bat layers.
- `variants/matharia/src/screens/zombies-scene.css` — scoped layout, feedback and motion.

New assets, generated with the built-in `image_gen.imagegen` tool, inspected and converted to WebP:

- `variants/matharia/assets/png/backgrounds/bg_zombies_graveyard_v4@2x.webp` — 1844×853, 677,376 bytes.
- `variants/matharia/assets/png/props/graveyard_bat_v2@2x.webp` — 768×324, 52,830 bytes, transparent alpha.

Exact prompts, references and tool settings: [zombie-graveyard-prompts.json](../../variants/matharia/reference/zombie-graveyard-prompts.json). Original generation paths, crop bounds and asset hashes: [zombie-graveyard-assets.json](../../variants/matharia/reference/zombie-graveyard-assets.json). The originals remain intact. Bat clipping separates the sprite's body/wings for articulation; no background masks, patches, baked controls or screenshot overlays are used.

Additional outputs are this checklist, the appended WORKLOG entry, scoped QA scripts/reports/comparisons under `qa-artifacts/zombie-graveyard`, and the generated Capacitor public bundle. No package dependencies, original game rules, question banks, scoring, timers, saves, account or purchase code changed in this pass.

## Remaining production work

Native iPhone/iPad execution, iOS safe-area/orientation behaviour, accessibility text settings and native animation performance remain unverified on this Windows host. Run those checks on the signed Mac/device candidate before production. No layout defects remain in the tested browser states; this is not an exhaustive check of every generated question or every device size. No TestFlight upload, deployment or merge was performed.

Assumptions retained: landscape orientation, existing hero/zombie cast, sapphire-and-gold interface and unchanged game mechanics. No external legacy assumptions were used.
