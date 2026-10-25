# Campaign gameplay QA - 23 October 2026

## Result and limits

All 28 assigned non-Core campaign games now have an observed wrong-answer response and a genuine correct interaction. This is a gameplay pass on the locally compiled iOS web assets, with active scored timers. It is not an iPhone native/TestFlight certification, and it does not mean every round, tier, seed or terminal outcome has been tested.

The other six campaign games are documented in [SATS_FRACTION_INTERACTION_PLAYTEST.md](SATS_FRACTION_INTERACTION_PLAYTEST.md). Core papers are a separate owner/evidence set. Do not count the dense games or repeated phone cases twice.

The consolidated machine-readable ledger is `qa-artifacts/full-playtest/campaign/campaign-ledger.json`. Original failed harness attempts remain in phase ledgers and attemptHistory; a failed coverage assertion has not been presented as a production bug.

## Method

Compiled candidate at `http://127.0.0.1:3024`; fresh isolated synthetic account per game; tier 5 routes from the current repository catalog. Landscape 844 x 390, with Prime Pop and Rounding Rocket at portrait 390 x 844. Inputs use actual Start, pointer dragging, button clicks and text entry. No React internals, score callbacks, direct answer callbacks, accelerated clocks or live accounts. Calculations use displayed questions, diagrams, points or rendered numeric attributes; answer keys are not imported into browser solvers.

Deterministic seed 8431 for the main campaign. Polygon solid-property reachability additionally uses a constant 0.35 question-random fixture to select property mode, while retaining normal UI actions and scoring. Its ordinary seeded run independently accepted 76 consecutive correct questions and observed solid face/vertex sorting; the additional fixture observed real solid property answers.

## Observed action scope

| Game key | Correct and wrong interactions | Final victory observed | Evidence ledger |
|---|---|---|---|
| place_value_panic | reversed place values rejected; all digits dragged to appropriate columns | Not tested to final result | phase6-results.json |
| number_line_ninja | incorrect number rejected; equal intervals give 2 | Not tested to final result | phase3-results.json |
| prime_pop | composite tap costs one life | Yes | phase4-results.json |
| rounding_rocket | wrong rounded value rejected without installing part; rounded to 2000 | Yes | phase5-results.json |
| maths_vs_zombies | incorrect calculation rejected; calculation answer -3 | Yes | phase5-results.json |
| percent_power | wrong choice 128 rejected; independently calculated 120 accepted | Not tested to final result | phase3-results.json |
| simplify_sprint | factor 7 does not divide both; largest valid common factor | Not tested to final result | ledger.json |
| angle_arena | wrong angle misses target; new straight-line/ratio angle accepted | Not tested to final result | phase3-results.json |
| polygon_palace | false shape property rejected; complete independently checked visible property set accepted | Not tested to final result | polygon-property-ui-results.json |
| area_architect | non-area value rejected; 19 blue unit squares | Yes | ledger.json |
| rotation_relay | degenerate triangle rejected; all three reflected vertices accepted | Not tested to final result | phase5-results.json |
| coordinates_quest | starting point rejected after route movement; route ends at (0,-3) | Not tested to final result | phase3-results.json |
| conversion_canyon | empty scale rejected; exact displayed-weight combination accepted | Not tested to final result | phase3-results.json |
| perimeter_path | wrong choice 8932 cm rejected; independently calculated 7400 accepted | Not tested to final result | phase2-results.json |
| mean_machine | wrong computed mean rejected; (11+11+9+9+12+8)/6=10 | Not tested to final result | phase2-results.json |
| graph_grabber | wrong choice 180 rejected; independently calculated 160 accepted | Not tested to final result | ledger.json |
| line_graph_lab | smaller graph rise rejected; greatest successive rise 4 to 5 | Not tested to final result | ledger.json |
| data_detective | nonmatching suspect accusation rejected; all four evidence amounts match accused suspect | Not tested to final result | phase6-results.json |
| factor_frenzy | non-factor rune set rejected; complete independently computed factor set opens sentinel lock | Not tested to final result | phase4-results.json |
| multiplication_mine | incorrect column product rejected; 1676 × 91 = 152516, all partial products/carries/placeholders entered | Not tested to final result | phase5-results.json |
| order_ops_arena | incorrect numerical calculation rejected; ordered bracket/multiplication expression fully resolved | Not tested to final result | phase2-results.json |
| formula_forge | wrong formula output rejected; formula evaluation 195 | Not tested to final result | ledger.json |
| remainder_run | 100 boxes and 6 left; incorrect subsequent quotient/remainder rejected | Not tested to final result | phase5-results.json |
| time_keeper_cove | 12:00 rejected against non-noon target; target hand positions submitted | Not tested to final result | phase2-results.json |
| problem_pyramid | wrong choice 2376 rejected; independently calculated 2374 accepted | Not tested to final result | phase3-results.json |
| unit_mixer | wrong choice 24,500 g rejected; independently calculated 580 accepted | Not tested to final result | ledger.json |
| change_counter | one penny rejected as incorrect change; 78p exact change selected as coins | Yes | phase7-results.json |
| ratio_fractions | incorrect fuel fraction stalls car; target parts / all parts = 3/4 | Not tested to final result | phase4-results.json |


## Confirmed repair

Polygon Palace could apply 2D side/parallel/regularity predicates to solids: the generated cube property set could mark "Has no parallel sides" as true, and solids could receive a parallel-sides sorting prompt from placeholder 2D fields. The bounded repair restricts solid property choices to 3D/face/edge/vertex facts, and matches sorting criteria to the dimension of the shape. Face/vertex sort availability follows the existing count stages. Early property sets that lack enough valid distractors retain the existing fallback to a naming question.

`scripts/verify-polygon-dimensional-properties.mjs` tests actual extracted production generators against independent face/edge/vertex counts for all four solids at stages 5, 8 and 11: 1,200 generated property/sort pairs pass. The pre-fix 400-pair sample exposed 1,856 scope/key observations (baseline JSON retained). This source check is separate from the real browser property/sort interactions.

## Evidence and unresolved scope

Opening, selected, wrong, correct and selected victory screenshots are in `qa-artifacts/full-playtest/campaign/`. Full scored victories observed in this assignment: prime_pop, rounding_rocket, maths_vs_zombies, area_architect, change_counter. Other games have action-level evidence; their full timer/fail/victory/replay paths remain outside this 28-game matrix.

Earlier checker failures included a Submit-disabled-after-reset wait, a hidden Rocket build-status read, expecting an immediate Zombies victory instead of defending through its real timer, transient briefing/toast detachment and a test-only money-literal encoding issue. Each was resolved by observing the actual UI contract, with failed artifacts retained. No production fix was made for these harness assumptions.

Scored Zombies was defended for the full timer with actual calculation casts; Prime Pop achieved its goal using prime-only pointer taps after one deliberate composite mistake. Change Counter completed all six customer change receipts. Area Architect completed five rooms. Rocket installed all eight parts and reached launch/orbit/results.

## Files and assumptions

Production change in this gameplay task: `src/games/PolygonPalaceGame.tsx` only. Added verification/report files: `scripts/full-campaign-playtest.mjs`, `scripts/verify-polygon-dimensional-properties.mjs`, this report and local QA artifacts. The parent owns final build/type checks and the full release report. No deploy, upload, backend changes, new art or live account mutations were performed. No external legacy assumptions were used.
