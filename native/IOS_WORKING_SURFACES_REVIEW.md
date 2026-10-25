# Working surfaces: Change Counter and Multiplication Mine

22 October 2026. Local B5 readability batch. No upload or deployment.

## Scope and assumptions

Inspected `ChangeCounterGame.tsx`, `ShopCheckoutScene.tsx`, `monster-market.css`, `change-counter-shop.css`, `MultiplicationMineGame.tsx`, `MultiplicationColumns.tsx`, `multiplication-mine.css`, composition overrides and the existing till/multiplication tests. Established shop/mining art remains. Landscape remains the phone policy. Native validation is separate. No external legacy assumptions were used.

## Changes

- `src/games/change-counter-shop.css`: increase useful checkout width from73% to85% on short landscape, reclaiming decorative clerk space. Clerk is resized and raised behind the existing counter, retaining visible face/torso. Main receipt item/line totals are15px, unit prices14px, totals17px; coin labels17px. Override the evidenced old12px `!important` receipt rule locally, without editing global styles. Rows reserve actual text height; local receipt overflow remains available for unusual long items rather than overlapping text. Desktop checkout width78% instead of64%.
- `src/games/multiplication-mine.css`: useful working region83% instead of73%, decorative guide17%; written digits22px instead of17px, carries/place headings13px instead of10px, column question15px instead of12px. Column grid remains aligned; active place shading, entered digits and carry instructions are unchanged. Larger desktop lesson also receives more width. No arithmetic, answer generation, score, event or timer code changed.
- `scripts/verify-ios-working-surfaces.mjs`: isolated seeded fixture at844×390,667×375,1440×900 for both games. Checks actual fonts, visible44px controls and dock clearance. Shop exercises selected tray, wrong submission, clearing, exact coin change and correct feedback. Mine exercises wrong choice preserving current column, each written step including carry/placeholder/final sum, and completed-product progress.

## Evidence

`qa-artifacts/ios-working-surfaces/` contains original audit before captures and fresh opening/selected/carry/wrong/correct captures. Before questions differ; they are comparison evidence of composition, not pixel baselines. Inspect the844 and667 phone originals at native size before judging smaller contact images.

Source-server exploration reproduced unrelated HMR/navigation interruptions. Initial successful phone renders showed the legacy receipt rule was still imposing12px text; the local specificity was corrected and a computed14px minimum assertion added. The combined **compiled iOS browser rerun passed6/6** cases after the48.48s integration build (`.tmp/ios-remediation-integration-build.log`): both games at844×390,667×375 and1440×900, with wrong/correct interactions,44px controls, dock clearance and no document scrolling. Raw results: `qa-artifacts/ios-working-surfaces/results.json`; log `.tmp/ios-working-surfaces-compiled.log`.

`npx tsx scripts/verify-mine-method.ts` passed **1,386 products**: column carries, ones-first order, tens placeholders, aligned rows and final totals. This is arithmetic verification, not native touch proof. Final combined build/typecheck and wider regression checks remain in the overall remediation batch report.

The focused compiled shop rerun additionally passed **3/3** row-reachability cases: each item can be scrolled fully into its own receipt viewport, including the last unit price at667×375. Captures `change_counter-*-last-receipt-line.png`; results `results-focused.json`, log `.tmp/ios-working-shop-scroll.log`. The smallest tested phone needs this local receipt scroll for some four-line trades; it is explicitly retained rather than claiming every value is simultaneously visible.

## Limits

No new native iPhone, VoiceOver or sustained normal-motion performance verification. Current fixture covers tier5 opening and first product/trade states; it does not certify every random item, every tier, or a whole session. Dense receipt variants can scroll within the receipt; no document scrolling is introduced. Wider shared-shell migration may require final geometry rechecks.

## 23 October final-candidate regression

Compiled3024 final candidate: `.tmp/ios-final-candidate-build.log`,39.69s. Working surfaces passed **6 unique cases out of6** after one focused rerun; receipt reachability was also repeated at the three shop sizes and passed **3/3**. These three shop repetitions are not counted as three additional unique working cases. Final combined six-row report: `qa-artifacts/ios-working-surfaces/results.json`. Logs `.tmp/ios-final-working-23oct.log`, `.tmp/ios-final-working-mine-recheck.log`, `.tmp/ios-final-receipt-23oct.log`.

The first run was5/6. Mine1440 timed out waiting for generic `[data-game-set]` visibility after Start. Its saved failure body and screenshot show the actual complete Mine screen and179s HUD, not the opening splash. Console/page errors and request failures were empty; all fixture APIs returned200, with initial requests beginning at26.995s and completing within3ms, then save at37.857s. No pending fixture RPC was recorded at capture. This does not establish a root cause for the transient readiness timeout. The same case passed unchanged-timeout rerun, including wrong choice, every written step and completed-product progress. Original failure remains in `23oct-first-run-results.json` and `multiplication_mine-1440-failure.png`; rerun is `23oct-mine1440-recheck.json`, and the final combined row explicitly records the prior outcome.

Failure diagnostics now retain viewport, rendered body, console/page errors, failed requests and isolated fixture API timing/body; auth response bodies are excluded. No production fix, readiness selector change or timeout increase was used to obtain the rerun. No native certification or deployment is claimed.
