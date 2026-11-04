# Lava Path: crossing space and motion

Request: improve use of the landscape playfield and add visible animation. Reference: the supplied 1280 × 589 iPhone photo and the current repository's approved `unit_mixer.png`. Source checkout: `D:/BrainZilla/GitHub/SATsLegends`, branch `codex/website-refinement-2026-10-28`. Existing unrelated work was preserved.

Visual thesis: a readable, close volcanic crossing with the same sapphire-and-gold interface. The main subject is the hero landing on independent basalt platforms. Supporting information occupies two compact side regions; four answers sit above the fixed shared footer.

Interaction thesis: the camera follows the existing crossing index, the hero jumps and lands within the original feedback interval, and ember drift / molten currents keep the river alive. The next-stone beacon, error wobble and landing sparks reinforce where to look. All decorative layers ignore input. Motion pauses with gameplay and stops for reduced motion.

Assumptions: landscape orientation, the existing clean background/platform/hero art and the ten-crossing objective remain. The camera changes the illustrated coordinates, not gameplay progression. No additional assets were necessary.

## Implementation

- `variants/matharia/src/screens/LavaScene.tsx`: the real React rendering path; follows the source crossing index with a 420 ms camera/flight sequence; constant-sized hero, next-stone beacon, progress marks and decorative atmosphere/landing effects.
- `variants/matharia/src/screens/lava-scene.css`: explicit question, progress, helper, crossing and answer regions; larger nearby platforms; safe-area-aware answer clearance above the unchanged shared HUD; paused/reduced-motion styles.
- `variants/matharia/reference/lava-assets.json` and `variants/matharia/scripts/prepare-lava-assets.py`: current presentation projection recorded consistently alongside unchanged asset metadata. The image preparation script was not rerun.
- `variants/matharia/scripts/verify-lava.mjs` and `verify-lava-motion.mjs` and `unit-conversion-qa.mjs`: configurable local URL/evidence output, account-fixture readiness before navigation, following-camera and ambient-motion checks.

The source controller `src/games/LavaPathGame.tsx`, Matharia presenter binding, shared HUD, approved reference and production image assets are protected by before/after hashes. Questions/options, conversion arithmetic, score, stars, lives, ten source crossing indices and original 560/720 ms controller delays remain unchanged. No purchase, account, save or progression integration was changed.

Independent assets are retained. No flattened screen, baked controls, background patches or concealment masks were introduced. The camera viewport legitimately clips the off-screen continuation of the path.

## Verification checklist

| Check | Status | Evidence |
| --- | --- | --- |
| Current source and reference inspection | Done | `qa-artifacts/lava-space-motion-2026-11-03/source-before-hashes.json` |
| Layout and visual review | Passed: reference, before/after, compact phone and iPad captures inspected | `before-after.png`, `approved-vs-running.png` |
| Complete conversion gameplay / failure / retry / result | 10/10 profiles; 100 independently calculated correct answers | `game/checks.json` |
| Real-time movement, pause and reduced motion | 4/4 cases; 16 safe-area/root-font combinations | `motion/motion-and-safe-areas.json` |
| Phone/iPad HUD and safe-area integration | 2/2 profiles, including 59 px phone side insets | `hud/checks.json` |
| Reference / before / running screen comparison | Captured and inspected | `approved-vs-running.png`, `before-after.png` |
| Build and TypeScript | Passed | `build.log`, `typecheck.log` |
| Capacitor web resource preparation | 853/853 build files match SHA-256; minimum iOS 16.4 | `native-copy.json` |
| Native iOS device execution | Unverified | Windows host |
| TestFlight upload | Not performed | Local source task |

All browser fixtures intercept account requests locally. They do not call a live account service. Browser viewport/safe-area and font checks are not native iOS, Dynamic Type, VoiceOver or hardware-performance testing.

## Evidence and limits

- [Before / after](../../qa-artifacts/lava-space-motion-2026-11-03/before-after.png)
- [Approved concept / running screen](../../qa-artifacts/lava-space-motion-2026-11-03/approved-vs-running.png)
- [Actual motion recording](../../qa-artifacts/lava-space-motion-2026-11-03/lava-motion.mp4) and [GIF preview](../../qa-artifacts/lava-space-motion-2026-11-03/lava-motion.gif)
- [Verification result](../../qa-artifacts/lava-space-motion-2026-11-03/RESULT.json) and [protected-source hashes](../../qa-artifacts/lava-space-motion-2026-11-03/source-scope.json)
- [iPhone HUD capture](../../qa-artifacts/lava-space-motion-2026-11-03/hud/phone-unit_mixer.png) and [iPad HUD capture](../../qa-artifacts/lava-space-motion-2026-11-03/hud/ipad-unit_mixer.png)

Functional profiles: Chromium and WebKit at 844 × 390 (reference/phone), 667 × 375, 932 × 430 and 1024 × 768. Every profile completed ten crossings, including an incorrect answer, duplicate-activation guard, active-time pause, original score/star checks, results and Map return. The phone profiles additionally exercised three-life failure and Retry. Motion checks exercised both engines with normal/reduced motion, 44 px simulated horizontal safe insets, 21 px bottom clearance, two phone sizes and root fonts of 20/24 px. Final HUD captures use 852 × 393 with 59 px phone side insets, and 1024 × 768 with 24/20 px iPad top/bottom insets.

The reference comparison uses different question states. The distant overview is deliberately replaced with a camera showing nearby platforms in response to the space/motion request; the concept is a style/composition reference, not a claim of pixel-identical output. The hero no longer shrinks with crossing depth. No new artwork was introduced.

The first capture opened before fixture entitlement readiness and showed a test paywall; the harness was corrected to wait for isolated full access. An initial safe-area test only set stage variables and omitted the native content viewport; it was corrected to replace safe-area env values throughout the local stylesheet. Final reports pass with the corrected harness. Superseded failure captures/logs are diagnostic evidence, not final acceptance results.

Changed files are the seven implementation/QA paths listed above, this document, an appended WORKLOG entry, QA evidence, and regenerated Capacitor web resources. No commit, push, merge, publication or TestFlight upload was performed.

Before release: execute the signed iOS app on representative iPhone/iPad hardware or simulators and verify native safe areas, rotation, accessibility and animation/audio performance. Browser video is not a device frame-rate benchmark.

No external legacy assumptions were used.
