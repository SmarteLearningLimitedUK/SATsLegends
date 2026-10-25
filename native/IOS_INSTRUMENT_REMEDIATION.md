# iOS instrument and label remediation

22 October 2026. Local source changes only. No deployment or TestFlight upload.

## Scope and assumptions

Bounded B5 instrument/label batch from the existing iOS audit: Chrono Dash, Angle Arena, Perimeter Path, Line Graph Lab and Scale Builder. Keep the existing rich art, educational questions, answer order, maths, scoring, Start gate and shared dock. Landscape phone layout remains the existing policy. No external legacy assumptions were used.

Inspected `AGENTS.md`, `native/IOS_IMPLEMENTATION_ROADMAP.md`, `native/IOS_ART_DIRECTION.md`, the five corresponding `qa-artifacts/ios-aaa-audit/*-play.png` captures, local components/styles, and current browser renders before adjusting each layout. No shared shell or unrelated game files changed by this batch.

## Changes and evidence

- **Chrono Dash:** the clock previously competed vertically with a full-width action row. In short landscape, the clock now spans the activity rows while the hour/minute controls and actions occupy the right column. Clock footprint increased from roughly 150px to 205px at 844×390. Control labels are 12px; 44px hand controls remain. Idle hand advice moves to existing lightbulb tips; actual feedback remains visible above actions, with a `data-tone` marker matching the existing feedback visibility contract.
- **Angle Arena:** the educational angle illustration uses 20% rather than 16% of canvas height for its radius, a 25% increase. Its vertical centre leaves clearance below the question and above answers. The short-height answer floor is 44px rather than 38px. Mathematical prompt/angle derivation unchanged.
- **Perimeter Path:** edge measurement text increases from 5.5 to 7 SVG units (27%). All edge values and mixed-unit calculations remain unchanged. No invisible expanded hit areas were added. The diagram's dense optional SVG edge toggles are still smaller than 44px; this is an explicit remaining accessibility limitation, not covered by the HTML-button size pass below.
- **Line Graph Lab:** reduced empty answer-panel width, increased plot width (about 363px to 403px at 844), 13px tick labels rather than 11px, 12px axis header rather than 10px. Answers remain bottom aligned and ≥44px. Plot-entry mode retains its more-specific existing width allocation. Corrected the chart's accessible description to water temperature in °C against minutes, matching the visible graph; it incorrectly referred to brainpower.
- **Scale Builder:** existing title/field padding repair retained. At 667×375, six keypad columns rendered about 39.9px wide. The control column now has a 290px minimum at short landscape widths, retaining the blueprint while making keys at least 44px wide.

## Changed source files

- `src/games/ChronoDashGame.tsx`
- `src/games/chrono-dash.css` (new scoped local stylesheet)
- `src/games/AngleArenaGame.tsx`
- `src/games/angle-arena.css`
- `src/games/PerimeterPathGame.tsx`
- `src/games/LineGraphLabGame.tsx`
- `src/games/line-graph-lab.css`
- `src/games/scale-builder.css`

Evidence and raw rectangles: `qa-artifacts/ios-instruments/final.json`; final screenshots `final-{game_key}-{844|667}.png`. Initial audit captures remain the visual baseline. These are geometry comparisons, not approved pixel diffs: random question values differ between captures. Source browser checks used isolated release account fixtures, reduced motion, 844×390 and 667×375. `final-scale_builder-667.png` was visually inspected after its final keypad adjustment; clock/angle/perimeter/graph were inspected at both sizes.

## Executed checks

- Ten final source browser captures: 5 games × 2 phone sizes. **10/10** have zero page runtime errors, no document vertical scroll, and zero visible HTML buttons below 43.5px in width or height. SVG edge targets are explicitly excluded from this size statement.
- Shared tips/dock check on 844 source: Angle, Perimeter, Line Graph and Chrono passed. Scale's helper/panel flow reached the timer assertion, but the shared checker then waited for an absent timer; this is a checker issue reported to the parent and is not claimed as a Scale pass here.
- `npx tsx scripts/verify-scale-builder-math.ts`: passed exact answers, decimal factors, invalid/missing numbers and independent dimension errors.
- `npx tsx scripts/verify-angle-question-variety.ts`: passed all five tiers, 15–22 valid prompt types and 80 seeded runs per tier.
- A follow-up source interaction capture timed out during startup/navigation before gameplay. No interaction success is claimed from it. Further browsers were stopped/queued to avoid concurrent source/preview contention. Parent final compiled regression and targeted interaction checks remain required.

## Remaining validation

Final compiled iOS-mode all-game regression and interaction/state checks are owned by the parent after the shared viewport work finishes. Confirm clock hand changes and submitted feedback, angle answer/launch transition, perimeter edge toggle and answer feedback, Scale keypad/clear/check, and line reading/plot-entry responses. Actual iPhone safe areas, VoiceOver, sustained normal-motion performance and native orientation remain device checks. These browser captures are not native release certification.

## Accessible perimeter checking — 23 October 2026

Follow-up B6 correction adds a 44px alternative to the dense optional SVG edge toggles. `PerimeterPathGame.tsx` now puts a separate `Check next edge` control above the unchanged four perimeter answers in a `.perimeter-response-tools` wrapper. The button announces the next edge's index/value plus checked count; it calls the existing `toggleEdge`. After every edge is checked it becomes `Reset edge checks`, clearing only `selectedEdgeIds`. It cannot submit an answer or reset a question, timer or score. New local `src/games/perimeter-path.css` places the wrapper in the existing right grid column and styles the control; shared layout styles and diagram sizing remain unchanged.

`node scripts/verify-ios-perimeter-edge-checks.mjs` passed both844×390 and667×375 source cases: all eight edge checks, visible state changes, reset, unchanged question ID, then the calculated correct mixed-unit perimeter answer. All five right-column HTML controls were at least44px in each dimension; no dock overlap, document scroll or runtime errors. Evidence: `qa-artifacts/ios-perimeter-edge-checks/results.json`, `667-ready.png`, `667-all-checked.png` and answered states. Ready/all-checked667 screenshots were visually inspected; diagram and all four answer choices remain clear. The original small SVG targets remain optional; sequential large controls offer the same checking task without relying on them.

Final compiled rerun is pending the parent's next build. `scripts/verify-ios-perimeter-edge-checks.mjs` accepts `LEGEND_IOS_QA_URL` and `LEGEND_QA_OUT`. Native VoiceOver, physical edge taps and normal-motion checks remain device work. No deployment was performed.

## Final compiled interaction verification — 23 October 2026

Against preview3024 after the parent's final frozen-source iOS build (`.tmp/ios-remaining-build.log`, updated23October08:41 local), the instrument state suite passed **10/10 cases**, five games at844×390 and667×375, with **26 captured state records**, zero page runtime errors, no document vertical scrolling and no visible HTML-button/bottom-dock intersections.

Executed transitions:

- Chrono: hour increment changes the displayed hands, reset returns to12:00, guaranteed incorrect submission shows its message, reset works again.
- Angle: answer becomes pressed/locked, firing resolves, automatic advance reaches a different question.
- Perimeter: diagram edge toggle updates its checked state and a calculated mixed-unit answer succeeds.
- Scale: keypad entry, clear, one wrong dimension and error feedback, clear, both correct dimensions and success feedback.
- Line Graph: correct biggest-increase reading, Next Graph, selection of the exact halfway temperature, plotting the point and correct feedback/Next Graph.

Persistent checker: `scripts/verify-ios-instrument-states.mjs`. Final combined evidence: `qa-artifacts/ios-instruments/compiled-final-results-2026-10-23.json`; original eight non-graph cases/images are under `compiled-states-2026-10-23/`, and the two final graph cases under `compiled-graph-states-2026-10-23/`. The original graph checks twice used a question selector under the old local header. Inspection identified `ViewportQuestion` portals the question into the shared question region, so the checker was corrected to `[data-game-question] [data-question-copy]`; no game code changed to resolve this test issue. Original raw selector failures remain historical evidence. Final graph selected/correct plot states have zero visible HTML controls below43.5px, the half-pixel tolerance used for a44px CSS screening floor. The844 plot-selected screenshot was visually inspected: labels, selected point, all options and plot action remain clear.

The new large Perimeter alternative also passed its dedicated **2/2 compiled cases**, with **6 screenshots/states**, on the same final build. Each case checks all eight edges in order, verifies eight highlighted SVG edges, resets to zero, confirms question ID is unchanged, then answers the perimeter correctly. Every right-column control is at least44px within browser measurement tolerance, with no dock intersection, scrolling or runtime errors. Evidence: `qa-artifacts/ios-perimeter-edge-checks/compiled-2026-10-23/results.json`. This supersedes the earlier pending compiled-rerun note. The sequential control supplies a large equivalent for optional edge checking; the original small diagram labels remain clickable and are not claimed to be44px themselves.

All source changes remain local. No TestFlight upload or deployment was made. Native VoiceOver, safe-area behaviour and normal-motion performance remain unverified on physical devices. No external legacy assumptions were used.
