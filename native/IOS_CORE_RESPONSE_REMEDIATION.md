# Core response presentation remediation

22 October 2026. Roadmap B5(e), local changes only. No deployment/TestFlight upload.

## Evidence and changes

The compiled 667x375 starting-state captures in `qa-artifacts/ios-core-responses/*-before.png` showed combination choice names rendered at roughly7px inside the scaled SVG. Fraction, pictogram and graph model canvases measured about104–121px high. The left column spent18px plus a gap on charge progress above a separate44px mission-tools row.

- `src/components/game-ui/SatsRevisionGapVisual.tsx`: combination choices now use two semantic HTML lists, preserving every original group, count, item and pairing instruction. Text has a12px rendered floor instead of shrinking with a520px SVG viewBox. This changes presentation only, with no product/count answer revealed.
- `src/components/game-ui/core-paper-presentation.css`: short-landscape charge progress and mission tools share one44px footer; model margins reduce to8px/10px to spend more space on the educational diagram. Existing paper1/2/3 colours and frame materials remain. The working-board summary has a44px target.
- `scripts/export-ios-core-response-fixtures.ts`: extracts exact existing-bank checkpoints, without editing questions or marking.
- `scripts/verify-ios-core-responses.mjs`: captures six response types across667x375,844x390 and1440x900; seeds exact checkpoint IDs and checks diagram bounds, document overflow, choice text size, response entry and marking.

## Assumptions and limits

The existing SATs bank and marking are the source of truth; no learning concepts, answers, difficulties or scores were changed. Readability checks are browser CSS pixels, not native VoiceOver or physical iPhone certification. Native keyboard, touch and safe-area validation remain required. No external legacy assumptions were used.

Verification outcomes are recorded in the parent integration report and the raw `qa-artifacts/ios-core-responses/after.json`; do not infer a complete run from partial capture files. Before captures currently establish four667px states; source/compiled build provenance and remaining cases must remain labelled.

## 23 October follow-up diagnosis

The first1rem gutter kept text clear of the companion but exposed an available-height problem at667x375: the choices scrollport was102px high while its contents required111px. The worst existing-bank case found in the deterministic seed sweep is paper3 seed26 (six top-stripe colours/four bottom-stripe colours); even after removing redundant per-column “Choose one” copy and compacting margins, it required116px.

The final task-specific composition therefore gives choice-list models1.25fr and their single numeric response.75fr on short landscape, selected by `:has(.sats-choice-pairs)`. The original prompt and full one-of-each pairing statement remain. Font size stays12px with1.2 line-height; no choice is removed, clipped or reduced. The model retains a consistent1rem interior gutter.

Diagnostic prototype evidence is explicitly labelled `prototype*` in the artifact folder; it injects the source presentation into the earlier compiled page and is **not** final compiled verification. It measured117px available/required for both default and worst cases at667, and132px at844. The numeric response remained194px wide at667 and247px at844. Final compiled verification now includes the six original fixtures at three sizes plus worst-case choices at both phone sizes (20 cases), all-choice visibility,44px input dimensions, field-label overflow and correct submission/marking.

The narrower numeric field also exposed a clipped generic placeholder. A task-scoped12px placeholder style keeps “Your answer” readable; the full field label, input aria-label and entered mathematical answer retain their existing size/content. The regression measures placeholder text width against the actual input interior.

A first compiled full-run attempt on23 October passed four667px entry/answer/marking cases, then failed during navigation before rectangle entry. A separate fresh-context diagnostic also timed out on initial DOMContentLoaded, so that attempt is retained as incomplete rather than interpreted as a rectangle maths/rendering failure. The harness now preloads the exact scoped checkpoint into a separate isolated context for every fixture, records page/request failures, allows90s navigation and closes its browser in a finally block. Final outcomes below must come from the completed rebuilt run, not the partial attempt.

## Final compiled result — 23 October 2026

**20/20 passed**, exit0: `CORE_PHASE=after node scripts/verify-ios-core-responses.mjs`, log `.tmp/ios-core-23oct-complete.log`. Stable compiled iOS-mode preview3024 from `.tmp/ios-final-candidate-build.log` (39.69s). Prototype injection was explicitly disabled. Each fixture used a fresh isolated account/browser context and an existing-bank checkpoint; the previous reused-context navigation stall did not recur.

- Seven cases each at667x375 and844x390 (six response types plus worst-case flags), six at1440x900.
- Every case entered its answer via the actual fields, slider, category/half-symbol controls or graph/rectangle controls, then saved, finished and verified the mission received full marks.
- All20 models/diagrams remained within their reserved bounds; zero document scrolling and zero recorded page errors.
- All combination choices fit the visible list region; every label retained its full text, input dimensions met44px, placeholder width fit, and choice text remained at least12px. The full one-of-each pairing statement stayed visible.
- At667, fraction/pictogram canvas height increased from121 to159px; line-build116 to154px. Combination model width increased from187 to302px and height104 to142px. The worst6/4 flag list fits117px available/required at667 and132px at844.
- Final screenshots for667 default/worst combinations, fraction shading and short-phone controls were visually inspected. The placeholder is now fully readable. No source edits followed this verification.

Browse [the20-case comparison gallery](../qa-artifacts/ios-core-responses/index.html) and [raw final results](../qa-artifacts/ios-core-responses/after.json). Before evidence is available for four initial667 cases; other cards intentionally show only final captures. This is representative response coverage, not a claim that every SATs mission/seed or native iPhone behaviour has been tested. Release hold remains active; no deployment or TestFlight upload occurred.
