# Fraction game interaction playtest — 23 October 2026

Compiled iOS candidate at `http://127.0.0.1:3024`, tier 5 routes from the current repository catalog. All six assigned games were played using actual DOM button clicks and input filling, at both 844 × 390 and 667 × 375. Each case used a fresh isolated release-account fixture, unlocked QA player and deterministic seed 8431. No live accounts or deployment were used. Browser contexts and browser are closed.

## Results: 12 / 12 actual-action cases pass

| Game | Both phone sizes: observed actions and outcome | Final evidence |
|---|---|---|
| Share Splitter | Incomplete allocation rejected; reset; allocate all cakes from total and displayed ratios; five correct rounds; Mission results dialog | `qa-artifacts/full-playtest/fractions/results.json` |
| Scale Builder | Incorrect lengths rejected; edit both answers; independently multiply original lengths by scale factor; five projects; Blueprints restored dialog | Same first-run results |
| Fraction Forge | Wrong permitted operand pair rejected; clear; enumerate displayed numeric fractions against shown operation/target; six successful commissions; Mission results dialog | `qa-artifacts/full-playtest/fractions-recheck/results.json` |
| Potion Panic | Incomplete brew rejected; recover; derive ingredient counts from total drops and displayed ratio, respecting already-filled ingredient; three correct brews; Mission results dialog | Same recheck results |
| Match Mastery | Numeric solver finds a non-matching adjacent swap and observes rejection; then finds eight valid swaps from displayed fraction/decimal/percentage equivalences; score increases after every accepted swap | Same recheck results |
| Take-Out Rush | Wrong sum rejected; reset; derive eligible portion combination from displayed fractions, target and minimum count; five orders served through actual automatic validation and natural customer arrival | `qa-artifacts/full-playtest/takeout-auto-recheck/results.json` |

All final cases recorded no page errors. Opening, wrong and correct screenshots are next to each result file, with completion screenshots for the four completed games. Match Mastery did **not** reach its score target in this bounded eight-swap check. Takeout's timed shift was **not** run to completion. No full-victory claim is made for these two games.

## Harness corrections and preserved failures

First-run failures are retained; they were investigated as test assumptions rather than hidden or reported as product failures:

- Takeout automatically submits an exact valid sum after 140 ms. Clicking Send again could wait on the already-submitted next ticket, and Reset is correctly disabled for an empty tray. Final test observes automatic service and customer arrival, without changing game timing or queue logic.
- Forge intentionally disables whole-number cards for the first division slot. The first solver incorrectly discarded them altogether; final solver reads all shown ingots, chooses the proper fraction first, then the whole number when enabled.
- Potion renders `OF` in uppercase; the rounds regex was corrected to be case-insensitive.
- Match score polling had a misplaced Promise `catch`; corrected without changing game state.

No production changes were required from these interaction cases. The only production correction from the answer-integrity work is documented separately in `SATS_ANSWER_INTEGRITY_PLAYTEST.md`.

## Reproduction and limits

Run `node scripts/playtest-fraction-interactions.mjs` against a compiled preview on 3024. Optional `LEGEND_PLAY_KEYS` comma-separated game keys and `LEGEND_QA_OUT` select a focused rerun/output directory. The script saves each case before closing its isolated context.

Independent pure-generator checks also cover all five tiers: ratio sharing, potion counts and scale tests from the answer audit, plus 1,000 Takeout integer-fraction reachability checks and 1,000 Forge cross-multiplied recipes in `scripts/verify-fraction-generator-solvability.mjs`. Those are mathematical checks; only the tier-five interactive routes were exercised here. Native Safari/WebView keyboard, audio listening and physical iPhone touches remain separate device verification.

Changed files: `scripts/playtest-fraction-interactions.mjs`, `scripts/verify-fraction-generator-solvability.mjs`, these reports and QA evidence. Assumptions: the current catalog's tier-five routes and documented button/data hooks represent the shipped UI; real interactions may use the existing automatic submission flow. No external legacy assumptions were used.
