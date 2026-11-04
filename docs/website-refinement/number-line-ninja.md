# Number Line Ninja — gem answers and enemy reaction

The user requested gem-like answer choices and a visible topple when a correct answer damages the enemy, with the elements usable in the future iOS edition.

The four answers remain individual HTML buttons with live number text. The faceted gem is a separate CSS-rendered visual layer; it is not embedded in the scenery or button text. The enemy uses a separate game-local rotation wrapper anchored at its feet. A correct answer retains the existing single strength decrement and hit audio, and shows a temporary −1 marker. A wrong answer does not topple or damage the enemy. Reduced-motion mode retains the strength decrement and marker without the rotation. The character, scenery, answer positions and effects are separately movable in future layouts.

The website production build and TypeScript pass. Chromium checked the 1440 × 900 desktop and 1280 × 720 short desktop; WebKit emulated an 844 × 390 phone and 1024 × 768 tablet. Correct-answer damage, reaction, next question and reduced-motion behaviour were exercised. A further desktop interaction check verified a wrong answer causes no damage and two consecutive correct answers trigger distinct topples and remove two strength points. These are browser checks, not physical iOS certification.

Review screenshots and recorded geometry/reaction checks: `qa-artifacts/website-refinement-2026-10-28/number-line-gems-v1/`. Status: proposed revision, awaiting user review; no full-game approval is implied. Existing live account, native project and maths/scoring rules are unchanged.

Changed files: `src/games/NumberLineNinjaGame.tsx`, `src/games/number-line-ninja.css`, `docs/website-refinement/review-inventory.json`, and this review record. Assumptions: use the current website's character and progression, with a visible but recoverable topple; future native sizing will adapt these separate elements. No external legacy assumptions were used.


## Independent number line

The number-line rail is now a standalone SVG asset (`src/assets/number-line-ninja/number-line-rail.svg`), rendered by the separate `NumberLineDisplay` component. Its marks, numbers, missing-value marker and answer-flight target remain independently positioned live elements. The existing question generation, scoring and game layout are retained. The asset and component can be resized or repositioned for a later iOS layout; native iOS behaviour still requires its own validation.

Review: `qa-artifacts/website-refinement-2026-10-28/number-line-asset-v1/`. Status: awaiting review. Assumption: the independently reusable visual should be a scalable rail, with text and marks kept separate. No external legacy assumptions were used.



## Larger number-line labels

Increased the live number labels on the line, with a smaller increase on compact landscape screens. The rail and labels remain separate. Review screenshots: `qa-artifacts/website-refinement-2026-10-28/number-line-larger-labels/`. Awaiting review.
