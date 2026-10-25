# Final compiled campaign screen sweep — 23 October 2026

Browser QA only. No deployment or TestFlight upload. No external legacy assumptions were used.

## Executed scope

`node scripts/verify-ios-remediation.mjs` ran sequentially against frozen compiled iOS-mode preview3024, one browser worker at a time, with a fresh isolated account fixture for each game. Fixed random seed1234567, reduced motion, tier5 routes from the existing37-entry catalog, no synthetic safe-area insets in this wide sweep. The native portrait games were swapped to portrait for the compact phone profile; desktop retained desktop orientation. No live account service calls or production account changes occurred.

| Profile | Rendered viewport | Actual result | Evidence |
|---|---|---|---|
| Standard phone | 844×390 landscape; Prime/Rocket390×844 | **37/37 passed** | `qa-artifacts/ios-remediation/final-default/results.json` |
| Compact phone | 667×375 landscape; Prime/Rocket375×667 | **37/37 passed** | `qa-artifacts/ios-remediation/final-compact/results.json` |
| Desktop-shaped browser |1440×900| **37/37 passed** | `qa-artifacts/ios-remediation/final-desktop/results.json` |

Total **111/111** completed; all browser contexts and worker browsers closed. No automatic retry was performed. There were no startup failures or failure-diagnostic files in these runs.

## What passed

At each opening game state: optional helpers hidden; no visible game button intersects the bottom dock or top HUD; no question card intersects the top HUD; all visible buttons within the viewport; no horizontal or vertical document overflow. Lightbulb/rules panel present with at least three rules; collected round tips present where applicable; round pauses while open; sampled timer remains unchanged; Escape closes the panel, restores focus to the lightbulb and resumes the stage; no page runtime errors.

All37 game screenshots plus target rectangles were saved per profile. This is an automated opening-state geometry and shared-controls pass, not a claim that every question, interaction, artwork layer, native device or animation state is certified. Parent-owned targeted flow, rotation, question-shape, audio and touch checks supplement it. Other instrument/calm state evidence is documented in IOS_INSTRUMENT_REMEDIATION.md and IOS_CALM_REMEDIATION.md.

## Touch-size findings retained separately

The harness records small targets but does not treat the record as a universal failure where an explicit larger equivalent exists. Therefore **111 bounds passes do not mean every target is44px**.

- Coordinates Quest:49 dense grid-marker buttons measured26.84px square on default phone,24.95px on compact and42px on desktop. Its larger input alternative is covered by the parent's touch tests; direct grid cells are not claimed to meet44px.
- Data Detective: four **evidence-category rows**, not the large suspect cards, measured132×28px on both phone profiles. No such small rows on desktop. The parent assigned a scoped44px correction after this sweep. These111 results precede that correction and must not be represented as its validation; recompile and run the local Data Detective phone checks after that change.

No other visible HTML-button family fell below the43.5px screening threshold in the three recorded profiles. SVG/canvas spatial targets need their specific interaction/accessibility checks rather than this HTML-button scan.

## Harness diagnostic correction

Changed only `scripts/verify-ios-remediation.mjs` during this task:

- On any first failure, save request failures, pending requests, HTTP errors, console and page errors **before** DOM collection or screenshot. Then collect body, URL/readiness, question/stage rectangles, stylesheet state and resource timings, bounded only for diagnostic collection. The main navigation/Start limits were not increased and no retry was added.
- Question/HUD auditing now queries `.app-viewport [data-game-question]`, because `ViewportQuestion` moves question cards outside the local game-set subtree. The old descendant-only selector missed these portalled questions.

The pre-existing final-default report contained37 passes and was replaced by this latest candidate run; no failed first run was overwritten. Any later failure should use a separate output folder and retain its diagnostic artifact.

Physical iPhone safe areas, VoiceOver, sustained normal-motion performance, memory pressure, native interruption and purchase flows remain native release checks. The user's release hold remains active.

## Subsequent corrections and final candidate

The111 bounds/Tips checks above did not detect visual occlusion or clipped text. The separate74-image phone review found Coordinates' guide covering the plot and Graph Grabber's missing leading axis digits; the small-target record also led to the Data Detective correction. All three are corrected locally, with originals retained.

- Data Detective:4/4 compiled profiles; real44px minimum rows, readable full names/totals, contained legend, pin/unpin and stable dossier closure.
- Coordinates:12/12 final compiled flow/inset cases, including6 coordinate cases with explicit full guide/plot rectangle exclusion and real step/confirm actions.
- Graph Grabber:3/3 final compiled profiles, complete numeric labels, no tick collisions, readable actual hover values and correct answers.
- Final affected-game sweep:9/9 for these three games at standard phone, compact phone and desktop. Raw results/screens are under `qa-artifacts/ios-remediation/final-corrections/`; this does not overwrite or relabel the earlier111 rows.

See IOS_REMEDIATION_PROGRESS.md for final build hashes, exact scripts, scope/limits and the179-image combined gallery. No production change followed the final build or targeted checks. No deployment.
