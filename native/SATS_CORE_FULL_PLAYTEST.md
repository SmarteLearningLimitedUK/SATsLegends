# Full Core paper UI playtest — 23 October 2026

## Current outcome

**All 86 questions were completed through the actual UI: arithmetic 40/40, reasoning Paper 2 35/35 and reasoning Paper 3 35/35.** Each run saved every response, expanded review, recorded exactly one history attempt, and reported no page errors. All three exercised answer pad, Later/revisit, saved working notes and finish-cancel. Tests ran at 844 × 390 against the compiled iOS preview; this is browser-based integration evidence, not a physical iPhone certification.

| Paper | Real checkpoint seed | Saved responses | Marks | Final evidence |
|---|---:|---:|---:|---|
| Arithmetic | 1792747801292 | 36 | 40/40 | `qa-artifacts/full-playtest/core-arithmetic-fixed/results.json` |
| Reasoning 2 | 1792747408643 | 25 | 35/35 | `qa-artifacts/full-playtest/core-final/results.json`, paper-2 row |
| Reasoning 3 | 1792747419214 | 25 | 35/35 | Same file, paper-3 row |

Focused repaired-build regression also passes: dense response slots, new checkpoint reload, historical null-slot recovery, seed/answer/workpad retention and real review score **3/40**, without page errors. Evidence: `qa-artifacts/full-playtest/core-checkpoint-fixed/results.json` and four state screenshots. Earlier blank-paper **0/40** and timeout-current-draft **1/40** tests passed; their timer/scoring paths did not change in the subsequent checkpoint repair.

The two naturally selected reasoning runs exercised `construct-graph` and `ext-symmetry` construction controls. All nine remaining families subsequently passed the separately labelled seeded-resume fixtures below: **11/11 construction families covered**. These targeted fixtures supplement, rather than enlarge, the 86-question natural full-run count.

The separate answer-integrity audit checks mathematical correctness. This playthrough uses the actual generated paper's expected answers to exercise the visible UI; it is an integration check, not an independent answer oracle.

Harness: `scripts/playtest-full-core-papers.mjs`, using `scripts/qa/core-playtest-actions.mjs` and the Node `scripts/export-playtest-paper.ts`. Real Start, intro, buttons, inputs, answer pad, construction controls, Save/Later, workpad and finish dialog are used. The only browser reads for paper export are the real scoped checkpoint seed; no answers or scoring callbacks are injected into browser state.

## First candidate attempt, preserved

Evidence: `qa-artifacts/full-playtest/core/results.json` and `core-run.log`.

- **Blank paper passed:** real finish/review reports 0 / 40 marks, with one saved history attempt.
- **Timeout draft passed:** a correct first answer and workpad were entered without Save. Playwright advanced the real browser clock past the paper deadline; the normal game timer moved to review and preserved the current response and workpad. Review/history awards only the first mission's mark, with one attempt.
- **Paper 1 full playthrough was initially blocked:** after Start, the UI remained `Loading game…` beyond the harness's 10-second component-ready timeout. No page errors or failed requests were observed. Later complete runs passed with the same timeout. The transient observation is preserved; its root cause was not established.
- **Papers 2/3 full playthroughs were initially blocked by source/build mismatch:** the first Later navigation displayed a different mission from the Node-exported current-source paper for the same real checkpoint seed. Current source `satsAdventure.ts` modification time was 10:14:19, newer than compiled `dist-ios/index.html` at 10:05:50. A matching build was needed before the source-based exporter could validate compiled selection. That mismatch was subsequently resolved; no question-answer/UI defect was inferred from it.

At that stage all first-run browsers closed and full-paper traversal awaited a matching candidate. The final successful outcomes are recorded above. The harness was extended to record pending request URL/type/elapsed diagnostics on failure and retain the checkpoint seed. Initial failed runs remain untouched.

## Matching candidate: reasoning completed; arithmetic defect confirmed

`qa-artifacts/full-playtest/core-final/results.json` records both reasoning papers fully completed through actual controls: 25/25 saved answers each, **35/35 marks each**, expanded answer/solution review and one history attempt each. Later/revisit, answer pad, workpad preservation and finish-cancel passed. The initial source/build mismatch is therefore resolved for these runs.

Arithmetic reached question 33 (`ar-long-mult-a`) after 32 valid saved responses. A second real run with explicit next-mission/save settling reproduced a **production failure**, not the earlier harness checkpoint-read assumption:

- Hidden method field 0 plus visible final response field 1 created `[null,"28405"]` in the serialized draft (seed `1792747489210`).
- Subsequent answer-pad edits spread the sparse array into an undefined first element. Save & continue raised `Cannot read properties of undefined (reading 'trim')`, remained at 32/36, and did not advance to long division.
- The checkpoint reader also required string-only arrays, so the null-bearing saved draft could not restore.

Reproducer evidence: `qa-artifacts/full-playtest/core-arithmetic-recheck/results.json`, log and failure screenshot; original matching-candidate run is also retained. Parent applied a bounded `BossEncounterGame.tsx` correction to initialize missing response slots with empty strings and recover historical null placeholders. This agent did not edit that production file. Compiled verification subsequently passed as recorded above.

Completed regression: `scripts/playtest-core-checkpoint-restoration.mjs` exercises multiple answer-pad edits, dense draft/save advancement, real reload retaining seed and saved answers/workpad, and a deliberate historical-null checkpoint fixture followed by recovery and a real 3/40 review. Full arithmetic 36/36 and 40/40 subsequently passed on the repaired compiled candidate. Blank and timeout tests from the first candidate remain valid for their unchanged paths.

## Remaining construction controls: 9 / 9 pass

`scripts/export-core-construction-fixtures.ts` found actual selected papers containing the nine families. `scripts/playtest-core-constructions.mjs` first created a real scoped checkpoint, then selected only its seed/index with empty answers, resumed through the normal reader and entered the response exclusively through visible controls. These are explicitly **seeded resumed-paper fixtures**, not natural full runs. Each received its full expected question marks on Save/finish/review, with no page errors.

| Family | Paper / seed | Awarded marks | Visible interaction |
|---|---|---:|---|
| `depth-angle-draw` | 3 / 0 | 1/1 | Ray-angle slider |
| `revision-fraction-shade` | 2 / 1 | 1/1 | Shaded-squares slider |
| `draw-rectangle` | 3 / 2 | 1/1 | Increase long-side controls |
| `draw-angle` | 3 / 3 | 1/1 | Increase angle by five degrees |
| `depth-rectangle-build` | 2 / 4 | 2/2 | Length and width sliders |
| `depth-pie-build` | 2 / 6 | 2/2 | Sector tabs and angle slider |
| `depth-line-build` | 3 / 6 | 2/2 | Reading tabs and plot slider |
| `depth-symmetry-axes` | 3 / 8 | 1/1 | Select line A/B/C/D buttons |
| `revision-pictogram-build` | 2 / 9 | 2/2 | Row choices and add-half-symbol buttons |

Evidence: eight passing rows and state screenshots in `qa-artifacts/full-playtest/core-constructions/`; final `draw-angle` passing row and screenshots in `core-constructions-recheck/`. Its initial fixture failed when the helper clicked an exiting intro a second time after phase had already changed to play. The helper now stops at play and waits for the actual clicked popup to become hidden; only the harness changed. That initial failure remains preserved.

All browsers are closed. Changed test/report files for Core: `scripts/playtest-full-core-papers.mjs`, `scripts/playtest-core-checkpoint-restoration.mjs`, `scripts/export-core-construction-fixtures.ts`, `scripts/playtest-core-constructions.mjs`, `scripts/qa/core-playtest-actions.mjs`, this report and QA artifacts. The exporter/answer helper supplied by the parent is used as an integration oracle; mathematical correctness is addressed separately in `SATS_ANSWER_INTEGRITY_PLAYTEST.md`.

No production files were edited by this playtest agent. No build, deployment, live-account operation or external legacy assumptions were used.
