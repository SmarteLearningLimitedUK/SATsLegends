# Mean Machine portrait amendment — 26 October 2026

Requested change: Mean Machine should play in portrait, as identified in the owner's screenshot of the review gallery. This is a subsequent local amendment; the already uploaded TestFlight build `100.7.1` does not include it. No additional upload was started.

## Composition and behaviour

- The shared orientation policy requests portrait for Mean Machine, including the existing native Capacitor orientation owner. Other explicit blueprint identities retain their own policies.
- The question, scanner and answers form a vertical composition within the existing shell's usable height. Larger phones have two answer rows; compact phones have one row of four answers.
- Compact phones display the same live active readings in a separate, readable strip. The small internal reels are hidden there. No value is regenerated, reformatted or replaced.
- Answer feedback occupies a layout row instead of covering the answer buttons. The existing Scan, answer handlers, scoring, lives, timers, progression and feedback messages are retained.

## Content protection

The original protected baseline was retained. There are 164 unchanged protected source files and two exact, documented presentation exceptions: `gameOrientation.ts` and the read-only JSX addition in `MeanMachineGame.tsx`. Removing only that new readout block reproduces the latter file from released commit `98a0bbd6c705647bcc5e228cf94bda4bcb31eaba` byte for byte after newline normalization. No question, answer, generation or gameplay logic changed.

## Verification and evidence

The amendment passed TypeScript, the iOS web build, seven browser viewport/motion playtests (Scan, wrong/correct answers and rotation preservation), four opening-layout captures, the shared Start/Help/focus/rotation/exit checks and the 148-case geometry/contrast report. The regenerated gallery includes portrait Mean Machine. Subsequent work follows the separate `production-ui-v2/USER_BRIEF.md`; its new requirements are tracked independently.

Verification results are stored in `qa-artifacts/mean-workshop/results.json`, `qa-artifacts/production-rebuild/after/report.json` and `qa-artifacts/production-rebuild/states/report.json`. The review gallery and contact sheets are regenerated from actual screenshots. These are Chromium checks, not physical iPhone or WebKit certification. Native device validation of this new amendment remains outstanding.

## Changed files

Product: `src/app/gameOrientation.ts`, `src/games/MeanMachineGame.tsx`, `src/games/mean-machine.css`.

QA: `scripts/verify-game-orientation.ts`, `scripts/verify-mean-workshop.mjs`, `scripts/verify-production-states.mjs`, `scripts/production-content-guard.mjs`, `scripts/build-production-review.mjs`. The shared state-check script now supports a selected-game rerun while retaining other recorded results.

Documentation/metadata: this review, `native/CURRENT_TESTFLIGHT_UPDATE.md`, and `native/production-rebuild/{README.md,LAYOUT_AND_ORIENTATION.md,VALIDATION.md,game-inventory.json,visual-source-exceptions.json,validation-ledger.json}`. Generated screenshots and the HTML gallery remain local QA artifacts.

Assumptions: the selected game is Mean Machine; the requested amendment is presentational and should be held for a later build. Existing assets and the React/TypeScript/Vite/Capacitor architecture are retained. No external legacy assumptions were used.
