# iOS dense touch remediation

22 October 2026. Local browser remediation only; no deployment or TestFlight upload.

## Scope and assumptions

Roadmap B5/B6 measured controls only: Match Mastery tiles, Remainder Run Unload, Prime Pop bubbles. Existing React/TypeScript stack, art, maths, scoring, Start and pause remain. The 44 CSS-pixel screen is a browser usability check, not proof of native UIKit point size. No external legacy assumptions were used.

## Changes

- `src/games/FractionMatchGame.tsx`: board width derives from actual border and five square rows/four gaps instead of a hardcoded 32px frame budget.
- `src/games/fraction-match.css`: short landscape uses the existing frame as a 4px rail. Match's question remains in its left column; the full-width question reserve is removed only here. Status follows the measured question height. Board stays on the right, leaving the hero and scenery intact.
- `src/games/RemainderRunGame.tsx`: unchanged. `remainder-run.css` restores Unload to 44px height with readable 12px text, including very short landscape where its row had been hidden.
- `src/games/PrimePopGame.tsx`: visible bubble diameter floor is 44px on all sizes. Existing spawning, separation, bounds and line crossing use this same helper, so the visual object and input geometry agree. No expanded invisible hitboxes. `prime-pop.css` unchanged.
- `scripts/verify-ios-dense-touch.mjs`: deterministic seeded isolated-account browser comparisons, rendered targets and question/dock exclusion, Match edge selection, loading/unloading interaction. Entering/exiting bubble animation samples excluded from steady-state target screening.

## Evidence

`qa-artifacts/ios-touch-remediation/`: paired `*-before.png` / `*-after.png`, Match selection images and raw `before.json` / `after.json`. Default/short landscape 844x390 and667x375; Prime portrait390x844 and320x568. Browser source server3023, reduced motion, seeded question fixture. Source files captured directly; no native build claim.

Before: Match38.16px /35.16px, Unload52x22px, Prime42px minimum. After: Match49.16px /46.16px, Unload54.88x44px, mature Prime44px minimum. Side-column question placement and complete first board row visually inspected at667x375. No target/question or target/dock intersection in tested captures.

Diagnosis checkpoint: narrowing the frame first exposed the existing portalled full-width question overlap; moving the question into its actual column initially retained its duplicate measured top reserve. The final composition removes that duplicate reserve only for Match rather than stacking additional offsets. An initial Prime22px measurement was an entering bubble's half-scale animation, so the regression now explicitly screens mature targets.

## Remaining validation

Native device safe areas, VoiceOver, physical edge taps, normal-motion sustained play and touch latency require iPhone testing. Release hold remains active. Parent integration build/typecheck and broader game regression are recorded by the main implementation batch.

The23 October final sweep additionally found Data Detective's pie evidence controls below the44px target screen. Its separately bounded correction and final compiled outcomes are recorded in [IOS_DATA_TOUCH_REMEDIATION.md](IOS_DATA_TOUCH_REMEDIATION.md).
