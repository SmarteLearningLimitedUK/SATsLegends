# Calm portrait and Place Value prompt remediation

22 October 2026. Local-only source changes. No TestFlight upload or deployment. Existing rich scenes, pacing, calm activity behaviour and educational question content retained. No external legacy assumptions were used.

## Scope and root causes

Read existing audit/interface captures and current `WellbeingNotes.tsx`, `WellbeingShell.tsx`, the six activity components and `wellbeing.css`. Inspected `qa-artifacts/ios-aaa-audit/interfaces/768-breath-bloom.png` and `390-thought-release.png` before changing layout.

- Parent's preceding footer correction explicitly places progress in grid column 1 and the rotating-note flex row in column 2, resetting both to automatic placement in the one-column phone layout. This fixes the tablet note being confined to a narrow, word-by-word column. `WellbeingNotes.tsx` timing and state logic did not need changing.
- The short-phone check found footer content behind the bottom dock even where document scroll remained zero. Peaceful Pond forced a 440px scene; other calm scenes inherited a 355px minimum. Thought Release's combined header, panel padding, gaps and 66px decorative balloon row exceeded its height budget.
- `PlaceValuePanicGame.tsx` rendered full and compact copies of the same question, relying on competing CSS visibility rules. A single `pvp-prompt-text` span now renders the existing `questionPrompt`; `context=""` suppresses generated duplicate story context. The question generator and memo remain unchanged for all five tiers, including practice wording.

## Changes

- `src/wellbeing/wellbeing.css`: scoped portrait rules at ≤430px wide and ≤740px tall. Peaceful Pond uses the actual flexible content height and keeps a minimum 184px field for four 44px pad/ring rows. Thought Release reduces decorative balloon size and spacing, retains all 44px actions and complete choice text, and uses 12px supplementary tip text. Lantern Camp, Star Path and Leaf Drift replace fixed scene minima with flexible available-height rows. Existing paced animation, interactivity, top-HUD suppression and taller/tablet layouts are preserved.
- `src/games/PlaceValuePanicGame.tsx`: one question span and explicit empty generated context. Full `questionPrompt` remains visible on every layout; no maths or scoring changes.
- `scripts/verify-ios-calm-layout.mjs`: isolated, sequential ready/active/selected/completion capture and geometry checker. Default source3023; set `LEGEND_IOS_QA_URL` and optional `LEGEND_QA_OUT` for a stable compiled preview. Checks footer against actual bottom dock, reading width >200px, no document overflow, absent top gameplay HUD, keep-tip button state, Breathing active state, Pond attention selection, Lantern packed state, Leaf selection/completion and Thought selection/completion.

## Source evidence

`qa-artifacts/ios-calm-remediation/results.json` and activity screenshots include 390×844, 375×667 and exploratory 768×1024. This is browser geometry, not native iPad support. Final source sweep: **17 of 18 activity cases passed**, including all six at 390 and 768 and the five corrected short-phone cases. Breath Bloom at 375 timed out during source navigation, before gameplay; an earlier focused check already captured its ready/active layout passing. No final whole-suite pass is claimed from this interrupted source run.

Short-phone Peaceful Pond and Thought Release were additionally captured and visually inspected after correction: footer bottoms 581px / 578.6px against dock top603px; note reading area275px. The tablet corrected Breath Bloom note is now a wide paragraph rather than the old narrow column. Selected Leaf layout and Thought completion modal were inspected at390. No physical-device or animation-performance result is inferred.

## Remaining verification

Parent is freezing source edits and preparing a stable final compiled build. Re-run `scripts/verify-ios-calm-layout.mjs` against that preview, and confirm Place Value's single question on a tablet-shaped viewport. Save those results separately from historical source failures; amend this record only after execution. Native safe areas, VoiceOver, motion comfort and physical iPhone interaction remain native validation, not browser certification.

## Stable compiled verification — 23 October 2026

Against the parent's completed 23 October iOS-mode build on preview3024 (`.tmp/ios-remaining-build.log`, 37.36s), the final calm sweep passed **18/18 activity cases**, producing **33 ready/active/selected state records**, with zero page runtime errors. Leaf Drift and Thought Release also reached their completion dialogs at all three sizes. Footer/dock clearance, >200px tip reading area, no document overflow, top gameplay-HUD absence and keep-tip toggling passed. Evidence: `qa-artifacts/ios-calm-remediation/compiled-2026-10-23/results.json` and adjacent screenshots. Visually inspected compiled375 Peaceful Pond selected,375 Lantern Camp packed/dimmer and768 Breath Bloom ready; status/tips and controls remain above the dock.

Place Value Panic's single-question fix passed **all five scored tiers at1024×768**. Full visible prompts ranged from two-digit words to hundreds of thousands; each had exactly one `.pvp-prompt-text`, no legacy full/compact span pair, and no generated context duplicate. Routes were derived from this repository's Number Base Camp data plus campaign normalizer (5,13,21,29,37). Evidence: `qa-artifacts/ios-calm-remediation/pvp-results.json` and `1024-place-value-tier{1..5}.png`. This is exploratory tablet-shaped browser coverage, not a native iPad support claim.

The historical source navigation failures remain recorded above and are superseded only for the listed compiled cases. Further native safe-area, VoiceOver and sustained normal-motion checks remain outstanding. No release action was performed.
