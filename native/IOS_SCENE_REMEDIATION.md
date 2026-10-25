# iOS scene remediation — Rounding Rocket and Maths vs Zombies

22 October 2026. Local changes only; no upload, release or native certification.

## Scope and source

This bounded B4 art batch addresses the two P1 scene treatments evidenced in `IOS_ART_DIRECTION.md`. It uses current repository assets and components. No new artwork, gameplay content, score, timing or orientation policy is introduced. Shared shell work is recorded separately.

Inspected: `RoundingRocketGame.tsx`, `RoundingRocketScene.tsx`, `rounding-rocket.css`, `MathsVsZombiesGame.tsx`, `maths-vs-zombies.css`, scene composition overrides and existing rocket/grounding/audio tests. Assumptions: established character designs and rich scenery remain; portrait is the supported phone Rocket composition, landscape the supported phone Zombies composition. Desktop browser exploration is separate from native device support.

## Changes

- `src/games/RoundingRocketScene.tsx`: existing illustrated asset keeps its assembly regions. Pending parts have a readable muted silhouette, next part has a restrained warm emphasis, installed regions remain full colour. The eight-part sequence previously had only seven illustrated regions; the existing SVG comms antenna now represents the eighth named part, including its pending/next/installed state.
- `src/games/rounding-rocket.css`: pending opacity rises to .62 with moderate desaturation/contrast; next part is .9 opacity and lightly emphasized. No blinking construction effect or new loop is added. Full rocket and launch phase retain their existing treatment.
- `src/games/maths-vs-zombies.css`: remove whole-environment greyscale/brightness/blur from the actually visible outer world layer and its fallback. A feathered cool tonal region inside the combat playfield separates the hero, with a shallow floor shadow. Existing feet and stone footing remain at the same baseline. Remove broad hero halo; retain a restrained contact shadow. Sky, sea and architecture outside the combat lane keep their original rich colour/detail.
- `scripts/verify-ios-scene-remediation.mjs`: isolated account fixture, seeded questions, phone/desktop normal and reduced-motion matrix; Rocket opening/half-built/countdown/launch/orbit/result; Zombies actor readiness, ground/cast geometry and answer/dock clearance.

## Scene records

| Scene / composition | Cause and intended hierarchy | Evidence and review |
|---|---|---|
| Rocket tier 5, 390×844 and 320×568 portrait | Faint whole-asset preview made sky/coast dominate the buildable object. Interaction should be question → rounded answer → visibly growing rocket. Cause: local opacity/luminance, not deficient world art. | `qa-artifacts/ios-scene-remediation/rocket-*-opening.png`, `*-half-built.png`, `*-launch.png`, `*-orbit.png`. Full-size 390 render reviewed: central rocket now identifiable, engine preview bright; question and answers remain separate. Pending/installed distinction also uses the installed count and next-part name. |
| Rocket 1440×900 browser | Same image opacity defect; larger composition is exploratory. | Matching desktop state captures. No assertion of native iPad support. |
| Zombies tier 5, 844×390 and 667×375 landscape | Whole-backdrop filtering flattened the established scene. Hero is the combat focal subject; question/answer remain primary learning actions. Cause: global treatment applied where a local tonal region suffices. | `zombies-*-opening.png` and `*-cast.png`. Full-size 844 render reviewed: hero/footing distinct, warm architecture and blue sea restored. No character size or floor coordinates changed. |
| Zombies 1440×900 browser | Same regional separation change, larger viewport exploration. | Matching opening/cast captures and raw foot rectangles in JSON. |

`rocket-before.png` and `zombies-before.png` are preserved actual pre-batch audit captures; their random question differs. The test additionally produces `*-treatment-before.png` by temporarily reconstructing only the previous visual treatment on the same seeded current question. These reconstructed comparison images are explicitly diagnostic, not historical build captures. `grayscale-comparison.jpg` is a diagnostic thumbnail sheet, not a production asset or automated visual-quality score.

## Validation and remaining limits

Final results are recorded in `qa-artifacts/ios-scene-remediation/results.json`; logs under `.tmp/ios-scene-*` are local diagnostics. **12/12 final compiled-browser scene cases passed**: Rocket at390×844,320×568,1440×900 and Zombies at844×390,667×375,1440×900, each normal/reduced motion. The first compiled run had a desktop navigation timeout and a stale-round test read; the checker now waits for answer controls to be enabled before reading the next question. Both desktop cases passed rerun. Their original outcomes remain in `compiled-first-run-results.json` and the final rows record the recheck. Source-server exploratory failures remain in `source-exploratory-results.json`, including an account-fixture conflict screen; they are not counted as passes.

Existing `verify-zombie-hero-grounding.mjs` passed **9/9** cases (three viewport sizes in normal/reduced motion plus Bran/Mochi/Vex desktop). Existing `verify-zombies-contrast-audio.mjs` passed **2/2** profiles after rerun of a navigation timeout: three non-silent decoded defeat groans per profile, no ambient interruption, muted defeat silent. Audio evidence remains under `qa-artifacts/zombies-contrast-audio/`, grounding evidence under `qa-artifacts/zombie-hero-grounding/`. These are browser AudioContext assertions, not physical-speaker listening tests.

Compiled baseline: combined local iOS Vite build reported51.37s in `.tmp/ios-remediation-first-build.log`; served from3024. No game-state/maths mutations or live account writes were used. The gallery is `qa-artifacts/ios-scene-remediation/index.html`.

Native iPhone colour rendering, both safe-area directions, audio interruption, sustained frame-time/memory, physical touch and VoiceOver remain device checks. The scene changes do not claim the full roadmap, all avatar/crop combinations, or all gameplay states are certified. Final build/typecheck and wider regressions belong to the combined batch report.

No external legacy assumptions were used. No deployment or TestFlight upload was performed.

## 23 October regression

After the shared viewport migration, the compiled3024 candidate passed **12/12 scene cases** and **9/9 grounding cases**. Initial scene run was11/12:390-wide normal-motion Rocket remained on “Opening Matharia…” while waiting30s for Start; the unchanged-timeout full case passed rerun. `23oct-first-run-results.json` retains the initial failure; final `results.json` records the rerun explicitly. Logs `.tmp/ios-final-scene-23oct.log`, `.tmp/ios-scene-start-recheck.log` and `.tmp/ios-final-ground-23oct.log`.

Instrumented cold-start retries record console, request failures and isolated fixture API response timing/body, excluding auth response bodies. Rocket Start appeared in1.369s, with no console/page/request errors and all six fixture APIs200 within0–10.2ms. A subsequent first audio-profile attempt also timed out waiting for Start before gameplay; the instrumented Zombies retry succeeded with no recorded API error. Diagnostic artifacts `startup-diagnostic.json` and `startup-diagnostic-zombies.json` preserve these observations. **This intermittent automated bootstrap timeout is not claimed fixed or attributed to production/native code.** The audio checker now captures startup failure directly if it recurs; timeout limits were not increased.

After the last assessment-placeholder-only rebuild (`.tmp/ios-final-candidate-build.log`,39.69s), the existing audio checker passed **2/2** profiles, each three non-silent decoded groans and silent muted defeat. Log `.tmp/ios-final-audio-23oct-candidate.log`. Scene/grounding production files were unchanged by that rebuild; their preceding23October captures were retained without another redundant matrix run. Native device/audio certification remains outstanding.
