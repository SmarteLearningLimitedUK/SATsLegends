# Coordinates guide and plot separation

23 October 2026. Local presentation correction; no release action.

The final visual review found that the guide covered the rightmost grid column and +3 axis area at667×375 and844×390. The earlier button/HUD checks could pass because the decoration did not block input events. This was a real visual failure: mathematical information was obscured.

The short-landscape board now reserves the guide's existing24% scene width plus its1% edge gap before sizing and centering the coordinate plane. The reservation uses the measured shared scene width. Character artwork, pose, baseline and mathematical coordinates are unchanged. The plane retains its available-height size; it moves into the clear region rather than shrinking the whole game.

Changed production file: `src/games/coordinates-quest.css`.

Regression: `scripts/verify-flow-game-layout.mjs` now explicitly rejects intersection between the entire guide rectangle and coordinate plane, in addition to its safe-area bounds,44px alternative controls, step/confirm action and selected-point assertions. It exercises844×390 and667×375, zero insets and both simulated44px side/21px bottom inset directions.

Prototype evidence is labelled in `qa-artifacts/ios-remediation/coordinate-guide-prototype/`; it injects the source stylesheet into the previous compiled candidate and is not final compiled verification. It passed12 pilot cases, including6 coordinate cases with the new separation assertion. Zero-inset plot size remained216px at844 and201px at667; clear horizontal gaps to the full guide rectangle were38.78px and15.33px respectively.

Final compiled verification passed **12/12**, including all6 coordinate cases with guide/plane exclusion and step/confirm checks. Raw results: `qa-artifacts/ios-remediation/flow-contract/results.json`; no stylesheet injection was used. The final affected-game sweep also passed all3 games ×3 viewports, including Coordinates desktop. Current opening captures are under `final-corrections/{default,compact,desktop}/`.

Original obscured opening images and review notes remain under `final-default/`, `final-compact/` and `visual-review/`. The combined gallery uses corrected opening captures and labels the older images as before comparisons.

Assumptions: dense direct grid markers retain the separate44px step/confirm alternative; browser inset simulations are not physical iPhone validation. No external legacy assumptions were used. No mathematical content/scoring changes or deployment.
