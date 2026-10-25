# Graph Grabber scale and tooltip repair — 23 October 2026

Local source correction only. No deployment or TestFlight upload. No external legacy assumptions were used.

## Evidence and root cause

Final compact visual review found the leading digit missing from180,160 and120 on the Y axis. Preserved the actual pre-fix capture at `qa-artifacts/graph-grabber-axis/baseline-667-axis-clipped.png` (copied from the111-case compact sweep).

Inspected `src/games/GraphGrabberGame.tsx`, local `graph-grabber.css` and relevant existing chart typography/composition rules. Compact Recharts layout combined a28px Y-axis width and **negative8px left margin**, leaving insufficient room for complete three-digit text. Initial geometry additionally measured the top label3.1px above its SVG and160/180 label boxes intersecting by about4.7px. These are mathematical display defects, despite the older broad HTML-button bounds test passing.

## Scoped change

Only production file changed: `src/games/GraphGrabberGame.tsx`.

- Compact Y-axis width52px and nonnegative left margin8px give a measured60px plot gutter. Desktop retains its60px axis width plus10px margin (70px gutter).
- Compact top margin12px leaves the entire numeric glyph box inside the SVG.
- Compact tick sampling uses fewer intervals and removes a near-adjacent penultimate label while preserving the axis maximum. The tested180 scale now shows0,60,120,180; desktop retains all20-unit ticks. Recharts still maps the same numeric domain linearly. Bar values, crate-unit scale, category names, questions, options, scoring and answer logic are unchanged.
- The existing desktop hover tooltip's item value was black on its dark panel, despite the container text colour. Added scoped `Tooltip itemStyle={{color:'#fff8ec'}}`; the value remains the original datum.

No local/shared CSS or unrelated production component changed. Existing pictogram/crate rendering, trace tabs and selection handlers are preserved.

## Verification

Persistent checker: `scripts/verify-graph-grabber-axis.mjs`, default source3023, configurable `LEGEND_IOS_QA_URL` and `LEGEND_QA_OUT`.

- Source axis/answer cases: **3/3 passed** at844×390,667×375 and1440×900. Source667 and1440 captures were visually inspected after correction.
- Final compiled axis **and actual hover** cases on the parent's tooltip candidate: **3/3 passed**. The measured plot gutters are60,60 and70px, all above44px. Every numeric tick rectangle is fully inside the SVG; no tick text rectangles intersect.
- Moved the real mouse to the centre of a painted crate. Tooltip label matched that shipment; tooltip value140 matched `data-crate-value`; computed value text colour was `rgb(255, 248, 236)` at every size. Desktop tooltip screenshot was visually inspected and is now readable.
- Calculated the answer from the displayed bar data and question, selected it, and observed `Graph secured` at all three sizes. Final test question needed740 crates, its displayed deliveries totalled620 and the selected correct answer was120. Zero page runtime errors or button/top-HUD/bottom-dock intersections occurred.

Final evidence: `qa-artifacts/graph-grabber-axis/compiled-tooltip-mouse/results.json` plus `{width}-axis.png`, `{width}-tooltip.png`, `{width}-correct.png` and geometry files. The earlier `compiled/` axis-only results precede the tooltip fix; `compiled-tooltip/` retains a **test locator failure**, not a product failure: Playwright's exact rectangle hover was intercepted by the crate's own decorative cross-path. The final test uses actual mouse coordinates within the painted crate and verifies the resulting real tooltip, without forced events or timeout extensions. Initial source checker also learned that Recharts' empty Y-axis container is not the numeric label subtree; the final check measures actual numeric SVG texts.

The parent's final affected-game bounds sweep additionally checks question/HUD separation. Native touch/VoiceOver, normal-motion and physical-device rendering remain native release validation. All worker browsers closed after verification. No release action was made.
