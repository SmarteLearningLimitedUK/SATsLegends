# SATs answer integrity playtest — 23 October 2026

Scope: mathematical answer generation and marking, using current repository banks. This is one part of the wider playtest, not a claim that every SATs objective or every playable interaction has been independently certified. No live account, browser, build, deployment or TestFlight operation was used for this work.

## Confirmed defect and correction

`src/systems/content/satsResponseMarking.ts`, `calculationEvidence`, silently discarded a decimal point before a digit when the pupil omitted a leading zero. Reproduced without randomness:

| Working | Before | Correct / after |
|---|---:|---:|
| `.5 + .5` | 10 | 1 |
| `-.5 + 1` | -4 | 0.5 |
| `1 ÷ .5` | 0.2 | 2 |

This could wrongly grant or withhold a method mark. The tokenizer now accepts leading decimal notation and verifies that every non-whitespace input character was consumed. Numeric atoms and intermediate sums must be finite. Arithmetic precedence, intermediate evidence and final-answer contracts remain unchanged. Malformed dots, unsafe text, incomplete expressions and division by zero are rejected.

Evidence: `qa-artifacts/full-playtest/content/method-decimal-boundary.log` preserves the before results. `method-decimal-regression.log` records the corrected 11 literal expected calculation cases, 15 rejection cases and four real partial-credit routes. The tests use independently worked numeric constants; they do not use generated answer keys as an oracle.

## Completed checks

All listed commands completed successfully. Logs and JSON results are under `qa-artifacts/full-playtest/content/`.

| Check | Actual coverage / result |
|---|---|
| Exact-arithmetic Python oracle against fresh inventory | 32,037 independently checked fields; 125 seeds; 202 mission families; 100 authored shared/other families; zero mismatches |
| `verify-full-playtest-math-boundaries.ts` | 1,500 number lines across all five tiers: derive the missing value from two displayed labels; exactly one numerically correct option; four distinct numeric options |
| Same boundary suite | 1,500 transformations across all tiers: translation vector, reflection midpoint/invariant coordinate, grid bounds, distinct describe options |
| Same boundary suite | 5,000 rounding rounds across all tiers: independent lower/upper-distance decision, unique correct pad and distinct pads |
| Same boundary suite | All 59 supported Roman values independently decoded; invalid range rejected; 720 Roman clock prompts checked; exact face labels checked |
| Same boundary suite | 1,089 written multiplication examples, including zeros and carries: reconstruct displayed rows numerically and compare their sum and final row with the direct product |
| `verify-fraction-generator-solvability.mjs` | All five tiers, 1,000 Takeout orders independently solved using integer-denominator reachability with visible portion/minimum/banned-item constraints; 1,000 Forge recipes cross-multiplied, distinct numeric ingots and division operand types checked |
| `verify-sats-content.ts` after fix | 600 paper variants; marks, durations, strands, paper separation, deterministic replay, answer marking and equivalent-choice uniqueness pass |
| `verify-sats-question-integrity.ts` after fix | 70 readable authored challenge prompts, 12 independently checked data puzzles and unique measurement/time tiles pass |
| `verify-maths-marking.ts` after fix | Simplest-form instructions, final arithmetic marks, algebra, objective references and foundation labels pass |
| `verify-maths-local-banks.mjs` after fix | 798 ratio-race entries, 1,000 each sharing/potions/perimeter/percentage/division, 40 area questions and four convex-solid Euler checks pass |
| `verify-sats-upgrades.ts` | 1,000 seeds, 6,000 method tasks, 1,000 valid-pair tasks and 5,000 independent shipment questions pass |
| `verify-content-depth.ts` | 53 families over 1,000 seeds, reachability, partial marks, rectangle alternatives, set/sequence and tolerance boundaries pass |
| `verify-sats-topic-gaps.ts` | 10 families over 1,000 seeds, reachability, malformed response rejection and combinations checks pass |
| Scale and angle focused suites | Exact scale input and independent dimension mistakes pass; all five angle tiers pass (80 seeded runs each) |

Fresh inventory was exported using the existing `export-maths-audit.ts` with only its output folder redirected. The existing independent Python driver and `scripts/qa/sats_depth_oracle.py` / `sats_revision_gap_oracle.py` checked that export using exact fractions and independent geometry logic. Temporary wrappers under `.tmp` redirected historical report paths; they did not alter production generators. Inventory and oracle output: `content/independent/current-inventory.json` and `current-answer-verification.json`.

## Limits and follow-up interpretation

- A generated answer scoring full marks against its own marker is a consistency check, not independent proof. The 32,037-field oracle run and added boundary suite supplement those existing checks.
- Objective tags and 53 broad topic-family references establish representative presence, not full question depth, official assessment weighting or an appropriate difficulty progression. The parallel curriculum review must establish those separately.
- Some independent oracles read supplied visual-model dimensions or authored expected explanations. Those checks establish consistency between visible givens and the answer; they do not prove that every drawing is visually legible or every explanation is age-appropriate.
- Measurement-choice numeric comparisons sometimes remove the printed unit. Their passing result alone does not prove every visible unit label is correct. The focused shipment/perimeter/scale tests cover their own unit contracts only.
- The calendar oracle follows the question's explicit leap-year wording; it does not prove an independently generated Gregorian-year calculation exists. Convex-solid Euler checks alone do not certify every named property or curved solid.
- Seeded sampling is reproducible, not exhaustive. New test seed: `0x23102026`; the historical local-bank suite uses `0x20462026`.
- This work does not validate native keyboard behavior, touch interaction, audio or device rendering; those require the separately coordinated screen/playtest passes.

## Files changed for this audit

- `src/systems/content/satsResponseMarking.ts`: bounded decimal method-evidence correction.
- `scripts/verify-method-decimal-boundaries.ts`: independent parser/credit regression.
- `scripts/verify-full-playtest-math-boundaries.ts`: independent all-tier and boundary checks.
- `scripts/verify-fraction-generator-solvability.mjs`: independent all-tier fraction recipe/order reachability.
- This report and generated evidence under `qa-artifacts/full-playtest/content/`.

Assumptions: conventional school decimal notation permits `.5`; number-line displayed labels define the equal scale; existing bank APIs define supported tiers and clock values. No external legacy assumptions were used. No art, layout, question meaning, scoring totals or curriculum content was changed.
