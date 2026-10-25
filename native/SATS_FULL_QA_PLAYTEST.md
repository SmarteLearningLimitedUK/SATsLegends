# SATs Legends — full QA and playtest review

23 October 2026. Current repository only. This is a **SATs revision companion disguised as a game**, not a replacement curriculum or a concept-teaching course. The review therefore checks tested content, usable practice, correct marking, clear questions and playable presentation. It does not recommend unrelated teaching systems or extra games simply to duplicate curriculum headings.

## Current verdict

All **37 current games have actual gameplay evidence**: wrong/correct interactions in the 34 ordinary games and complete runs of the three Core papers with **86 saved responses and 110/110 available marks**. Independent mathematical checks also pass after correcting a decimal-method marking defect. A full objective crosswalk found representative numerical or diagram-based evidence across all 195 framework rows, with **114 supported representatives and 81 thin objectives**; that does not mean complete depth or official-paper equivalence.

The local QA pass is complete, including compiled verification of the Polygon dimensional-property repair. **The user's release hold remains in place:** no deployment or TestFlight upload has been performed. Physical iPhone/WebView verification, pupil difficulty calibration and the intermittent startup observation below remain separate validation limits. This is a scoped browser/source QA outcome, not unconditional deployment sign-off.

The [evidence gallery](../qa-artifacts/full-playtest/index.html) links screenshots from labelled runs, including preserved failures. A screenshot is not proof that an entire game or every generated state passed. Detailed reports below distinguish source evidence, independent numeric checks and actual UI actions.

## Evidence and actual counts

| Workstream | Completed evidence | Interpretation |
|---|---|---|
| Core full papers | 36 arithmetic + 25 + 25 reasoning responses; review 40/40, 35/35, 35/35; one history attempt each | Actual Start/intro, visible controls, answer pad, Save, Later/revisit, workpad and finish-cancel; expected bank answers used for integration, separately audited mathematically |
| Core construction coverage | 2 families in natural full papers + 9 seeded resumed-paper fixtures = **11/11 families** | Actual sliders/buttons, Save/finish and full question marks; seeded fixtures begin with empty answers and are explicitly not natural full runs |
| Core persistence/clock | Dense and historical-null checkpoint restoration; blank paper 0/40; timeout unsaved current draft 1/40; all three papers pause/resume/reload checks | Real controls and normal timer logic; Playwright advances the browser clock for bounded timeout tests |
| Fraction games | **12/12** actual wrong/retry/correct cases: six games × 844×390 / 667×375 | Four games reach full completion; Match has eight successful swaps and Takeout five served orders per size, without claiming timed victory |
| Current campaign catalogue | **34/34 ordinary games** have observed wrong/correct interactions, plus all 3 Core full runs | 28 campaign cases plus 6 fraction games; most games have bounded actions, not a completed run of every tier |
| Calm activities | **12 unique game/profile cases pass** after repair: six activities × compact portrait phone / desktop | Combines passing initial cases and targeted repaired reruns; do not count repeated runs as additional activities |
| Additional practice access | **2/2** compiled Tips/workshop checks | Capacity in Unit Mixer and regular-polygon angles in Angle Arena are accessible, lazily loaded, paused and focus-contained |
| Mathematical keys | **32,037 independently checked fields**: 125 seeds, 202 mission families plus 100 shared/other authored families; zero mismatches | Exact-fraction and geometry oracles derive expected answers from givens/model; not just answers scoring against themselves |
| Added boundaries | 1,500 number lines; 1,500 transformations; 5,000 rounding rounds; 1,089 written products; 59 Roman values; 720 Roman clock prompts; 1,000 Takeout and 1,000 Forge checks | All five tiers where applicable; independent missing-scale, numeric-equivalence, reachability, carry/zero and operand checks |
| Existing seeded suites | 600 paper variants; 53 depth families × 1,000 seeds; 10 gap families × 1,000 seeds; 5,000 shipment checks; local ratio/measure/calculation suites | Some are self-consistency/reachability checks; detailed answer audit identifies which expectations are independent |
| Curriculum source matrix | 202 families × 250 seeds = 50,500 generated instances; 200 selected in Core sample | A family/guide join alone is not proof of actual play exposure; two non-selected families are verified through restored Tips practice |
| Official objective crosswalk | **195 rows: 114 supported representatives, 81 thin, 0 wholly unevidenced** | Semantic demand checked against current framework; supported means a matched representative, not mastery or full context breadth |
| Audio/source | All **37 current game keys** have sound profiles; all 20 referenced clips exist | The historical constants verifier counts an extra non-current key; do not describe that as 38 played games |
| Audio/results actual UI | Failure → Retry → correct clocks → timed victory; mute/unmute, music media advancement, Board pause, saved progress reload | Final recheck passes; no direct audio/game callbacks used to manufacture results |
| Account/start flow | **4/4** compiled profiles: invalid/correct login, signup/reset navigation, learner selection, Start, rotation/reentry and portrait account return | Isolated shared-account fixture and native bridge stand-in; no live authentication or actual physical rotation |
| Difficulty/build checks | Final five-tier property suite **28/28**; TypeScript passes; final iOS build **32.41s**; website build **31.80s** | Generator properties and route/tier wiring, not pupil-calibrated difficulty. Existing Vite chunk-size advisories remain; no build error |
| Account shell | **4/4** isolated fixture cases pass: invalid/correct login, signup/reset links, learner selection, orientation bridge, Start/re-entry | Actual UI, no live authentication or subscription purchase; `qa-artifacts/full-playtest/account/results.json` |
| Evidence gallery | Desktop and 390px filtering checked: **37 rows / 32 images**, no page errors or failed assets | Gallery UI verification, not an extra 37 game passes; `qa-artifacts/full-playtest/gallery-ui-check.json` |

Final [campaign evidence](SATS_CAMPAIGN_PLAYTEST.md) resolves Place Value Panic, Polygon Palace, Data Detective and Change Counter. Full victories were observed in **Area Architect, Prime Pop, Rounding Rocket, Maths vs Zombies and Change Counter**, plus the four completed fraction games. The additional result/retry test completed a scored Chrono Dash run with an accelerated browser clock. Match and Takeout remain bounded checks, as do the other ordinary campaign games. Original harness failures, the genuine repaired defects and the unresolved startup observation remain preserved separately.

## Confirmed defects repaired

| Finding | Correction | Evidence/status |
|---|---|---|
| Leading decimal working `.5 + .5`, `-.5 + 1`, `1 ÷ .5` was read as 10, -4, 0.2 | Accept leading decimals, require full token coverage and finite numeric operations | Independent literal regressions pass; malformed expressions rejected |
| Core's absolute deadline continued through shared pause | Preserve and restore deadline through Tips, orientation pause and reload | All three compiled paper checks hold the clock and resume correctly |
| Hidden arithmetic method slot produced sparse/undefined draft; Save could throw and old null checkpoint could not restore | Initialize missing response slots with empty strings; recover historical null placeholders | Actual Q33 failure preserved; repaired full Paper 1 scores 40/40; new/legacy reload regression scores 3/40 without page errors |
| Tips replacement left the existing extra SATs practice workshop without a caller | Closed-by-default Practise SATs questions disclosure in Tips, loaded on demand | 2/2 compiled correct-answer/focus/pause checks pass |
| Ten family objective tags mismatched the actual tested demand | Correct only the objective references, preserving questions/answers/scoring | Current matrix and semantic ledger regenerated; detailed before/after table in curriculum report |
| Calendar text could say “1 years” / “1 months” | Singular/plural wording follows the actual quantity | Bounded text-only correction included in candidate |
| Compact Orion constellation star targets overlapped | Compact phone targets are 48px instead of the inherited 62px minimum | Repaired phone check passes without overlapping targets; six calm activities × two profiles now have unique passing evidence |
| Polygon solid questions could offer 2D side/regularity properties; cube could be keyed as having no parallel sides | Shape-kind-scoped property/sort semantics; solid face/edge/vertex language retained | **1,200 repaired source cases pass**; actual compiled solid sorting and property answers accepted with independent geometry expectations |

No new art, bank expansion, unrelated backend or teaching curriculum was added in this audit. Existing high-resolution scenes and character art were preserved.

## SATs scope and remaining content depth

The authoritative scope is the [STA KS2 maths framework](https://www.gov.uk/government/publications/key-stage-2-mathematics-test-framework), with the [2026 school papers and mark schemes](https://www.gov.uk/government/publications/key-stage-2-tests-2026-mathematics-test-materials) used as current examples. The [curriculum report](SATS_CURRICULUM_PLAYTEST_AUDIT.md) links detailed provenance and the full [195-row semantic ledger](../qa-artifacts/full-playtest/objective-ledger.md). A single year's paper is not an exhaustive list of tested topics. No official question text was copied into the game.

All nine strands have reachable Core representatives. The evidence does not justify a new wholly missing topic game. The 81 thin objectives reflect limited representation, numerical range or independent response demand. The main revision-depth opportunities are varied unprompted multi-step strategy, unfamiliar diagrams/contexts, multiple valid answers, numerical-range variety and independent construction. These belong within existing games/banks. Physical apparatus and inferring a mental strategy from a final answer are practical assessment limits, not missing teaching features to bolt onto this app.

Examples of narrower main-game scope are Rocket's 10/100/1,000 rounding, Place Value Panic's generated range and Angle Arena's straight-line focus; wider associated Core/practice banks supply additional tested demands. Do not advertise an individual main generator as full-topic coverage. Source tags, 202 families and 114 supported representatives are different measures and must not be merged into a “coverage percentage”.

No newly established reachable scored requirement for probability, median/mode, negative multiplication/division or a circumference formula was found. Calendar facts and Roman clock formats are within assessed scope. Scope decisions use actual reachable content rather than dormant component names.

## Presentation, difficulty and native boundaries

Checked phone play uses 844×390 / 667×375 landscape for the six fraction games and 844×390 for full Core, plus portrait compact calm checks and desktop calm checks. Real actions verify accessible selection and response completion in those states. They do not establish that no possible random state, long translated text or physical device keyboard can ever overlap. High-resolution art and animation quality remain partly visual judgement; no automated test certifies “AAA” quality.

Five-tier source/boundary tests pass and Core orders its chosen questions by internal difficulty. Those labels are author estimates. Actual pupil error patterns and completion times are needed to claim a calibrated progression. This is a revision game, so useful challenge/recall and test-like independent responses matter more than adding lessons.

One first-run Paper 1 startup remained “Loading game…” beyond a 10-second readiness check without page errors or failed requests; later full runs passed with the same bound. Earlier intermittent cold-start observations also remain without a reproduced root cause. Preserve this as a performance/reliability observation rather than claim it was fixed or erase the failed run.

Browser evidence is not native certification. A physical iPhone/TestFlight pass must still check WKWebView safe areas, portrait/landscape transitions, keyboard behavior, audio unlock/interruptions/speaker balance, touch precision and subscription/account flows. No live Apple, payment or production-account changes were made here. Keep the user's upload hold in place.

Final checks: `npm run lint`, `npm run build:ios`, `npm run build`, `verify-five-tier-difficulty.mjs`, `verify-sats-content.ts` and `verify-method-decimal-boundaries.ts` all passed on the final source. Logs are `.tmp/full-playtest-final-tsc.log`, `.tmp/full-playtest-polygon-build.log`, `.tmp/full-playtest-website-build.log`, `.tmp/full-five-tier-final.log`, `.tmp/full-content-final.log` and `.tmp/full-decimal-final.log`. No production edit followed these final checks. The gallery has 37 game rows and 32 selected images; desktop/phone layout, filtering and loaded image requests passed. Reconciled evidence and build hashes are in `qa-artifacts/full-playtest/final-verification.json`.

Final TypeScript validation passed. The parent coordinates the remaining website build after the last campaign browser closes; this draft does not pre-claim that pending build result.

## Reports, exact production scope and assumptions

- [Answer integrity](SATS_ANSWER_INTEGRITY_PLAYTEST.md): independent oracles, seeded counts and parser regression.
- [Core full playtest](SATS_CORE_FULL_PLAYTEST.md): all 86, 11 construction families, pause/persistence and retained failures.
- [Fraction interactions](SATS_FRACTION_INTERACTION_PLAYTEST.md): 12 real-action cases and bounded completion claims.
- [Campaign interactions](SATS_CAMPAIGN_PLAYTEST.md): 28 further games, five scored victories and the Polygon repair.
- [Curriculum review](SATS_CURRICULUM_PLAYTEST_AUDIT.md): framework/2026 papers, 195-objective ledger, ten tag corrections and depth limits.
- [Audio trace](SATS_AUDIO_EVENT_AUDIT.md): event/sample coverage and listening/native limitations. Actual result/audio evidence is `qa-artifacts/full-playtest/results-audio-recheck/results.json`.

The production changes in this audit are confined to these nine files:

1. `src/games/BossEncounterGame.tsx` — Core pause/deadline, dense response slots and legacy checkpoint recovery.
2. `src/components/game-ui/PracticeIntroPopup.tsx` — restore existing additional SATs practice through Tips.
3. `src/systems/content/satsAdventure.ts` — objective reference corrections.
4. `src/systems/content/satsDepthMissions.ts` — objective reference corrections.
5. `src/systems/content/satsExtendedMissions.ts` — objective reference corrections.
6. `src/systems/content/satsRevisionGapMissions.ts` — calendar singular/plural text.
7. `src/systems/content/satsResponseMarking.ts` — leading decimal method parsing.
8. `src/wellbeing/wellbeing.css` — compact Orion target spacing.
9. `src/games/PolygonPalaceGame.tsx` — verified 2D/3D property separation.

Scripts, reports, screenshots, exported inventories and downloaded official reference material under `scripts/`, `native/` and `qa-artifacts/full-playtest/` are evidence, not gameplay features. Existing unrelated dirty files were not reset or claimed as this audit's changes.

Assumptions: the current 37-key catalog defines scored-game scope; the six calm activities are additional; seeded bank answers may be used as UI integration expectations only after separating independent mathematical checks; original release-account fixtures represent isolated test users, not production data. All source and claims come from the current prompt/repository and explicitly retrieved official material. **No external legacy assumptions were used.**
