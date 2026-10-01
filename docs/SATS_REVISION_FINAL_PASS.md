# SATs revision and Core mock adventures

## Scope and assumptions

- Interpret SATs as **England KS2 mathematics**. English reading and grammar are outside this maths repository and this amendment.
- Improve all 34 current campaign minigame guides, not the obsolete game list in BUILD_SPEC.
- Preserve practice plus five campaign difficulty tiers. The existing three Core routes become complete mock adventures; no new boss system is added.
- Use original questions, existing game backgrounds, the shared HUD and existing React/TypeScript/Vite architecture. No external legacy project assumptions were used.
- External factual references: [STA maths framework](https://www.gov.uk/government/publications/key-stage-2-mathematics-test-framework), [current 2026 materials](https://www.gov.uk/government/publications/key-stage-2-tests-2026-mathematics-test-materials), and [England maths curriculum](https://www.gov.uk/government/publications/national-curriculum-in-england-mathematics-programmes-of-study/national-curriculum-in-england-mathematics-programmes-of-study). No published question text was copied.

## Learner explanations and revision strategy

Every live campaign blueprint has a plain-language goal, three steps covering controls and maths, and a worked example. A centrally managed practice briefing prevents duplicate popups and releases each game's own introduction state when dismissed. Help uses the same guide at every difficulty, rather than falling back to internal implementation terminology.

Help also provides guided SATs missions with immediate explanations. These share their question models, visuals, response fields and answer checking with the Core. This is where additional revision content sits when an original game concentrates on a narrower skill, such as Fraction Forge's ordering mechanic. It does not silently replace the existing five-tier games.

Recommended loop, also shown after each mock: learn a method in practice; attempt the five levels; use a guided mission to work through a misconception; revisit tomorrow and later in the week; mix islands; take a Core run; use its review links for targeted practice. This combines fluency, application, mixed retrieval and timed assessment. Optional median/mode/range content remains enrichment; SATs statistics missions focus on the assessed mean and data interpretation.

## Coverage pass

The original revision mission pool now has at least one example for every **56 strand/substrand categories** in framework Table 2. This is breadth coverage, not a claim that one generated run samples every Year 3–6 objective or every possible problem variant. Question references identify the intended teaching strand; content should continue receiving educator review.

| Strand | Revision content and destination |
|---|---|
| N1–N6: number/place value | Counting, reading/writing large numbers, Roman numerals, place value, rounding, negatives and intervals. Place Value Panic, Number Line Ninja, Rounding Rocket. |
| C1–C9: calculations | Mental/written operations, inverse checks and estimates, factors/multiples/primes/squares/cubes, short and long multiplication/division, remainders in context, operation order and multi-step problems. Calculation Clash, Maths vs Zombies, Prime Pop, Factor Frenzy, Multiplication Mine, Remainder Run, Order Ops Arena, Problem Pyramid. |
| F1–F12: fractions/decimals/percentages | Naming and counting fractions, equivalence/simplification/order, same and different denominator addition/subtraction, mixed numbers, fraction multiplication/division, decimals and percentage equivalence, decimal rounding/order/calculations, fractions of quantities and reverse percentage problems. Café, Fraction Forge, Match Mastery, Simplify Sprint, Percent Power and calculation games. |
| R1–R4: ratio | Proportional recipes, fair comparisons using percentages, scale factors and unequal sharing. Potion Panic, Share Splitter, Ratio Racer, Scale Builder. |
| A1–A5: algebra | Missing numbers, substituting/inverting formulae, sequences, two unknowns and systematic enumeration. Formula Forge and Calculation Clash. |
| M1–M9: measurement | Comparing measures, scales, money/change, clocks/time/durations, metric and given imperial conversion, perimeter/rectangle/triangle/parallelogram/compound area, cuboid volume and practical problems. Conversion Canyon, Lava Path, Change Counter, Chrono Dash, Perimeter Path, Area Architect. |
| G1–G5: shape properties | Names/classification, parallel sides, symmetry, solids/faces/edges/vertices/nets, angle totals, circle radius/diameter, paper construction using ruler/protractor. Polygon Palace and Angle Arena. |
| P1–P3: position/direction | Repeating turns, compass movement, translations/reflections and four-quadrant coordinates. Rotation Station and Coordinates Quest. |
| S1–S3: statistics | Labelled/numbered bar and line graphs, tables/timetables, interpolation, pie sectors, differences/totals, constructing a chart and mean. Graph Grabber, Line Graph Lab, Data Detective, Mean Machine. |

Practical drawing missions explicitly use paper and require an adult check. A written “drawn” response alone earns no automatic mark. These tasks complement on-screen game models without pretending that typing can assess ruler/protractor use.

## Core assessment rules

| Existing route | Adventure | Time | Marks | Missions |
|---|---|---:|---:|---:|
| crystal_core | Arithmetic Reactor | 30 min | 40 | 36 |
| mirror_gate | Mirror Gate Expedition | 40 min | 35 | 25 |
| matrix_match | Matrix Crystal Quest | 40 min | 35 | 25 |

Arithmetic uses entered answers and context-free calculations, including four two-mark long written-method items. Both reasoning papers are mixed, include all nine strands, and have 24 number/ratio/algebra marks plus 11 measurement/geometry/position/statistics marks. Across the three papers this is 88/110 (80%) versus 22/110 (20%), within framework Table 10's profile. Reasoning mixes selected, entered, multipart and adult-checked constructed responses. Missions are ordered broadly from easier to harder; replay varies quantities and selections.

The countdown starts when launched, is visible in the shared HUD and continues during help or tab inactivity. Core timing overrides the existing development flag disabling normal level timers. Incorrect answers do not consume lives or expose answers during a run. Saving charges the animated reactor but does not signal correctness. Learners may skip, revisit and edit saved responses; finishing requires the in-game confirmation, and timeout saves the active draft and opens review. Once in review, answers cannot be changed.

Equivalent decimals/fractions/mixed numbers and time formats are accepted without evaluating learner input as code. Multipart questions award individual correct-response marks. Correct long-calculation answers receive two marks; incorrect answers may receive one method mark only after an adult confirms valid formal working. Written explanations/drawings require an adult check. Review separates pending checks, shows solutions, recommends practice routes, and saves the latest result per paper locally. No scaled score or official pass threshold is invented. Game rewards use existing progression callbacks after the learner finishes reviewing.

These are game mock adventures with the official duration, mark profile and broad subject coverage. They are original game questions, not psychometrically standardised STA papers; free-response marking and exact official method criteria still need educator judgement. The game retains scaffolding familiar from its training models.

## Layout and verification

Required order is retained: shared top HUD → mission strip → interaction/playfield → response cluster → shared bottom HUD. Backgrounds end at the gameplay boundary. **Scoped Core exception:** desktop/tablet use the existing responsive shell to accommodate graphs and constructed answers; desktop response inputs and action buttons share one compact row. Phone remains in the existing portrait shell. Review and mission list scroll inside the gameplay area. Dialogs trap focus, restore focus and support Escape; reduced motion stops the reactor ring and feedback pulse.

Device checks use PC (including short 1264×625), WebKit iPad A2HS (768×1024) and smartphone A2HS (390×844) emulation. These are browser checks, not a claim of physical-device testing. QA reports/screenshots are in ignored `qa-artifacts/sats-final`.

Validation scripts:
- `scripts/verify-sats-content.ts`: 600 paper variants; timing/count/marks/domain weights; 56 substrands; guides; equivalent answers; partial/manual marking; independent arithmetic recomputation.
- `scripts/verify-sats-final-pass.mjs`: all 34 desktop guides and representative tablet/phone guides, all three Core runs across devices, hierarchy/fit, saved/revisited answers and result persistence.
- `scripts/verify-sats-mock-flow.mjs`: all 36 incorrect answers still reach review; method credit; Escape; accelerated 40-minute timeout saves the current draft.

## Files changed in this amendment

- `src/systems/content/learnerGuides.ts`, `satsAdventure.ts`, `islandBlueprint.ts`
- `src/components/game-ui/LearnerGuideContext.ts`, `PracticeIntroPopup.tsx`, `RevisionWorkshop.tsx`, `SatsMissionVisual.tsx`, `sats-adventure.css`, `useDialogFocus.ts`
- `src/games/BossEncounterGame.tsx`
- `src/App.tsx`, `src/app/AppRouter.tsx`, `src/app/gameplaySessionContract.ts`, `src/app/useGameplaySession.ts`
- `src/components/UnifiedMiniGameHud.tsx`, `src/screens/IslandLevels.tsx`, `src/gameMeta.ts`, `src/constants.ts`
- The three verification scripts above and this document.

Existing user changes elsewhere were preserved. No backend, analytics or unrelated systems were added.

Final verification: production build and TypeScript check passed. The initial 51 browser cases (34 desktop guides, eight representative A2HS guides and nine Core runs) passed. The final nine Core cases passed again after the last clock/layout changes. A separate native test passed the full 36-question incorrect-answer run, adult method credit and automatic reasoning timeout; the training pause check confirmed that reading a briefing does not consume the Chrono round. All 600 generated-paper cases and the 56-substrand coverage check passed.
